// Popup script for FocusGate

document.getElementById("open-app").addEventListener("click", () => {
    // TODO: Open the web app in a new tab
    chrome.tabs.create({ url: "https://focusgate-web-app.com" }); // Placeholder
});
