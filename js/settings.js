// Settings & Key Management for GitHub Pages Hub
class SettingsManager {
  constructor() {
    window.settings = this;
    const cfg = window.HUB_CONFIG || {};
    this.openrouterKey = localStorage.getItem("freellm_openrouter_key") || cfg.defaultOpenrouterKey || "";
    this.groqKey = localStorage.getItem("freellm_groq_key") || cfg.defaultGroqKey || "";

    const oldTunnels = [
      "contrary-qty-slope-conferences.trycloudflare.com",
      "timeline-mistakes-niagara-units.trycloudflare.com"
    ];
    let savedBackend = localStorage.getItem("freellm_backend_url") || localStorage.getItem("selfHostedUrl");
    if (savedBackend && oldTunnels.some(t => savedBackend.includes(t))) {
      savedBackend = cfg.defaultBackendUrl || "https://wolf-competitive-reveals-glow.trycloudflare.com";
      localStorage.setItem("freellm_backend_url", savedBackend);
      localStorage.setItem("selfHostedUrl", savedBackend);
    }

    const isLocalhost = typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
    if (isLocalhost) {
      this.backendUrl = window.location.origin.includes("5000") ? window.location.origin : "http://localhost:5000";
      localStorage.setItem("freellm_backend_url", this.backendUrl);
    } else if (!savedBackend || savedBackend.includes("trycloudflare.com")) {
      this.backendUrl = cfg.defaultBackendUrl || "https://wolf-competitive-reveals-glow.trycloudflare.com";
      if (this.backendUrl) {
        localStorage.setItem("freellm_backend_url", this.backendUrl);
      }
    } else {
      this.backendUrl = savedBackend;
    }

    // OmniRoute Gateway Base URL (:20128)
    this.omnirouteUrl = localStorage.getItem("omniroute_url") || localStorage.getItem("freellm_omniroute_url") || (isLocalhost ? "http://localhost:20128" : (this.backendUrl || "http://localhost:20128"));
    localStorage.setItem("omniroute_url", this.omnirouteUrl);

    this.systemPrompt = localStorage.getItem("freellm_system_prompt") || "";
    this.temperature = parseFloat(localStorage.getItem("freellm_temperature") || "0.7");
    this.maxTokens = parseInt(localStorage.getItem("freellm_max_tokens") || "4096");
    this.isOpen = false;
  }

  init() {
    this.setupEventListeners();
    this.syncFormValues();
  }

  openModal() {
    this.isOpen = true;
    const modal = document.getElementById("settings-modal");
    if (modal) {
      this.syncFormValues();
      modal.classList.remove("hidden");
    }
  }

  closeModal() {
    this.isOpen = false;
    const modal = document.getElementById("settings-modal");
    if (modal) {
      modal.classList.add("hidden");
    }
  }

  syncFormValues() {
    const orInput = document.getElementById("openrouter-key-input");
    if (orInput) orInput.value = this.openrouterKey;

    const groqInput = document.getElementById("groq-key-input");
    if (groqInput) groqInput.value = this.groqKey;

    const backendInput = document.getElementById("backend-url-input");
    if (backendInput) backendInput.value = this.backendUrl;

    const omniInput = document.getElementById("omniroute-url-input");
    if (omniInput) omniInput.value = this.omnirouteUrl;

    const promptInput = document.getElementById("system-prompt-input");
    if (promptInput) promptInput.value = this.systemPrompt;

    const tempSlider = document.getElementById("temp-slider");
    const tempVal = document.getElementById("temp-val");
    if (tempSlider && tempVal) {
      tempSlider.value = this.temperature;
      tempVal.textContent = this.temperature;
    }

    const tokensSlider = document.getElementById("tokens-slider");
    const tokensVal = document.getElementById("tokens-val");
    if (tokensSlider && tokensVal) {
      tokensSlider.value = this.maxTokens;
      tokensVal.textContent = this.maxTokens;
    }
  }

  saveSettings() {
    const orInput = document.getElementById("openrouter-key-input");
    if (orInput) {
      this.openrouterKey = orInput.value.trim();
      localStorage.setItem("freellm_openrouter_key", this.openrouterKey);
      if (window.clientEngine) window.clientEngine.saveKeys({ openrouter: this.openrouterKey });
    }

    const groqInput = document.getElementById("groq-key-input");
    if (groqInput) {
      this.groqKey = groqInput.value.trim();
      localStorage.setItem("freellm_groq_key", this.groqKey);
      if (window.clientEngine) window.clientEngine.saveKeys({ groq: this.groqKey });
    }

    const backendInput = document.getElementById("backend-url-input");
    if (backendInput) {
      this.backendUrl = backendInput.value.trim().replace(/\/+$/, "");
      localStorage.setItem("freellm_backend_url", this.backendUrl);
      if (window.clientEngine) window.clientEngine.saveKeys({ backendUrl: this.backendUrl });
    }

    const omniInput = document.getElementById("omniroute-url-input");
    if (omniInput && omniInput.value.trim()) {
      this.omnirouteUrl = omniInput.value.trim().replace(/\/+$/, "");
      localStorage.setItem("omniroute_url", this.omnirouteUrl);
      localStorage.setItem("freellm_omniroute_url", this.omnirouteUrl);
    }

    const promptInput = document.getElementById("system-prompt-input");
    if (promptInput) {
      this.systemPrompt = promptInput.value.trim();
      localStorage.setItem("freellm_system_prompt", this.systemPrompt);
    }

    const tempSlider = document.getElementById("temp-slider");
    if (tempSlider) {
      this.temperature = parseFloat(tempSlider.value);
      localStorage.setItem("freellm_temperature", this.temperature);
    }

    const tokensSlider = document.getElementById("tokens-slider");
    if (tokensSlider) {
      this.maxTokens = parseInt(tokensSlider.value);
      localStorage.setItem("freellm_max_tokens", this.maxTokens);
    }

    this.closeModal();
    if (window.app && window.app.showCommandToast) {
      window.app.showCommandToast("💾 Settings saved successfully!");
    } else {
      alert("Settings saved successfully!");
    }
  }

  setupEventListeners() {
    const trigger = document.getElementById("settings-trigger-btn");
    if (trigger) trigger.addEventListener("click", () => this.openModal());

    const closeBtn = document.getElementById("close-settings-modal-btn");
    if (closeBtn) closeBtn.addEventListener("click", () => this.closeModal());

    const saveBtn = document.getElementById("save-settings-btn");
    if (saveBtn) saveBtn.addEventListener("click", () => this.saveSettings());

    const tempSlider = document.getElementById("temp-slider");
    const tempVal = document.getElementById("temp-val");
    if (tempSlider && tempVal) {
      tempSlider.addEventListener("input", (e) => {
        tempVal.textContent = e.target.value;
      });
    }

    const tokensSlider = document.getElementById("tokens-slider");
    const tokensVal = document.getElementById("tokens-val");
    if (tokensSlider && tokensVal) {
      tokensSlider.addEventListener("input", (e) => {
        tokensVal.textContent = e.target.value;
      });
    }
  }
}

window.getOmniRouteBaseUrl = function() {
  if (typeof localStorage !== "undefined") {
    const stored = localStorage.getItem("omniroute_url") || localStorage.getItem("freellm_omniroute_url");
    if (stored) return stored.replace(/\/+$/, "");
  }
  if (window.settings && window.settings.omnirouteUrl) {
    return window.settings.omnirouteUrl.replace(/\/+$/, "");
  }
  const isLocalhost = typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
  return isLocalhost ? "http://localhost:20128" : "https://wolf-competitive-reveals-glow.trycloudflare.com";
};

window.SettingsManager = SettingsManager;
