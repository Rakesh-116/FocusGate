/* Shared time helpers for extension sync and blocked screen behavior. */
export const TEMP_BYPASS_DURATION_MS = 10 * 60 * 1000;
export const SESSION_REFRESH_BUFFER_SECONDS = 60;
export const REMOTE_SYNC_STALE_MS = 15 * 1000;

export function getTodayKey() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

export function getDayOfYear(date = new Date()) {
    const start = new Date(date.getFullYear(), 0, 0);
    const differenceMs = date.getTime() - start.getTime();
    return Math.floor(differenceMs / 86400000);
}
