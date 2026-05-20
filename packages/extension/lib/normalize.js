/* Normalization helpers for blocked URLs and user-provided rule prefixes. */
export function normalizeMatchValue(value) {
    return (value || "")
        .toLowerCase()
        .trim()
        .replace(/^https?:\/\//, "")
        .replace(/^www\./, "")
        .replace(/\/$/, "");
}

export function matchesBlockedRule(url, rule) {
    const normalizedUrl = normalizeMatchValue(url);
    const normalizedRule = normalizeMatchValue(rule);
    return normalizedRule !== "" && normalizedUrl.startsWith(normalizedRule);
}

export function isExtensionPage(url) {
    return typeof url === "string" && url.startsWith(`chrome-extension://${chrome.runtime.id}/`);
}
