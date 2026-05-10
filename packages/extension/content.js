// Content script for FocusGate Chrome Extension

// Check if current URL is blocked
// TODO: Get blocked URLs from background or storage

const blockedUrls = ["youtube.com/shorts", "instagram.com/reels"]; // Placeholder

const isBlocked = blockedUrls.some((prefix) => window.location.href.includes(prefix));

if (isBlocked) {
    // Inject the Dynamic Block Screen
    injectBlockScreen();
}

function injectBlockScreen() {
    // Create shadow DOM to avoid CSS conflicts
    const shadowHost = document.createElement("div");
    shadowHost.id = "focusgate-block-screen";
    shadowHost.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 999999;
    background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
    font-family: Inter, sans-serif;
  `;
    document.body.appendChild(shadowHost);

    const shadow = shadowHost.attachShadow({ mode: "open" });

    // TODO: Render the Dynamic Block Screen component here
    // For now, simple placeholder
    shadow.innerHTML = `
    <style>
      .block-screen {
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        height: 100%;
        padding: 2rem;
        color: white;
        text-align: center;
      }
      .quote { font-size: 1.5rem; margin-bottom: 2rem; }
      .tasks { flex: 1; margin-bottom: 2rem; }
      .vision-cards { margin-bottom: 2rem; }
      .unlock-btn {
        background: #ef4444;
        color: white;
        border: none;
        padding: 1rem 2rem;
        border-radius: 0.5rem;
        cursor: pointer;
      }
    </style>
    <div class="block-screen">
      <div class="quote">"Stay focused on what matters." - Anonymous</div>
      <div class="tasks">
        <h2>Your tasks for today:</h2>
        <!-- TODO: List tasks -->
        <p>Task 1: Complete project</p>
      </div>
      <div class="vision-cards">
        <h2>Vision Board</h2>
        <!-- TODO: Carousel -->
        <p>Image placeholder</p>
      </div>
      <button class="unlock-btn">Emergency Unlock</button>
    </div>
  `;
}
