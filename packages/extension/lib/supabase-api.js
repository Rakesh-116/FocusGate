/* Supabase access layer for the extension background worker. */
import { getDashboardUrl, normalizeAppOrigin } from "./config.js";
import { getDayOfYear, getTodayKey, SESSION_REFRESH_BUFFER_SECONDS } from "./time.js";

const DEFAULT_BLOCK_GROUP_NAME = "FocusGate Web Blocklist";
const VISION_CARD_BUCKET = "vision-cards";
const DEFAULT_FETCH_TIMEOUT_MS = 20000;
const SESSION_REFRESH_TIMEOUT_MS = 15000;

function isAbortLikeError(error) {
    return (
        error?.name === "AbortError" ||
        error?.name === "TimeoutError" ||
        error instanceof DOMException ||
        String(error?.message || error).toLowerCase().includes("aborted")
    );
}

async function fetchWithTimeout(url, options = {}, timeoutMs = DEFAULT_FETCH_TIMEOUT_MS) {
    const controller = new AbortController();
    const timeoutId = globalThis.setTimeout(() => controller.abort(), timeoutMs);

    try {
        return await fetch(url, {
            ...options,
            signal: controller.signal,
        });
    } catch (error) {
        if (isAbortLikeError(error)) {
            throw new Error(`Request timed out after ${timeoutMs}ms`);
        }
        throw error;
    } finally {
        globalThis.clearTimeout(timeoutId);
    }
}

function buildHeaders(accessToken, anonKey) {
    return {
        apikey: anonKey,
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
    };
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
        // Ignore invalid URLs during fallback resolution.
    }
    return null;
}

function buildStorageObjectPath(bucket, path) {
    return path
        .split("/")
        .filter(Boolean)
        .map((segment) => encodeURIComponent(segment))
        .join("/")
        .replace(/^/, `${bucket}/`);
}

function getAbsoluteSignedUrl(signedUrl, supabaseUrl) {
    if (!signedUrl || typeof signedUrl !== "string") {
        return null;
    }

    try {
        if (signedUrl.startsWith("/object/")) {
            return new URL(`/storage/v1${signedUrl}`, supabaseUrl).toString();
        }

        if (signedUrl.startsWith("object/")) {
            return new URL(`/storage/v1/${signedUrl}`, supabaseUrl).toString();
        }

        return new URL(signedUrl, supabaseUrl).toString();
    } catch {
        return null;
    }
}

async function createSignedStorageUrl(bucket, path, session, appConfig, expiresIn = 3600) {
    const { supabaseUrl, supabaseAnonKey } = assertSupabaseConfig(appConfig);
    const objectPath = buildStorageObjectPath(bucket, path);
    const url = new URL(`${supabaseUrl}/storage/v1/object/sign/${objectPath}`);

    const response = await fetchWithTimeout(url.toString(), {
        method: "POST",
        headers: buildHeaders(session.accessToken, supabaseAnonKey),
        body: JSON.stringify({ expiresIn }),
    });

    if (!response.ok) {
        throw new Error(`createSignedStorageUrl failed with status ${response.status}`);
    }

    const data = await response.json();
    return (
        getAbsoluteSignedUrl(data?.signedUrl, supabaseUrl) ??
        getAbsoluteSignedUrl(data?.signedURL, supabaseUrl) ??
        getAbsoluteSignedUrl(data?.signed_url, supabaseUrl)
    );
}

export async function refreshVisionCardImageUrl(imageUrl, session, appConfig) {
    const storagePath = getVisionCardPathFromUrl(imageUrl);
    if (!storagePath) {
        return imageUrl;
    }

    try {
        const signedUrl = await createSignedStorageUrl(VISION_CARD_BUCKET, storagePath, session, appConfig);
        return signedUrl || imageUrl;
    } catch (error) {
        console.warn("refreshVisionCardImageUrl failed", error);
        return imageUrl;
    }
}

function assertSupabaseConfig(appConfig) {
    const supabaseUrl = appConfig?.supabaseUrl;
    const supabaseAnonKey = appConfig?.supabaseAnonKey;

    if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error("Missing Supabase config in extension appConfig.");
    }

    return {
        appOrigin: normalizeAppOrigin(appConfig?.appOrigin),
        appDashboardUrl: getDashboardUrl(appConfig?.appOrigin),
        supabaseUrl,
        supabaseAnonKey,
    };
}

export async function refreshExtensionSession(session, appConfig) {
    if (!session?.refreshToken) {
        return session ?? null;
    }

    const { supabaseUrl, supabaseAnonKey } = assertSupabaseConfig(appConfig);
    const response = await fetchWithTimeout(
        `${supabaseUrl}/auth/v1/token?grant_type=refresh_token`,
        {
        method: "POST",
        headers: {
            apikey: supabaseAnonKey,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ refresh_token: session.refreshToken }),
        },
        SESSION_REFRESH_TIMEOUT_MS,
    );

    if (!response.ok) {
        throw new Error(`refreshExtensionSession failed with status ${response.status}`);
    }

    const data = await response.json();
    return {
        userId: data.user?.id ?? session.userId ?? null,
        accessToken: data.access_token,
        refreshToken: data.refresh_token ?? session.refreshToken,
        expiresAt: data.expires_at ?? null,
    };
}

export async function ensureFreshExtensionSession(session, appConfig) {
    if (!session?.accessToken) {
        return null;
    }

    const expiresAtMs = Number(session.expiresAt || 0) * 1000;
    if (expiresAtMs && expiresAtMs - Date.now() > SESSION_REFRESH_BUFFER_SECONDS * 1000) {
        return session;
    }

    try {
        return await refreshExtensionSession(session, appConfig);
    } catch {
        // If refresh is temporarily unavailable, keep using the current token and
        // let the next authenticated request decide whether it is still valid.
        return session;
    }
}

export async function fetchTasksForToday(session, appConfig) {
    const { supabaseUrl, supabaseAnonKey } = assertSupabaseConfig(appConfig);
    const url = new URL(`${supabaseUrl}/rest/v1/tasks`);
    url.searchParams.set("select", "id,user_id,title,completed,date,created_at");
    url.searchParams.set("user_id", `eq.${session.userId}`);
    url.searchParams.set("date", `eq.${getTodayKey()}`);
    url.searchParams.set("order", "created_at.asc");

    const response = await fetchWithTimeout(url.toString(), {
        headers: buildHeaders(session.accessToken, supabaseAnonKey),
    });

    if (!response.ok) {
        throw new Error(`fetchTasksForToday failed with status ${response.status}`);
    }

    return await response.json();
}

export async function fetchBlockedRules(session, appConfig) {
    const { supabaseUrl, supabaseAnonKey } = assertSupabaseConfig(appConfig);
    const groupUrl = new URL(`${supabaseUrl}/rest/v1/block_groups`);
    groupUrl.searchParams.set("select", "id");
    groupUrl.searchParams.set("user_id", `eq.${session.userId}`);
    groupUrl.searchParams.set("name", `eq.${DEFAULT_BLOCK_GROUP_NAME}`);
    groupUrl.searchParams.set("limit", "1");

    const groupResponse = await fetchWithTimeout(groupUrl.toString(), {
        headers: buildHeaders(session.accessToken, supabaseAnonKey),
    });

    if (!groupResponse.ok) {
        throw new Error(`fetchBlockedRules group lookup failed with status ${groupResponse.status}`);
    }

    const groups = await groupResponse.json();
    const groupId = groups?.[0]?.id;
    if (!groupId) {
        return [];
    }

    const itemsUrl = new URL(`${supabaseUrl}/rest/v1/block_group_items`);
    itemsUrl.searchParams.set("select", "app_or_url");
    itemsUrl.searchParams.set("group_id", `eq.${groupId}`);
    itemsUrl.searchParams.set("platform", "in.(web,all)");
    itemsUrl.searchParams.set("order", "app_or_url.asc");

    const itemsResponse = await fetchWithTimeout(itemsUrl.toString(), {
        headers: buildHeaders(session.accessToken, supabaseAnonKey),
    });

    if (!itemsResponse.ok) {
        throw new Error(`fetchBlockedRules items lookup failed with status ${itemsResponse.status}`);
    }

    const items = await itemsResponse.json();
    if (!Array.isArray(items)) {
        return [];
    }

    const rules = [];
    for (const item of items) {
        if (typeof item?.app_or_url === "string" && item.app_or_url.trim() !== "") {
            rules.push(
                item.app_or_url
                    .trim()
                    .toLowerCase()
                    .replace(/^https?:\/\//, "")
                    .replace(/^www\./, "")
                    .replace(/\/$/, ""),
            );
        }
    }

    return rules;
}

export async function fetchUserSettings(session, appConfig) {
    const { supabaseUrl, supabaseAnonKey } = assertSupabaseConfig(appConfig);
    const settingsUrl = new URL(`${supabaseUrl}/rest/v1/user_settings`);
    settingsUrl.searchParams.set(
        "select",
        "show_tasks_on_block_screen,show_vision_cards_on_block_screen,show_quotes_on_block_screen,bypass_cooldown_seconds,bypass_requires_reason",
    );
    settingsUrl.searchParams.set("user_id", `eq.${session.userId}`);
    settingsUrl.searchParams.set("limit", "1");

    const response = await fetchWithTimeout(settingsUrl.toString(), {
        headers: buildHeaders(session.accessToken, supabaseAnonKey),
    });

    if (!response.ok) {
        throw new Error(`fetchUserSettings failed with status ${response.status}`);
    }

    const rows = await response.json();
    return rows?.[0] ?? null;
}

export async function fetchVisionCards(session, appConfig) {
    const { supabaseUrl, supabaseAnonKey } = assertSupabaseConfig(appConfig);
    const cardsUrl = new URL(`${supabaseUrl}/rest/v1/vision_cards`);
    cardsUrl.searchParams.set("select", "id,image_url,caption,sort_order");
    cardsUrl.searchParams.set("user_id", `eq.${session.userId}`);
    cardsUrl.searchParams.set("order", "sort_order.asc");

    const response = await fetchWithTimeout(cardsUrl.toString(), {
        headers: buildHeaders(session.accessToken, supabaseAnonKey),
    });

    if (!response.ok) {
        throw new Error(`fetchVisionCards failed with status ${response.status}`);
    }

    const cards = await response.json();
    if (!Array.isArray(cards)) {
        return [];
    }

    return await Promise.all(
        cards.map(async (card) => ({
            ...card,
            image_url: await refreshVisionCardImageUrl(card.image_url, session, appConfig),
        })),
    );
}

export async function fetchQuoteOfDay(session, appConfig) {
    const { supabaseUrl, supabaseAnonKey } = assertSupabaseConfig(appConfig);
    const countUrl = new URL(`${supabaseUrl}/rest/v1/quotes`);
    countUrl.searchParams.set("select", "id");

    const countResponse = await fetchWithTimeout(countUrl.toString(), {
        headers: {
            ...buildHeaders(session.accessToken, supabaseAnonKey),
            Prefer: "count=exact",
        },
    });

    if (!countResponse.ok) {
        throw new Error(`fetchQuoteOfDay count lookup failed with status ${countResponse.status}`);
    }

    const total = Number(countResponse.headers.get("content-range")?.split("/")?.[1] || 0);
    if (total <= 0) {
        return null;
    }

    const offset = getDayOfYear(new Date()) % total;
    const quoteUrl = new URL(`${supabaseUrl}/rest/v1/quotes`);
    quoteUrl.searchParams.set("select", "id,text,author");
    quoteUrl.searchParams.set("limit", "1");
    quoteUrl.searchParams.set("offset", String(offset));

    const quoteResponse = await fetchWithTimeout(quoteUrl.toString(), {
        headers: buildHeaders(session.accessToken, supabaseAnonKey),
    });

    if (!quoteResponse.ok) {
        throw new Error(`fetchQuoteOfDay row lookup failed with status ${quoteResponse.status}`);
    }

    const rows = await quoteResponse.json();
    return rows?.[0] ?? null;
}

export async function fetchFuturePreview(session, appConfig) {
    const { supabaseUrl, supabaseAnonKey } = assertSupabaseConfig(appConfig);
    const today = getTodayKey();

    const goalUrl = new URL(`${supabaseUrl}/rest/v1/user_goals`);
    goalUrl.searchParams.set("select", "title,intensity");
    goalUrl.searchParams.set("user_id", `eq.${session.userId}`);
    goalUrl.searchParams.set("is_active", "eq.true");
    goalUrl.searchParams.set("limit", "1");

    const futuresUrl = new URL(`${supabaseUrl}/rest/v1/future_generations`);
    futuresUrl.searchParams.set("select", "scenario_type,narrative,score,intensity");
    futuresUrl.searchParams.set("user_id", `eq.${session.userId}`);
    futuresUrl.searchParams.set("date", `eq.${today}`);
    futuresUrl.searchParams.set("order", "scenario_type.asc");

    const commitsUrl = new URL(`${supabaseUrl}/rest/v1/daily_commits`);
    commitsUrl.searchParams.set("select", "id,completed_at");
    commitsUrl.searchParams.set("user_id", `eq.${session.userId}`);
    commitsUrl.searchParams.set("date", `eq.${today}`);

    const [goalResponse, futuresResponse, commitsResponse] = await Promise.all([
        fetchWithTimeout(goalUrl.toString(), { headers: buildHeaders(session.accessToken, supabaseAnonKey) }),
        fetchWithTimeout(futuresUrl.toString(), { headers: buildHeaders(session.accessToken, supabaseAnonKey) }),
        fetchWithTimeout(commitsUrl.toString(), { headers: buildHeaders(session.accessToken, supabaseAnonKey) }),
    ]);

    if (!goalResponse.ok) {
        throw new Error(`fetchFuturePreview goal lookup failed with status ${goalResponse.status}`);
    }
    if (!futuresResponse.ok) {
        throw new Error(`fetchFuturePreview futures lookup failed with status ${futuresResponse.status}`);
    }
    if (!commitsResponse.ok) {
        throw new Error(`fetchFuturePreview commits lookup failed with status ${commitsResponse.status}`);
    }

    const goalRows = await goalResponse.json();
    const futureRows = await futuresResponse.json();
    const commitRows = await commitsResponse.json();
    const committedCount = Array.isArray(commitRows) ? commitRows.length : 0;
    const completedCount = Array.isArray(commitRows)
        ? commitRows.filter((row) => Boolean(row?.completed_at)).length
        : 0;
    const computedScore = committedCount > 0 ? Math.round((completedCount / committedCount) * 100) : 0;
    const preferredScenario = computedScore >= 70 ? "heaven" : "hell";
    const featuredFuture = Array.isArray(futureRows)
        ? futureRows.find((row) => row?.scenario_type === preferredScenario) ||
          futureRows.find((row) => row?.scenario_type === "heaven") ||
          futureRows[0]
        : null;

    if (!featuredFuture) {
        return null;
    }

    return {
        goalTitle: goalRows?.[0]?.title ?? null,
        score: typeof featuredFuture?.score === "number" ? featuredFuture.score : computedScore,
        scenarioType: featuredFuture?.scenario_type ?? preferredScenario,
        narrative: featuredFuture?.narrative ?? null,
        intensity: featuredFuture?.intensity ?? goalRows?.[0]?.intensity ?? 3,
    };
}

export async function toggleTaskCompletion(taskId, completed, session, appConfig) {
    const { supabaseUrl, supabaseAnonKey } = assertSupabaseConfig(appConfig);
    const taskUrl = new URL(`${supabaseUrl}/rest/v1/tasks`);
    taskUrl.searchParams.set("id", `eq.${taskId}`);
    taskUrl.searchParams.set("select", "id,user_id,title,completed,date,created_at");

    const response = await fetchWithTimeout(taskUrl.toString(), {
        method: "PATCH",
        headers: {
            ...buildHeaders(session.accessToken, supabaseAnonKey),
            Prefer: "return=representation",
        },
        body: JSON.stringify({ completed }),
    });

    if (!response.ok) {
        throw new Error(`toggleTaskCompletion failed with status ${response.status}`);
    }

    const rows = await response.json();
    return rows?.[0] ?? null;
}

export async function insertBypassAttempt(payload, session, appConfig) {
    const { supabaseUrl, supabaseAnonKey } = assertSupabaseConfig(appConfig);
    const url = new URL(`${supabaseUrl}/rest/v1/block_attempts`);

    const response = await fetchWithTimeout(url.toString(), {
        method: "POST",
        headers: buildHeaders(session.accessToken, supabaseAnonKey),
        body: JSON.stringify([payload]),
    });

    if (!response.ok) {
        throw new Error(`insertBypassAttempt failed with status ${response.status}`);
    }
}
