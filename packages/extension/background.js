/* Extension background worker that syncs focus data and enforces blocked URLs. */
import { getBlockedPageUrl, getDashboardUrl } from "./lib/config.js";
import { isExtensionPage, matchesBlockedRule, normalizeMatchValue } from "./lib/normalize.js";
import {
    getAppConfig,
    getBlockedScreenData,
    getBlockedUrls,
    getExtensionSession,
    getRemoteSyncMeta,
    getTaskSyncState,
    getTemporaryBypasses,
    saveTemporaryBypass,
    setStorage,
    STORAGE_KEYS,
} from "./lib/storage.js";
import {
    ensureFreshExtensionSession,
    fetchBlockedRules,
    fetchFuturePreview,
    fetchQuoteOfDay,
    fetchTasksForToday,
    fetchUserSettings,
    fetchVisionCards,
    insertBypassAttempt,
    toggleTaskCompletion,
    refreshVisionCardImageUrl,
} from "./lib/supabase-api.js";
import { REMOTE_SYNC_STALE_MS, TEMP_BYPASS_DURATION_MS, getTodayKey } from "./lib/time.js";

const REMOTE_SYNC_ALARM = "focusgate-remote-sync";
const REMOTE_SYNC_ALARM_MINUTES = 15;

function logInfo(message, details) {
    console.info("[FocusGate background]", message, details ?? "");
}

function logError(message, error) {
    console.error("[FocusGate background]", message, error);
}

function getDefaultBlockScreenSettings() {
    return {
        show_tasks_on_block_screen: true,
        show_vision_cards_on_block_screen: true,
        show_quotes_on_block_screen: true,
        bypass_cooldown_seconds: 30,
        bypass_requires_reason: true,
    };
}

function buildSyncMeta(partial = {}) {
    return {
        lastAttemptedAt: new Date().toISOString(),
        lastSuccessfulAt: null,
        lastError: null,
        source: "background",
        ...partial,
    };
}

async function sendTabMessage(tabId, message) {
    return new Promise((resolve) => {
        chrome.tabs.sendMessage(tabId, message, () => {
            void chrome.runtime.lastError;
            resolve();
        });
    });
}

async function getBlockingState() {
    const taskSyncState = await getTaskSyncState();
    if (!taskSyncState || taskSyncState.taskDate !== getTodayKey()) {
        return {
            active: false,
            reason: "No task sync for today",
            pendingTaskCount: 0,
            completedTaskCount: 0,
            totalTaskCount: 0,
            lastSyncedAt: taskSyncState?.lastSyncedAt ?? null,
        };
    }

    const pendingTaskCount = Number(taskSyncState.pendingTaskCount || 0);
    const completedTaskCount = Number(taskSyncState.completedTaskCount || 0);
    const totalTaskCount = Number(taskSyncState.totalTaskCount || 0);

    return {
        active: pendingTaskCount > 0,
        reason: pendingTaskCount > 0 ? `${pendingTaskCount} pending task(s)` : "All tasks complete",
        pendingTaskCount,
        completedTaskCount,
        totalTaskCount,
        lastSyncedAt: taskSyncState.lastSyncedAt ?? null,
    };
}

async function requestSyncFromAppTabs() {
    const appConfig = await getAppConfig();
    const appOrigin = appConfig?.appOrigin ?? null;
    if (!appOrigin) {
        return false;
    }
    const tabs = await chrome.tabs.query({ url: `${appOrigin}/*` });
    const messages = [];
    for (const tab of tabs) {
        if (tab.id != null) {
            messages.push(sendTabMessage(tab.id, { type: "focusgateRequestSync" }));
        }
    }
    await Promise.all(messages);
    return tabs.length > 0;
}

async function broadcastStateUpdate() {
    const tabs = await chrome.tabs.query({});
    const sends = [];
    for (const tab of tabs) {
        if (tab.id != null) {
            sends.push(sendTabMessage(tab.id, { type: "focusgateStateUpdated" }));
        }
    }
    await Promise.all(sends);
}

function buildTaskSyncState(tasks, userId, source) {
    const totalTaskCount = Array.isArray(tasks) ? tasks.length : 0;
    let completedTaskCount = 0;

    if (Array.isArray(tasks)) {
        for (const task of tasks) {
            if (task.completed) {
                completedTaskCount += 1;
            }
        }
    }

    const pendingTaskCount = Math.max(totalTaskCount - completedTaskCount, 0);
    return {
        userId: userId ?? null,
        taskDate: getTodayKey(),
        totalTaskCount,
        completedTaskCount,
        pendingTaskCount,
        hasPendingTasks: pendingTaskCount > 0,
        lastSyncedAt: new Date().toISOString(),
        source,
    };
}

async function refreshRemoteState(force = false) {
    const [appConfig, blockedUrls, blockedScreenData, session] = await Promise.all([
        getAppConfig(),
        getBlockedUrls(),
        getBlockedScreenData(),
        getExtensionSession(),
    ]);

    const lastSyncedAtMs = blockedScreenData?.lastSyncedAt ? new Date(blockedScreenData.lastSyncedAt).getTime() : 0;
    if (!force && lastSyncedAtMs && Date.now() - lastSyncedAtMs < REMOTE_SYNC_STALE_MS) {
        return {
            blockedUrls,
            blockingState: await getBlockingState(),
            blockedScreenData: blockedScreenData ?? null,
            setupReady: Boolean(appConfig?.supabaseUrl && appConfig?.supabaseAnonKey && session?.userId),
        };
    }

    if (!appConfig?.supabaseUrl || !appConfig?.supabaseAnonKey || !session?.userId) {
        await setStorage({
            [STORAGE_KEYS.remoteSyncMeta]: buildSyncMeta({
                lastSuccessfulAt: blockedScreenData?.lastSyncedAt ?? null,
                lastError: "Missing extension session or app config",
            }),
        });
        return {
            blockedUrls,
            blockingState: await getBlockingState(),
            blockedScreenData: blockedScreenData ?? null,
            setupReady: false,
        };
    }

    try {
        await setStorage({
            [STORAGE_KEYS.remoteSyncMeta]: buildSyncMeta({
                lastSuccessfulAt: blockedScreenData?.lastSyncedAt ?? null,
                lastError: null,
            }),
        });

        let freshSession;
        try {
            freshSession = await ensureFreshExtensionSession(session, appConfig);
        } catch (error) {
            logError("ensureFreshExtensionSession failed", error);
            await setStorage({
                [STORAGE_KEYS.remoteSyncMeta]: buildSyncMeta({
                    lastSuccessfulAt: blockedScreenData?.lastSyncedAt ?? null,
                    lastError: error?.message ?? String(error),
                }),
            });
            return {
                blockedUrls,
                blockingState: await getBlockingState(),
                blockedScreenData: blockedScreenData ?? null,
                setupReady: false,
            };
        }
        if (!freshSession?.userId || !freshSession.accessToken) {
            return {
                blockedUrls,
                blockingState: await getBlockingState(),
                blockedScreenData: blockedScreenData ?? null,
                setupReady: false,
            };
        }

        let tasks = [];
        let nextBlockedUrls = [];
        let settings = null;
        let visionCards = [];
        let quote = null;
        let futurePreview = null;

        try {
            tasks = await fetchTasksForToday(freshSession, appConfig);
        } catch (error) {
            logError("fetchTasksForToday failed", error);
        }

        try {
            nextBlockedUrls = await fetchBlockedRules(freshSession, appConfig);
        } catch (error) {
            logError("fetchBlockedRules failed", error);
        }

        try {
            settings = await fetchUserSettings(freshSession, appConfig);
        } catch (error) {
            logError("fetchUserSettings failed", error);
        }

        try {
            visionCards = await fetchVisionCards(freshSession, appConfig);
        } catch (error) {
            logError("fetchVisionCards failed", error);
        }

        try {
            quote = await fetchQuoteOfDay(freshSession, appConfig);
        } catch (error) {
            logError("fetchQuoteOfDay failed", error);
        }

        try {
            futurePreview = await fetchFuturePreview(freshSession, appConfig);
        } catch (error) {
            logError("fetchFuturePreview failed", error);
        }

        const taskSyncState = buildTaskSyncState(tasks, freshSession.userId, "supabase");
        const nextBlockedScreenData = {
            userId: freshSession.userId,
            tasks: Array.isArray(tasks) ? tasks : [],
            visionCards: Array.isArray(visionCards) ? visionCards : [],
            quote: quote ?? null,
            futurePreview: futurePreview ?? null,
            settings: settings ?? getDefaultBlockScreenSettings(),
            blockedUrls: Array.isArray(nextBlockedUrls) ? nextBlockedUrls : [],
            appOrigin: appConfig.appOrigin,
            appDashboardUrl: getDashboardUrl(appConfig.appOrigin),
            lastSyncedAt: taskSyncState.lastSyncedAt,
        };

        await setStorage({
            [STORAGE_KEYS.blockedUrls]: nextBlockedScreenData.blockedUrls,
            [STORAGE_KEYS.blockedScreenData]: nextBlockedScreenData,
            [STORAGE_KEYS.extensionSession]: freshSession,
            [STORAGE_KEYS.remoteSyncMeta]: buildSyncMeta({
                lastSuccessfulAt: taskSyncState.lastSyncedAt,
                lastError: null,
            }),
            [STORAGE_KEYS.taskSyncState]: taskSyncState,
        });

        return {
            blockedUrls: nextBlockedScreenData.blockedUrls,
            blockingState: await getBlockingState(),
            blockedScreenData: nextBlockedScreenData,
            setupReady: true,
        };
    } catch (error) {
        logError("refreshRemoteState failed", error);
        await setStorage({
            [STORAGE_KEYS.remoteSyncMeta]: buildSyncMeta({
                lastSuccessfulAt: blockedScreenData?.lastSyncedAt ?? null,
                lastError: error?.message ?? String(error),
            }),
        });
        return {
            blockedUrls,
            blockingState: await getBlockingState(),
            blockedScreenData: blockedScreenData ?? null,
            setupReady: Boolean(appConfig?.supabaseUrl && appConfig?.supabaseAnonKey && session?.userId),
        };
    }
}

async function syncAllData(source = "manual") {
    const [appConfig, session] = await Promise.all([getAppConfig(), getExtensionSession()]);
    let didRequestTabSync = false;

    if (!appConfig?.supabaseUrl || !appConfig?.supabaseAnonKey || !session?.refreshToken) {
        didRequestTabSync = await requestSyncFromAppTabs().catch(() => false);
        if (!didRequestTabSync) {
            await setStorage({
                [STORAGE_KEYS.remoteSyncMeta]: buildSyncMeta({
                    source,
                    lastError: "Connect your FocusGate account from the web app once to bootstrap the extension.",
                }),
            });
        }
    }

    if (didRequestTabSync) {
        await new Promise((resolve) => setTimeout(resolve, 300));
    }

    return refreshRemoteState(true);
}

async function scheduleRemoteSync() {
    await chrome.alarms.create(REMOTE_SYNC_ALARM, {
        delayInMinutes: 1,
        periodInMinutes: REMOTE_SYNC_ALARM_MINUTES,
    });
}

async function checkUrl(url, tabId) {
    if (!url || !tabId || isExtensionPage(url)) {
        return { blocked: false };
    }

    const existingState = await getBlockingState();
    if (!existingState.lastSyncedAt) {
        await requestSyncFromAppTabs();
        await new Promise((resolve) => setTimeout(resolve, 150));
    }

    await refreshRemoteState(false);

    const [rules, blockingState, temporaryBypasses] = await Promise.all([
        getBlockedUrls(),
        getBlockingState(),
        getTemporaryBypasses(),
    ]);

    if (!blockingState.active || !rules.length) {
        return { blocked: false, blockingState };
    }

    for (const rule of rules) {
        if (matchesBlockedRule(url, rule)) {
            const normalizedRule = normalizeMatchValue(rule);
            if (Number(temporaryBypasses[normalizedRule] || 0) > Date.now()) {
                return { blocked: false, rule, blockingState, bypassed: true };
            }

            chrome.tabs.update(tabId, { url: getBlockedPageUrl(rule, url) });
            return { blocked: true, rule, blockingState };
        }
    }

    return { blocked: false, blockingState };
}

async function mergeWebTaskSync(payload) {
    const currentBlockedScreenData = await getBlockedScreenData();
    const nextTaskSyncState = payload
        ? {
              userId: payload.userId ?? null,
              taskDate: payload.taskDate ?? getTodayKey(),
              totalTaskCount: Number(payload.totalTaskCount || 0),
              completedTaskCount: Number(payload.completedTaskCount || 0),
              pendingTaskCount: Number(payload.pendingTaskCount || 0),
              hasPendingTasks: Boolean(payload.pendingTaskCount > 0),
              lastSyncedAt: payload.lastSyncedAt ?? new Date().toISOString(),
              source: "page",
          }
        : null;

    const nextBlockedScreenData = currentBlockedScreenData
        ? {
              ...currentBlockedScreenData,
              lastSyncedAt: nextTaskSyncState?.lastSyncedAt ?? currentBlockedScreenData.lastSyncedAt,
          }
        : currentBlockedScreenData;

    await setStorage({
        [STORAGE_KEYS.taskSyncState]: nextTaskSyncState,
        [STORAGE_KEYS.blockedScreenData]: nextBlockedScreenData,
    });
}

async function mergeAppConfig(payload) {
    if (!payload) {
        return;
    }

    const currentAppConfig = (await getAppConfig()) ?? {};
    await setStorage({
        [STORAGE_KEYS.appConfig]: {
            ...currentAppConfig,
            appOrigin: payload.appOrigin ?? currentAppConfig.appOrigin ?? null,
            supabaseUrl: payload.supabaseUrl ?? currentAppConfig.supabaseUrl ?? null,
            supabaseAnonKey: payload.supabaseAnonKey ?? currentAppConfig.supabaseAnonKey ?? null,
        },
    });
}

async function handleToggleTask(taskId, completed) {
    const [appConfig, session, blockedScreenData] = await Promise.all([
        getAppConfig(),
        getExtensionSession(),
        getBlockedScreenData(),
    ]);

    if (!appConfig || !session?.userId) {
        throw new Error("FocusGate extension is not configured yet.");
    }

    const freshSession = await ensureFreshExtensionSession(session, appConfig);
    if (!freshSession?.userId) {
        throw new Error("Missing extension session.");
    }

    const updatedTask = await toggleTaskCompletion(taskId, completed, freshSession, appConfig);
    const currentTasks = Array.isArray(blockedScreenData?.tasks) ? blockedScreenData.tasks : [];
    const nextTasks = [];

    for (const task of currentTasks) {
        if (task.id === taskId) {
            nextTasks.push({ ...task, completed });
        } else {
            nextTasks.push(task);
        }
    }

    const nextTaskSyncState = buildTaskSyncState(nextTasks, freshSession.userId, "extension");
    const nextBlockedScreenData = {
        ...(blockedScreenData ?? {}),
        userId: freshSession.userId,
        tasks: nextTasks,
        lastSyncedAt: nextTaskSyncState.lastSyncedAt,
    };

    await setStorage({
        [STORAGE_KEYS.extensionSession]: freshSession,
        [STORAGE_KEYS.taskSyncState]: nextTaskSyncState,
        [STORAGE_KEYS.blockedScreenData]: nextBlockedScreenData,
    });

    await broadcastStateUpdate();

    return {
        updatedTask,
        blockedScreenData: nextBlockedScreenData,
        blockingState: await getBlockingState(),
    };
}

async function handleBypass(rule, blockedUrl, reason, durationMs = TEMP_BYPASS_DURATION_MS) {
    const normalizedRule = normalizeMatchValue(rule);
    if (!normalizedRule) {
        throw new Error("Missing blocked rule for bypass.");
    }

    const [appConfig, session] = await Promise.all([getAppConfig(), getExtensionSession()]);
    if (appConfig?.supabaseUrl && appConfig?.supabaseAnonKey && session?.userId) {
        try {
            const freshSession = await ensureFreshExtensionSession(session, appConfig);
            if (freshSession?.userId) {
                await insertBypassAttempt(
                    {
                        user_id: freshSession.userId,
                        app_or_url: blockedUrl,
                        attempted_at: new Date().toISOString(),
                        bypassed: true,
                        bypass_reason: reason || null,
                        bypass_waited_seconds: Math.round(Number(durationMs) / 1000),
                    },
                    freshSession,
                    appConfig,
                );

                await setStorage({ [STORAGE_KEYS.extensionSession]: freshSession });
            }
        } catch (error) {
            logError("handleBypass logging failed", error);
        }
    }

    await saveTemporaryBypass(normalizedRule, Number(durationMs) || TEMP_BYPASS_DURATION_MS);
    return { ok: true };
}

chrome.runtime.onInstalled.addListener(async () => {
    const blockedUrls = await getBlockedUrls();
    if (!Array.isArray(blockedUrls) || blockedUrls.length === 0) {
        await setStorage({
            [STORAGE_KEYS.blockedUrls]: [
                "youtube.com/shorts",
                "instagram.com/reels",
                "tiktok.com",
                "x.com/i/flow/trending",
            ],
        });
    }

    await scheduleRemoteSync();
    await syncAllData("install");
});

chrome.runtime.onStartup.addListener(() => {
    void scheduleRemoteSync();
    void syncAllData("startup");
});

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === REMOTE_SYNC_ALARM) {
        void syncAllData("alarm");
    }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message?.type === "getExtensionState") {
        syncAllData("popup")
            .then(async (state) => {
                const remoteSyncMeta = await getRemoteSyncMeta();
                sendResponse({ ...state, remoteSyncMeta });
            })
            .catch((error) => {
                logError("getExtensionState failed", error);
                sendResponse({ blockedUrls: [], blockingState: null, blockedScreenData: null, remoteSyncMeta: null, setupReady: false });
            });
        return true;
    }

    if (message?.type === "getBlockedScreenData") {
        syncAllData("blocked-page")
            .then(async (state) => {
                sendResponse({
                    setupReady: state.setupReady,
                    blockedScreenData: state.blockedScreenData ?? (await getBlockedScreenData()),
                    blockingState: state.blockingState,
                });
            })
            .catch((error) => {
                logError("getBlockedScreenData failed", error);
                sendResponse({ setupReady: false, blockedScreenData: null, blockingState: null });
            });
        return true;
    }

    if (message?.type === "syncNow") {
        syncAllData("manual")
            .then(async (state) => {
                const remoteSyncMeta = await getRemoteSyncMeta();
                sendResponse({ ok: true, ...state, remoteSyncMeta });
            })
            .catch((error) => {
                logError("syncNow failed", error);
                sendResponse({ ok: false, error: error?.message ?? String(error) });
            });
        return true;
    }

    if (message?.type === "toggleTask") {
        handleToggleTask(message.payload?.taskId, Boolean(message.payload?.completed))
            .then((result) => sendResponse(result))
            .catch((error) => {
                logError("toggleTask failed", error);
                sendResponse({ error: error.message });
            });
        return true;
    }

    if (message?.type === "confirmBypass") {
        handleBypass(
            message.payload?.rule,
            message.payload?.blockedUrl,
            message.payload?.reason ?? "",
            message.payload?.durationMs ?? TEMP_BYPASS_DURATION_MS,
        )
            .then((result) => sendResponse(result))
            .catch((error) => {
                logError("confirmBypass failed", error);
                sendResponse({ error: error.message });
            });
        return true;
    }

    if (message?.type === "checkUrl") {
        checkUrl(message.url, sender.tab?.id).then((result) => sendResponse(result));
        return true;
    }

    if (message?.type === "syncSession") {
        setStorage({
            [STORAGE_KEYS.extensionSession]: message.payload
                ? {
                      userId: message.payload.userId ?? null,
                      accessToken: message.payload.accessToken ?? null,
                      refreshToken: message.payload.refreshToken ?? null,
                      expiresAt: message.payload.expiresAt ?? null,
                  }
                : null,
        })
            .then(() => syncAllData("session-sync"))
            .then(() => broadcastStateUpdate())
            .then(() => sendResponse({ ok: true }))
            .catch((error) => {
                logError("syncSession failed", error);
                sendResponse({ ok: false, error: error.message });
            });
        return true;
    }

    if (message?.type === "syncTaskState") {
        mergeWebTaskSync(message.payload ?? null)
            .then(() => broadcastStateUpdate())
            .then(() => sendResponse({ ok: true }))
            .catch((error) => {
                logError("syncTaskState failed", error);
                sendResponse({ ok: false, error: error.message });
            });
        return true;
    }

    if (message?.type === "syncBlockedUrls") {
        const blockedUrls = Array.isArray(message.payload)
            ? message.payload.map((rule) => normalizeMatchValue(rule)).filter(Boolean)
            : [];
        setStorage({ [STORAGE_KEYS.blockedUrls]: blockedUrls })
            .then(() => syncAllData("rules-sync"))
            .then(() => broadcastStateUpdate())
            .then(() => sendResponse({ ok: true }))
            .catch((error) => {
                logError("syncBlockedUrls failed", error);
                sendResponse({ ok: false, error: error.message });
            });
        return true;
    }

    if (message?.type === "syncAppConfig") {
        mergeAppConfig(message.payload ?? null)
            .then(() => syncAllData("config-sync"))
            .then(() => broadcastStateUpdate())
            .then(() => sendResponse({ ok: true }))
            .catch((error) => {
                logError("syncAppConfig failed", error);
                sendResponse({ ok: false, error: error.message });
            });
        return true;
    }

    if (message?.type === "refreshVisionCardUrl") {
        const imageUrl = message.payload?.imageUrl;
        if (!imageUrl) {
            sendResponse({ imageUrl: null });
            return true;
        }

        Promise.all([getAppConfig(), getExtensionSession()])
            .then(([appConfig, session]) => {
                if (!appConfig?.supabaseUrl || !appConfig?.supabaseAnonKey || !session?.userId) {
                    return { imageUrl };
                }
                return refreshVisionCardImageUrl(imageUrl, session, appConfig).then((nextUrl) => ({ imageUrl: nextUrl }));
            })
            .then((result) => sendResponse(result))
            .catch((error) => {
                logError("refreshVisionCardUrl failed", error);
                sendResponse({ imageUrl });
            });
        return true;
    }

    if (message?.type === "blockedUrlsUpdated") {
        broadcastStateUpdate().then(() => sendResponse({ ok: true }));
        return true;
    }

    if (message?.type === "tempBypass") {
        handleBypass(
            message.payload?.rule,
            message.payload?.blockedUrl,
            message.payload?.reason ?? "",
            message.payload?.durationMs,
        )
            .then((result) => sendResponse(result))
            .catch((error) => {
                logError("tempBypass failed", error);
                sendResponse({ ok: false, error: error.message });
            });
        return true;
    }

    if (message?.type === "openApp") {
        getAppConfig()
            .then((appConfig) => {
                const dashboardUrl = getDashboardUrl(appConfig?.appOrigin);
                if (!dashboardUrl) {
                    throw new Error("FocusGate app origin is not configured yet.");
                }
                return chrome.tabs.create({ url: dashboardUrl });
            })
            .then(() => sendResponse({ ok: true }));
        return true;
    }

    if (message?.type === "goBackOrClose" && sender.tab?.id) {
        chrome.tabs.goBack(sender.tab.id, () => {
            if (chrome.runtime.lastError) {
                getAppConfig().then((appConfig) => {
                    const dashboardUrl = getDashboardUrl(appConfig?.appOrigin);
                    if (!dashboardUrl) {
                        sendResponse({ ok: false, error: "FocusGate app origin is not configured yet." });
                        return;
                    }
                    chrome.tabs.update(sender.tab.id, { url: dashboardUrl }, () => sendResponse({ ok: true }));
                });
                return;
            }
            sendResponse({ ok: true });
        });
        return true;
    }

    return false;
});

chrome.webNavigation.onBeforeNavigate.addListener(
    (details) => {
        if (details.frameId !== 0) {
            return;
        }
        checkUrl(details.url, details.tabId);
    },
    {
        url: [{ urlContains: "://" }],
    },
);

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.url) {
        checkUrl(changeInfo.url, tabId);
    }
});

logInfo("Background worker loaded");
