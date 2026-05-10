// Background service worker for FocusGate Chrome Extension

// Fetch user's block list and tasks from Supabase on startup
chrome.runtime.onStartup.addListener(() => {
    // TODO: Fetch and cache block list, tasks, vision cards
    console.log("FocusGate extension started");
});

// Listen for tab updates to check for blocked URLs
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === "loading" && tab.url) {
        // TODO: Check if URL matches blocked prefixes, inject block screen if so
    }
});
