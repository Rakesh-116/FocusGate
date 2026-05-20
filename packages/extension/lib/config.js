/* Extension config helpers for app URLs and Supabase connection details. */
const DEFAULT_APP_DASHBOARD_PATH = "/dashboard";

export function normalizeAppOrigin(appOrigin) {
    if (typeof appOrigin !== "string" || appOrigin.trim() === "") {
        return null;
    }

    return appOrigin.trim().replace(/\/$/, "");
}

export function getDashboardUrl(appOrigin) {
    const normalizedOrigin = normalizeAppOrigin(appOrigin);
    return normalizedOrigin ? `${normalizedOrigin}${DEFAULT_APP_DASHBOARD_PATH}` : null;
}

export function getBlockedPageUrl(rule, blockedUrl) {
    const url = new URL(chrome.runtime.getURL("blocked.html"));
    url.searchParams.set("rule", rule);
    url.searchParams.set("url", blockedUrl);
    return url.toString();
}
