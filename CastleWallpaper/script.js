const root = document.documentElement;
const MAIL_FRAMES = [
    "assets/mail/Mail1.png",
    "assets/mail/Mail2.png",
    "assets/mail/Mail3.png",
    "assets/mail/Mail4.png",
    "assets/mail/Mail5.png"
];

const KNIGHT_BASE_PATH = "assets/characters/knight/animations/breathing-idle/south";
const KNIGHT_IDLE_FRAMES = [
    `${KNIGHT_BASE_PATH}/frame_000.png`,
    `${KNIGHT_BASE_PATH}/frame_001.png`,
    `${KNIGHT_BASE_PATH}/frame_002.png`,
    `${KNIGHT_BASE_PATH}/frame_003.png`
];

const KNIGHT_DEFEAT_FRAMES = [
    KNIGHT_IDLE_FRAMES[3],
    KNIGHT_IDLE_FRAMES[2],
    KNIGHT_IDLE_FRAMES[1],
    KNIGHT_IDLE_FRAMES[0],
    KNIGHT_IDLE_FRAMES[1]
];

const KNIGHT_ANIMATIONS = {
    idle: { frames: KNIGHT_IDLE_FRAMES, delay: 160, loop: true },
    cast: { frames: [...KNIGHT_IDLE_FRAMES, ...KNIGHT_IDLE_FRAMES.slice().reverse()], delay: 110, loop: true },
    victory: {
        frames: [
            KNIGHT_IDLE_FRAMES[0],
            KNIGHT_IDLE_FRAMES[1],
            KNIGHT_IDLE_FRAMES[2],
            KNIGHT_IDLE_FRAMES[3],
            KNIGHT_IDLE_FRAMES[2],
            KNIGHT_IDLE_FRAMES[1]
        ],
        delay: 140,
        loop: false,
        holdLastFrame: true
    },
    defeat: {
        frames: KNIGHT_DEFEAT_FRAMES,
        delay: 130,
        loop: false,
        holdLastFrame: true
    }
};

const defaultProperties = {
    mailWebhook: "",
    mailStatusUrl: "",
    mailX: 22,
    mailY: 28,
    mailScale: 1.1,
    notesWebhook: "",
    notesStatusUrl: "",
    notesX: 12,
    notesY: 22,
    notesScale: 0.1,
    notesPlaceholder: "Drop a royal note",
    settingsX: 88,
    settingsY: 18,
    settingsScale: 0.9,
    knightWebhook: "",
    knightStatusUrl: "",
    knightMethod: "POST",
    knightX: 57,
    knightY: 70,
    knightScale: 1.1,
    pollInterval: 4000,
    statusTimeout: 60000
};

const legacyPositionDefaults = {
    mailX: 20,
    mailY: 34,
    notesX: 74,
    notesY: 45,
    settingsY: 20,
    knightX: 60,
    knightY: 68
};

const propertyMeta = {
    mailWebhook: { label: "Mail Webhook", mask: true },
    mailStatusUrl: { label: "Mail Status Endpoint" },
    mailX: { label: "Mail Position X", cssVar: "--mail-x", unit: "%", precision: 1 },
    mailY: { label: "Mail Position Y", cssVar: "--mail-y", unit: "%", precision: 1 },
    mailScale: { label: "Mail Scale", cssVar: "--mail-scale", precision: 2 },
    notesWebhook: { label: "Notes Webhook", mask: true },
    notesStatusUrl: { label: "Notes Status Endpoint" },
    notesX: { label: "Notes Position X", cssVar: "--notes-x", unit: "%", precision: 1 },
    notesY: { label: "Notes Position Y", cssVar: "--notes-y", unit: "%", precision: 1 },
    notesScale: { label: "Notes Scale", cssVar: "--notes-scale", precision: 2 },
    notesPlaceholder: { label: "Notes Placeholder" },
    settingsX: { label: "Glyph Position X", cssVar: "--settings-x", unit: "%", precision: 1 },
    settingsY: { label: "Glyph Position Y", cssVar: "--settings-y", unit: "%", precision: 1 },
    settingsScale: { label: "Glyph Scale", cssVar: "--settings-scale", precision: 2 },
    knightWebhook: { label: "Knight Webhook", mask: true },
    knightStatusUrl: { label: "Knight Status Endpoint" },
    knightMethod: { label: "Knight Webhook Method" },
    knightX: { label: "Knight Position X", cssVar: "--knight-x", unit: "%", precision: 1 },
    knightY: { label: "Knight Position Y", cssVar: "--knight-y", unit: "%", precision: 1 },
    knightScale: { label: "Knight Scale", cssVar: "--knight-scale", precision: 2 },
    pollInterval: { label: "Status Poll Interval (ms)" },
    statusTimeout: { label: "Status Timeout (ms)" }
};

const propertyControls = {
    mailWebhook: { type: "text", placeholder: "https://" },
    mailStatusUrl: { type: "text", placeholder: "https://" },
    mailX: { type: "range", min: 0, max: 100, step: 1 },
    mailY: { type: "range", min: 0, max: 100, step: 1 },
    mailScale: { type: "range", min: 0.5, max: 2.5, step: 0.05 },
    notesWebhook: { type: "text", placeholder: "https://" },
    notesStatusUrl: { type: "text", placeholder: "https://" },
    notesX: { type: "range", min: 0, max: 100, step: 1 },
    notesY: { type: "range", min: 0, max: 100, step: 1 },
    notesScale: { type: "range", min: 0.5, max: 2, step: 0.05 },
    notesPlaceholder: { type: "text", placeholder: "Drop a royal note" },
    settingsX: { type: "range", min: 0, max: 100, step: 1 },
    settingsY: { type: "range", min: 0, max: 100, step: 1 },
    settingsScale: { type: "range", min: 0.5, max: 2, step: 0.05 },
    knightWebhook: { type: "text", placeholder: "https://" },
    knightStatusUrl: { type: "text", placeholder: "https://" },
    knightMethod: {
        type: "select",
        options: [
            { label: "POST", value: "POST" },
            { label: "GET", value: "GET" }
        ]
    },
    knightX: { type: "range", min: 0, max: 100, step: 1 },
    knightY: { type: "range", min: 0, max: 100, step: 1 },
    knightScale: { type: "range", min: 0.5, max: 2.5, step: 0.05 },
    pollInterval: { type: "range", min: 500, max: 10000, step: 250 },
    statusTimeout: { type: "range", min: 5000, max: 120000, step: 5000 }
};

const state = { ...defaultProperties };
const widgetState = { mail: "idle", notes: "idle", knight: "idle" };
const dom = {};
const widgetConfigs = {};
const pollHandles = new Map();
const defaultWidgetPayloads = {
    mail: { kind: "mail" },
    notes: { kind: "notes" },
    knight: { kind: "do nothing" }
};
let mailFrameIndex = 0;
let mailFrameTimer = null;
let hasReceivedLivelyProps = false;
let knightAnimator = null;
let knightSpeechTimer = null;

document.addEventListener("DOMContentLoaded", init);

function init() {
    cacheDom();
    prepareWidgetConfigs();
    buildSettingsList();
    refreshSettingsView();
    applyCssDefaults();
    attachMailHandlers();
    attachNotesHandlers();
    attachSettingsHandlers();
    attachKnightHandlers();
    attachKnightIncantationHandlers();
    loadLocalPropertyDefaults();
    if (dom.knightSprite) {
        knightAnimator = new KnightAnimator(dom.knightSprite, KNIGHT_ANIMATIONS);
        knightAnimator.play("idle");
    }
    renderNotesPlaceholder();
    exposeWallpaperBridge();
}

function cacheDom() {
    dom.mailWidget = document.getElementById("mail-widget");
    dom.mailImage = dom.mailWidget?.querySelector(".mail-frame");
    dom.notesWidget = document.getElementById("notes-widget");
    dom.notesInput = document.getElementById("notes-input");
    dom.notesSend = document.getElementById("notes-send");
    dom.settingsToggle = document.getElementById("settings-toggle");
    dom.settingsPanel = document.getElementById("settings-panel");
    dom.settingsClose = document.getElementById("settings-close");
    dom.settingsList = document.getElementById("settings-list");
    dom.settingsEmpty = document.querySelector(".settings-empty");
    dom.knightWidget = document.getElementById("knight-widget");
    dom.knightProgress = dom.knightWidget?.querySelector(".knight-progress-fill");
    dom.knightDialog = dom.knightWidget?.querySelector(".knight-dialog");
    dom.knightSprite = dom.knightWidget?.querySelector(".knight-sprite");
    dom.knightSpeechText = document.getElementById("knight-speech-text");
    dom.knightInput = document.getElementById("knight-input");
    dom.knightForm = document.getElementById("knight-incantation");
    dom.knightCast = document.getElementById("knight-cast");
}

function getWidgetMethod(widgetId) {
    const methodKey = `${widgetId}Method`;
    const value = state[methodKey];
    if (typeof value === "string") {
        const normalized = value.trim().toUpperCase();
        if (normalized === "GET" || normalized === "POST") {
            return normalized;
        }
    }
    return "POST";
}

function prepareWebhookRequest(method, webhook, body) {
    if (method === "GET") {
        const params = new URLSearchParams();
        params.set("widget", body.widget);
        params.set("source", body.source);
        params.set("timestamp", body.timestamp);
        params.set("payload", JSON.stringify(body.payload || {}));
        Object.entries(body.payload || {}).forEach(([key, value]) => {
            const primitive = typeof value === "object" ? null : value;
            if (primitive === undefined || primitive === null) return;
            params.set(key, String(primitive));
        });
        const connector = webhook.includes("?") ? "&" : "?";
        return {
            url: `${webhook}${connector}${params.toString()}`,
            init: { method: "GET", headers: { "Cache-Control": "no-store" } }
        };
    }
    return {
        url: webhook,
        init: {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        }
    };
}

async function parseAutomationResponse(response) {
    if (!response || response.status === 204) {
        return {};
    }
    let rawText = "";
    try {
        rawText = await response.text();
    } catch (error) {
        return {};
    }
    if (!rawText) {
        return {};
    }
    const trimmed = rawText.trim();
    if (!trimmed) {
        return {};
    }
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json") || trimmed.startsWith("{") || trimmed.startsWith("[")) {
        try {
            const parsed = JSON.parse(trimmed);
            if (parsed && typeof parsed === "object") {
                return { ...parsed, rawText: trimmed };
            }
            if (typeof parsed === "string") {
                return { text: parsed };
            }
        } catch (error) {
            // fall back to text representation
        }
    }
    return { text: trimmed, rawText: trimmed };
}

function prepareWidgetConfigs() {
    widgetConfigs.mail = {
        element: dom.mailWidget,
        webhookKey: "mailWebhook",
        statusKey: "mailStatusUrl"
    };
    widgetConfigs.notes = {
        element: dom.notesWidget,
        webhookKey: "notesWebhook",
        statusKey: "notesStatusUrl"
    };
    widgetConfigs.knight = {
        element: dom.knightWidget,
        webhookKey: "knightWebhook",
        statusKey: "knightStatusUrl"
    };
}

function buildSettingsList() {
    if (!dom.settingsList) return;
    dom.settingsList.innerHTML = "";
    dom.settingsInputs = new Map();
    Object.entries(propertyMeta).forEach(([key, meta]) => {
        const row = document.createElement("div");
        row.className = "settings-row";

        const label = document.createElement("label");
        label.textContent = meta.label;
        label.htmlFor = `settings-${key}`;
        row.appendChild(label);

        const controlMeta = propertyControls[key];
        if (controlMeta) {
            const control = createSettingsControl(key, controlMeta);
            row.appendChild(control.wrapper);
            dom.settingsInputs.set(key, {
                input: control.input,
                valueEl: control.valueEl,
                controlType: controlMeta.type
            });
        } else {
            const span = document.createElement("span");
            span.className = "settings-value";
            span.dataset.key = key;
            span.textContent = "—";
            row.appendChild(span);
        }

        dom.settingsList.appendChild(row);
    });
}

function refreshSettingsView() {
    Object.keys(propertyMeta).forEach(updateSettingsEntry);
}

function applyCssDefaults() {
    Object.entries(propertyMeta).forEach(([key, meta]) => {
        if (!meta.cssVar) return;
        const value = state[key];
        applyCssVar(meta.cssVar, value, meta.unit);
    });
}

function attachMailHandlers() {
    if (!dom.mailWidget) return;
    dom.mailWidget.addEventListener("pointerenter", startMailAnimation);
    dom.mailWidget.addEventListener("pointerleave", stopMailAnimation);
    dom.mailWidget.addEventListener("click", () => triggerAutomation("mail"));
}

function attachNotesHandlers() {
    if (!dom.notesSend || !dom.notesInput) return;
    dom.notesSend.addEventListener("click", handleNotesSend);
    dom.notesInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            handleNotesSend();
        }
    });
}

function attachSettingsHandlers() {
    if (!dom.settingsToggle || !dom.settingsPanel) return;
    dom.settingsToggle.addEventListener("click", toggleSettingsPanel);
    dom.settingsClose?.addEventListener("click", closeSettingsPanel);
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            closeSettingsPanel();
        }
    });
}

function attachKnightHandlers() {
    if (!dom.knightWidget) return;
    dom.knightWidget.addEventListener("click", () => handleKnightIncantationSend());
}

function attachKnightIncantationHandlers() {
    if (!dom.knightForm) return;
    dom.knightForm.addEventListener("submit", (event) => {
        event.preventDefault();
        handleKnightIncantationSend();
    });
}

function startMailAnimation() {
    stopMailAnimation();
    updateMailFrame();
    mailFrameTimer = window.setInterval(updateMailFrame, 150);
}

function stopMailAnimation() {
    if (mailFrameTimer) {
        clearInterval(mailFrameTimer);
        mailFrameTimer = null;
    }
    mailFrameIndex = 0;
    updateMailFrame();
}

function updateMailFrame() {
    if (!dom.mailImage) return;
    const src = MAIL_FRAMES[mailFrameIndex] || MAIL_FRAMES[0];
    dom.mailImage.src = src;
    mailFrameIndex = (mailFrameIndex + 1) % MAIL_FRAMES.length;
}

function handleNotesSend() {
    if (!dom.notesInput) return;
    const rawText = dom.notesInput.value.trim();
    if (!rawText) {
        dom.notesInput.focus();
        return;
    }
    triggerAutomation("notes", {
        text: rawText,
        rawText: dom.notesInput.value
    });
}

function handleKnightIncantationSend() {
    if (!dom.knightInput) {
        triggerAutomation("knight");
        return;
    }
    if (dom.knightInput.disabled) {
        return;
    }
    const incantation = dom.knightInput.value.trim();
    if (!incantation) {
        dom.knightInput.focus();
        return;
    }
    triggerAutomation("knight", { text: incantation, incantation });
}

function toggleSettingsPanel() {
    if (!dom.settingsPanel || !dom.settingsToggle) return;
    const willOpen = dom.settingsPanel.classList.contains("hidden");
    dom.settingsPanel.classList.toggle("hidden");
    dom.settingsToggle.setAttribute("aria-expanded", String(willOpen));
    dom.settingsToggle.dataset.state = willOpen ? "success" : "idle";
}

function closeSettingsPanel() {
    if (!dom.settingsPanel || !dom.settingsToggle) return;
    dom.settingsPanel.classList.add("hidden");
    dom.settingsToggle.setAttribute("aria-expanded", "false");
    dom.settingsToggle.dataset.state = "idle";
}

function triggerAutomation(widgetId, payload = {}) {
    const config = widgetConfigs[widgetId];
    if (!config || !config.element) return;
    const webhook = state[config.webhookKey];
    if (!webhook) {
        setWidgetState(widgetId, "error", { message: "Webhook missing" });
        return;
    }

    setWidgetState(widgetId, "loading");
    const method = getWidgetMethod(widgetId);
    const mergedPayload = {
        ...(defaultWidgetPayloads[widgetId] || {}),
        ...(payload || {})
    };
    const body = {
        widget: widgetId,
        source: "castle-wallpaper",
        timestamp: new Date().toISOString(),
        payload: mergedPayload
    };

    const request = prepareWebhookRequest(method, webhook, body);

    fetch(request.url, request.init).then(async (response) => {
        if (!response.ok) {
            const errorText = await response.text().catch(() => "");
            const reason = errorText?.trim() || `Request failed (${response.status})`;
            throw new Error(reason);
        }
        const responseDetails = await parseAutomationResponse(response);
        const statusUrl = state[config.statusKey];
        if (statusUrl) {
            beginStatusPolling(widgetId);
        } else {
            setWidgetState(widgetId, "success", responseDetails);
        }
    }).catch((error) => {
        setWidgetState(widgetId, "error", { message: error.message });
    });
}

function beginStatusPolling(widgetId) {
    clearPoll(widgetId);
    const startedAt = Date.now();
    const tick = () => {
        pollStatus(widgetId, startedAt);
    };
    pollHandles.set(widgetId, window.setTimeout(tick, state.pollInterval));
}

function pollStatus(widgetId, startedAt) {
    const config = widgetConfigs[widgetId];
    if (!config) return;
    const statusUrl = state[config.statusKey];
    if (!statusUrl) {
        setWidgetState(widgetId, "success");
        return;
    }
    if (Date.now() - startedAt > state.statusTimeout) {
        setWidgetState(widgetId, "error", { message: "Status timeout" });
        return;
    }

    fetch(`${statusUrl}?_=${Date.now()}`, { cache: "no-store" })
        .then((response) => {
            if (!response.ok) throw new Error(`Status ${response.status}`);
            return response.json();
        })
        .then((data) => handleStatusPayload(widgetId, data, startedAt))
        .catch((error) => {
            console.error(error);
            scheduleNextPoll(widgetId, startedAt);
        });
}

function handleStatusPayload(widgetId, payload, startedAt) {
    const status = (payload.status || "").toLowerCase();
    if (status === "success" || status === "completed" || status === "done") {
        setWidgetState(widgetId, "success", payload);
        clearPoll(widgetId);
        return;
    }
    if (status === "error" || status === "failed") {
        setWidgetState(widgetId, "error", payload);
        clearPoll(widgetId);
        return;
    }

    if (typeof payload.progress === "number") {
        updateWidgetProgress(widgetId, payload.progress);
    }
    scheduleNextPoll(widgetId, startedAt);
}

function scheduleNextPoll(widgetId, startedAt) {
    clearPoll(widgetId);
    pollHandles.set(
        widgetId,
        window.setTimeout(() => pollStatus(widgetId, startedAt), state.pollInterval)
    );
}

function clearPoll(widgetId) {
    const handle = pollHandles.get(widgetId);
    if (handle) {
        clearTimeout(handle);
        pollHandles.delete(widgetId);
    }
}

function setWidgetState(widgetId, newState, details = {}) {
    widgetState[widgetId] = newState;
    const element = widgetConfigs[widgetId]?.element;
    if (element) {
        element.dataset.state = newState;
    }

    if (widgetId === "mail" && newState !== "idle") {
        stopMailAnimation();
    }
    if (widgetId === "notes" && dom.notesSend && dom.notesInput) {
        const busy = newState === "loading";
        dom.notesSend.disabled = busy;
        dom.notesInput.disabled = busy;
        if (newState === "success") {
            dom.notesInput.value = "";
        }
    }
    if (widgetId === "knight") {
        const busy = newState === "loading";
        if (dom.knightInput) dom.knightInput.disabled = busy;
        if (dom.knightCast) dom.knightCast.disabled = busy;
        if (newState === "success" && dom.knightInput) {
            dom.knightInput.value = "";
        }
        updateKnightUi(newState, details);
    }
    if (newState !== "loading") {
        clearPoll(widgetId);
    }
}

function updateWidgetProgress(widgetId, progress) {
    if (widgetId !== "knight") return;
    if (!dom.knightProgress) return;
    const normalized = Math.max(0, Math.min(1, progress > 1 ? progress / 100 : progress));
    dom.knightProgress.style.width = `${Math.round(normalized * 100)}%`;
}

function clearKnightSpeechTimer() {
    if (knightSpeechTimer) {
        clearInterval(knightSpeechTimer);
        knightSpeechTimer = null;
    }
}

function setKnightSpeechInstant(text) {
    if (!dom.knightSpeechText) return;
    clearKnightSpeechTimer();
    dom.knightSpeechText.textContent = text || "...";
}

function startKnightThinking() {
    if (!dom.knightSpeechText) return;
    clearKnightSpeechTimer();
    const frames = [".", "..", "..."];
    let index = 0;
    dom.knightSpeechText.textContent = frames[index];
    knightSpeechTimer = window.setInterval(() => {
        index = (index + 1) % frames.length;
        dom.knightSpeechText.textContent = frames[index];
    }, 420);
}

function typeKnightSpeech(text) {
    if (!dom.knightSpeechText) return;
    const safeText = (text || "Auftrag abgeschlossen.").toString();
    clearKnightSpeechTimer();
    dom.knightSpeechText.textContent = "";
    let index = 0;
    knightSpeechTimer = window.setInterval(() => {
        index += 1;
        dom.knightSpeechText.textContent = safeText.slice(0, index);
        if (index >= safeText.length) {
            clearKnightSpeechTimer();
        }
    }, 55);
}

const SPEECH_IGNORED_KEYS = new Set([
    "widget",
    "source",
    "timestamp",
    "status",
    "state",
    "kind",
    "id",
    "progress"
]);

function sanitizeSpeechString(value) {
    if (typeof value !== "string") return "";
    const trimmed = value.trim();
    if (!trimmed) return "";
    if (/^{{[^{}]+}}$/i.test(trimmed)) {
        return "";
    }
    return trimmed;
}

function findFirstMeaningfulString(value, depth = 0, visited = new Set()) {
    if (depth > 6) return "";
    if (typeof value === "string") {
        return sanitizeSpeechString(value);
    }
    if (!value || typeof value !== "object") {
        return "";
    }
    if (visited.has(value)) {
        return "";
    }
    visited.add(value);
    for (const [key, child] of Object.entries(value)) {
        if (SPEECH_IGNORED_KEYS.has(key)) continue;
        const result = findFirstMeaningfulString(child, depth + 1, visited);
        if (result) return result;
    }
    return "";
}

function extractKnightSpeech(details) {
    if (!details || typeof details !== "object") return "";
    const directKeys = ["text", "message", "dialogue", "speech", "result", "response", "rawText"];
    for (const key of directKeys) {
        const candidate = sanitizeSpeechString(details[key]);
        if (candidate) {
            return candidate;
        }
    }

    const nestedKeys = ["payload", "data", "output", "result", "response"];
    for (const key of nestedKeys) {
        const nested = details[key];
        if (!nested) continue;
        if (typeof nested === "string") {
            const candidate = sanitizeSpeechString(nested);
            if (candidate) return candidate;
        }
        if (typeof nested === "object") {
            const deep = findFirstMeaningfulString(nested);
            if (deep) return deep;
        }
    }

    return findFirstMeaningfulString(details);
}

function getKnightAnimationKey(stateName) {
    if (stateName === "loading") return "cast";
    if (stateName === "success") return "victory";
    if (stateName === "error") return "defeat";
    return "idle";
}

function setKnightAnimation(key) {
    if (!dom.knightWidget || !key) return;
    dom.knightWidget.dataset.animation = key;
    if (knightAnimator) {
        const requiresCompletion = key === "victory" || key === "defeat";
        knightAnimator.play(
            key,
            requiresCompletion ? (finishedKey) => handleKnightAnimationComplete(finishedKey) : null
        );
    }
}

function updateKnightUi(stateName, details = {}) {
    updateWidgetProgress("knight", details.progress ?? 0);
    if (stateName === "success") {
        updateWidgetProgress("knight", 1);
    }
    const animationKey = getKnightAnimationKey(stateName);
    setKnightAnimation(animationKey);

    if (stateName === "loading") {
        startKnightThinking();
    } else if (stateName === "success") {
        const speech = extractKnightSpeech(details);
        if (speech) {
            typeKnightSpeech(speech);
        } else {
            setKnightSpeechInstant("Mission erfüllt.");
        }
    } else if (stateName === "error") {
        const errorText = extractKnightSpeech(details) || details.message || "Der Zauber schlug fehl.";
        setKnightSpeechInstant(errorText);
    }

    if (!dom.knightDialog) return;
    if (stateName === "error") {
        showKnightDialogue(details.message || "The spell fizzled.");
    } else if (stateName === "success" && details.dialogue) {
        showKnightDialogue(details.dialogue);
    } else {
        hideKnightDialogue();
    }
}

function showKnightDialogue(text) {
    if (!dom.knightDialog) return;
    dom.knightDialog.textContent = text;
    dom.knightDialog.classList.add("visible");
}

function hideKnightDialogue() {
    if (!dom.knightDialog) return;
    dom.knightDialog.classList.remove("visible");
    dom.knightDialog.textContent = "";
}

function applyCssVar(variable, value, unit = "") {
    if (value === undefined || value === null) return;
    const numeric = typeof value === "number" ? value : Number(value);
    if (Number.isNaN(numeric)) return;
    root.style.setProperty(variable, `${numeric}${unit || ""}`);
}

function setProperty(key, value) {
    let nextValue = value;
    if (typeof nextValue === "string" && key.toLowerCase().endsWith("method")) {
        nextValue = nextValue.trim().toUpperCase();
    }
    state[key] = nextValue;
    const meta = propertyMeta[key];
    if (meta?.cssVar) {
        applyCssVar(meta.cssVar, nextValue, meta.unit);
    }
    if (key === "notesPlaceholder") {
        renderNotesPlaceholder();
    }
    updateSettingsEntry(key);
}

function renderNotesPlaceholder() {
    if (!dom.notesInput) return;
    dom.notesInput.placeholder = state.notesPlaceholder || defaultProperties.notesPlaceholder;
}

function updateSettingsEntry(key) {
    const refs = dom.settingsInputs?.get(key);
    const value = state[key];
    if (refs) {
        if (refs.controlType === "checkbox") {
            const desired = Boolean(value);
            if (refs.input.checked !== desired) {
                refs.input.checked = desired;
            }
        } else if (refs.controlType === "range" || refs.controlType === "number") {
            const numeric = typeof value === "number" ? value : Number(value) || 0;
            if (refs.input.value !== String(numeric)) {
                refs.input.value = numeric;
            }
            if (refs.valueEl) {
                refs.valueEl.textContent = formatPropertyValue(key, numeric);
            }
        } else if (refs.input.tagName === "SELECT") {
            const textValue = value == null ? "" : String(value);
            if (refs.input.value !== textValue) {
                refs.input.value = textValue;
            }
        } else {
            const textValue = value == null ? "" : String(value);
            if (refs.input.value !== textValue) {
                refs.input.value = textValue;
            }
        }
    } else if (dom.settingsList) {
        const span = dom.settingsList.querySelector(`span[data-key="${key}"]`);
        if (span) {
            span.textContent = formatPropertyValue(key, value);
        }
    }
    dom.settingsEmpty?.classList.add("hidden");
}

function formatPropertyValue(key, value) {
    if (value === undefined || value === null || value === "") {
        return "—";
    }
    const meta = propertyMeta[key];
    if (meta?.mask) {
        return value ? "configured" : "—";
    }
    if (typeof value === "number" && meta?.precision !== undefined) {
        return value.toFixed(meta.precision) + (meta.unit || "");
    }
    if (typeof value === "number") {
        return String(value);
    }
    return value.toString();
}

function exposeWallpaperBridge() {
    window.wallpaperPropertyListener = {
        applyUserProperties(properties) {
            if (!properties) return;
            hasReceivedLivelyProps = true;
            Object.entries(properties).forEach(([key, rawValue]) => {
                const parsed = parsePropertyValue(rawValue);
                if (parsed === undefined) return;
                if (shouldIgnoreLegacyDefault(key, parsed)) return;
                setProperty(key, parsed);
            });
            dom.settingsEmpty?.classList.add("hidden");
        }
    };
}

function parsePropertyValue(rawValue) {
    if (rawValue === null || rawValue === undefined) return undefined;
    if (typeof rawValue === "object" && "value" in rawValue) {
        return rawValue.value;
    }
    return rawValue;
}

function shouldIgnoreLegacyDefault(key, value) {
    if (!(key in legacyPositionDefaults)) {
        return false;
    }
    const desiredDefault = defaultProperties[key];
    if (desiredDefault === undefined || desiredDefault === null) {
        return false;
    }
    const numericValue = typeof value === "number" ? value : Number(value);
    if (Number.isNaN(numericValue)) {
        return false;
    }
    return numericValue === legacyPositionDefaults[key] && numericValue !== desiredDefault;
}

class KnightAnimator {
    constructor(img, animations) {
        this.img = img;
        this.animations = animations;
        this.currentKey = null;
        this.frameIndex = 0;
        this.timer = null;
        this.preloaded = new Set();
        this.loop = true;
        this.holdLastFrame = false;
        this.onComplete = null;
        this.preloadFrames();
    }

    preloadFrames() {
        Object.values(this.animations).forEach(({ frames }) => {
            frames.forEach((src) => this.preloadImage(src));
        });
    }

    preloadImage(src) {
        if (this.preloaded.has(src)) return;
        const image = new Image();
        image.src = src;
        this.preloaded.add(src);
    }

    play(key, onComplete) {
        if (!this.img) return;
        const animation = this.animations[key];
        if (!animation || animation.frames.length === 0) return;
        this.currentKey = key;
        this.frameIndex = 0;
        this.loop = animation.loop !== false;
        this.holdLastFrame = Boolean(animation.holdLastFrame);
        this.onComplete = typeof onComplete === "function" ? onComplete : null;
        this.renderFrame();
        this.queueNextFrame();
    }

    renderFrame() {
        const animation = this.animations[this.currentKey];
        if (!animation) return;
        const frameSrc = animation.frames[this.frameIndex] || animation.frames[0];
        if (frameSrc) {
            this.img.src = frameSrc;
        }
    }

    queueNextFrame() {
        this.clearTimer();
        const animation = this.animations[this.currentKey];
        if (!animation) return;
        this.timer = setTimeout(() => {
            this.frameIndex += 1;
            if (this.frameIndex >= animation.frames.length) {
                if (this.loop) {
                    this.frameIndex = 0;
                } else {
                    if (!this.holdLastFrame) {
                        this.frameIndex = animation.frames.length - 1;
                        this.renderFrame();
                    }
                    if (this.onComplete) {
                        const cb = this.onComplete;
                        this.onComplete = null;
                        cb(this.currentKey);
                    }
                    return;
                }
            }
            this.renderFrame();
            this.queueNextFrame();
        }, animation.delay);
    }

    clearTimer() {
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
    }
}

function handleKnightAnimationComplete(animationKey) {
    if (animationKey !== "victory" && animationKey !== "defeat") return;
    if (widgetState.knight === "loading") return;
    setTimeout(() => {
        if (widgetState.knight === "success" || widgetState.knight === "error") {
            setWidgetState("knight", "idle");
        }
    }, 0);
}

function createSettingsControl(key, control) {
    const wrapper = document.createElement("div");
    wrapper.className = "settings-field";
    let input;
    let valueEl = null;

    if (control.type === "textarea") {
        input = document.createElement("textarea");
    } else if (control.type === "select") {
        input = document.createElement("select");
        (control.options || []).forEach((option) => {
            const opt = document.createElement("option");
            opt.value = option.value;
            opt.textContent = option.label ?? option.value;
            input.appendChild(opt);
        });
    } else {
        input = document.createElement("input");
        if (control.type === "range") {
            input.type = "range";
            input.min = control.min ?? 0;
            input.max = control.max ?? 100;
            input.step = control.step ?? 1;
            valueEl = document.createElement("span");
            valueEl.className = "settings-value";
        } else if (control.type === "checkbox") {
            input.type = "checkbox";
        } else if (control.type === "number") {
            input.type = "number";
            if (control.min !== undefined) input.min = control.min;
            if (control.max !== undefined) input.max = control.max;
            if (control.step !== undefined) input.step = control.step;
        } else {
            input.type = "text";
        }
    }

    input.id = `settings-${key}`;
    input.dataset.key = key;
    if (control.placeholder) {
        if (input.tagName === "TEXTAREA") {
            input.placeholder = control.placeholder;
        } else if (input.type === "text") {
            input.placeholder = control.placeholder;
        }
    }

    const eventName = control.type === "checkbox" || control.type === "select" ? "change" : "input";
    input.addEventListener(eventName, () => handleSettingsInputChange(key, input, control));

    wrapper.appendChild(input);
    if (valueEl) {
        wrapper.appendChild(valueEl);
    }

    return { wrapper, input, valueEl };
}

function handleSettingsInputChange(key, inputEl, control) {
    let value;
    if (control.type === "checkbox") {
        value = Boolean(inputEl.checked);
    } else if (control.type === "range" || control.type === "number") {
        value = Number(inputEl.value);
        if (Number.isNaN(value)) {
            return;
        }
    } else {
        value = inputEl.value;
    }
    setProperty(key, value);
}

function loadLocalPropertyDefaults() {
    fetch("LivelyProperties.json", { cache: "no-store" })
        .then((response) => (response.ok ? response.json() : null))
        .then((data) => {
            if (!data) return;
            let applied = false;
            Object.entries(data).forEach(([key, descriptor]) => {
                const value = descriptor?.value;
                if (value === undefined || value === null || value === "") return;
                if (shouldIgnoreLegacyDefault(key, value)) return;
                setProperty(key, value);
                applied = true;
            });
            if (applied && !hasReceivedLivelyProps) {
                hasReceivedLivelyProps = true;
                dom.settingsEmpty?.classList.add("hidden");
            }
        })
        .catch(() => {
            // Ignore errors when running outside a server or if the file is unavailable.
        });
}
