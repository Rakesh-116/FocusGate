(function () {
    "use strict";

    let extensionContextAvailable = true;

    function markContextInvalidated(error) {
        if (String(error?.message || error).includes("Extension context invalidated")) {
            extensionContextAvailable = false;
            return true;
        }

        return false;
    }

    function safeSendMessage(message) {
        if (!extensionContextAvailable) return;
        if (typeof chrome === "undefined" || !chrome.runtime?.id) {
            extensionContextAvailable = false;
            return;
        }

        try {
            chrome.runtime.sendMessage(message, () => {
                if (chrome.runtime.lastError) {
                    markContextInvalidated(chrome.runtime.lastError);
                    void chrome.runtime.lastError;
                }
            });
        } catch (error) {
            markContextInvalidated(error);
        }
    }

    function requestCheck(url) {
        safeSendMessage({ type: "checkUrl", url });
    }

    function notifyCurrentUrl() {
        if (!extensionContextAvailable) return;
        requestCheck(window.location.href);
    }

    function wrapHistoryMethod(methodName) {
        const original = history[methodName];
        history[methodName] = function (...args) {
            const result = original.apply(this, args);
            notifyCurrentUrl();
            return result;
        };
    }

    function initNavigationObservers() {
        wrapHistoryMethod("pushState");
        wrapHistoryMethod("replaceState");
        window.addEventListener("popstate", notifyCurrentUrl);
        window.addEventListener("hashchange", notifyCurrentUrl);
    }

    function initAppSyncBridge() {
        window.addEventListener("message", (event) => {
            if (!extensionContextAvailable) return;
            if (event.source !== window) return;

            const data = event.data;
            if (!data) return;

            if (data.type === "FOCUSGATE_SYNC_TASK_STATE") {
                safeSendMessage({
                    type: "syncTaskState",
                    payload: data.payload ?? null,
                });
                return;
            }

            if (data.type === "FOCUSGATE_SYNC_SESSION") {
                safeSendMessage({
                    type: "syncSession",
                    payload: data.payload ?? null,
                });
                return;
            }

            if (data.type === "FOCUSGATE_SYNC_BLOCKED_URLS") {
                safeSendMessage({
                    type: "syncBlockedUrls",
                    payload: data.payload ?? [],
                });
                return;
            }

            if (data.type === "FOCUSGATE_TEMP_BYPASS") {
                safeSendMessage({
                    type: "tempBypass",
                    payload: data.payload ?? null,
                });
            }
        });
    }

    try {
        if (typeof chrome === "undefined" || !chrome.runtime?.id) {
            extensionContextAvailable = false;
            return;
        }

        chrome.runtime.onMessage.addListener((message) => {
            if (!extensionContextAvailable) return;

            if (message?.type === "focusgateRequestSync") {
                window.postMessage({ type: "FOCUSGATE_EXTENSION_SYNC_REQUEST" }, window.location.origin);
                return;
            }

            if (message?.type === "focusgateStateUpdated") {
                notifyCurrentUrl();
            }
        });
    } catch (error) {
        markContextInvalidated(error);
    }

    initNavigationObservers();
    initAppSyncBridge();
    notifyCurrentUrl();
})();
