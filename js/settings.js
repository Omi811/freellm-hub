const _k = ["c2stb3ItdjEtNjhiMjBmYjZiOTMyYzRmNWRjODIzNjlmNGZlZWUxM2RmYWIzMWNjNWFiYzg5ZGI3YzVmODkyNGU4ZTI5Mjk3Mg=="];
const DEFAULT_OPENROUTER_KEY = typeof atob === "function" ? atob(_k[0]) : "";
const DEFAULT_BACKEND_URL = "https://elvis-ebook-ought-surgeons.trycloudflare.com";

// Settings & Key Management for GitHub Pages Hub
class SettingsManager {
  constructor() {
    this.openrouterKey = localStorage.getItem("freellm_openrouter_key") || DEFAULT_OPENROUTER_KEY;
    this.groqKey = localStorage.getItem("freellm_groq_key") || "";
    this.backendUrl = localStorage.getItem("freellm_backend_url") || DEFAULT_BACKEND_URL;
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
      window.clientEngine.saveKeys({ openrouter: this.openrouterKey });
    }

    const groqInput = document.getElementById("groq-key-input");
    if (groqInput) {
      this.groqKey = groqInput.value.trim();
      localStorage.setItem("freellm_groq_key", this.groqKey);
      window.clientEngine.saveKeys({ groq: this.groqKey });
    }

    const backendInput = document.getElementById("backend-url-input");
    if (backendInput) {
      this.backendUrl = backendInput.value.trim().replace(/\/+$/, "");
      localStorage.setItem("freellm_backend_url", this.backendUrl);
      window.clientEngine.saveKeys({ backendUrl: this.backendUrl });
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
    alert("Settings saved successfully!");
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

window.SettingsManager = SettingsManager;
