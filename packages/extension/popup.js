const openAppButton = document.getElementById("open-app");
const refreshButton = document.getElementById("refresh-list");
const patternList = document.getElementById("pattern-list");
const emptyState = document.getElementById("empty-state");
const statusBadge = document.getElementById("status-badge");
const statusDetail = document.getElementById("status-detail");
const taskStats = document.getElementById("task-stats");
const syncMeta = document.getElementById("sync-meta");

let currentPatterns = [];

function formatTime(isoString) {
    if (!isoString) return "Not synced yet";
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) return "Not synced yet";
    return `Last synced ${date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
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
        statusBadge.textContent = "Waiting for Task Sync";
        statusBadge.className = "badge badge-waiting";
        statusDetail.textContent = "Open the FocusGate dashboard so tasks and blocked links sync into the extension.";
    }

    taskStats.textContent = `${completed}/${total} tasks completed`;
    syncMeta.textContent = formatTime(blockingState?.lastSyncedAt);
}

function loadExtensionState() {
    chrome.runtime.sendMessage({ type: "getExtensionState" }, (response) => {
        if (chrome.runtime.lastError) {
            currentPatterns = [];
            renderPatterns();
            renderBlockingState(null);
            return;
        }

        currentPatterns = Array.isArray(response?.blockedUrls) ? response.blockedUrls : [];
        renderPatterns();
        renderBlockingState(response?.blockingState ?? null);
    });
}

openAppButton?.addEventListener("click", () => {
    chrome.runtime.sendMessage({ type: "openApp" });
});

refreshButton?.addEventListener("click", loadExtensionState);

loadExtensionState();
