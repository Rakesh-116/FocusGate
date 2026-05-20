/* Dynamic blocked-page renderer owned entirely by the extension runtime. */

const appRoot = document.getElementById("app");
const params = new URLSearchParams(window.location.search);
const blockedUrl = params.get("url") || "";
const rule = params.get("rule") || "";

const VISION_CARD_BUCKET = "vision-cards";
const STORAGE_KEY_EXTENSION_SESSION = "extensionSession";
const STORAGE_KEY_APP_CONFIG = "appConfig";

const state = {
    blockedScreenData: null,
    blockingState: null,
    carouselIndex: 0,
};

function escapeHtml(value) {
    return String(value || "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;");
}

function getVisionCardPathFromUrl(url) {
    try {
        if (typeof url !== "string" || url.trim() === "") {
            return null;
        }

        const trimmed = url.trim();
        if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://") && !trimmed.startsWith("/")) {
            return trimmed;
        }

        const publicPath = `/storage/v1/object/public/${VISION_CARD_BUCKET}/`;
        if (trimmed.startsWith(publicPath)) {
            return trimmed.slice(publicPath.length);
        }

        const parsed = new URL(trimmed);
        const marker = `/storage/v1/object/public/${VISION_CARD_BUCKET}/`;
        const index = parsed.pathname.indexOf(marker);
        if (index !== -1) {
            return parsed.pathname.slice(index + marker.length);
        }

        const signedMarker = `/storage/v1/object/sign/${VISION_CARD_BUCKET}/`;
        const signedIndex = parsed.pathname.indexOf(signedMarker);
        if (signedIndex !== -1) {
            return decodeURIComponent(parsed.pathname.slice(signedIndex + signedMarker.length));
        }
    } catch {
        // Ignore invalid URLs.
    }
    return null;
}

function buildSignedStorageUrl(baseUrl, storagePath) {
    const encodedPath = storagePath
        .split("/")
        .filter(Boolean)
        .map((segment) => encodeURIComponent(segment))
        .join("/");

    return `${baseUrl}/storage/v1/object/sign/${VISION_CARD_BUCKET}/${encodedPath}`;
}

function toAbsoluteSupabaseUrl(url, supabaseUrl) {
    if (!url || typeof url !== "string") {
        return null;
    }

    try {
        if (url.startsWith("/object/")) {
            return new URL(`/storage/v1${url}`, supabaseUrl).toString();
        }

        if (url.startsWith("object/")) {
            return new URL(`/storage/v1/${url}`, supabaseUrl).toString();
        }

        return new URL(url, supabaseUrl).toString();
    } catch {
        return null;
    }
}

async function refreshVisionCardUrlInPage(imageUrl) {
    const storage = await new Promise((resolve) => {
        chrome.storage.local.get([STORAGE_KEY_EXTENSION_SESSION, STORAGE_KEY_APP_CONFIG], resolve);
    });

    const session = storage[STORAGE_KEY_EXTENSION_SESSION] ?? null;
    const appConfig = storage[STORAGE_KEY_APP_CONFIG] ?? null;
    if (!session?.accessToken || !appConfig?.supabaseUrl || !appConfig?.supabaseAnonKey) {
        return imageUrl;
    }

    const storagePath = getVisionCardPathFromUrl(imageUrl);
    if (!storagePath) {
        return imageUrl;
    }

    try {
        const response = await fetch(buildSignedStorageUrl(appConfig.supabaseUrl, storagePath), {
            method: "POST",
            headers: {
                apikey: appConfig.supabaseAnonKey,
                Authorization: `Bearer ${session.accessToken}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ expiresIn: 3600 }),
        });

        if (!response.ok) {
            return imageUrl;
        }

        const data = await response.json();
        return (
            toAbsoluteSupabaseUrl(data?.signedUrl, appConfig.supabaseUrl) ??
            toAbsoluteSupabaseUrl(data?.signedURL, appConfig.supabaseUrl) ??
            toAbsoluteSupabaseUrl(data?.signed_url, appConfig.supabaseUrl) ??
            imageUrl
        );
    } catch (error) {
        console.warn("refreshVisionCardUrlInPage failed", error);
        return imageUrl;
    }
}

function renderLoading() {
    appRoot.innerHTML = `
        <div class="loading-shell">
            <div class="panel setup-card">
                <p class="eyebrow">FocusGate</p>
                <h1 class="section-title u-mt-10">Loading your block screen…</h1>
                <p class="section-copy">We are syncing your tasks, cards, and block settings.</p>
            </div>
        </div>
    `;
}

function renderSetupRequired() {
    appRoot.innerHTML = `
        <div class="setup-shell">
            <div class="panel setup-card">
                <p class="eyebrow">FocusGate</p>
                <h1 class="section-title u-mt-10">Finish setup in the web app first.</h1>
                <p class="section-copy">
                    The extension needs your FocusGate account session and public app config before it can load
                    tasks, quotes, and vision cards independently.
                </p>
                <div class="actions u-mt-20">
                    <button class="button button-primary" id="open-app-btn">Open FocusGate</button>
                    <button class="button" id="go-back-btn">Go Back</button>
                </div>
            </div>
        </div>
    `;

    document.getElementById("open-app-btn")?.addEventListener("click", openApp);
    document.getElementById("go-back-btn")?.addEventListener("click", goBack);
}

function getVisibleTasks(tasks) {
    if (!Array.isArray(tasks)) {
        return [];
    }

    const nextTasks = [];
    for (const task of tasks) {
        if (!task.completed) {
            nextTasks.push(task);
        }
    }
    return nextTasks;
}

function openApp() {
    chrome.runtime.sendMessage({ type: "openApp" });
}

function goBack() {
    chrome.runtime.sendMessage({ type: "goBackOrClose" });
}

function redirectToBlockedUrl() {
    if (!blockedUrl) {
        openApp();
        return;
    }
    window.location.replace(blockedUrl);
}

async function toggleTask(taskId, nextCompleted) {
    const response = await chrome.runtime.sendMessage({
        type: "toggleTask",
        payload: {
            taskId,
            completed: nextCompleted,
        },
    });

    if (response?.error) {
        const errorNode = document.getElementById("task-error");
        if (errorNode) {
            errorNode.textContent = response.error;
        }
        return;
    }

    state.blockedScreenData = response.blockedScreenData ?? state.blockedScreenData;
    state.blockingState = response.blockingState ?? state.blockingState;

    const visibleTasks = getVisibleTasks(state.blockedScreenData?.tasks ?? []);
    renderBlockedPage();

    if (visibleTasks.length === 0) {
        window.setTimeout(() => {
            redirectToBlockedUrl();
        }, 1200);
    }
}

function attachBlockedPageEvents() {
    document.getElementById("open-dashboard-btn")?.addEventListener("click", openApp);
    document.getElementById("go-back-btn")?.addEventListener("click", goBack);

    const taskButtons = document.querySelectorAll("[data-task-id]");
    for (const button of taskButtons) {
        button.addEventListener("click", () => {
            const taskId = button.getAttribute("data-task-id");
            if (!taskId) {
                return;
            }
            toggleTask(taskId, true);
        });
    }

    attachCarouselControls();
    attachVisionCardImageHandlers();
}

function updateCarouselPosition() {
    const track = document.querySelector(".carousel-track");
    if (!track) {
        return;
    }

    const slides = track.querySelectorAll(".carousel-slide");
    if (!slides.length) {
        return;
    }

    const currentIndex = Math.max(0, Math.min(state.carouselIndex, slides.length - 1));
    track.style.transform = `translateX(-${currentIndex * 100}%)`;

    const dots = document.querySelectorAll(".carousel-dot");
    dots.forEach((dot, index) => {
        dot.classList.toggle("active", index === currentIndex);
    });
}

function attachCarouselControls() {
    const track = document.querySelector(".carousel-track");
    if (!track) {
        return;
    }

    const slideCount = track.querySelectorAll(".carousel-slide").length;
    state.carouselIndex = Math.max(0, Math.min(state.carouselIndex, Math.max(slideCount - 1, 0)));
    updateCarouselPosition();

    const prevButton = document.querySelector(".carousel-prev");
    const nextButton = document.querySelector(".carousel-next");
    const dots = document.querySelectorAll(".carousel-dot");

    prevButton?.addEventListener("click", () => {
        state.carouselIndex = (state.carouselIndex - 1 + slideCount) % slideCount;
        updateCarouselPosition();
    });

    nextButton?.addEventListener("click", () => {
        state.carouselIndex = (state.carouselIndex + 1) % slideCount;
        updateCarouselPosition();
    });

    dots.forEach((dot) => {
        dot.addEventListener("click", () => {
            const index = Number(dot.dataset.slideIndex ?? 0);
            state.carouselIndex = Math.max(0, Math.min(index, slideCount - 1));
            updateCarouselPosition();
        });
    });
}

function attachVisionCardImageHandlers() {
    const images = document.querySelectorAll("img[data-vision-card-fallback]");
    for (const img of images) {
        if (img.dataset.fallbackAttached === "1") {
            continue;
        }
        img.dataset.fallbackAttached = "1";
        img.addEventListener("error", async () => {
            if (img.dataset.triedFallback === "1") {
                return;
            }
            img.dataset.triedFallback = "1";
            const currentSrc = img.getAttribute("src") || "";
            const refreshedUrl = await refreshVisionCardUrlInPage(currentSrc);
            if (refreshedUrl && refreshedUrl !== currentSrc) {
                img.src = refreshedUrl;
            }
        });
    }
}

function renderHeroSection(cards) {
    if (!Array.isArray(cards) || cards.length === 0) {
        return `
            <section class="panel hero-panel">
                <div class="hero-empty">Add vision cards from the FocusGate web control panel to make your blocked screen more motivating.</div>
            </section>
        `;
    }

    return `
        <section class="panel hero-panel">
            <div class="carousel" id="vision-carousel">
                <div class="carousel-viewport">
                    <div class="carousel-track">
                        ${cards
                            .map(
                                (card) => `
                                    <article class="carousel-slide">
                                        <div class="hero-image">
                                            <img data-vision-card-fallback src="${escapeHtml(card.image_url)}" alt="${escapeHtml(card.caption || "Vision card")}" />
                                            <div class="hero-caption">${escapeHtml(card.caption || "Stay connected to your why")}</div>
                                        </div>
                                    </article>
                                `,
                            )
                            .join("")}
                    </div>
                </div>
                ${cards.length > 1 ? `
                    <button class="carousel-nav carousel-prev" type="button" aria-label="Previous slide">←</button>
                    <button class="carousel-nav carousel-next" type="button" aria-label="Next slide">→</button>
                    <div class="carousel-dots">
                        ${cards
                            .map(
                                (_card, index) => `
                                    <button class="carousel-dot${index === 0 ? " active" : ""}" type="button" data-slide-index="${index}" aria-label="Show slide ${index + 1}"></button>
                                `,
                            )
                            .join("")}
                    </div>
                ` : ""}
            </div>
        </section>
    `;
}

function renderTasksSection(visibleTasks) {
    if (!visibleTasks.length) {
        return `
            <section class="panel tasks-panel">
                <p class="eyebrow">Finish these first</p>
                <h2 class="section-title u-mt-12">Your live task list</h2>
                <p class="section-copy">Complete one of today's remaining tasks to unlock this route.</p>
                <div id="task-error" class="error u-mt-14"></div>
                <div class="task-list">
                    <div class="empty">No pending tasks are left for today.</div>
                </div>
                <div class="success-banner">All done. Redirecting you back now.</div>
            </section>
        `;
    }

    return `
        <section class="panel tasks-panel">
            <p class="eyebrow">Finish these first</p>
            <h2 class="section-title u-mt-12">Your live task list</h2>
            <p class="section-copy">Complete one of today's remaining tasks to unlock this route.</p>
            <div id="task-error" class="error u-mt-14"></div>
            <div class="task-list">
                ${visibleTasks
                    .map(
                        (task) => `
                            <div class="task-row">
                                <button class="task-button" data-task-id="${escapeHtml(task.id)}">
                                    <span class="checkbox">&#10003;</span>
                                    <span>${escapeHtml(task.title)}</span>
                                </button>
                            </div>
                        `,
                    )
                    .join("")}
            </div>
        </section>
    `;
}

function renderQuoteSection(quote) {
    return `
        <section class="panel quote-panel">
            <div class="quote">"${escapeHtml(quote?.text || "Focus is the ability to say no to distractions.")}"</div>
            <div class="quote-author">${escapeHtml(quote?.author || "FocusGate")}</div>
        </section>
    `;
}

function renderFutureSection(futurePreview) {
    if (!futurePreview) {
        return "";
    }

    return `
        <section class="panel quote-panel">
            <p class="eyebrow">Today's future check</p>
            <h2 class="section-title u-mt-12">${futurePreview.scenarioType === "heaven" ? "Bright path in progress" : "Warning from your future self"}</h2>
            <p class="section-copy u-mt-14">${escapeHtml(futurePreview.narrative || "Your future check will appear here once the dashboard generates it.")}</p>
            <div class="actions u-mt-20">
                <div class="button">Score: ${escapeHtml(String(futurePreview.score ?? 0))}/100</div>
                ${futurePreview.goalTitle ? `<div class="button">${escapeHtml(futurePreview.goalTitle)}</div>` : ""}
            </div>
        </section>
    `;
}

function renderBlockedPage() {
    const blockedScreenData = state.blockedScreenData;
    if (!blockedScreenData) {
        renderSetupRequired();
        return;
    }

    const settings = blockedScreenData.settings ?? {};
    const visibleTasks = getVisibleTasks(blockedScreenData.tasks ?? []);

    appRoot.innerHTML = `
        <div class="shell">
            <section class="panel header">
                <div>
                    <p class="eyebrow">Blocked content</p>
                    <div class="blocked-url">You tried to open: ${escapeHtml(rule || blockedUrl || "blocked route")}</div>
                </div>
                <div class="actions">
                    <button class="button" id="go-back-btn">Go back</button>
                    <button class="button" id="open-dashboard-btn">Open dashboard</button>
                </div>
            </section>

            <div class="stack">
                <div class="main-grid">
                    ${settings.show_vision_cards_on_block_screen === false ? `
                        <section class="panel hero-panel">
                            <div class="hero-empty">Vision board is turned off in your settings.</div>
                        </section>
                    ` : renderHeroSection(blockedScreenData.visionCards ?? [])}

                    <div class="right-grid">
                        ${settings.show_quotes_on_block_screen === false ? "" : renderQuoteSection(blockedScreenData.quote)}
                        ${renderFutureSection(blockedScreenData.futurePreview)}
                        ${settings.show_tasks_on_block_screen === false ? "" : renderTasksSection(visibleTasks)}
                    </div>
                </div>
            </div>
        </div>
    `;

    attachBlockedPageEvents();
}

async function boot() {
    renderLoading();
    const response = await chrome.runtime.sendMessage({ type: "getBlockedScreenData" });
    if (!response?.setupReady) {
        renderSetupRequired();
        return;
    }

    state.blockedScreenData = response.blockedScreenData ?? null;
    state.blockingState = response.blockingState ?? null;
    renderBlockedPage();
}

boot();
