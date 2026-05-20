/* Storage helpers wrapping chrome.storage.local with typed access patterns. */
import { TEMP_BYPASS_DURATION_MS } from "./time.js";

export const STORAGE_KEYS = {
    appConfig: "appConfig",
    blockedScreenData: "blockedScreenData",
    blockedUrls: "blockedUrls",
    extensionSession: "extensionSession",
    remoteSyncMeta: "remoteSyncMeta",
    taskSyncState: "taskSyncState",
    temporaryBypasses: "temporaryBypasses",
};

export function getStorage(keys) {
    return new Promise((resolve) => chrome.storage.local.get(keys, resolve));
}

export function setStorage(values) {
    return new Promise((resolve) => chrome.storage.local.set(values, resolve));
}

export async function getAppConfig() {
    const result = await getStorage([STORAGE_KEYS.appConfig]);
    return result.appConfig ?? null;
}

export async function getBlockedScreenData() {
    const result = await getStorage([STORAGE_KEYS.blockedScreenData]);
    return result.blockedScreenData ?? null;
}

export async function getExtensionSession() {
    const result = await getStorage([STORAGE_KEYS.extensionSession]);
    return result.extensionSession ?? null;
}

export async function getBlockedUrls() {
    const result = await getStorage([STORAGE_KEYS.blockedUrls]);
    return Array.isArray(result.blockedUrls) ? result.blockedUrls : [];
}

export async function getRemoteSyncMeta() {
    const result = await getStorage([STORAGE_KEYS.remoteSyncMeta]);
    return result.remoteSyncMeta ?? null;
}

export async function getTaskSyncState() {
    const result = await getStorage([STORAGE_KEYS.taskSyncState]);
    return result.taskSyncState ?? null;
}

export async function getTemporaryBypasses() {
    const result = await getStorage([STORAGE_KEYS.temporaryBypasses]);
    const now = Date.now();
    const storedBypasses = result.temporaryBypasses ?? {};
    const activeBypasses = Object.fromEntries(
        Object.entries(storedBypasses).filter(([, expiresAt]) => Number(expiresAt) > now),
    );

    if (Object.keys(activeBypasses).length !== Object.keys(storedBypasses).length) {
        await setStorage({ [STORAGE_KEYS.temporaryBypasses]: activeBypasses });
    }

    return activeBypasses;
}

export async function saveTemporaryBypass(rule, durationMs = TEMP_BYPASS_DURATION_MS) {
    const currentBypasses = await getTemporaryBypasses();
    await setStorage({
        [STORAGE_KEYS.temporaryBypasses]: {
            ...currentBypasses,
            [rule]: Date.now() + durationMs,
        },
    });
}
