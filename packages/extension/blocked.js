const params = new URLSearchParams(window.location.search);
const rule = params.get("rule") || "Unknown rule";
const url = params.get("url") || "Unknown URL";

document.getElementById("blockedRule").textContent = rule;
document.getElementById("blockedUrl").textContent = url;

document.getElementById("goBackBtn").addEventListener("click", () => {
    chrome.runtime.sendMessage({ type: "goBackOrClose" });
});

document.getElementById("openAppBtn").addEventListener("click", () => {
    chrome.runtime.sendMessage({ type: "openApp" });
});
