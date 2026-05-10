// Background service worker for FocusGate Chrome Extension

const DEFAULT_BLOCKED_URLS = ["youtube.com/shorts", "instagram.com/reels", "tiktok.com", "twitter.com"];

chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.get(["blockedUrls"], (result) => {
        if (!result.blockedUrls) {
            chrome.storage.local.set({ blockedUrls: DEFAULT_BLOCKED_URLS });
        }
    });
});

chrome.runtime.onStartup.addListener(() => {
    console.log("FocusGate extension started");
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message?.type === "getBlockedUrls") {
        chrome.storage.local.get({ blockedUrls: DEFAULT_BLOCKED_URLS }, (result) => {
            sendResponse({ blockedUrls: result.blockedUrls });
        });
        return true;
    }

    if (message?.type === "recordBypass") {
        chrome.storage.local.get({ bypassHistory: [] }, (result) => {
            const history = result.bypassHistory || [];
            const record = { url: message.url, reason: message.reason, timestamp: Date.now() };
            chrome.storage.local.set({ bypassHistory: [...history, record] });
        });
    }

    if (message?.type === "openApp") {
        chrome.tabs.create({ url: "http://localhost:5173/preview-block" });
    }
});
