/*! Clima Card — compact A/C card for Home Assistant · MIT · github.com/stathisktm/clima-card */

const CLIMA_VERSION = "2.0.0";

const CLIMA_DEFAULTS = {
  title: "A/C",
  subtitle: "",
  theme: "",
  image_url: "",

  entity_climate: "",
  entity_indoor_temp: "",
  entity_indoor_humidity: "",
  entity_outside_temp: "",
  entity_power_consumption: "",
  entity_eco: "",
  entity_timer: "",

  show_mode_cool: true,
  show_mode_heat: true,
  show_mode_fan: true,
  show_mode_dry: true,
  show_mode_auto: true,

  show_fan_speed: true,
  show_power_consumption: true,

  color_cool: "#2196f3",
  color_heat: "#f44336",
  color_dry: "#ff9800",
  color_fan: "#4caf50",
  color_auto: "#9c27b0",
  color_off: "rgba(0, 0, 0, 0.4)",
};

const CLIMA_MODES = [
  { mode: "cool", show: "show_mode_cool", label: "❄ Ψύξη", color: "color_cool" },
  { mode: "heat", show: "show_mode_heat", label: "☀ Θέρμανση", color: "color_heat" },
  { mode: "fan_only", show: "show_mode_fan", label: "🌀 Ανεμ.", color: "color_fan" },
  { mode: "dry", show: "show_mode_dry", label: "💧 Dry", color: "color_dry" },
  // heat_cool and auto are both "let the unit decide" — whichever the A/C exposes gets the button.
  { mode: "heat_cool", show: "show_mode_auto", label: "AUTO", color: "color_auto", alt: "auto" },
];

const CLIMA_ACTION = {
  cooling: "ψύχει", heating: "ζεσταίνει", drying: "αφυγραίνει", fan: "ανεμιστήρας",
  idle: "αναμονή", off: "", preheating: "προθέρμανση", defrosting: "ξεπάγωμα",
};

const CLIMA_FAN = {
  auto: "auto", silent: "σιγά", quiet: "σιγά", low: "χαμηλή", medium: "μεσαία", middle: "μεσαία",
  high: "υψηλή", turbo: "turbo", strong: "turbo", off: "off",
};

const CLIMA_THEMES = {
  "ios-dark-mode-blue-red": {
    "--primary-color": "#2196f3", "--accent-color": "#ff5252", "--secondary-text-color": "#b0b0b0",
    "--primary-text-color": "#ffffff", "--ha-card-background": "#15171b", "--card-background-color": "#15171b",
    "--divider-color": "rgba(255,255,255,0.10)",
  },
  "ios-dark-mode": {
    "--primary-color": "#ffffff", "--accent-color": "#ffffff", "--secondary-text-color": "#aaaaaa",
    "--primary-text-color": "#ffffff", "--ha-card-background": "#151515", "--card-background-color": "#151515",
    "--divider-color": "rgba(255,255,255,0.10)",
  },
};

const climaBad = (v) => v === undefined || v === null || v === "" || v === "unknown" || v === "unavailable";

/** An older editor saved the humidity entity under a key literally named "null". */
function climaMigrate(config) {
  const cfg = { ...(config || {}) };
  if (!cfg.entity_indoor_humidity && typeof cfg.null === "string") cfg.entity_indoor_humidity = cfg.null;
  delete cfg.null;
  return cfg;
}

class ClimaCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = {};
    this._hass = null;
    this._pendingTemp = null;
    this._tempTimer = null;
  }

  static getConfigElement() {
    return document.createElement("clima-card-editor");
  }

  static getStubConfig(hass) {
    const climate = Object.keys(hass?.states || {}).find((id) => id.startsWith("climate."));
    return { title: "A/C", entity_climate: climate || "" };
  }

  setConfig(config) {
    if (!config || typeof config !== "object") throw new Error("Λάθος ρυθμίσεις κάρτας");
    this._config = { ...CLIMA_DEFAULTS, ...climaMigrate(config) };
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    if (!this.shadowRoot.querySelector("ha-card")) this._render();
    this._updateState();
  }

  getCardSize() {
    return 3;
  }

  getGridOptions() {
    return { columns: 6, min_columns: 4, rows: "auto" };
  }

  /* =========================
     RENDER
     ========================= */

  _render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; width: 100%; box-sizing: border-box; }
        * { box-sizing: border-box; }

        ha-card {
          display: block;
          position: relative; overflow: hidden; padding: 7px 11px 8px; border-radius: 14px;
          color: var(--primary-text-color, #fff);
          box-shadow: var(--ha-card-box-shadow, 0 4px 16px rgba(0,0,0,.18));
          transition: background 400ms ease;
        }

        /* HEADER */
        .card-header { display: flex; align-items: center; justify-content: space-between; gap: 8px; min-height: 27px; margin-bottom: 4px; }
        .title-wrap { min-width: 0; flex: 1; cursor: pointer; user-select: none; }
        .title-wrap:active { transform: scale(.985); }
        .title-row { display: flex; align-items: center; gap: 5px; min-width: 0; height: 22px; }
        .climate-icon { --mdc-icon-size: 17px; width: 17px; height: 17px; flex-shrink: 0; display: inline-flex; }
        .climate-icon.spin { animation: clima-spin 2.4s linear infinite; }
        @keyframes clima-spin { to { transform: rotate(360deg); } }
        .title-inline { display: flex; align-items: baseline; gap: 6px; min-width: 0; }
        .title { font-size: 14px; font-weight: 700; line-height: 18px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .subtitle { font-size: 9px; line-height: 10px; opacity: .58; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex-shrink: 1; }
        .action {
          font-size: 8px; line-height: 14px; padding: 0 6px; border-radius: 7px; white-space: nowrap;
          background: rgba(255,255,255,.14); text-transform: uppercase; letter-spacing: .3px;
        }

        /* POWER BUTTON */
        .power-control {
          display: inline-flex; align-items: center; justify-content: center; width: 30px; min-width: 30px; height: 27px; padding: 0;
          border-radius: 8px; border: 1px solid rgba(255,255,255,.14); background: rgba(255,255,255,.10); color: #fff;
          cursor: pointer; flex-shrink: 0; transition: background 120ms ease, transform 100ms ease, opacity 150ms ease;
        }
        .power-control ha-icon { --mdc-icon-size: 17px; width: 17px; height: 17px; display: inline-flex; }
        .power-control.is-on { background: rgba(255,255,255,.16); border-color: rgba(255,255,255,.22); }
        .power-control.is-off { opacity: .68; background: rgba(0,0,0,.15); }
        .power-control:hover { background: rgba(255,255,255,.20); }
        .power-control:active { transform: scale(.88); }
        .power-control:focus-visible { outline: 1px solid rgba(255,255,255,.70); outline-offset: 1px; }

        /* TEMPERATURE */
        .hero {
          display: flex; align-items: center; justify-content: space-between; gap: 8px; min-height: 50px;
          padding: 4px 8px; margin-bottom: 5px; border-radius: 10px; background: rgba(0,0,0,.10); border: 1px solid rgba(255,255,255,.08);
        }
        .temperature-block { display: flex; align-items: baseline; min-width: 0; }
        .indoor-temp { font-size: 31px; line-height: 32px; font-weight: 700; letter-spacing: -1.2px; font-variant-numeric: tabular-nums; }
        .temp-unit { margin-left: 2px; font-size: 11px; opacity: .70; }
        .indoor-label { margin-left: 4px; font-size: 9px; opacity: .55; }
        .target-block { display: flex; align-items: center; gap: 3px; flex-shrink: 0; }
        .temp-control {
          display: flex; align-items: center; justify-content: center; width: 26px; height: 26px; padding: 0; border: 0;
          border-radius: 8px; background: rgba(255,255,255,.10); color: inherit; font-size: 17px; cursor: pointer;
        }
        .temp-control:active { transform: scale(.90); }
        .temp-control:disabled { opacity: .35; cursor: default; }
        .target-temp { min-width: 43px; text-align: center; font-size: 17px; line-height: 22px; font-weight: 700; font-variant-numeric: tabular-nums; transition: opacity .2s; }
        .target-temp.pending { opacity: .65; }
        .target-label { display: block; text-align: center; font-size: 8px; line-height: 9px; opacity: .55; }
        .hero-image { width: 38px; height: 38px; flex-shrink: 0; object-fit: cover; border-radius: 9px; opacity: .90; }

        /* HVAC MODES */
        .modes { display: flex; align-items: center; gap: 4px; width: 100%; margin-bottom: 5px; overflow-x: auto; scrollbar-width: none; }
        .modes::-webkit-scrollbar { display: none; }
        .mode-btn {
          flex: 1 1 0; min-width: 42px; height: 27px; padding: 3px 5px; border: 1px solid rgba(255,255,255,.10); border-radius: 8px;
          background: rgba(0,0,0,.13); color: inherit; font: inherit; font-size: 9px; font-weight: 600; white-space: nowrap; cursor: pointer;
          opacity: .70; transition: background 150ms ease, opacity 150ms ease, transform 100ms ease;
        }
        .mode-btn.active { opacity: 1; border-color: rgba(255,255,255,.25); background: var(--mode-color); }
        .mode-btn:active { transform: scale(.96); }

        /* COMPACT INFO ROW */
        .compact-row {
          display: flex; align-items: center; width: 100%; min-height: 31px; padding: 3px 6px; border-radius: 9px;
          background: rgba(0,0,0,.11); border: 1px solid rgba(255,255,255,.07); overflow: hidden;
        }
        .stats { display: flex; align-items: center; gap: 6px; width: 100%; min-width: 0; flex-wrap: nowrap; overflow-x: auto; overflow-y: hidden; scrollbar-width: none; }
        .stats::-webkit-scrollbar { display: none; }
        .stat {
          display: inline-flex; align-items: center; justify-content: center; gap: 3px; flex: 0 0 auto; height: 23px;
          padding: 1px 2px; font-size: 9px; line-height: 18px; white-space: nowrap; opacity: .90; cursor: pointer;
        }
        .stat > ha-icon { --mdc-icon-size: 14px; width: 14px; height: 14px; flex-shrink: 0; display: inline-flex; opacity: .90; }
        .stat-value { font-weight: 600; }

        /* FAN / SWING */
        .fan-control, .swing-control {
          display: inline-flex; align-items: center; justify-content: center; gap: 3px; height: 27px; min-width: 29px;
          padding: 0 6px; margin: 0; border-radius: 8px; background: rgba(255,255,255,.11); border: 1px solid rgba(255,255,255,.12);
          cursor: pointer; color: #fff; font-size: 9px; font-weight: 600; white-space: nowrap; flex-shrink: 0;
          transition: background 120ms ease, transform 100ms ease;
        }
        .fan-control ha-icon, .swing-control ha-icon { --mdc-icon-size: 18px; width: 18px; height: 18px; display: inline-flex; flex-shrink: 0; color: #fff; }
        .fan-control:hover, .swing-control:hover { background: rgba(255,255,255,.18); }
        .fan-control:active, .swing-control:active { transform: scale(.92); background: rgba(255,255,255,.24); }
        .fan-control:focus-visible, .swing-control:focus-visible { outline: 1px solid rgba(255,255,255,.70); outline-offset: 1px; }
        .spacer { flex: 1; }

        .hidden { display: none !important; }
        .warning { font-size: 10px; opacity: .8; padding: 6px 2px; }

        @media (max-width: 430px) {
          ha-card { padding: 6px 9px 7px; }
          .stats { gap: 5px; }
          .stat { font-size: 8px; }
          .title { font-size: 13px; }
          .subtitle { font-size: 8px; }
          .fan-label { display: none; }
        }
      </style>

      <ha-card>
        <div class="card-header">
          <div class="title-wrap" id="titleWrap" title="Πληροφορίες A/C">
            <div class="title-row">
              <ha-icon id="climateIcon" class="climate-icon" icon="mdi:air-conditioner"></ha-icon>
              <div class="title-inline">
                <div id="title" class="title"></div>
                <div id="subtitle" class="subtitle"></div>
                <div id="action" class="action hidden"></div>
              </div>
            </div>
          </div>
          <button id="powerControl" class="power-control" type="button" title="Ενεργοποίηση / απενεργοποίηση" aria-label="Ενεργοποίηση / απενεργοποίηση">
            <ha-icon id="powerIcon" icon="mdi:power-off"></ha-icon>
          </button>
        </div>

        <div id="warning" class="warning hidden"></div>

        <div class="hero">
          <div class="temperature-block">
            <span id="indoorTemp" class="indoor-temp">--</span>
            <span class="temp-unit">°C</span>
            <span class="indoor-label">χώρος</span>
          </div>
          <img id="heroImage" class="hero-image hidden" alt="" />
          <div class="target-block">
            <button id="tempDown" class="temp-control" type="button" aria-label="Μείωση">−</button>
            <div>
              <div id="targetTemp" class="target-temp">--</div>
              <span class="target-label">στόχος</span>
            </div>
            <button id="tempUp" class="temp-control" type="button" aria-label="Αύξηση">+</button>
          </div>
        </div>

        <div id="modes" class="modes">
          ${CLIMA_MODES.map((m) => `<button class="mode-btn" data-mode="${m.mode}" type="button">${m.label}</button>`).join("")}
        </div>

        <div id="compactRow" class="compact-row">
          <div id="stats" class="stats">
            <div id="outsideStat" class="stat hidden" data-entity="entity_outside_temp"><ha-icon icon="mdi:thermometer"></ha-icon><span id="outsideValue" class="stat-value">--</span></div>
            <div id="humidityStat" class="stat hidden" data-entity="entity_indoor_humidity"><ha-icon icon="mdi:water-percent"></ha-icon><span id="humidityValue" class="stat-value">--</span></div>
            <div id="powerStat" class="stat hidden" data-entity="entity_power_consumption"><ha-icon icon="mdi:flash"></ha-icon><span id="powerValue" class="stat-value">--</span></div>
            <div id="ecoStat" class="stat hidden" data-entity="entity_eco"><ha-icon icon="mdi:leaf"></ha-icon><span id="ecoValue" class="stat-value">Eco</span></div>
            <div id="timerStat" class="stat hidden" data-entity="entity_timer"><ha-icon icon="mdi:timer-outline"></ha-icon><span id="timerValue" class="stat-value">--</span></div>
            <div class="spacer"></div>
            <div id="fanControl" class="fan-control" role="button" tabindex="0" title="Ταχύτητα ανεμιστήρα">
              <ha-icon id="fanIcon" icon="mdi:fan"></ha-icon><span id="fanLabel" class="fan-label"></span>
            </div>
            <div id="swingControl" class="swing-control" role="button" tabindex="0" title="Περσίδες">
              <ha-icon id="swingIcon" icon="mdi:swap-vertical-variant"></ha-icon>
            </div>
          </div>
        </div>
      </ha-card>
    `;

    const title = this.shadowRoot.querySelector("#title");
    const subtitle = this.shadowRoot.querySelector("#subtitle");
    title.textContent = this._config.title || "";
    subtitle.textContent = this._config.subtitle || "";
    subtitle.classList.toggle("hidden", !this._config.subtitle);

    const image = this.shadowRoot.querySelector("#heroImage");
    if (this._config.image_url) image.src = this._config.image_url;
    image.classList.toggle("hidden", !this._config.image_url);

    this._bindEvents();
    this._updateState();
  }

  _bindEvents() {
    const root = this.shadowRoot;
    const press = (el, fn) => {
      el?.addEventListener("click", fn);
      el?.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); }
      });
    };
    root.querySelector("#titleWrap").addEventListener("click", () => this._moreInfo(this._config.entity_climate));
    root.querySelector("#powerControl").addEventListener("click", () => this._togglePower());
    root.querySelector("#tempDown").addEventListener("click", () => this._changeTemp(-1));
    root.querySelector("#tempUp").addEventListener("click", () => this._changeTemp(+1));
    root.querySelectorAll(".mode-btn").forEach((b) => b.addEventListener("click", () => this._setHvacMode(b.dataset.real || b.dataset.mode)));
    press(root.querySelector("#fanControl"), () => this._cycle("fan_modes", "fan_mode", "set_fan_mode"));
    press(root.querySelector("#swingControl"), () => this._cycle("swing_modes", "swing_mode", "set_swing_mode"));
    root.querySelectorAll(".stat[data-entity]").forEach((s) =>
      s.addEventListener("click", () => this._moreInfo(this._config[s.dataset.entity])));
  }

  /* =========================
     ACTIONS
     ========================= */

  _haptic() {
    this.dispatchEvent(new CustomEvent("haptic", { detail: "light", bubbles: true, composed: true }));
  }

  _moreInfo(entityId) {
    if (!entityId) return;
    this.dispatchEvent(new CustomEvent("hass-more-info", { detail: { entityId }, bubbles: true, composed: true }));
  }

  _call(service, data) {
    const entity_id = this._config.entity_climate;
    if (!this._hass || !entity_id) return;
    this._hass.callService("climate", service, { entity_id, ...data }).catch((e) => console.error(`clima-card ${service}:`, e));
    this._haptic();
  }

  _togglePower() {
    const climate = this._climate();
    if (!climate) return;
    this._call(climate.state === "off" ? "turn_on" : "turn_off");
  }

  _setHvacMode(mode) {
    if (mode) this._call("set_hvac_mode", { hvac_mode: mode });
  }

  _cycle(listAttr, currentAttr, service) {
    const a = this._climate()?.attributes || {};
    const modes = Array.isArray(a[listAttr]) ? a[listAttr] : [];
    if (!modes.length) return;
    const i = modes.indexOf(a[currentAttr]);
    this._call(service, { [currentAttr]: modes[(i + 1) % modes.length] });
  }

  /** Presses add up on screen and go out as one call once they stop for a moment. */
  _changeTemp(direction) {
    const climate = this._climate();
    const a = climate?.attributes || {};
    const base = this._pendingTemp ?? Number(a.temperature);
    if (!Number.isFinite(base)) return;
    const stepAttr = Number(a.target_temp_step);
    const step = Number.isFinite(stepAttr) && stepAttr > 0 ? stepAttr : 0.5;
    const min = Number(a.min_temp ?? 16), max = Number(a.max_temp ?? 30);
    let next = Math.round((base + direction * step) / step) * step;
    next = Number(Math.max(min, Math.min(max, next)).toFixed(2));
    this._pendingTemp = next;
    this._showTarget(next, true);
    this._haptic();
    clearTimeout(this._tempTimer);
    this._tempTimer = setTimeout(() => {
      const value = this._pendingTemp;
      this._pendingTemp = null;
      if (value !== null) this._call("set_temperature", { temperature: value });
    }, 700);
  }

  /* =========================
     STATE
     ========================= */

  _climate() {
    return this._getEntityState(this._config.entity_climate);
  }

  _getEntityState(entityId) {
    if (!this._hass || !entityId) return null;
    return this._hass.states?.[entityId] || null;
  }

  _temperature(value) {
    if (climaBad(value)) return "--";
    const n = Number(value);
    return Number.isFinite(n) ? n.toFixed(1) : "--";
  }

  _showTarget(value, pending) {
    const target = this.shadowRoot.querySelector("#targetTemp");
    target.textContent = this._temperature(value);
    target.classList.toggle("pending", !!pending);
  }

  _setIcon(selector, icon) {
    const el = this.shadowRoot.querySelector(selector);
    if (el && icon && el.getAttribute("icon") !== icon) el.setAttribute("icon", icon);
  }

  _climateIcon(state) {
    return { cool: "mdi:snowflake", heat: "mdi:fire", fan_only: "mdi:fan", dry: "mdi:water-percent", heat_cool: "mdi:autorenew", auto: "mdi:autorenew" }[state] || "mdi:air-conditioner";
  }

  _fanIcon(mode) {
    const k = String(mode || "").toLowerCase();
    if (["silent", "quiet", "low", "1"].includes(k)) return "mdi:fan-speed-1";
    if (["medium", "middle", "2"].includes(k)) return "mdi:fan-speed-2";
    if (["high", "turbo", "strong", "3"].includes(k)) return "mdi:fan-speed-3";
    if (k === "auto") return "mdi:fan-auto";
    if (k === "off") return "mdi:fan-off";
    return "mdi:fan";
  }

  _swingIcon(mode) {
    const k = String(mode || "").toLowerCase();
    if (k === "vertical") return "mdi:arrow-up-down";
    if (k === "horizontal") return "mdi:arrow-left-right";
    if (k === "both") return "mdi:arrow-all";
    return "mdi:swap-vertical-variant";
  }

  _formatPower(entity) {
    const n = Number(entity.state);
    const unit = entity.attributes?.unit_of_measurement || "W";
    if (!Number.isFinite(n)) return `${entity.state} ${unit}`;
    if (unit === "W" && Math.abs(n) >= 1000) return `${(n / 1000).toFixed(1)} kW`;
    return `${unit === "W" ? Math.round(n) : n} ${unit}`;
  }

  _formatEco(entity) {
    const s = String(entity.state).toLowerCase();
    if (["on", "true", "1"].includes(s)) return "Eco";
    if (["off", "false", "0"].includes(s)) return "--";
    return entity.state;
  }

  /** Timer helper: remaining time while active; a timestamp: the time it fires; else the state. */
  _formatTimer(entity) {
    const id = entity.entity_id || "";
    if (id.startsWith("timer.")) {
      if (entity.state === "idle") return "--";
      const fin = entity.attributes?.finishes_at;
      if (entity.state === "active" && fin) {
        const secs = Math.max(0, Math.round((new Date(fin).getTime() - Date.now()) / 1000));
        return `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`;
      }
      return entity.attributes?.remaining || entity.state;
    }
    if (entity.attributes?.device_class === "timestamp" && !climaBad(entity.state)) {
      const d = new Date(entity.state);
      if (!Number.isNaN(d.getTime())) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    return climaBad(entity.state) ? "--" : entity.state;
  }

  _updateStat(statSel, valueSel, text, visible) {
    const stat = this.shadowRoot.querySelector(statSel);
    if (!stat) return;
    stat.classList.toggle("hidden", !visible);
    const value = this.shadowRoot.querySelector(valueSel);
    if (value) value.textContent = text ?? "--";
  }

  _updateState() {
    if (!this._hass || !this.shadowRoot.querySelector("ha-card")) return;
    const root = this.shadowRoot;
    const cfg = this._config;
    const climate = this._climate();

    const warning = root.querySelector("#warning");
    warning.classList.toggle("hidden", !!climate);
    if (!climate) {
      warning.textContent = cfg.entity_climate ? `Δεν βρέθηκε: ${cfg.entity_climate}` : "Διάλεξε κλιματιστικό στις ρυθμίσεις της κάρτας.";
      this._applyThemeAndBackground("off");
      return;
    }

    const a = climate.attributes || {};
    const state = climate.state;
    const isOff = state === "off";

    this._applyThemeAndBackground(state);

    // Header: mode icon (spinning fan in fan mode), live action chip.
    this._setIcon("#climateIcon", this._climateIcon(state));
    root.querySelector("#climateIcon").classList.toggle("spin", state === "fan_only");
    const actionText = CLIMA_ACTION[a.hvac_action] ?? (a.hvac_action || "");
    const action = root.querySelector("#action");
    action.textContent = actionText;
    action.classList.toggle("hidden", isOff || !actionText);

    const power = root.querySelector("#powerControl");
    power.classList.toggle("is-off", isOff);
    power.classList.toggle("is-on", !isOff);
    this._setIcon("#powerIcon", isOff ? "mdi:power-off" : "mdi:power");
    power.title = isOff ? "Ενεργοποίηση A/C" : "Απενεργοποίηση A/C";
    power.setAttribute("aria-label", power.title);

    // Temperatures
    const indoor = this._getEntityState(cfg.entity_indoor_temp);
    root.querySelector("#indoorTemp").textContent = this._temperature(indoor ? indoor.state : a.current_temperature);
    if (this._pendingTemp === null) this._showTarget(a.temperature, false);
    const noTarget = !Number.isFinite(Number(a.temperature));
    root.querySelector("#tempDown").disabled = noTarget;
    root.querySelector("#tempUp").disabled = noTarget;

    // Modes: configured on AND supported by this A/C.
    const supported = Array.isArray(a.hvac_modes) ? a.hvac_modes : null;
    CLIMA_MODES.forEach((m) => {
      const btn = root.querySelector(`.mode-btn[data-mode="${m.mode}"]`);
      let real = m.mode;
      if (supported && !supported.includes(m.mode) && m.alt && supported.includes(m.alt)) real = m.alt;
      btn.dataset.real = real;
      const visible = cfg[m.show] !== false && (!supported || supported.includes(real));
      btn.classList.toggle("hidden", !visible);
      btn.classList.toggle("active", state === real);
      btn.style.setProperty("--mode-color", cfg[m.color] || CLIMA_DEFAULTS[m.color]);
    });

    // Fan
    const fanModes = Array.isArray(a.fan_modes) ? a.fan_modes : [];
    const fan = root.querySelector("#fanControl");
    fan.classList.toggle("hidden", cfg.show_fan_speed === false || !fanModes.length);
    this._setIcon("#fanIcon", this._fanIcon(a.fan_mode));
    const fanName = climaBad(a.fan_mode) ? "" : (CLIMA_FAN[String(a.fan_mode).toLowerCase()] || a.fan_mode);
    root.querySelector("#fanLabel").textContent = fanName;
    fan.title = fanName ? `Ανεμιστήρας: ${fanName} — πάτα για αλλαγή` : "Ταχύτητα ανεμιστήρα";

    // Swing
    const swingModes = Array.isArray(a.swing_modes) ? a.swing_modes : [];
    const swing = root.querySelector("#swingControl");
    swing.classList.toggle("hidden", !swingModes.length);
    this._setIcon("#swingIcon", this._swingIcon(a.swing_mode));
    swing.title = climaBad(a.swing_mode) ? "Περσίδες" : `Περσίδες: ${a.swing_mode} — πάτα για αλλαγή`;

    // Info row
    const outside = this._getEntityState(cfg.entity_outside_temp);
    this._updateStat("#outsideStat", "#outsideValue", outside ? `${this._temperature(outside.state)}°` : "--", !!outside);

    const humidity = this._getEntityState(cfg.entity_indoor_humidity);
    let humidityText = "--";
    if (humidity) {
      const n = Number(humidity.state);
      humidityText = Number.isFinite(n) ? `${Math.round(n)}%` : `${humidity.state}%`;
    } else if (Number.isFinite(Number(a.current_humidity))) {
      humidityText = `${Math.round(a.current_humidity)}%`;
    }
    this._updateStat("#humidityStat", "#humidityValue", humidityText, humidityText !== "--");

    const powerEntity = this._getEntityState(cfg.entity_power_consumption);
    this._updateStat("#powerStat", "#powerValue", powerEntity ? this._formatPower(powerEntity) : "--",
      cfg.show_power_consumption !== false && !!powerEntity);

    const eco = this._getEntityState(cfg.entity_eco);
    this._updateStat("#ecoStat", "#ecoValue", eco ? this._formatEco(eco) : "Eco", !!eco);

    const timer = this._getEntityState(cfg.entity_timer);
    this._updateStat("#timerStat", "#timerValue", timer ? this._formatTimer(timer) : "--", !!timer);
  }

  _applyThemeAndBackground(state) {
    const card = this.shadowRoot.querySelector("ha-card");
    if (!card) return;
    const cfg = this._config;
    const colorKey = { cool: "color_cool", heat: "color_heat", dry: "color_dry", fan_only: "color_fan", heat_cool: "color_auto", auto: "color_auto" }[state] || "color_off";
    let style = "";
    Object.entries(CLIMA_THEMES[cfg.theme] || {}).forEach(([k, v]) => { style += `${k}:${v} !important;`; });
    style += `background:${cfg[colorKey] || CLIMA_DEFAULTS[colorKey]} !important;`;
    if (card.getAttribute("style") !== style) card.setAttribute("style", style);
  }
}

/* =========================================================
   VISUAL EDITOR
   ========================================================= */

const CLIMA_LABELS = {
  title: "Τίτλος", subtitle: "Υπότιτλος", image_url: "Εικόνα (URL)", theme: "Θέμα",
  entity_climate: "Κλιματιστικό", entity_indoor_temp: "Θερμοκρασία χώρου", entity_indoor_humidity: "Υγρασία χώρου",
  entity_outside_temp: "Εξωτερική θερμοκρασία", entity_power_consumption: "Κατανάλωση", entity_eco: "Eco", entity_timer: "Χρονοδιακόπτης",
  show_mode_cool: "Ψύξη", show_mode_heat: "Θέρμανση", show_mode_fan: "Ανεμιστήρας", show_mode_dry: "Αφύγρανση",
  show_mode_auto: "Auto", show_fan_speed: "Κουμπί ανεμιστήρα", show_power_consumption: "Κατανάλωση",
  color_cool: "Ψύξη", color_heat: "Θέρμανση", color_dry: "Αφύγρανση", color_fan: "Ανεμιστήρας", color_auto: "Auto", color_off: "Σβηστό",
};

const climaEntity = (name, domains, device_class) => ({
  name, selector: { entity: { filter: device_class ? { domain: domains, device_class } : { domain: domains } } },
});

const CLIMA_SCHEMA = [
  climaEntity("entity_climate", ["climate"]),
  { type: "grid", name: "", schema: [{ name: "title", selector: { text: {} } }, { name: "subtitle", selector: { text: {} } }] },
  {
    type: "expandable", title: "Αισθητήρες", icon: "mdi:thermometer-lines", expanded: true,
    schema: [
      climaEntity("entity_indoor_temp", ["sensor"], "temperature"),
      climaEntity("entity_indoor_humidity", ["sensor"], "humidity"),
      climaEntity("entity_outside_temp", ["sensor", "weather"]),
      climaEntity("entity_power_consumption", ["sensor"]),
      climaEntity("entity_eco", ["switch", "binary_sensor", "input_boolean", "sensor", "select"]),
      climaEntity("entity_timer", ["timer", "sensor", "number", "select"]),
    ],
  },
  {
    type: "expandable", title: "Εμφάνιση", icon: "mdi:eye-outline",
    schema: [
      { type: "grid", name: "", schema: ["show_mode_cool", "show_mode_heat", "show_mode_fan", "show_mode_dry", "show_mode_auto", "show_fan_speed", "show_power_consumption"].map((name) => ({ name, selector: { boolean: {} } })) },
      { name: "theme", selector: { select: { mode: "dropdown", options: [
        { value: "", label: "Κανένα" },
        { value: "ios-dark-mode", label: "iOS dark" },
        { value: "ios-dark-mode-blue-red", label: "iOS dark μπλε-κόκκινο" },
      ] } } },
      { name: "image_url", selector: { text: {} } },
    ],
  },
  {
    type: "expandable", title: "Χρώματα φόντου ανά λειτουργία (χρώμα ή CSS gradient)", icon: "mdi:palette",
    schema: [{ type: "grid", name: "", schema: ["color_cool", "color_heat", "color_dry", "color_fan", "color_auto", "color_off"].map((name) => ({ name, selector: { text: {} } })) }],
  },
];

class ClimaCardEditor extends HTMLElement {
  setConfig(config) {
    this._config = climaMigrate(config);
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    if (this._form) this._form.hass = hass;
  }

  async _render() {
    if (!this._form) {
      // ha-form and its pickers are lazy-loaded by HA; any built-in card editor pulls them in.
      if (!customElements.get("ha-form") && window.loadCardHelpers) {
        const helpers = await window.loadCardHelpers();
        const c = await helpers.createCardElement({ type: "entities", entities: [] });
        await c.constructor.getConfigElement?.();
      }
      this._form = document.createElement("ha-form");
      this._form.computeLabel = (s) => CLIMA_LABELS[s.name] ?? s.name;
      this._form.addEventListener("value-changed", (ev) => {
        ev.stopPropagation();
        this._config = climaMigrate({ ...this._config, ...ev.detail.value });
        this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: this._config }, bubbles: true, composed: true }));
      });
      this.appendChild(this._form);
    }
    this._form.hass = this._hass;
    this._form.schema = CLIMA_SCHEMA;
    this._form.data = { ...CLIMA_DEFAULTS, ...this._config };
  }
}

if (!customElements.get("clima-card")) customElements.define("clima-card", ClimaCard);
if (!customElements.get("clima-card-editor")) customElements.define("clima-card-editor", ClimaCardEditor);

window.customCards = window.customCards || [];
if (!window.customCards.some((c) => c.type === "clima-card")) {
  window.customCards.push({
    type: "clima-card",
    name: "Clima Card",
    description: "Συμπαγής κάρτα κλιματιστικού: θερμοκρασίες, λειτουργίες, ανεμιστήρας, περσίδες, κατανάλωση.",
    preview: true,
    documentationURL: "https://github.com/stathisktm/clima-card",
  });
}

console.info(`%c CLIMA-CARD %c ${CLIMA_VERSION} `, "background:#2196f3;color:#fff;border-radius:3px 0 0 3px;padding:1px 4px", "background:#222;color:#fff;border-radius:0 3px 3px 0;padding:1px 4px");
