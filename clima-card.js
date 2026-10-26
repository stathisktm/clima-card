class ClimaCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = {};
    this._hass = null;
  }

  setConfig(config) {
    if (!config || typeof config !== "object") {
      throw new Error("Invalid configuration");
    }

    const cfg = { ...config };

    if (
      !cfg.entity_indoor_humidity &&
      cfg.null &&
      typeof cfg.null === "string"
    ) {
      cfg.entity_indoor_humidity = cfg.null;
    }

    delete cfg.null;

    this._config = {
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

      ...cfg
    };

    this._render();
  }

  set hass(hass) {
    this._hass = hass;

    if (!this.shadowRoot.querySelector("ha-card")) {
      this._render();
    }

    this._updateState();
  }

  _render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          width: 100%;
          box-sizing: border-box;
        }

        * {
          box-sizing: border-box;
        }

        ha-card {
          position: relative;
          overflow: hidden;
          padding: 7px 11px 8px;
          border-radius: 14px;
          color: var(--primary-text-color, #fff);
          box-shadow:
            var(
              --ha-card-box-shadow,
              0 4px 16px rgba(0,0,0,.18)
            );
          transition:
            background 200ms ease;
        }

        /* =========================
           HEADER
           ========================= */

        .card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          min-height: 27px;
          margin-bottom: 4px;
        }

        .title-wrap {
          min-width: 0;
          flex: 1;
          cursor: pointer;
          user-select: none;
        }

        .title-wrap:active {
          transform: scale(.985);
        }

        .title-row {
          display: flex;
          align-items: center;
          gap: 5px;
          min-width: 0;
          height: 22px;
        }

        .climate-icon {
          --mdc-icon-size: 17px;
          width: 17px;
          height: 17px;
          flex-shrink: 0;
          display: inline-flex;
        }

        .title {
          font-size: 14px;
          font-weight: 700;
          line-height: 18px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .subtitle {
          margin: 0 0 0 22px;
          font-size: 9px;
          line-height: 10px;
          opacity: .58;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /*
         * When a subtitle exists, keep it visually
         * beside the title instead of creating a
         * second large header row.
         */
        .title-inline {
          display: flex;
          align-items: baseline;
          gap: 6px;
          min-width: 0;
        }

        .title-inline .subtitle {
          margin: 0;
          flex-shrink: 1;
        }

        /* =========================
           POWER BUTTON
           ========================= */

        .power-control {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 30px;
          min-width: 30px;
          height: 27px;
          padding: 0;
          border-radius: 8px;
          border: 1px solid rgba(255,255,255,.14);
          background: rgba(255,255,255,.10);
          color: #fff;
          cursor: pointer;
          flex-shrink: 0;
          transition:
            background 120ms ease,
            transform 100ms ease,
            opacity 150ms ease;
        }

        .power-control ha-icon {
          --mdc-icon-size: 17px;
          width: 17px;
          height: 17px;
          display: inline-flex;
        }

        .power-control.is-on {
          background: rgba(255,255,255,.16);
          border-color: rgba(255,255,255,.22);
        }

        .power-control.is-off {
          opacity: .68;
          background: rgba(0,0,0,.15);
        }

        .power-control:hover {
          background: rgba(255,255,255,.20);
        }

        .power-control:active {
          transform: scale(.88);
        }

        .power-control:focus-visible {
          outline: 1px solid rgba(255,255,255,.70);
          outline-offset: 1px;
        }

        /* =========================
           TEMPERATURE
           ========================= */

        .hero {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          min-height: 50px;
          padding: 4px 8px;
          margin-bottom: 5px;
          border-radius: 10px;
          background: rgba(0,0,0,.10);
          border: 1px solid rgba(255,255,255,.08);
        }

        .temperature-block {
          display: flex;
          align-items: baseline;
          min-width: 0;
        }

        .indoor-temp {
          font-size: 31px;
          line-height: 32px;
          font-weight: 700;
          letter-spacing: -1.2px;
        }

        .temp-unit {
          margin-left: 2px;
          font-size: 11px;
          opacity: .70;
        }

        .indoor-label {
          margin-left: 4px;
          font-size: 9px;
          opacity: .55;
        }

        .target-block {
          display: flex;
          align-items: center;
          gap: 3px;
          flex-shrink: 0;
        }

        .temp-control {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 26px;
          height: 26px;
          padding: 0;
          border: 0;
          border-radius: 8px;
          background: rgba(255,255,255,.10);
          color: inherit;
          font-size: 17px;
          cursor: pointer;
        }

        .temp-control:active {
          transform: scale(.90);
        }

        .target-temp {
          min-width: 43px;
          text-align: center;
          font-size: 17px;
          line-height: 22px;
          font-weight: 700;
        }

        .target-label {
          display: block;
          text-align: center;
          font-size: 8px;
          line-height: 9px;
          opacity: .55;
        }

        .hero-image {
          width: 38px;
          height: 38px;
          flex-shrink: 0;
          object-fit: cover;
          border-radius: 9px;
          opacity: .90;
        }

        /* =========================
           HVAC MODES
           ========================= */

        .modes {
          display: flex;
          align-items: center;
          gap: 4px;
          width: 100%;
          margin-bottom: 5px;
          overflow-x: auto;
          scrollbar-width: none;
        }

        .modes::-webkit-scrollbar {
          display: none;
        }

        .mode-btn {
          flex: 1 1 0;
          min-width: 42px;
          height: 27px;
          padding: 3px 5px;
          border: 1px solid rgba(255,255,255,.10);
          border-radius: 8px;
          background: rgba(0,0,0,.13);
          color: inherit;
          font-size: 9px;
          font-weight: 600;
          white-space: nowrap;
          cursor: pointer;
          opacity: .70;
          transition:
            background 150ms ease,
            opacity 150ms ease,
            transform 100ms ease;
        }

        .mode-btn.active {
          opacity: 1;
          border-color: rgba(255,255,255,.25);
        }

        .mode-btn:active {
          transform: scale(.96);
        }

        .mode-btn[data-mode="cool"].active {
          background: var(--clima-cool);
        }

        .mode-btn[data-mode="heat"].active {
          background: var(--clima-heat);
        }

        .mode-btn[data-mode="dry"].active {
          background: var(--clima-dry);
        }

        .mode-btn[data-mode="fan_only"].active {
          background: var(--clima-fan);
        }

        .mode-btn[data-mode="heat_cool"].active {
          background: var(--clima-auto);
        }

        /* =========================
           COMPACT INFO ROW
           ========================= */

        .compact-row {
          display: flex;
          align-items: center;
          width: 100%;
          min-height: 31px;
          padding: 3px 6px;
          border-radius: 9px;
          background: rgba(0,0,0,.11);
          border: 1px solid rgba(255,255,255,.07);
          overflow: hidden;
        }

        .stats {
          display: flex;
          align-items: center;
          justify-content: flex-start;
          gap: 6px;
          width: 100%;
          min-width: 0;
          flex-wrap: nowrap;
          overflow-x: auto;
          overflow-y: hidden;
          scrollbar-width: none;
        }

        .stats::-webkit-scrollbar {
          display: none;
        }

        .stat {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 3px;
          flex: 0 0 auto;
          height: 23px;
          min-width: 0;
          padding: 1px 2px;
          font-size: 9px;
          line-height: 18px;
          white-space: nowrap;
          opacity: .90;
        }

        .stat > ha-icon {
          --mdc-icon-size: 14px;
          width: 14px;
          height: 14px;
          flex-shrink: 0;
          display: inline-flex;
          opacity: .90;
        }

        .stat-value {
          font-weight: 600;
        }

        /* =========================
           FAN / SWING
           ========================= */

        .fan-control,
        .swing-control {
          display: inline-flex !important;
          align-items: center;
          justify-content: center;
          width: 29px !important;
          min-width: 29px !important;
          max-width: 29px;
          height: 27px !important;
          min-height: 27px;
          padding: 0 !important;
          margin: 0;
          border-radius: 8px;
          background: rgba(255,255,255,.11);
          border: 1px solid rgba(255,255,255,.12);
          cursor: pointer;
          opacity: 1 !important;
          color: #fff;
          transition:
            background 120ms ease,
            transform 100ms ease;
        }

        .fan-control ha-icon,
        .swing-control ha-icon {
          --mdc-icon-size: 18px;
          width: 18px;
          height: 18px;
          display: inline-flex;
          flex-shrink: 0;
          opacity: 1 !important;
          color: #fff;
        }

        .fan-control:hover,
        .swing-control:hover {
          background: rgba(255,255,255,.18);
        }

        .fan-control:active,
        .swing-control:active {
          transform: scale(.88);
          background: rgba(255,255,255,.24);
        }

        .fan-control:focus-visible,
        .swing-control:focus-visible {
          outline: 1px solid rgba(255,255,255,.70);
          outline-offset: 1px;
        }

        .hidden {
          display: none !important;
        }

        @media (max-width: 430px) {
          ha-card {
            padding: 6px 9px 7px;
          }

          .stats {
            gap: 5px;
          }

          .stat {
            font-size: 8px;
          }

          .title {
            font-size: 13px;
          }

          .subtitle {
            font-size: 8px;
          }

          .fan-control,
          .swing-control {
            width: 27px !important;
            min-width: 27px !important;
            max-width: 27px;
          }

          .fan-control ha-icon,
          .swing-control ha-icon {
            --mdc-icon-size: 17px;
            width: 17px;
            height: 17px;
          }
        }
      </style>

      <ha-card>

        <div class="card-header">

          <div
            class="title-wrap"
            id="titleWrap"
            title="Πληροφορίες A/C"
          >
            <div class="title-row">

              <ha-icon
                id="climateIcon"
                class="climate-icon"
                icon="mdi:air-conditioner"
              ></ha-icon>

              <div class="title-inline">

                <div
                  id="title"
                  class="title"
                ></div>

                <div
                  id="subtitle"
                  class="subtitle"
                ></div>

              </div>

            </div>
          </div>

          <button
            id="powerControl"
            class="power-control"
            type="button"
            title="Ενεργοποίηση / απενεργοποίηση"
            aria-label="Ενεργοποίηση / απενεργοποίηση"
          >
            <ha-icon
              id="powerIcon"
              icon="mdi:power-off"
            ></ha-icon>
          </button>

        </div>

        <div class="hero">

          <div class="temperature-block">

            <span
              id="indoorTemp"
              class="indoor-temp"
            >--</span>

            <span class="temp-unit">
              °C
            </span>

            <span class="indoor-label">
              χώρος
            </span>

          </div>

          <img
            id="heroImage"
            class="hero-image hidden"
            alt=""
          />

          <div class="target-block">

            <button
              id="tempDown"
              class="temp-control"
              type="button"
            >−</button>

            <div>
              <div
                id="targetTemp"
                class="target-temp"
              >--</div>

              <span class="target-label">
                στόχος
              </span>
            </div>

            <button
              id="tempUp"
              class="temp-control"
              type="button"
            >+</button>

          </div>

        </div>

        <div
          id="modes"
          class="modes"
        >

          <button
            class="mode-btn"
            data-mode="cool"
            type="button"
          >
            ❄ Ψύξη
          </button>

          <button
            class="mode-btn"
            data-mode="heat"
            type="button"
          >
            ☀ Θέρμανση
          </button>

          <button
            class="mode-btn"
            data-mode="fan_only"
            type="button"
          >
            🌀 Ανεμ.
          </button>

          <button
            class="mode-btn"
            data-mode="dry"
            type="button"
          >
            💧 Dry
          </button>

          <button
            class="mode-btn"
            data-mode="heat_cool"
            type="button"
          >
            AUTO
          </button>

        </div>

        <div
          id="compactRow"
          class="compact-row"
        >

          <div
            id="stats"
            class="stats"
          >

            <div
              id="outsideStat"
              class="stat hidden"
            >
              <ha-icon
                icon="mdi:thermometer"
              ></ha-icon>

              <span
                id="outsideValue"
                class="stat-value"
              >--</span>
            </div>

            <div
              id="humidityStat"
              class="stat hidden"
            >
              <ha-icon
                icon="mdi:water-percent"
              ></ha-icon>

              <span
                id="humidityValue"
                class="stat-value"
              >--</span>
            </div>

            <div
              id="powerStat"
              class="stat hidden"
            >
              <ha-icon
                icon="mdi:flash"
              ></ha-icon>

              <span
                id="powerValue"
                class="stat-value"
              >--</span>
            </div>

            <div
              id="fanControl"
              class="fan-control"
              title="Αλλαγή ταχύτητας ανεμιστήρα"
              role="button"
              tabindex="0"
              aria-label="Αλλαγή ταχύτητας ανεμιστήρα"
            >
              <ha-icon
                id="fanIcon"
                icon="mdi:fan"
              ></ha-icon>
            </div>

            <div
              id="swingControl"
              class="swing-control"
              title="Αλλαγή περσίδων"
              role="button"
              tabindex="0"
              aria-label="Αλλαγή περσίδων"
            >
              <ha-icon
                id="swingIcon"
                icon="mdi:swap-vertical-variant"
              ></ha-icon>
            </div>

            <div
              id="ecoStat"
              class="stat hidden"
            >
              <ha-icon
                icon="mdi:leaf"
              ></ha-icon>

              <span
                id="ecoValue"
                class="stat-value"
              >Eco</span>
            </div>

            <div
              id="timerStat"
              class="stat hidden"
            >
              <ha-icon
                icon="mdi:timer-outline"
              ></ha-icon>

              <span
                id="timerValue"
                class="stat-value"
              >--</span>
            </div>

          </div>
        </div>

      </ha-card>
    `;

    const title =
      this.shadowRoot.querySelector("#title");

    const subtitle =
      this.shadowRoot.querySelector("#subtitle");

    if (title) {
      title.textContent =
        this._config.title || "";
    }

    if (subtitle) {
      subtitle.textContent =
        this._config.subtitle || "";

      subtitle.classList.toggle(
        "hidden",
        !this._config.subtitle
      );
    }

    this._applyThemeAndBackground();
    this._applyVisibility();
    this._bindEvents();
    this._updateState();
  }

  _bindEvents() {
    const root = this.shadowRoot;

    root.querySelector("#titleWrap")?.addEventListener(
      "click",
      () => this._openMoreInfo()
    );

    root.querySelector("#powerControl")?.addEventListener(
      "click",
      () => this._togglePower()
    );

    root.querySelector("#tempDown")?.addEventListener(
      "click",
      () => this._changeTemp(-0.5)
    );

    root.querySelector("#tempUp")?.addEventListener(
      "click",
      () => this._changeTemp(0.5)
    );

    root.querySelectorAll(".mode-btn").forEach((button) => {
      button.addEventListener("click", () => {
        this._setHvacMode(button.dataset.mode);
      });
    });

    const fan =
      root.querySelector("#fanControl");

    fan?.addEventListener(
      "click",
      () => this._cycleFanMode()
    );

    fan?.addEventListener(
      "keydown",
      (event) => {
        if (
          event.key === "Enter" ||
          event.key === " "
        ) {
          event.preventDefault();
          this._cycleFanMode();
        }
      }
    );

    const swing =
      root.querySelector("#swingControl");

    swing?.addEventListener(
      "click",
      () => this._cycleSwingMode()
    );

    swing?.addEventListener(
      "keydown",
      (event) => {
        if (
          event.key === "Enter" ||
          event.key === " "
        ) {
          event.preventDefault();
          this._cycleSwingMode();
        }
      }
    );
  }

  async _togglePower() {
    const entityId =
      this._config.entity_climate;

    const entity =
      this._getEntityState(entityId);

    if (
      !this._hass ||
      !entityId ||
      !entity
    ) {
      return;
    }

    try {
      if (entity.state === "off") {
        await this._hass.callService(
          "climate",
          "turn_on",
          {
            entity_id: entityId
          }
        );
      } else {
        await this._hass.callService(
          "climate",
          "turn_off",
          {
            entity_id: entityId
          }
        );
      }
    } catch (error) {
      console.error(
        "clima-card toggle power:",
        error
      );
    }
  }

  _openMoreInfo() {
    const entityId =
      this._config.entity_climate;

    if (!entityId) return;

    this.dispatchEvent(
      new CustomEvent("hass-more-info", {
        detail: {
          entityId
        },
        bubbles: true,
        composed: true
      })
    );
  }

  async _setHvacMode(mode) {
    const entityId =
      this._config.entity_climate;

    if (
      !this._hass ||
      !entityId ||
      !mode
    ) {
      return;
    }

    try {
      await this._hass.callService(
        "climate",
        "set_hvac_mode",
        {
          entity_id: entityId,
          hvac_mode: mode
        }
      );
    } catch (error) {
      console.error(
        "clima-card set_hvac_mode:",
        error
      );
    }
  }

  async _cycleFanMode() {
    const entityId =
      this._config.entity_climate;

    const entity =
      this._getEntityState(entityId);

    if (!entity || !this._hass) {
      return;
    }

    const modes =
      Array.isArray(
        entity.attributes?.fan_modes
      )
        ? entity.attributes.fan_modes
        : [];

    if (!modes.length) {
      return;
    }

    const current =
      entity.attributes?.fan_mode;

    const currentIndex =
      modes.indexOf(current);

    const nextIndex =
      currentIndex >= 0
        ? (currentIndex + 1) % modes.length
        : 0;

    const next =
      modes[nextIndex];

    if (!next) return;

    try {
      await this._hass.callService(
        "climate",
        "set_fan_mode",
        {
          entity_id: entityId,
          fan_mode: next
        }
      );
    } catch (error) {
      console.error(
        "clima-card set_fan_mode:",
        error
      );
    }
  }

  async _cycleSwingMode() {
    const entityId =
      this._config.entity_climate;

    const entity =
      this._getEntityState(entityId);

    if (!entity || !this._hass) {
      return;
    }

    const modes =
      Array.isArray(
        entity.attributes?.swing_modes
      )
        ? entity.attributes.swing_modes
        : [];

    if (!modes.length) {
      return;
    }

    const current =
      entity.attributes?.swing_mode;

    const currentIndex =
      modes.indexOf(current);

    const nextIndex =
      currentIndex >= 0
        ? (currentIndex + 1) % modes.length
        : 0;

    const next =
      modes[nextIndex];

    if (!next) return;

    try {
      await this._hass.callService(
        "climate",
        "set_swing_mode",
        {
          entity_id: entityId,
          swing_mode: next
        }
      );
    } catch (error) {
      console.error(
        "clima-card set_swing_mode:",
        error
      );
    }
  }

  async _changeTemp(delta) {
    const entityId =
      this._config.entity_climate;

    const entity =
      this._getEntityState(entityId);

    if (!entity || !this._hass) {
      return;
    }

    const current =
      Number(
        entity.attributes?.temperature
      );

    if (!Number.isFinite(current)) {
      return;
    }

    const min =
      Number(
        entity.attributes?.min_temp ?? 16
      );

    const max =
      Number(
        entity.attributes?.max_temp ?? 30
      );

    const configuredStep =
      Number(
        entity.attributes?.target_temp_step ?? 0.5
      );

    const step =
      Number.isFinite(configuredStep) &&
      configuredStep > 0
        ? configuredStep
        : 0.5;

    let next =
      current + delta;

    next =
      Math.round(next / step) * step;

    next =
      Math.max(
        min,
        Math.min(max, next)
      );

    next =
      Number(
        next.toFixed(2)
      );

    try {
      await this._hass.callService(
        "climate",
        "set_temperature",
        {
          entity_id: entityId,
          temperature: next
        }
      );
    } catch (error) {
      console.error(
        "clima-card set_temperature:",
        error
      );
    }
  }

  _getEntityState(entityId) {
    if (
      !this._hass ||
      !entityId
    ) {
      return null;
    }

    return (
      this._hass.states?.[entityId] ||
      null
    );
  }

  _valid(value) {
    return (
      value !== undefined &&
      value !== null &&
      value !== "" &&
      value !== "unknown" &&
      value !== "unavailable"
    );
  }

  _temperature(value) {
    if (!this._valid(value)) {
      return "--";
    }

    const number =
      Number(value);

    if (!Number.isFinite(number)) {
      return "--";
    }

    return number.toFixed(1);
  }

  _formatPower(
    value,
    attributes = {}
  ) {
    if (!this._valid(value)) {
      return "--";
    }

    const number =
      Number(value);

    const unit =
      attributes.unit_of_measurement ||
      "W";

    if (!Number.isFinite(number)) {
      return `${value} ${unit}`;
    }

    if (Math.abs(number) >= 1000) {
      return `${(
        number / 1000
      ).toFixed(1)} kW`;
    }

    return `${Math.round(number)} ${unit}`;
  }

  _getClimateIcon(state) {
    switch (state) {
      case "cool":
        return "mdi:snowflake";

      case "heat":
        return "mdi:fire";

      case "fan_only":
        return "mdi:fan";

      case "dry":
        return "mdi:water-percent";

      case "heat_cool":
        return "mdi:autorenew";

      case "off":
      default:
        return "mdi:air-conditioner";
    }
  }

  _getFanIcon(mode) {
    const key =
      String(mode || "")
        .trim()
        .toLowerCase();

    switch (key) {
      case "silent":
      case "low":
        return "mdi:fan-speed-1";

      case "medium":
        return "mdi:fan-speed-2";

      case "high":
      case "turbo":
        return "mdi:fan-speed-3";

      case "auto":
        return "mdi:fan-auto";

      case "off":
        return "mdi:fan-off";

      default:
        return "mdi:fan";
    }
  }

  _getSwingIcon(mode) {
    const key =
      String(mode || "")
        .trim()
        .toLowerCase();

    switch (key) {
      case "vertical":
        return "mdi:arrow-up-down";

      case "horizontal":
        return "mdi:arrow-left-right";

      case "both":
        return "mdi:arrow-all";

      case "off":
        return "mdi:swap-vertical-variant";

      default:
        return "mdi:swap-vertical-variant";
    }
  }

  _setIcon(selector, icon) {
    const element =
      this.shadowRoot.querySelector(
        selector
      );

    if (!element || !icon) {
      return;
    }

    try {
      element.icon = icon;
    } catch (error) {
      console.warn(
        "clima-card icon property:",
        error
      );
    }

    element.setAttribute(
      "icon",
      icon
    );

    requestAnimationFrame(() => {
      if (
        element.isConnected
      ) {
        try {
          element.icon = icon;
        } catch (error) {}

        element.setAttribute(
          "icon",
          icon
        );
      }
    });
  }

  _updateState() {
    if (
      !this._hass ||
      !this.shadowRoot
    ) {
      return;
    }

    const climate =
      this._getEntityState(
        this._config.entity_climate
      );

    if (!climate) {
      return;
    }

    const attrs =
      climate.attributes || {};

    /* =========================
       BACKGROUND
       ========================= */

    this._applyThemeAndBackground();

    /* =========================
       CLIMATE ICON
       ========================= */

    this._setIcon(
      "#climateIcon",
      this._getClimateIcon(
        climate.state
      )
    );

    /* =========================
       POWER BUTTON
       ========================= */

    const powerControl =
      this.shadowRoot.querySelector(
        "#powerControl"
      );

    if (powerControl) {
      const isOff =
        climate.state === "off";

      powerControl.classList.toggle(
        "is-off",
        isOff
      );

      powerControl.classList.toggle(
        "is-on",
        !isOff
      );

      this._setIcon(
        "#powerIcon",
        isOff
          ? "mdi:power-off"
          : "mdi:power"
      );

      powerControl.title =
        isOff
          ? "Ενεργοποίηση A/C"
          : "Απενεργοποίηση A/C";

      powerControl.setAttribute(
        "aria-label",
        powerControl.title
      );
    }

    /* =========================
       INDOOR TEMP
       ========================= */

    const indoorEntity =
      this._getEntityState(
        this._config.entity_indoor_temp
      );

    const indoorValue =
      indoorEntity
        ? indoorEntity.state
        : attrs.current_temperature;

    const indoor =
      this.shadowRoot.querySelector(
        "#indoorTemp"
      );

    if (indoor) {
      indoor.textContent =
        this._temperature(
          indoorValue
        );
    }

    /* =========================
       TARGET TEMP
       ========================= */

    const target =
      this.shadowRoot.querySelector(
        "#targetTemp"
      );

    if (target) {
      target.textContent =
        this._temperature(
          attrs.temperature
        );
    }

    /* =========================
       HVAC BUTTONS
       ========================= */

    this.shadowRoot
      .querySelectorAll(".mode-btn")
      .forEach((button) => {
        button.classList.toggle(
          "active",
          button.dataset.mode ===
            climate.state
        );
      });

    /* =========================
       FAN
       ========================= */

    const fanMode =
      attrs.fan_mode;

    this._setIcon(
      "#fanIcon",
      this._getFanIcon(
        fanMode
      )
    );

    const fanControl =
      this.shadowRoot.querySelector(
        "#fanControl"
      );

    if (fanControl) {
      fanControl.classList.toggle(
        "hidden",
        this._config.show_fan_speed === false
      );

      const fanText =
        this._valid(fanMode)
          ? `Ανεμιστήρας: ${fanMode}`
          : "Αλλαγή ταχύτητας ανεμιστήρα";

      fanControl.title =
        fanText;

      fanControl.setAttribute(
        "aria-label",
        `${fanText}. Πατήστε για αλλαγή.`
      );
    }

    /* =========================
       SWING
       ========================= */

    const swingMode =
      attrs.swing_mode;

    this._setIcon(
      "#swingIcon",
      this._getSwingIcon(
        swingMode
      )
    );

    const swingControl =
      this.shadowRoot.querySelector(
        "#swingControl"
      );

    if (swingControl) {
      swingControl.classList.remove(
        "hidden"
      );

      const swingText =
        this._valid(swingMode)
          ? `Περσίδες: ${swingMode}`
          : "Αλλαγή περσίδων";

      swingControl.title =
        swingText;

      swingControl.setAttribute(
        "aria-label",
        `${swingText}. Πατήστε για αλλαγή.`
      );
    }

    /* =========================
       OUTSIDE TEMP
       ========================= */

    const outsideEntity =
      this._getEntityState(
        this._config.entity_outside_temp
      );

    this._updateStat(
      "#outsideStat",
      "#outsideValue",
      outsideEntity
        ? `${this._temperature(
            outsideEntity.state
          )}°`
        : "--",
      !!outsideEntity
    );

    /* =========================
       HUMIDITY
       ========================= */

    const humidityEntity =
      this._getEntityState(
        this._config.entity_indoor_humidity
      );

    let humidityText =
      "--";

    if (humidityEntity) {
      const number =
        Number(
          humidityEntity.state
        );

      humidityText =
        Number.isFinite(number)
          ? `${Math.round(number)}%`
          : `${humidityEntity.state}%`;
    }

    this._updateStat(
      "#humidityStat",
      "#humidityValue",
      humidityText,
      !!humidityEntity
    );

    /* =========================
       POWER CONSUMPTION
       ========================= */

    const powerEntity =
      this._getEntityState(
        this._config.entity_power_consumption
      );

    const showPower =
      this._config.show_power_consumption !== false;

    this._updateStat(
      "#powerStat",
      "#powerValue",
      powerEntity
        ? this._formatPower(
            powerEntity.state,
            powerEntity.attributes
          )
        : "--",
      showPower && !!powerEntity
    );

    /* =========================
       ECO
       ========================= */

    const ecoEntity =
      this._getEntityState(
        this._config.entity_eco
      );

    this._updateStat(
      "#ecoStat",
      "#ecoValue",
      ecoEntity
        ? this._formatEco(
            ecoEntity
          )
        : "Eco",
      !!ecoEntity
    );

    /* =========================
       TIMER
       ========================= */

    const timerEntity =
      this._getEntityState(
        this._config.entity_timer
      );

    this._updateStat(
      "#timerStat",
      "#timerValue",
      timerEntity
        ? timerEntity.state
        : "--",
      !!timerEntity
    );

    const row =
      this.shadowRoot.querySelector(
        "#compactRow"
      );

    if (row) {
      row.classList.remove(
        "hidden"
      );
    }
  }

  _updateStat(
    statSelector,
    valueSelector,
    value,
    visible
  ) {
    const stat =
      this.shadowRoot.querySelector(
        statSelector
      );

    const valueEl =
      this.shadowRoot.querySelector(
        valueSelector
      );

    if (!stat) return;

    stat.classList.toggle(
      "hidden",
      !visible
    );

    if (valueEl) {
      valueEl.textContent =
        value ?? "--";
    }
  }

  _formatEco(entity) {
    const state =
      String(entity.state)
        .toLowerCase();

    if (
      state === "on" ||
      state === "true" ||
      state === "1"
    ) {
      return "Eco";
    }

    if (
      state === "off" ||
      state === "false" ||
      state === "0"
    ) {
      return "--";
    }

    return entity.state;
  }

  _applyThemeAndBackground() {
    const card =
      this.shadowRoot.querySelector(
        "ha-card"
      );

    if (!card) return;

    const climate =
      this._getEntityState(
        this._config.entity_climate
      );

    const state =
      climate?.state || "off";

    let color =
      this._config.color_off;

    switch (state) {
      case "cool":
        color =
          this._config.color_cool;
        break;

      case "heat":
        color =
          this._config.color_heat;
        break;

      case "dry":
        color =
          this._config.color_dry;
        break;

      case "fan_only":
        color =
          this._config.color_fan;
        break;

      case "heat_cool":
        color =
          this._config.color_auto;
        break;

      case "off":
      default:
        color =
          this._config.color_off;
        break;
    }

    const themes = {
      "ios-dark-mode-blue-red": {
        "--primary-color": "#2196f3",
        "--accent-color": "#ff5252",
        "--secondary-text-color": "#b0b0b0",
        "--primary-text-color": "#ffffff",
        "--ha-card-background": "#15171b",
        "--card-background-color": "#15171b",
        "--divider-color":
          "rgba(255,255,255,0.10)"
      },

      "ios-dark-mode": {
        "--primary-color": "#ffffff",
        "--accent-color": "#ffffff",
        "--secondary-text-color": "#aaaaaa",
        "--primary-text-color": "#ffffff",
        "--ha-card-background": "#151515",
        "--card-background-color": "#151515",
        "--divider-color":
          "rgba(255,255,255,0.10)"
      }
    };

    const theme =
      themes[this._config.theme];

    let style = "";

    if (theme) {
      Object.entries(theme).forEach(
        ([key, value]) => {
          style +=
            `${key}:${value} !important;`;
        }
      );
    }

    style +=
      `background:${color} !important;`;

    style +=
      `--clima-cool:${this._config.color_cool};`;

    style +=
      `--clima-heat:${this._config.color_heat};`;

    style +=
      `--clima-dry:${this._config.color_dry};`;

    style +=
      `--clima-fan:${this._config.color_fan};`;

    style +=
      `--clima-auto:${this._config.color_auto};`;

    style +=
      `--clima-off:${this._config.color_off};`;

    card.setAttribute(
      "style",
      style
    );
  }

  _applyVisibility() {
    if (!this.shadowRoot) return;

    const visibility = {
      cool:
        this._config.show_mode_cool !== false,

      heat:
        this._config.show_mode_heat !== false,

      fan_only:
        this._config.show_mode_fan !== false,

      dry:
        this._config.show_mode_dry !== false,

      heat_cool:
        this._config.show_mode_auto !== false
    };

    Object.entries(visibility).forEach(
      ([mode, visible]) => {
        const button =
          this.shadowRoot.querySelector(
            `.mode-btn[data-mode="${mode}"]`
          );

        if (button) {
          button.classList.toggle(
            "hidden",
            !visible
          );
        }
      }
    );

    const image =
      this.shadowRoot.querySelector(
        "#heroImage"
      );

    if (image) {
      if (this._config.image_url) {
        image.src =
          this._config.image_url;

        image.classList.remove(
          "hidden"
        );
      } else {
        image.classList.add(
          "hidden"
        );
      }
    }

    const fan =
      this.shadowRoot.querySelector(
        "#fanControl"
      );

    if (fan) {
      fan.classList.toggle(
        "hidden",
        this._config.show_fan_speed === false
      );
    }

    const swing =
      this.shadowRoot.querySelector(
        "#swingControl"
      );

    if (swing) {
      swing.classList.remove(
        "hidden"
      );
    }
  }

  static getConfigElement() {
    return document.createElement(
      "clima-card-editor"
    );
  }

  static getStubConfig() {
    return {
      type: "custom:clima-card",
      title: "A/C",
      subtitle: "",
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
      color_off: "rgba(0, 0, 0, 0.4)"
    };
  }
}


/* =========================================================
   EDITOR
   ========================================================= */

class ClimaCardEditor extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({
      mode: "open"
    });

    this._config = {};
    this._hass = null;
  }

  setConfig(config) {
    const cfg = {
      ...(config || {})
    };

    if (
      !cfg.entity_indoor_humidity &&
      cfg.null &&
      typeof cfg.null === "string"
    ) {
      cfg.entity_indoor_humidity =
        cfg.null;
    }

    delete cfg.null;

    this._config = cfg;

    this._render();
  }

  set hass(hass) {
    this._hass = hass;
  }

  _render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          padding: 8px 0;
        }

        .section {
          margin-bottom: 14px;
        }

        .section-title {
          margin-bottom: 8px;
          font-size: 12px;
          font-weight: 700;
          opacity: .85;
        }

        .grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }

        .full {
          grid-column: 1 / -1;
        }

        ha-textfield {
          width: 100%;
        }

        .switches {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 4px 12px;
        }

        ha-formfield {
          display: flex;
          align-items: center;
          min-height: 34px;
        }

        .colors {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }

        .color-input {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .color-label {
          font-size: 11px;
          opacity: .7;
        }

        input {
          width: 100%;
          min-height: 36px;
          padding: 7px 9px;
          border-radius: 6px;
          border: 1px solid var(--divider-color);
          background: var(--card-background-color);
          color: var(--primary-text-color);
          outline: none;
        }

        input:focus {
          border-color: var(--primary-color);
        }

        @media (max-width: 500px) {
          .grid,
          .colors,
          .switches {
            grid-template-columns: 1fr;
          }
        }
      </style>

      <div class="section">

        <div class="section-title">
          Βασικά
        </div>

        <div class="grid">

          <ha-textfield
            class="full"
            label="Τίτλος"
            data-prop="title"
          ></ha-textfield>

          <ha-textfield
            class="full"
            label="Υπότιτλος"
            data-prop="subtitle"
          ></ha-textfield>

          <ha-textfield
            class="full"
            label="Climate entity"
            data-prop="entity_climate"
          ></ha-textfield>

          <ha-textfield
            label="Θερμοκρασία χώρου"
            data-prop="entity_indoor_temp"
          ></ha-textfield>

          <ha-textfield
            label="Υγρασία χώρου"
            data-prop="entity_indoor_humidity"
          ></ha-textfield>

          <ha-textfield
            label="Εξωτερική θερμοκρασία"
            data-prop="entity_outside_temp"
          ></ha-textfield>

          <ha-textfield
            label="Κατανάλωση"
            data-prop="entity_power_consumption"
          ></ha-textfield>

          <ha-textfield
            label="Eco"
            data-prop="entity_eco"
          ></ha-textfield>

          <ha-textfield
            label="Timer"
            data-prop="entity_timer"
          ></ha-textfield>

          <ha-textfield
            class="full"
            label="Εικόνα URL"
            data-prop="image_url"
          ></ha-textfield>

          <ha-textfield
            class="full"
            label="Theme"
            data-prop="theme"
          ></ha-textfield>

        </div>
      </div>

      <div class="section">

        <div class="section-title">
          Εμφάνιση
        </div>

        <div class="switches">

          <ha-formfield label="Ψύξη">
            <ha-switch
              data-prop="show_mode_cool"
            ></ha-switch>
          </ha-formfield>

          <ha-formfield label="Θέρμανση">
            <ha-switch
              data-prop="show_mode_heat"
            ></ha-switch>
          </ha-formfield>

          <ha-formfield label="Ανεμιστήρας">
            <ha-switch
              data-prop="show_mode_fan"
            ></ha-switch>
          </ha-formfield>

          <ha-formfield label="Dry">
            <ha-switch
              data-prop="show_mode_dry"
            ></ha-switch>
          </ha-formfield>

          <ha-formfield label="Auto">
            <ha-switch
              data-prop="show_mode_auto"
            ></ha-switch>
          </ha-formfield>

          <ha-formfield label="Fan icon">
            <ha-switch
              data-prop="show_fan_speed"
            ></ha-switch>
          </ha-formfield>

          <ha-formfield label="Κατανάλωση">
            <ha-switch
              data-prop="show_power_consumption"
            ></ha-switch>
          </ha-formfield>

        </div>
      </div>

      <div class="section">

        <div class="section-title">
          Χρώματα / CSS
        </div>

        <div class="colors">

          <div class="color-input">
            <div class="color-label">
              Cool
            </div>
            <input
              type="text"
              data-prop="color_cool"
            />
          </div>

          <div class="color-input">
            <div class="color-label">
              Heat
            </div>
            <input
              type="text"
              data-prop="color_heat"
            />
          </div>

          <div class="color-input">
            <div class="color-label">
              Dry
            </div>
            <input
              type="text"
              data-prop="color_dry"
            />
          </div>

          <div class="color-input">
            <div class="color-label">
              Fan
            </div>
            <input
              type="text"
              data-prop="color_fan"
            />
          </div>

          <div class="color-input">
            <div class="color-label">
              Auto
            </div>
            <input
              type="text"
              data-prop="color_auto"
            />
          </div>

          <div class="color-input">
            <div class="color-label">
              Off
            </div>
            <input
              type="text"
              data-prop="color_off"
            />
          </div>

        </div>
      </div>
    `;

    this.shadowRoot
      .querySelectorAll("[data-prop]")
      .forEach((element) => {
        const prop =
          element.dataset.prop;

        if (
          element.tagName ===
          "HA-SWITCH"
        ) {
          element.checked =
            this._config[prop] !== false;
        } else {
          element.value =
            this._config[prop] ?? "";
        }

        element.addEventListener(
          "change",
          (event) =>
            this._valueChanged(event)
        );

        if (
          element.tagName !==
          "HA-SWITCH"
        ) {
          element.addEventListener(
            "input",
            (event) =>
              this._valueChanged(event)
          );
        }
      });
  }

  _valueChanged(event) {
    const element =
      event.currentTarget;

    if (
      !element?.dataset?.prop
    ) {
      return;
    }

    const prop =
      element.dataset.prop;

    let value;

    if (
      element.tagName ===
      "HA-SWITCH"
    ) {
      value =
        !!element.checked;
    } else {
      value =
        element.value;
    }

    this._config = {
      ...this._config,
      [prop]: value
    };

    delete this._config.null;

    this.dispatchEvent(
      new CustomEvent(
        "config-changed",
        {
          detail: {
            config: this._config
          },
          bubbles: true,
          composed: true
        }
      )
    );
  }
}


/* =========================================================
   CUSTOM ELEMENTS
   ========================================================= */

if (
  !customElements.get("clima-card")
) {
  customElements.define(
    "clima-card",
    ClimaCard
  );
}

if (
  !customElements.get("clima-card-editor")
) {
  customElements.define(
    "clima-card-editor",
    ClimaCardEditor
  );
}

window.customCards =
  window.customCards || [];

window.customCards.push({
  type: "clima-card",
  name: "Clima Card",
  description:
    "Compact climate card with dynamic HVAC, power, fan and swing controls.",
  preview: true,
  documentationURL: ""
});