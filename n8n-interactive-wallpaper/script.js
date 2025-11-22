class CharacterWidget {
    constructor(slotId, container) {
        this.slotId = slotId;
        this.container = container;
        this.config = {
            active: false,
            charPath: "",
            x: 0,
            y: 0,
            scale: 1.0,
            webhook: "",
            statusUrl: "",
            statusPollMs: 3000,
            statusTimeoutMs: 60000,
            requiresText: false,
            textPlaceholder: "Gib mir einen Text",
            speechDurationMs: 6000,
            textValue: "",
            moveEnabled: false,
            moveTargetX: null,
            moveTargetY: null,
            moveIntervalMs: 60000,
            moveDurationMs: 8000
        };
        this.state = "idle"; // idle, loading, success, error
        this.element = null;
        this.charImg = null;
        this.overlayImg = null;
        this.textInputWrapper = null;
        this.textInput = null;
        this.speechBubble = null;
        this.speechText = null;
        this.timer = null;
        this.statusPollTimer = null;
        this.statusStartTime = 0;
        this.statusLabel = null;
        this.progressBar = null;
        this.progressFill = null;
        this.lastStatusPayload = null;
        this.dialogueTimer = null;
        this.dialogueTimeout = null;
        this.movementTimer = null;
        this.movementRAF = null;
        this.movingTowardTarget = true;
        this.basePosition = { x: this.config.x, y: this.config.y };
        this.currentPosition = { x: this.config.x, y: this.config.y };
        this.currentDirection = null;
        this.walkingActive = false;

        this.render();
    }

    updateConfig(key, value) {
        if (key.endsWith("_active")) this.config.active = value;
        if (key.endsWith("_char")) this.config.charPath = value;
        if (key.endsWith("_x")) this.config.x = value;
        if (key.endsWith("_y")) this.config.y = value;
        if (key.endsWith("_scale")) this.config.scale = value;
        if (key.endsWith("_webhook")) this.config.webhook = value;
        if (key.endsWith("_statusUrl")) this.config.statusUrl = value;
        if (key.endsWith("_statusPollMs")) this.config.statusPollMs = Number(value) || 3000;
        if (key.endsWith("_statusTimeoutMs")) this.config.statusTimeoutMs = Number(value) || 60000;
        if (key.endsWith("_requiresText")) this.config.requiresText = Boolean(value);
        if (key.endsWith("_textPlaceholder")) this.config.textPlaceholder = value || "";
        if (key.endsWith("_speechDurationMs")) this.config.speechDurationMs = Number(value) || 6000;
        if (key.endsWith("_moveEnabled")) this.config.moveEnabled = Boolean(value);
        if (key.endsWith("_moveTargetX")) this.config.moveTargetX = value === null ? null : Number(value);
        if (key.endsWith("_moveTargetY")) this.config.moveTargetY = value === null ? null : Number(value);
        if (key.endsWith("_moveIntervalMs")) this.config.moveIntervalMs = Number(value) || 60000;
        if (key.endsWith("_moveDurationMs")) this.config.moveDurationMs = Number(value) || 8000;

        this.applyConfig();
    }

    applyConfig() {
        if (!this.element) return;

        // Visibility
        this.element.style.display = this.config.active ? "flex" : "none";

        // Position
        this.basePosition = { x: this.config.x, y: this.config.y };
        if (!this.isMoving()) {
            this.setPosition(this.basePosition.x, this.basePosition.y);
        }

        // Scale & Center
        // We use translate(-50%, -50%) to center the anchor point
        // And scale() to adjust size. Order matters in transform.
        this.element.style.transform = `translate(-50%, -50%) scale(${this.config.scale})`;

        // Character Source
        if (this.state === "idle") {
            this.updateImageSource("idle");
        }

        if (this.textInputWrapper && this.textInput) {
            this.textInputWrapper.style.display = this.config.requiresText ? "flex" : "none";
            this.textInput.placeholder = this.config.textPlaceholder || "Schreib etwas";
            const desired = this.config.textValue || "";
            if (this.textInput.value !== desired) {
                this.textInput.value = desired;
            }
        }

        const hasMovementTarget = Boolean(this.getMovementTarget());
        if (this.config.moveEnabled && hasMovementTarget) {
            if (this.state === "idle") {
                this.startMovementLoop();
            }
        } else {
            this.stopMovementLoop({ resetPosition: !this.config.moveEnabled || !hasMovementTarget });
        }
    }

    setPosition(x, y) {
        if (!this.element) return;
        if (typeof x !== "number" || typeof y !== "number") return;
        this.currentPosition = { x, y };
        this.element.style.left = `${x}%`;
        this.element.style.top = `${y}%`;
    }

    isMoving() {
        return Boolean(this.movementRAF);
    }

    startMovementLoop() {
        if (!this.config.moveEnabled || !this.getMovementTarget()) return;
        this.stopMovementLoop({ keepPosition: true, keepRAF: true });
        this.movementTimer = setTimeout(() => this.triggerMovement(), this.config.moveIntervalMs);
    }

    stopMovementLoop({ resetPosition = false, keepRAF = false, keepPosition = false } = {}) {
        if (this.movementTimer) {
            clearTimeout(this.movementTimer);
            this.movementTimer = null;
        }
        if (!keepRAF && this.movementRAF) {
            cancelAnimationFrame(this.movementRAF);
            this.movementRAF = null;
        }
        if (resetPosition && !keepPosition) {
            this.setPosition(this.basePosition.x, this.basePosition.y);
            this.movingTowardTarget = true;
        }
        if (!keepPosition) {
            this.setWalking(false);
            this.setDirection(null);
        }
    }

    triggerMovement() {
        if (!this.config.moveEnabled) return;
        if (this.state !== "idle") {
            this.startMovementLoop();
            return;
        }
        const from = { ...this.currentPosition };
        const target = this.movingTowardTarget ? this.getMovementTarget() : this.basePosition;
        if (!target) {
            this.startMovementLoop();
            return;
        }
        this.movingTowardTarget = !this.movingTowardTarget;
        this.animateMovement(from, target, this.config.moveDurationMs);
    }

    getMovementTarget() {
        const tx = typeof this.config.moveTargetX === "number" ? this.config.moveTargetX : this.basePosition.x;
        const ty = typeof this.config.moveTargetY === "number" ? this.config.moveTargetY : this.basePosition.y;
        if (tx === this.basePosition.x && ty === this.basePosition.y) {
            return null;
        }
        return { x: tx, y: ty };
    }

    animateMovement(from, to, duration) {
        if (duration <= 0) {
            this.setPosition(to.x, to.y);
            this.movementRAF = null;
            this.setWalking(false);
            this.setDirection(null);
            this.startMovementLoop();
            return;
        }
        const start = performance.now();
        this.setDirection(this.resolveDirection(from, to));
        this.setWalking(true);
        const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
        const step = (now) => {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = ease(progress);
            const x = from.x + (to.x - from.x) * eased;
            const y = from.y + (to.y - from.y) * eased;
            this.setPosition(x, y);
            if (progress < 1 && this.config.moveEnabled && this.state === "idle") {
                this.movementRAF = requestAnimationFrame(step);
            } else {
                this.movementRAF = null;
                if (!this.config.moveEnabled || this.state !== "idle") {
                    this.setPosition(this.basePosition.x, this.basePosition.y);
                    this.stopMovementLoop({ keepRAF: true });
                } else {
                    this.setPosition(x, y);
                    this.startMovementLoop();
                }
                this.setWalking(false);
                this.setDirection(null);
            }
        };
        this.movementRAF = requestAnimationFrame(step);
    }

    resolveDirection(from, to) {
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) return null;
        if (Math.abs(dx) >= Math.abs(dy)) {
            return dx >= 0 ? "east" : "west";
        }
        return dy >= 0 ? "south" : "north";
    }

    setDirection(direction) {
        const normalized = direction || null;
        if (this.currentDirection === normalized) return;
        this.currentDirection = normalized;
        if (this.state === "idle") {
            this.updateImageSource("idle");
        }
    }

    setWalking(isWalking) {
        if (!this.element) return;
        if (isWalking) {
            if (!this.walkingActive) {
                this.element.classList.add("walking");
                this.walkingActive = true;
            }
        } else if (this.walkingActive) {
            this.element.classList.remove("walking");
            this.walkingActive = false;
        }
    }

    updateImageSource(stateName) {
        if (!this.config.charPath) return;

        // Fix path separators
        let cleanPath = this.config.charPath.replace(/\\/g, "/");
        let folder = cleanPath.substring(0, cleanPath.lastIndexOf("/"));

        // If state is loading, we might want to show 'loading.gif' OR keep 'idle.gif' and show overlay.
        // The requirement is: "Sanduhr über dem Bild". So we keep the character visible.
        // However, if the user has a specific 'loading.gif' (e.g. casting spell), we should use it.
        // Let's try to use the specific state image, and if it fails, fallback to idle.

        const attempts = [];
        if (stateName === "idle" && this.currentDirection) {
            attempts.push(`${folder}/${stateName}_${this.currentDirection}.gif`);
        }
        attempts.push(`${folder}/${stateName}.gif`);
        attempts.push(`${folder}/idle.gif`);

        if (!this.charImg) return;
        const trySet = () => {
            const next = attempts.shift();
            if (!next) return;
            this.charImg.onerror = () => {
                this.charImg.onerror = null;
                trySet();
            };
            this.charImg.onload = () => {
                this.charImg.onerror = null;
                this.charImg.onload = null;
            };
            this.charImg.src = next;
        };
        trySet();
    }

    setState(newState, payload = null) {
        this.state = newState;
        if (this.element) {
            this.element.classList.remove("state-idle", "state-loading", "state-success", "state-error");
            this.element.classList.add(`state-${newState}`);
        }

        // Update Character Image
        // For loading, we might want to switch to 'loading.gif' (casting spell)
        this.updateImageSource(newState);

        // Update Overlay
        if (newState === "loading") {
            this.overlayImg.src = "assets/ui/hourglass.gif";
            this.overlayImg.style.display = "block";
            this.overlayImg.className = "overlay-img"; // Reset class
        } else if (newState === "success") {
            this.overlayImg.src = "assets/ui/checkmark.gif";
            this.overlayImg.style.display = "block";
            this.overlayImg.className = "overlay-img status-success";
        } else if (newState === "error") {
            this.overlayImg.src = "assets/ui/alert.gif";
            this.overlayImg.style.display = "block";
            this.overlayImg.className = "overlay-img status-error";
        } else {
            this.overlayImg.style.display = "none";
            this.overlayImg.className = "overlay-img";
        }

        this.updateStatusUI(payload, newState);

        // Clear timer
        if (this.timer) clearTimeout(this.timer);
        if (newState === "idle") {
            this.stopStatusPolling();
        }

        if (newState === "success" || newState === "error") {
            this.timer = setTimeout(() => {
                this.setState("idle");
            }, 3000);
        }

        if (newState === "success") {
            this.handleDialogue(payload || this.lastStatusPayload);
        } else {
            this.hideSpeechBubble();
        }

        if (newState === "idle" && this.config.moveEnabled) {
            this.startMovementLoop();
        } else if (newState !== "idle") {
            this.stopMovementLoop({ resetPosition: true });
            this.setDirection(null);
            this.setWalking(false);
        }
    }

    handleDialogue(payload) {
        if (!payload) {
            this.hideSpeechBubble();
            return;
        }
        const text = payload.dialogue || payload.speech || payload.message || payload.text;
        if (text) {
            this.showSpeechBubble(text.toString());
        } else {
            this.hideSpeechBubble();
        }
    }

    showSpeechBubble(text) {
        if (!this.speechBubble || !this.speechText) return;
        this.clearDialogueTimers();
        this.speechBubble.classList.add("visible");
        this.speechBubble.classList.remove("hidden");
        this.speechText.textContent = "";
        let index = 0;
        const chars = text.split("");
        this.dialogueTimer = setInterval(() => {
            this.speechText.textContent += chars[index];
            index += 1;
            if (index >= chars.length) {
                if (this.dialogueTimer) {
                    clearInterval(this.dialogueTimer);
                    this.dialogueTimer = null;
                }
                this.dialogueTimeout = setTimeout(() => this.hideSpeechBubble(), this.config.speechDurationMs);
            }
        }, 45);
    }

    hideSpeechBubble() {
        if (!this.speechBubble) return;
        this.clearDialogueTimers();
        this.speechBubble.classList.remove("visible");
        this.speechBubble.classList.add("hidden");
        if (this.speechText) this.speechText.textContent = "";
    }

    clearDialogueTimers(stopTypewriter = true) {
        if (stopTypewriter && this.dialogueTimer) {
            clearInterval(this.dialogueTimer);
            this.dialogueTimer = null;
        }
        if (this.dialogueTimeout) {
            clearTimeout(this.dialogueTimeout);
            this.dialogueTimeout = null;
        }
    }

    stopStatusPolling() {
        if (this.statusPollTimer) {
            clearTimeout(this.statusPollTimer);
            this.statusPollTimer = null;
        }
        this.statusStartTime = 0;
    }

    scheduleNextPoll(cb) {
        this.statusPollTimer = setTimeout(cb, this.config.statusPollMs);
    }

    mapStatusResponse(payload) {
        if (!payload) return "loading";
        const raw = (payload.status || payload.state || payload.result || "").toString().toLowerCase();
        if (["success", "completed", "done", "ok", "resolved"].includes(raw)) return "success";
        if (["error", "failed", "timeout", "aborted", "canceled"].includes(raw)) return "error";
        if (["idle", "ready", "waiting"].includes(raw)) return "idle";
        if (raw) return "loading";
        return "loading";
    }

    clampProgress(value) {
        if (typeof value !== "number" || Number.isNaN(value)) return null;
        if (value <= 1 && value >= 0) value = value * 100;
        value = Math.max(0, Math.min(100, value));
        return value;
    }

    extractProgress(payload) {
        if (!payload) return null;
        const keys = ["progress", "percent", "percentage", "progressPercent", "progress_percentage", "progress_current"];
        for (const key of keys) {
            if (payload[key] === undefined || payload[key] === null) continue;
            let raw = payload[key];
            if (typeof raw === "string") raw = raw.replace("%", "");
            const parsed = Number(raw);
            const clamped = this.clampProgress(parsed);
            if (clamped !== null) return clamped;
        }
        return null;
    }

    getDefaultMessage(state) {
        switch (state) {
            case "loading":
                return "Automation läuft...";
            case "success":
                return "Automation fertig";
            case "error":
                return "Automation fehlgeschlagen";
            default:
                return "";
        }
    }

    updateStatusUI(payload, forcedState = null) {
        if (payload) {
            this.lastStatusPayload = payload;
        } else if ((forcedState || this.state) === "idle") {
            this.lastStatusPayload = null;
        }

        const activeState = forcedState || this.state;
        const data = payload || this.lastStatusPayload;
        let message = "";

        if (data) {
            message = data.message || data.statusText || data.detail || "";
        }
        if (!message) {
            message = this.getDefaultMessage(activeState);
        }

        if (this.statusLabel) {
            if (message) {
                this.statusLabel.textContent = message;
                this.statusLabel.style.display = "block";
            } else {
                this.statusLabel.textContent = "";
                this.statusLabel.style.display = "none";
            }
        }

        if (this.progressBar) {
            if (activeState === "loading") {
                const progress = this.extractProgress(data);
                if (progress !== null) {
                    this.progressBar.style.display = "flex";
                    if (this.progressFill) {
                        this.progressFill.style.width = `${progress}%`;
                    }
                } else {
                    this.progressBar.style.display = "none";
                }
            } else {
                this.progressBar.style.display = "none";
            }
        }
    }

    beginStatusPolling() {
        if (!this.config.statusUrl) {
            this.setState("success");
            return;
        }

        this.stopStatusPolling();
        this.statusStartTime = Date.now();

        const poll = async () => {
            try {
                const response = await fetch(this.config.statusUrl, { cache: "no-store" });
                if (!response.ok) throw new Error(`Status ${response.status}`);
                let data = {};
                try {
                    data = await response.json();
                } catch (jsonError) {
                    console.warn(`Slot ${this.slotId}: Status endpoint returned non-JSON.`, jsonError);
                }
                const mapped = this.mapStatusResponse(data);
                this.updateStatusUI(data, mapped === "loading" ? "loading" : mapped);

                if (mapped === "loading") {
                    if (Date.now() - this.statusStartTime >= this.config.statusTimeoutMs) {
                        this.setState("error", data);
                        return;
                    }
                    this.scheduleNextPoll(poll);
                } else {
                    this.setState(mapped, data);
                }
            } catch (error) {
                console.error(`Slot ${this.slotId}: Status polling failed.`, error);
                if (Date.now() - this.statusStartTime >= this.config.statusTimeoutMs) {
                    this.setState("error", { message: "Status-Endpoint nicht erreichbar" });
                    return;
                }
                this.scheduleNextPoll(poll);
            }
        };

        // Immediate first poll for snappier feedback
        poll();
    }

    async handleClick() {
        if (this.state !== "idle") return;
        if (!this.config.webhook) {
            console.warn(`Slot ${this.slotId}: No webhook configured.`);
            this.setState("error", { message: "Keine Webhook-URL gesetzt" });
            return;
        }

        if (this.config.requiresText) {
            const textValue = (this.textInput?.value || "").trim();
            if (!textValue) {
                this.setState("error", { message: "Bitte gib zuerst einen Text ein" });
                return;
            }
            this.config.textValue = textValue;
        }

        this.setState("loading");
        this.stopStatusPolling();

        try {
            const response = await fetch(this.config.webhook, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    timestamp: new Date().toISOString(),
                    slot: this.slotId,
                    source: "Lively Wallpaper",
                    userText: this.config.requiresText ? this.config.textValue : undefined
                })
            });

            if (this.config.statusUrl) {
                // Webhook fire-and-forget; real status handled separately
                this.beginStatusPolling();
            } else {
                const fallbackPayload = this.config.requiresText
                    ? { dialogue: this.config.textValue || "" }
                    : { message: "Webhook ausgelöst" };
                this.setState("success", fallbackPayload);
            }
            console.log(`Slot ${this.slotId}: Webhook triggered.`);

        } catch (error) {
            console.error(`Slot ${this.slotId}: Webhook failed.`, error);
            this.setState("error", { message: "Webhook konnte nicht gesendet werden" });
        }
    }

    render() {
        this.element = document.createElement("div");
        this.element.className = "character-widget state-idle";
        this.element.dataset.slot = `Slot ${this.slotId}`;

        // Character Image
        this.charImg = document.createElement("img");
        this.charImg.className = "char-img";
        this.charImg.alt = "Character";
        this.element.appendChild(this.charImg);

        // Overlay Image
        this.overlayImg = document.createElement("img");
        this.overlayImg.className = "overlay-img";
        this.overlayImg.alt = "Status";
        this.element.appendChild(this.overlayImg);

        this.statusLabel = document.createElement("div");
        this.statusLabel.className = "status-label";
        this.element.appendChild(this.statusLabel);

        this.progressBar = document.createElement("div");
        this.progressBar.className = "progress-bar";
        this.progressFill = document.createElement("div");
        this.progressFill.className = "progress-fill";
        this.progressBar.appendChild(this.progressFill);
        this.element.appendChild(this.progressBar);

        this.textInputWrapper = document.createElement("div");
        this.textInputWrapper.className = "text-input-wrapper";
        this.textInput = document.createElement("input");
        this.textInput.type = "text";
        this.textInput.className = "text-input";
        this.textInput.placeholder = this.config.textPlaceholder;
        this.textInput.addEventListener("click", (event) => event.stopPropagation());
        this.textInput.addEventListener("input", () => {
            this.config.textValue = this.textInput?.value || "";
        });
        this.textInput.addEventListener("keydown", (event) => {
            if (event.key === "Enter") {
                event.preventDefault();
                event.stopPropagation();
                this.handleClick();
            }
        });
        this.textInputWrapper.appendChild(this.textInput);
        this.element.appendChild(this.textInputWrapper);

        this.speechBubble = document.createElement("div");
        this.speechBubble.className = "speech-bubble hidden";
        this.speechText = document.createElement("span");
        this.speechBubble.appendChild(this.speechText);
        this.speechBubble.addEventListener("click", (event) => event.stopPropagation());
        this.element.appendChild(this.speechBubble);

        this.element.addEventListener("click", () => this.handleClick());

        this.container.appendChild(this.element);
        this.applyConfig();
    }
}

// --- Main Logic ---

const widgetsContainer = document.getElementById("widgets-container");
const settingsButton = document.getElementById("settings-button");
const settingsPanel = document.getElementById("settings-panel");
const settingsCloseBtn = document.getElementById("settings-close");
const settingsList = document.getElementById("settings-list");
const settingsEmptyLabel = document.getElementById("settings-empty");
const slots = [1, 2, 3, 4];
const widgets = {};
let settingsVisible = false;
const livelyPropertyStore = new Map();
let livelyPropertySchema = null;

// Initialize Widgets
slots.forEach(id => {
    widgets[id] = new CharacterWidget(id, widgetsContainer);
});

// Global Config
function updateGlobalConfig(name, val) {
    livelyPropertyStore.set(name, val);
    renderSettingsPanel();
    if (name === "editMode") {
        if (val) document.body.classList.add("edit-mode");
        else document.body.classList.remove("edit-mode");
    }
    if (name === "backgroundImage") {
        if (val) {
            let path = `images/${val}`;
            if (val.includes(":") || val.startsWith("/")) path = val;
            document.getElementById("background").style.backgroundImage = `url('${path}')`;
        }
    }
}

// Lively Property Listener
function livelyPropertyListener(name, val) {
    // console.log(`Property: ${name} = ${val}`);
    livelyPropertyStore.set(name, val);
    renderSettingsPanel();

    const match = name.match(/^slot(\d+)_(.+)$/);
    if (match) {
        const slotId = parseInt(match[1]);
        const prop = match[0];
        if (widgets[slotId]) {
            widgets[slotId].updateConfig(prop, val);
        }
    } else {
        updateGlobalConfig(name, val);
    }
}

// --- Dev Mode / Auto-Init ---
// If no properties are received within 100ms (e.g. opening in browser), load defaults.
let propertiesReceived = false;
const originalLivelyPropertyListener = livelyPropertyListener;

// Override the listener to track if it's called
// Note: We can't easily override the function reference if it's called by Lively directly.
// But for our internal logic, we can check if it was called.
// Actually, a better approach for Dev Mode is to just set a timeout.
// If Lively calls the function, we set the flag.

// We need to make sure the function is globally accessible for Lively
window.livelyPropertyListener = function (name, val) {
    propertiesReceived = true;
    livelyPropertyStore.set(name, val);
    renderSettingsPanel();
    // Call the original logic (which is now inside this wrapper)
    // console.log(`Property: ${name} = ${val}`);

    const match = name.match(/^slot(\d+)_(.+)$/);
    if (match) {
        const slotId = parseInt(match[1]);
        const prop = match[0];
        if (widgets[slotId]) {
            widgets[slotId].updateConfig(prop, val);
        }
    } else {
        updateGlobalConfig(name, val);
    }
};

setTimeout(() => {
    if (!propertiesReceived) {
        console.log("Dev Mode: No Lively properties detected. Loading defaults...");
        window.livelyPropertyListener("backgroundImage", "default.jpg");
        window.livelyPropertyListener("slot1_active", true);
        window.livelyPropertyListener("slot1_char", "assets/characters/Wizard/idle.gif");
        window.livelyPropertyListener("slot1_x", 50);
        window.livelyPropertyListener("slot1_y", 50);
        window.livelyPropertyListener("slot1_scale", 1.0);
        window.livelyPropertyListener("slot1_webhook", "https://httpbin.org/delay/2");
        window.livelyPropertyListener("slot1_statusUrl", "");
        window.livelyPropertyListener("slot1_statusPollMs", 3000);
        window.livelyPropertyListener("slot1_statusTimeoutMs", 60000);
        window.livelyPropertyListener("slot1_moveEnabled", false);
        window.livelyPropertyListener("slot1_moveTargetX", 60);
        window.livelyPropertyListener("slot1_moveTargetY", 40);
        window.livelyPropertyListener("slot1_moveIntervalMs", 60000);
        window.livelyPropertyListener("slot1_moveDurationMs", 8000);

        window.livelyPropertyListener("slot2_active", true);
        window.livelyPropertyListener("slot2_char", "assets/characters/SynthEngineer/idle.gif");
        window.livelyPropertyListener("slot2_x", 65);
        window.livelyPropertyListener("slot2_y", 55);
        window.livelyPropertyListener("slot2_scale", 1.0);
        window.livelyPropertyListener("slot2_webhook", "https://httpbin.org/delay/1");
        window.livelyPropertyListener("slot2_statusUrl", "");
        window.livelyPropertyListener("slot2_statusPollMs", 3000);
        window.livelyPropertyListener("slot2_statusTimeoutMs", 60000);
        window.livelyPropertyListener("slot2_moveEnabled", false);
        window.livelyPropertyListener("slot2_moveTargetX", 75);
        window.livelyPropertyListener("slot2_moveTargetY", 60);
        window.livelyPropertyListener("slot2_moveIntervalMs", 60000);
        window.livelyPropertyListener("slot2_moveDurationMs", 8000);

        window.livelyPropertyListener("slot3_active", true);
        window.livelyPropertyListener("slot3_char", "assets/characters/ChronoRanger/idle.gif");
        window.livelyPropertyListener("slot3_x", 35);
        window.livelyPropertyListener("slot3_y", 60);
        window.livelyPropertyListener("slot3_scale", 1.0);
        window.livelyPropertyListener("slot3_webhook", "https://httpbin.org/delay/3");
        window.livelyPropertyListener("slot3_statusUrl", "");
        window.livelyPropertyListener("slot3_statusPollMs", 3000);
        window.livelyPropertyListener("slot3_statusTimeoutMs", 60000);
        window.livelyPropertyListener("slot3_moveEnabled", false);
        window.livelyPropertyListener("slot3_moveTargetX", 20);
        window.livelyPropertyListener("slot3_moveTargetY", 45);
        window.livelyPropertyListener("slot3_moveIntervalMs", 60000);
        window.livelyPropertyListener("slot3_moveDurationMs", 8000);

        window.livelyPropertyListener("slot4_active", true);
        window.livelyPropertyListener("slot4_char", "assets/characters/Wizard/idle.gif");
        window.livelyPropertyListener("slot4_requiresText", true);
        window.livelyPropertyListener("slot4_textPlaceholder", "Was soll ich sagen?");
        window.livelyPropertyListener("slot4_x", 20);
        window.livelyPropertyListener("slot4_y", 75);
        window.livelyPropertyListener("slot4_scale", 1.0);
        window.livelyPropertyListener("slot4_webhook", "https://httpbin.org/post");
        window.livelyPropertyListener("slot4_statusUrl", "");
        window.livelyPropertyListener("slot4_statusPollMs", 3000);
        window.livelyPropertyListener("slot4_statusTimeoutMs", 60000);
        window.livelyPropertyListener("slot4_speechDurationMs", 6000);
        window.livelyPropertyListener("slot4_moveEnabled", true);
        window.livelyPropertyListener("slot4_moveTargetX", 65);
        window.livelyPropertyListener("slot4_moveTargetY", 80);
        window.livelyPropertyListener("slot4_moveIntervalMs", 60000);
        window.livelyPropertyListener("slot4_moveDurationMs", 8000);

        // Add visual indicator for Dev Mode
        const devLabel = document.createElement("div");
        devLabel.style.position = "absolute";
        devLabel.style.bottom = "10px";
        devLabel.style.right = "10px";
        devLabel.style.color = "rgba(255, 255, 255, 0.5)";
        devLabel.style.fontFamily = "monospace";
        devLabel.innerText = "DEV MODE";
        document.body.appendChild(devLabel);
    }
}, 100);

function toggleSettingsPanel(forceState) {
    const next = typeof forceState === "boolean" ? forceState : !settingsVisible;
    settingsVisible = next;
    if (next) {
        settingsPanel?.classList.remove("hidden");
    } else {
        settingsPanel?.classList.add("hidden");
    }
}

function renderSettingsPanel() {
    if (!settingsList) return;
    if (livelyPropertySchema && Object.keys(livelyPropertySchema).length) {
        renderSchemaDrivenPanel();
    } else {
        renderFallbackPanel();
    }
}

function renderFallbackPanel() {
    if (!livelyPropertyStore.size) {
        if (settingsEmptyLabel) settingsEmptyLabel.style.display = "block";
        settingsList.innerHTML = "";
        return;
    }

    if (settingsEmptyLabel) settingsEmptyLabel.style.display = "none";
    const fragment = document.createDocumentFragment();
    Array.from(livelyPropertyStore.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .forEach(([key, value]) => {
            const row = document.createElement("div");
            row.className = "settings-row";
            const label = document.createElement("span");
            label.textContent = key;
            row.appendChild(label);
            row.appendChild(buildFallbackControl(key, value));
            fragment.appendChild(row);
        });
    settingsList.innerHTML = "";
    settingsList.appendChild(fragment);
}

function buildFallbackControl(name, value) {
    const valueType = typeof value;

    if (valueType === "boolean") {
        const input = document.createElement("input");
        input.type = "checkbox";
        input.checked = value;
        input.addEventListener("change", () => {
            window.livelyPropertyListener(name, input.checked);
        });
        return input;
    }

    if (valueType === "number") {
        const input = document.createElement("input");
        input.type = "number";
        input.value = value;
        input.step = "0.1";
        input.style.flex = "1";
        input.addEventListener("change", () => {
            const parsed = Number(input.value);
            window.livelyPropertyListener(name, Number.isFinite(parsed) ? parsed : value);
        });
        return input;
    }

    if (valueType === "string") {
        const input = document.createElement("input");
        input.type = "text";
        input.style.flex = "1";
        input.value = value;
        input.placeholder = name;
        input.addEventListener("change", () => window.livelyPropertyListener(name, input.value));
        return input;
    }

    const code = document.createElement("code");
    code.textContent = JSON.stringify(value, null, 2);
    code.style.flex = "1";
    return code;
}

function renderSchemaDrivenPanel() {
    const entries = Object.entries(livelyPropertySchema || {});
    if (!entries.length) {
        renderFallbackPanel();
        return;
    }
    if (settingsEmptyLabel) settingsEmptyLabel.style.display = "none";
    const fragment = document.createDocumentFragment();
    entries.forEach(([key, def]) => {
        const row = document.createElement("div");
        row.className = "settings-row";

        const label = document.createElement("span");
        label.textContent = def.text || key;

        const control = buildControlForProperty(key, def);
        row.appendChild(label);
        row.appendChild(control);
        fragment.appendChild(row);
    });
    settingsList.innerHTML = "";
    settingsList.appendChild(fragment);
}

function buildControlForProperty(name, def) {
    const currentValue = livelyPropertyStore.has(name)
        ? livelyPropertyStore.get(name)
        : def.value;
    const type = def.type;
    if (type === "checkbox") {
        const input = document.createElement("input");
        input.type = "checkbox";
        input.checked = Boolean(currentValue);
        input.addEventListener("change", () => applyPropertyUpdate(name, input.checked));
        return input;
    }

    if (type === "slider") {
        const wrapper = document.createElement("div");
        wrapper.style.display = "flex";
        wrapper.style.alignItems = "center";
        wrapper.style.gap = "6px";
        wrapper.style.flex = "1";

        const input = document.createElement("input");
        input.type = "range";
        input.min = def.min ?? 0;
        input.max = def.max ?? 100;
        if (def.step) input.step = def.step;
        input.value = currentValue ?? def.value ?? input.min;
        const valueLabel = document.createElement("code");
        valueLabel.textContent = input.value;

        input.addEventListener("input", () => {
            valueLabel.textContent = input.value;
        });
        input.addEventListener("change", () => {
            applyPropertyUpdate(name, parseFloat(input.value));
        });

        wrapper.appendChild(input);
        wrapper.appendChild(valueLabel);
        return wrapper;
    }

    const input = document.createElement("input");
    input.type = "text";
    input.style.flex = "1";
    input.value = currentValue ?? "";
    input.placeholder = def.text || name;
    input.addEventListener("change", () => applyPropertyUpdate(name, input.value));
    return input;
}

function applyPropertyUpdate(name, value) {
    let nextValue = value;
    const def = livelyPropertySchema?.[name];
    if (def?.type === "slider") {
        nextValue = Number(value);
    } else if (def?.type === "checkbox") {
        nextValue = Boolean(value);
    }
    window.livelyPropertyListener(name, nextValue);
}

async function loadPropertySchema() {
    try {
        const response = await fetch("LivelyProperties.json", { cache: "no-store" });
        if (!response.ok) throw new Error(response.statusText);
        livelyPropertySchema = await response.json();
        renderSettingsPanel();
    } catch (error) {
        console.warn("Konnte LivelyProperties.json nicht laden.", error);
    }
}

loadPropertySchema();

settingsButton?.addEventListener("click", () => toggleSettingsPanel());
settingsCloseBtn?.addEventListener("click", () => toggleSettingsPanel(false));
