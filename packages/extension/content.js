// Content script for FocusGate Chrome Extension

const DEFAULT_BLOCKED_URLS = ["youtube.com/shorts", "instagram.com/reels", "tiktok.com", "twitter.com"];
let blockedPatterns = DEFAULT_BLOCKED_URLS;

function normalizePattern(pattern) {
    return pattern.trim().toLowerCase();
}

function isUrlBlocked(href, patterns) {
    const lower = href.toLowerCase();
    return patterns.some((pattern) => pattern && lower.includes(normalizePattern(pattern)));
}

function broadcastStateChange() {
    const event = new Event("focusgate-url-change");
    window.dispatchEvent(event);
}

function attachHistoryListener() {
    const pushState = history.pushState;
    const replaceState = history.replaceState;

    history.pushState = function (...args) {
        const result = pushState.apply(this, args);
        broadcastStateChange();
        return result;
    };

    history.replaceState = function (...args) {
        const result = replaceState.apply(this, args);
        broadcastStateChange();
        return result;
    };

    window.addEventListener("popstate", () => broadcastStateChange());
}

function findDocumentRoot() {
    return document.body || document.documentElement || document;
}

function injectBlockScreen(blockedUrl) {
    if (document.getElementById("focusgate-block-screen")) return;

    const shadowHost = document.createElement("div");
    shadowHost.id = "focusgate-block-screen";
    shadowHost.style.cssText =
        "position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 999999; background: rgba(6, 10, 19, 0.98); font-family: Inter, sans-serif;";
    const root = findDocumentRoot();
    if (root && typeof root.appendChild === "function") {
        root.appendChild(shadowHost);
    } else {
        document.documentElement.appendChild(shadowHost);
    }

    const shadow = shadowHost.attachShadow({ mode: "open" });
    shadow.innerHTML = `
      <style>
        :host { all: initial; }
        .block-screen { box-sizing: border-box; min-height: 100vh; display: flex; flex-direction: column; justify-content: space-between; padding: 2rem; color: white; background: linear-gradient(135deg, #0f172a 0%, #111827 100%); }
        .title { font-size: clamp(2rem, 4vw, 3.5rem); font-weight: 800; margin-bottom: 1rem; letter-spacing: -0.04em; }
        .subtitle { color: #94a3b8; margin-bottom: 2rem; }
        .quote { border: 1px solid rgba(148, 163, 184, 0.18); border-radius: 2rem; padding: 1.75rem; background: rgba(15, 23, 42, 0.85); box-shadow: 0 32px 120px -80px rgba(15,23,42,.8); }
        .quote p { margin: 0; font-size: 1.1rem; line-height: 1.7; }
        .quote span { display: block; margin-top: 1rem; color: #c7d2fe; font-size: 0.95rem; }
        .section { margin-top: 2rem; }
        .section h2 { margin: 0 0 0.75rem 0; font-size: 1.1rem; letter-spacing: 0.08em; text-transform: uppercase; color: #94a3b8; }
        .card { border-radius: 1.75rem; overflow: hidden; background: rgba(15, 23, 42, 0.9); border: 1px solid rgba(148,163,184,0.08); padding: 1.5rem; }
        .card p { margin: 0; color: #e2e8f0; }
        .button-row { display: flex; flex-wrap: wrap; gap: 0.75rem; margin-top: 1.75rem; }
        .button { display: inline-flex; align-items: center; justify-content: center; min-height: 3rem; gap: 0.5rem; border: none; border-radius: 999px; padding: 0 1.5rem; font-weight: 700; cursor: pointer; }
        .button.primary { background: linear-gradient(90deg, #8b5cf6 0%, #ec4899 100%); color: white; }
        .button.secondary { background: rgba(255,255,255,0.08); color: #f8fafc; }
        .button.ghost { background: transparent; color: #94a3b8; border: 1px solid rgba(148,163,184,0.2); }
      </style>
      <div class="block-screen">
        <div>
          <div class="title">FocusGate has blocked this page.</div>
          <div class="subtitle">Your focus screen is active to keep you from falling into a distraction loop.</div>
          <div class="quote">
            <p>“Your ability to stay on task is the most valuable filter for your attention.”</p>
            <span>— FocusGate</span>
          </div>
        </div>
        <div class="section card">
          <h2>Blocked URL</h2>
          <p>${blockedUrl}</p>
        </div>
        <div class="section card">
          <h2>What to do instead</h2>
          <p>Complete one small task, review your vision board, or return when you're ready to focus.</p>
          <div class="button-row">
            <button class="button primary" id="bypass-button">Emergency Unlock</button>
            <button class="button secondary" id="open-app-button">Open FocusGate</button>
          </div>
          <p style="margin-top:1rem; font-size:0.9rem; color:#cbd5e1;">Press the unlock button only when you truly need it.</p>
        </div>
      </div>
    `;

    const bypassButton = shadow.getElementById("bypass-button");
    const openAppButton = shadow.getElementById("open-app-button");

    bypassButton?.addEventListener("click", () => {
        chrome.runtime.sendMessage({ type: "recordBypass", url: blockedUrl, reason: "emergency bypass" });
        shadowHost.remove();
    });

    openAppButton?.addEventListener("click", () => {
        chrome.runtime.sendMessage({ type: "openApp" });
        shadowHost.remove();
    });
}

function checkCurrentLocation() {
    if (isUrlBlocked(window.location.href, blockedPatterns)) {
        injectBlockScreen(window.location.href);
    }
}

function requestBlockedPatterns(callback) {
    chrome.runtime.sendMessage({ type: "getBlockedUrls" }, (response) => {
        blockedPatterns = Array.isArray(response?.blockedUrls) ? response.blockedUrls : DEFAULT_BLOCKED_URLS;
        if (typeof callback === "function") callback();
    });
}

function notifyPatternUpdate() {
    requestBlockedPatterns(checkCurrentLocation);
}

function initNavigationObserver() {
    const originalPush = history.pushState;
    const originalReplace = history.replaceState;

    history.pushState = function (...args) {
        const result = originalPush.apply(this, args);
        checkCurrentLocation();
        return result;
    };

    history.replaceState = function (...args) {
        const result = originalReplace.apply(this, args);
        checkCurrentLocation();
        return result;
    };

    window.addEventListener("popstate", checkCurrentLocation);
}

chrome.runtime.onMessage.addListener((message) => {
    if (message?.type === "blockedUrlsUpdated") {
        notifyPatternUpdate();
    }
});

initNavigationObserver();
requestBlockedPatterns(checkCurrentLocation);
