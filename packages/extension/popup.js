const openAppButton = document.getElementById("open-app");
const refreshButton = document.getElementById("refresh-list");
const patternList = document.getElementById("pattern-list");
const emptyState = document.getElementById("empty-state");
const statusBadge = document.getElementById("status-badge");
const statusDetail = document.getElementById("status-detail");
const taskStats = document.getElementById("task-stats");
const syncMeta = document.getElementById("sync-meta");
const syncError = document.getElementById("sync-error");

let currentPatterns = [];

function formatTimeLabel(isoString, prefix = "Last synced") {
    if (!isoString) return "Not synced yet";
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) return "Not synced yet";
    return `${prefix} ${date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
}

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
        item.innerHTML = `<span>${pattern}</span>`;
        patternList.appendChild(item);
    });
}

function renderBlockingState(blockingState) {
    const pending = Number(blockingState?.pendingTaskCount || 0);
    const completed = Number(blockingState?.completedTaskCount || 0);
    const total = Number(blockingState?.totalTaskCount || 0);
    const hasTodaySync = Boolean(blockingState?.lastSyncedAt);

    if (blockingState?.active) {
        statusBadge.textContent = "Blocking Active";
        statusBadge.className = "badge badge-active";
        statusDetail.textContent = `${pending} pending task${pending === 1 ? "" : "s"} remaining before distracting URLs unlock.`;
    } else if (hasTodaySync && total > 0) {
        statusBadge.textContent = "Unlocked";
        statusBadge.className = "badge badge-complete";
        statusDetail.textContent = "All of today's tasks are complete. Blocked URLs are currently unlocked.";
    } else {
        statusBadge.textContent = "Syncing";
        statusBadge.className = "badge badge-waiting";
        statusDetail.textContent = "The extension is waiting for account bootstrap or a fresh sync.";
    }

    taskStats.textContent = `${completed}/${total} tasks completed`;
    syncMeta.textContent = formatTimeLabel(blockingState?.lastSyncedAt);
}

function renderSyncMeta(remoteSyncMeta) {
    if (remoteSyncMeta?.lastSuccessfulAt) {
        syncMeta.textContent = formatTimeLabel(remoteSyncMeta.lastSuccessfulAt);
    } else if (remoteSyncMeta?.lastAttemptedAt) {
        syncMeta.textContent = formatTimeLabel(remoteSyncMeta.lastAttemptedAt, "Last attempted");
    } else {
        syncMeta.textContent = "Not synced yet";
    }

    if (remoteSyncMeta?.lastError) {
        syncError.textContent = remoteSyncMeta.lastError;
        syncError.style.display = "block";
    } else {
        syncError.textContent = "";
        syncError.style.display = "none";
    }
}

function applyExtensionState(response) {
    currentPatterns = Array.isArray(response?.blockedUrls) ? response.blockedUrls : [];
    renderPatterns();
    renderBlockingState(response?.blockingState ?? null);
    renderSyncMeta(response?.remoteSyncMeta ?? null);

    if (response?.setupReady === false) {
        statusBadge.textContent = "Connect Account";
        statusBadge.className = "badge badge-waiting";
        statusDetail.textContent = "Open the FocusGate web app once to connect your account. After that, the extension refreshes on its own.";
    }
}

function loadExtensionState() {
    chrome.runtime.sendMessage({ type: "getExtensionState" }, (response) => {
        if (chrome.runtime.lastError) {
            currentPatterns = [];
            renderPatterns();
            renderBlockingState(null);
            renderSyncMeta(null);
            return;
        }

        applyExtensionState(response);
    });
}

openAppButton?.addEventListener("click", () => {
    chrome.runtime.sendMessage({ type: "openApp" });
});

refreshButton?.addEventListener("click", () => {
    chrome.runtime.sendMessage({ type: "syncNow" }, (response) => {
        if (chrome.runtime.lastError || !response) {
            loadExtensionState();
            return;
        }
        applyExtensionState(response);
    });
});

loadExtensionState();
