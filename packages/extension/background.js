const DEFAULT_BLOCKED_URLS = ["youtube.com/shorts", "instagram.com/reels", "tiktok.com", "x.com/i/flow/trending"];
const APP_ORIGIN = "http://localhost:5173";
const APP_URL = `${APP_ORIGIN}/dashboard`;
const SUPABASE_URL = "https://xklfbprajleumjfgbocn.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhrbGZicHJhamxldW1qZmdib2NuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgzODY2NzIsImV4cCI6MjA5Mzk2MjY3Mn0.ElLOdbfiNJnR8B8tudNQ9fDNVYVl-aCF4-Ctau7-LEo";
const DEFAULT_BLOCK_GROUP_NAME = "FocusGate Web Blocklist";
const TEMP_BYPASS_DURATION_MS = 10 * 60 * 1000;
const SESSION_REFRESH_BUFFER_SECONDS = 60;
const REMOTE_SYNC_STALE_MS = 15 * 1000;

function getTodayKey() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function normalizeMatchValue(value) {
    return (value || "")
        .toLowerCase()
        .trim()
        .replace(/^https?:\/\//, "")
        .replace(/^www\./, "")
        .replace(/\/$/, "");
}

function matchesBlockedRule(url, rule) {
    const normalizedUrl = normalizeMatchValue(url);
    const normalizedRule = normalizeMatchValue(rule);
    return normalizedRule !== "" && normalizedUrl.startsWith(normalizedRule);
}

function isExtensionPage(url) {
    return typeof url === "string" && url.startsWith(`chrome-extension://${chrome.runtime.id}/`);
}

function getStorage(keys) {
    return new Promise((resolve) => chrome.storage.local.get(keys, resolve));
}

function setStorage(values) {
    return new Promise((resolve) => chrome.storage.local.set(values, resolve));
}

function sendTabMessage(tabId, message) {
    return new Promise((resolve) => {
        chrome.tabs.sendMessage(tabId, message, () => {
            void chrome.runtime.lastError;
            resolve();
        });
    });
}

function normalizeBlockedRule(rule) {
    return (rule || "")
        .toLowerCase()
        .trim()
        .replace(/^https?:\/\//, "")
        .replace(/^www\./, "")
        .replace(/\/$/, "");
}

function getBlockedPageUrl(url, rule) {
    return `${APP_ORIGIN}/blocked?url=${encodeURIComponent(url)}&rule=${encodeURIComponent(rule)}`;
}

function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildSupabaseHeaders(accessToken) {
    return {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
    };
}

async function getTemporaryBypasses() {
    const result = await getStorage(["temporaryBypasses"]);
    const now = Date.now();
    const storedBypasses = result.temporaryBypasses ?? {};
    const activeBypasses = Object.fromEntries(
        Object.entries(storedBypasses).filter(([, expiresAt]) => Number(expiresAt) > now),
    );

    if (Object.keys(activeBypasses).length !== Object.keys(storedBypasses).length) {
        await setStorage({ temporaryBypasses: activeBypasses });
    }

    return activeBypasses;
}

async function getBlockingState() {
    const result = await getStorage(["taskSyncState"]);
    const taskSyncState = result.taskSyncState;

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

async function getBlockedRules() {
    const result = await getStorage(["blockedUrls"]);
    return Array.isArray(result.blockedUrls) ? result.blockedUrls : DEFAULT_BLOCKED_URLS;
}

async function getExtensionSession() {
    const result = await getStorage(["extensionSession"]);
    return result.extensionSession ?? null;
}

async function refreshExtensionSession(session) {
    if (!session?.refreshToken) {
        return session ?? null;
    }

    const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
        method: "POST",
        headers: {
            apikey: SUPABASE_ANON_KEY,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ refresh_token: session.refreshToken }),
    });

    if (!response.ok) {
        throw new Error(`Failed to refresh extension session (${response.status})`);
    }

    const data = await response.json();
    const refreshedSession = {
        userId: data.user?.id ?? session.userId ?? null,
        accessToken: data.access_token,
        refreshToken: data.refresh_token ?? session.refreshToken,
        expiresAt: data.expires_at ?? null,
    };

    await setStorage({ extensionSession: refreshedSession });
    return refreshedSession;
}

async function ensureFreshExtensionSession() {
    const session = await getExtensionSession();
    if (!session?.accessToken) {
        return null;
    }

    const expiresAtMs = Number(session.expiresAt || 0) * 1000;
    if (expiresAtMs && expiresAtMs - Date.now() > SESSION_REFRESH_BUFFER_SECONDS * 1000) {
        return session;
    }

    return refreshExtensionSession(session);
}

async function fetchTasksFromSupabase(session) {
    const url = new URL(`${SUPABASE_URL}/rest/v1/tasks`);
    url.searchParams.set("select", "id,user_id,title,completed,date,created_at");
    url.searchParams.set("user_id", `eq.${session.userId}`);
    url.searchParams.set("date", `eq.${getTodayKey()}`);
    url.searchParams.set("order", "created_at.asc");

    const response = await fetch(url.toString(), {
        headers: buildSupabaseHeaders(session.accessToken),
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch tasks (${response.status})`);
    }

    return await response.json();
}

async function fetchBlockedRulesFromSupabase(session) {
    const groupUrl = new URL(`${SUPABASE_URL}/rest/v1/block_groups`);
    groupUrl.searchParams.set("select", "id");
    groupUrl.searchParams.set("user_id", `eq.${session.userId}`);
    groupUrl.searchParams.set("name", `eq.${DEFAULT_BLOCK_GROUP_NAME}`);
    groupUrl.searchParams.set("limit", "1");

    const groupResponse = await fetch(groupUrl.toString(), {
        headers: buildSupabaseHeaders(session.accessToken),
    });

    if (!groupResponse.ok) {
        throw new Error(`Failed to fetch block group (${groupResponse.status})`);
    }

    const groups = await groupResponse.json();
    const groupId = groups?.[0]?.id;

    if (!groupId) {
        return [];
    }

    const itemsUrl = new URL(`${SUPABASE_URL}/rest/v1/block_group_items`);
    itemsUrl.searchParams.set("select", "app_or_url");
    itemsUrl.searchParams.set("group_id", `eq.${groupId}`);
    itemsUrl.searchParams.set("platform", "in.(web,all)");
    itemsUrl.searchParams.set("order", "app_or_url.asc");

    const itemsResponse = await fetch(itemsUrl.toString(), {
        headers: buildSupabaseHeaders(session.accessToken),
    });

    if (!itemsResponse.ok) {
        throw new Error(`Failed to fetch blocked rules (${itemsResponse.status})`);
    }

    const items = await itemsResponse.json();
    return Array.isArray(items) ? items.map((item) => normalizeBlockedRule(item.app_or_url)).filter(Boolean) : [];
}

async function refreshRemoteState(force = false) {
    const [cachedState, cachedBlockedUrls, session] = await Promise.all([
        getStorage(["taskSyncState"]).then((result) => result.taskSyncState ?? null),
        getBlockedRules(),
        getExtensionSession(),
    ]);

    const lastSyncedAt = cachedState?.lastSyncedAt ? new Date(cachedState.lastSyncedAt).getTime() : 0;
    if (!force && lastSyncedAt && Date.now() - lastSyncedAt < REMOTE_SYNC_STALE_MS) {
        return {
            blockedUrls: cachedBlockedUrls,
            blockingState: await getBlockingState(),
        };
    }

    if (!session?.userId) {
        return {
            blockedUrls: cachedBlockedUrls,
            blockingState: await getBlockingState(),
        };
    }

    try {
        const freshSession = await ensureFreshExtensionSession();
        if (!freshSession?.userId || !freshSession.accessToken) {
            return {
                blockedUrls: cachedBlockedUrls,
                blockingState: await getBlockingState(),
            };
        }

        const [tasks, blockedUrls] = await Promise.all([
            fetchTasksFromSupabase(freshSession),
            fetchBlockedRulesFromSupabase(freshSession),
        ]);

        const totalTaskCount = Array.isArray(tasks) ? tasks.length : 0;
        const completedTaskCount = Array.isArray(tasks) ? tasks.filter((task) => task.completed).length : 0;
        const pendingTaskCount = Math.max(totalTaskCount - completedTaskCount, 0);
        const syncedAt = new Date().toISOString();

        await setStorage({
            blockedUrls,
            taskSyncState: {
                userId: freshSession.userId,
                taskDate: getTodayKey(),
                totalTaskCount,
                completedTaskCount,
                pendingTaskCount,
                hasPendingTasks: pendingTaskCount > 0,
                lastSyncedAt: syncedAt,
                source: "supabase",
            },
        });

        return {
            blockedUrls,
            blockingState: {
                active: pendingTaskCount > 0,
                reason: pendingTaskCount > 0 ? `${pendingTaskCount} pending task(s)` : "All tasks complete",
                pendingTaskCount,
                completedTaskCount,
                totalTaskCount,
                lastSyncedAt: syncedAt,
            },
        };
    } catch (error) {
        console.error("FocusGate remote sync failed", error);
        return {
            blockedUrls: cachedBlockedUrls,
            blockingState: await getBlockingState(),
        };
    }
}

async function requestSyncFromAppTabs() {
    const tabs = await chrome.tabs.query({ url: `${APP_ORIGIN}/*` });
    await Promise.all(
        tabs
            .filter((tab) => tab.id != null)
            .map((tab) => sendTabMessage(tab.id, { type: "focusgateRequestSync" })),
    );
}

async function checkUrl(url, tabId) {
    if (!url || !tabId || isExtensionPage(url)) {
        return { blocked: false };
    }

    const existingState = await getBlockingState();
    if (!existingState.lastSyncedAt) {
        await requestSyncFromAppTabs();
        await wait(150);
    }

    await refreshRemoteState(false);
    const [rules, blockingState, temporaryBypasses] = await Promise.all([getBlockedRules(), getBlockingState(), getTemporaryBypasses()]);

    if (!blockingState.active || !rules.length) {
        return { blocked: false, blockingState };
    }

    for (const rule of rules) {
        if (matchesBlockedRule(url, rule)) {
            const normalizedRule = normalizeBlockedRule(rule);
            if (Number(temporaryBypasses[normalizedRule] || 0) > Date.now()) {
                return { blocked: false, rule, blockingState, bypassed: true };
            }

            chrome.tabs.update(tabId, { url: getBlockedPageUrl(url, rule) });
            return { blocked: true, rule, blockingState };
        }
    }

    return { blocked: false, blockingState };
}

async function broadcastStateUpdate() {
    const tabs = await chrome.tabs.query({});
    await Promise.all(
        tabs
            .filter((tab) => tab.id != null)
            .map((tab) => sendTabMessage(tab.id, { type: "focusgateStateUpdated" })),
    );
}

chrome.runtime.onInstalled.addListener(async () => {
    const result = await getStorage(["blockedUrls"]);
    if (!Array.isArray(result.blockedUrls)) {
        await setStorage({ blockedUrls: DEFAULT_BLOCKED_URLS });
    }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message?.type === "getExtensionState") {
        requestSyncFromAppTabs()
            .then(() => wait(150))
            .then(() => refreshRemoteState(true))
            .then((state) => sendResponse(state));
        return true;
    }

    if (message?.type === "checkUrl") {
        checkUrl(message.url, sender.tab?.id).then((result) => sendResponse(result));
        return true;
    }

    if (message?.type === "syncSession") {
        setStorage({
            extensionSession: message.payload
                ? {
                    userId: message.payload.userId ?? null,
                    accessToken: message.payload.accessToken ?? null,
                    refreshToken: message.payload.refreshToken ?? null,
                    expiresAt: message.payload.expiresAt ?? null,
                }
                : null,
        }).then(() => {
            refreshRemoteState(true).then(() => {
                broadcastStateUpdate().then(() => sendResponse({ ok: true }));
            });
        });
        return true;
    }

    if (message?.type === "syncTaskState") {
        const payload = message.payload ?? null;
        setStorage({
            taskSyncState: payload
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
                : null,
        }).then(() => {
            broadcastStateUpdate().then(() => sendResponse({ ok: true }));
        });
        return true;
    }

    if (message?.type === "syncBlockedUrls") {
        const blockedUrls = Array.isArray(message.payload)
            ? message.payload.map((rule) => normalizeBlockedRule(rule)).filter(Boolean)
            : [];
        setStorage({ blockedUrls }).then(() => {
            broadcastStateUpdate().then(() => sendResponse({ ok: true }));
        });
        return true;
    }

    if (message?.type === "blockedUrlsUpdated") {
        broadcastStateUpdate().then(() => sendResponse({ ok: true }));
        return true;
    }

    if (message?.type === "tempBypass") {
        const rule = normalizeBlockedRule(message.payload?.rule);
        const durationMs = Number(message.payload?.durationMs || TEMP_BYPASS_DURATION_MS);

        if (!rule) {
            sendResponse({ ok: false });
            return false;
        }

        getTemporaryBypasses().then((temporaryBypasses) => {
            setStorage({
                temporaryBypasses: {
                    ...temporaryBypasses,
                    [rule]: Date.now() + durationMs,
                },
            }).then(() => sendResponse({ ok: true }));
        });
        return true;
    }

    if (message?.type === "openApp") {
        chrome.tabs.create({ url: APP_URL });
        sendResponse({ ok: true });
        return true;
    }

    if (message?.type === "goBackOrClose" && sender.tab?.id) {
        chrome.tabs.goBack(sender.tab.id, () => {
            if (chrome.runtime.lastError) {
                chrome.tabs.update(sender.tab.id, { url: APP_URL }, () => sendResponse({ ok: true }));
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
        if (details.frameId !== 0) return;
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
