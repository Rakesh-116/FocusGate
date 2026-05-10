const DEFAULT_PATTERNS = ["youtube.com/shorts", "instagram.com/reels", "tiktok.com", "twitter.com"];

const openAppButton = document.getElementById("open-app");
const addPatternButton = document.getElementById("add-pattern");
const refreshButton = document.getElementById("refresh-list");
const patternInput = document.getElementById("pattern-input");
const patternList = document.getElementById("pattern-list");
const emptyState = document.getElementById("empty-state");

let currentPatterns = [];

function renderPatterns() {
    while (patternList.firstChild) {
        patternList.removeChild(patternList.firstChild);
    }

    if (currentPatterns.length === 0) {
        emptyState.style.display = "block";
        return;
    }

    emptyState.style.display = "none";

    currentPatterns.forEach((pattern) => {
        const item = document.createElement("li");
        item.className = "list-item";
        item.innerHTML = `
            <span>${pattern}</span>
            <button data-pattern="${pattern}">Remove</button>
        `;
        const removeButton = item.querySelector("button");
        removeButton?.addEventListener("click", () => removePattern(pattern));
        patternList.appendChild(item);
    });
}

function loadPatterns() {
    chrome.storage.local.get({ blockedUrls: DEFAULT_PATTERNS }, (result) => {
        currentPatterns = Array.isArray(result.blockedUrls) ? result.blockedUrls : DEFAULT_PATTERNS;
        renderPatterns();
    });
}

function notifyTabsOfUpdate() {
    chrome.tabs.query({}, (tabs) => {
        tabs.forEach((tab) => {
            if (tab.id != null) {
                chrome.tabs.sendMessage(tab.id, { type: "blockedUrlsUpdated" }, () => {
                    // Ignore tabs where the content script is not loaded
                });
            }
        });
    });
}

function savePatterns(patterns) {
    chrome.storage.local.set({ blockedUrls: patterns }, () => {
        currentPatterns = patterns;
        renderPatterns();
        notifyTabsOfUpdate();
    });
}

function addPattern() {
    const value = (patternInput.value || "").trim();
    if (!value) return;
    if (currentPatterns.includes(value)) {
        patternInput.value = "";
        return;
    }
    savePatterns([...currentPatterns, value]);
    patternInput.value = "";
}

function removePattern(pattern) {
    savePatterns(currentPatterns.filter((item) => item !== pattern));
}

openAppButton?.addEventListener("click", () => {
    chrome.tabs.create({ url: "http://localhost:5173/preview-block" });
});

addPatternButton?.addEventListener("click", addPattern);
refreshButton?.addEventListener("click", loadPatterns);
patternInput?.addEventListener("keypress", (event) => {
    if (event.key === "Enter") addPattern();
});

loadPatterns();
