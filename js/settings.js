// Settings & Full Workspace Customization Management for FreeLLM Hub (v3.5)
class SettingsManager {
  constructor() {
    window.settings = this;
    const cfg = window.HUB_CONFIG || {};
    this.openrouterKey = localStorage.getItem("freellm_openrouter_key") || cfg.defaultOpenrouterKey || "";
    this.groqKey = localStorage.getItem("freellm_groq_key") || cfg.defaultGroqKey || "";
    this.geminiKey = localStorage.getItem("freellm_gemini_key") || "";
    this.mistralKey = localStorage.getItem("freellm_mistral_key") || "";
    this.omnirouteKey = localStorage.getItem("omniroute_key") || "";
    this.customEndpoint = localStorage.getItem("freellm_custom_endpoint") || "";
    this.customKey = localStorage.getItem("freellm_custom_key") || "";

    const oldTunnels = [
      "contrary-qty-slope-conferences.trycloudflare.com",
      "timeline-mistakes-niagara-units.trycloudflare.com",
      "wolf-competitive-reveals-glow.trycloudflare.com",
      "lighter-hill-increase-jar.trycloudflare.com"
    ];
    let savedBackend = localStorage.getItem("freellm_backend_url") || localStorage.getItem("selfHostedUrl");
    if (savedBackend && oldTunnels.some(t => savedBackend.includes(t))) {
      savedBackend = cfg.defaultBackendUrl || "https://treasure-millennium-ivory-prizes.trycloudflare.com";
      localStorage.setItem("freellm_backend_url", savedBackend);
      localStorage.setItem("selfHostedUrl", savedBackend);
    }

    const isLocalhost = typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
    if (isLocalhost) {
      this.backendUrl = window.location.origin.includes("5000") ? window.location.origin : "http://localhost:5000";
      localStorage.setItem("freellm_backend_url", this.backendUrl);
    } else if (!savedBackend || savedBackend.includes("trycloudflare.com")) {
      this.backendUrl = cfg.defaultBackendUrl || "https://treasure-millennium-ivory-prizes.trycloudflare.com";
      if (this.backendUrl) {
        localStorage.setItem("freellm_backend_url", this.backendUrl);
      }
    } else {
      this.backendUrl = savedBackend;
    }

    this.omnirouteUrl = localStorage.getItem("omniroute_url") || (isLocalhost ? "http://localhost:20128" : (this.backendUrl || "http://localhost:20128"));
    localStorage.setItem("omniroute_url", this.omnirouteUrl);

    this.systemPrompt = localStorage.getItem("freellm_system_prompt") || "";
    this.temperature = parseFloat(localStorage.getItem("freellm_temperature") || "0.7");
    this.maxTokens = parseInt(localStorage.getItem("freellm_max_tokens") || "4096");
    this.activeTab = "keys";
    this.isOpen = false;
  }

  init() {
    this.setupEventListeners();
    this.syncFormValues();
  }

  switchTab(tabId) {
    this.activeTab = tabId;
    document.querySelectorAll(".settings-tab-btn").forEach(btn => {
      if (btn.dataset.tab === tabId) {
        btn.classList.add("bg-amber-500/20", "text-amber-400", "border-amber-500/40");
        btn.classList.remove("text-stone-400", "border-transparent");
      } else {
        btn.classList.remove("bg-amber-500/20", "text-amber-400", "border-amber-500/40");
        btn.classList.add("text-stone-400", "border-transparent");
      }
    });

    document.querySelectorAll(".settings-tab-pane").forEach(pane => {
      pane.classList.toggle("hidden", pane.id !== `settings-pane-${tabId}`);
    });

    if (tabId === "slash") {
      this.renderSlashCommandManager();
    } else if (tabId === "customize") {
      this.renderCustomizerSettings();
    }
  }

  openModal(tab = "keys") {
    this.isOpen = true;
    const modal = document.getElementById("settings-modal");
    if (modal) {
      this.syncFormValues();
      this.switchTab(tab);
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

    const geminiInput = document.getElementById("gemini-key-input");
    if (geminiInput) geminiInput.value = this.geminiKey;

    const mistralInput = document.getElementById("mistral-key-input");
    if (mistralInput) mistralInput.value = this.mistralKey;

    const omniKeyInput = document.getElementById("omniroute-key-input");
    if (omniKeyInput) omniKeyInput.value = this.omnirouteKey;

    const customEndInput = document.getElementById("custom-endpoint-input");
    if (customEndInput) customEndInput.value = this.customEndpoint;

    const customKeyInput = document.getElementById("custom-key-input");
    if (customKeyInput) customKeyInput.value = this.customKey;

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
    }

    const groqInput = document.getElementById("groq-key-input");
    if (groqInput) {
      this.groqKey = groqInput.value.trim();
      localStorage.setItem("freellm_groq_key", this.groqKey);
    }

    const geminiInput = document.getElementById("gemini-key-input");
    if (geminiInput) {
      this.geminiKey = geminiInput.value.trim();
      localStorage.setItem("freellm_gemini_key", this.geminiKey);
    }

    const mistralInput = document.getElementById("mistral-key-input");
    if (mistralInput) {
      this.mistralKey = mistralInput.value.trim();
      localStorage.setItem("freellm_mistral_key", this.mistralKey);
    }

    const omniKeyInput = document.getElementById("omniroute-key-input");
    if (omniKeyInput) {
      this.omnirouteKey = omniKeyInput.value.trim();
      localStorage.setItem("omniroute_key", this.omnirouteKey);
    }

    const customEndInput = document.getElementById("custom-endpoint-input");
    if (customEndInput) {
      this.customEndpoint = customEndInput.value.trim();
      localStorage.setItem("freellm_custom_endpoint", this.customEndpoint);
    }

    const customKeyInput = document.getElementById("custom-key-input");
    if (customKeyInput) {
      this.customKey = customKeyInput.value.trim();
      localStorage.setItem("freellm_custom_key", this.customKey);
    }

    const backendInput = document.getElementById("backend-url-input");
    if (backendInput) {
      this.backendUrl = backendInput.value.trim().replace(/\/+$/, "");
      localStorage.setItem("freellm_backend_url", this.backendUrl);
    }

    const omniInput = document.getElementById("omniroute-url-input");
    if (omniInput && omniInput.value.trim()) {
      this.omnirouteUrl = omniInput.value.trim().replace(/\/+$/, "");
      localStorage.setItem("omniroute_url", this.omnirouteUrl);
    }

    if (window.clientEngine) {
      window.clientEngine.saveKeys({
        openrouter: this.openrouterKey,
        groq: this.groqKey,
        gemini: this.geminiKey,
        mistral: this.mistralKey,
        omniroute: this.omnirouteKey,
        customEndpoint: this.customEndpoint,
        customKey: this.customKey,
        backendUrl: this.backendUrl
      });
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
      window.app.showCommandToast("💾 Settings and keys saved successfully!");
    } else {
      alert("Settings saved successfully!");
    }
  }

  // --- Visual Customizer Settings Panel ---
  renderCustomizerSettings() {
    if (!window.customStore) return;
    const store = window.customStore;

    // Theme radio cards
    const themeCards = document.querySelectorAll(".theme-card-option");
    themeCards.forEach(card => {
      const tid = card.dataset.themeId;
      const isSelected = tid === store.state.activeThemeId;
      card.classList.toggle("border-[#0A84FF]", isSelected);
      card.classList.toggle("bg-[#0A84FF]/10", isSelected);
      card.classList.toggle("shadow-sm", isSelected);
      card.classList.toggle("shadow-blue-500/10", isSelected);
    });

    const accentPicker = document.getElementById("custom-accent-picker");
    if (accentPicker && store.state.customAccent) {
      accentPicker.value = store.state.customAccent;
    }

    const widthSelect = document.getElementById("chat-width-select");
    if (widthSelect) widthSelect.value = store.state.chatMaxWidth;

    const fontSelect = document.getElementById("chat-font-select");
    if (fontSelect) fontSelect.value = store.state.chatFontSize;

    const thinkToggle = document.getElementById("thinking-autoexpand-toggle");
    if (thinkToggle) thinkToggle.checked = store.state.autoExpandThinking;
  }

  selectTheme(themeId) {
    if (window.customStore) {
      window.customStore.applyTheme(themeId);
      this.renderCustomizerSettings();
      if (window.app) window.app.showCommandToast(`🎨 Theme set to ${themeId}`);
    }
  }

  onAccentColorChange(hex) {
    if (window.customStore) {
      window.customStore.setCustomAccent(hex);
    }
  }

  onChatWidthChange(width) {
    if (window.customStore) {
      window.customStore.setChatLayout(width, null);
    }
  }

  onChatFontChange(size) {
    if (window.customStore) {
      window.customStore.setChatLayout(null, size);
    }
  }

  onThinkingToggleChange(checked) {
    if (window.customStore) {
      window.customStore.setThinkingPreference(checked);
    }
  }

  // --- Editable Quick-Stack Slash Command Manager ---
  renderSlashCommandManager() {
    if (!window.customStore) return;
    const container = document.getElementById("slash-commands-editor-list");
    if (!container) return;

    const commands = window.customStore.getSlashCommands();
    container.innerHTML = commands.map((c, i) => `
      <div class="p-3 rounded-xl border border-stone-800 bg-stone-950 flex items-center justify-between gap-3">
        <div class="flex items-center gap-2.5 flex-1 min-w-0">
          <span class="text-base">${c.icon || '⚡'}</span>
          <div class="truncate">
            <span class="font-bold text-amber-400 font-mono text-xs">${c.trigger}</span>
            <span class="text-stone-300 font-medium text-xs ml-1.5">${c.label}</span>
            <span class="text-stone-500 text-[10px] block font-mono">Model: ${c.modelId} · Temp: ${c.temperature}${c.webSearch ? ' · 🌐 Web' : ''}${c.osint ? ' · 🛰️ OSINT' : ''}</span>
          </div>
        </div>
        <div class="flex items-center gap-1.5">
          <button type="button" onclick="window.settings.editSlashCommandPrompt('${c.id}')" title="Edit Command" class="px-2 py-1 rounded bg-stone-900 hover:bg-stone-800 text-stone-300 text-xs font-mono cursor-pointer transition-all">✏️</button>
          <button type="button" onclick="window.settings.deleteSlashCommand('${c.id}')" title="Delete Command" class="px-2 py-1 rounded bg-stone-900 hover:bg-stone-800 text-red-400 text-xs font-mono cursor-pointer transition-all">🗑️</button>
        </div>
      </div>
    `).join("");
  }

  addSlashCommandPrompt() {
    const trigger = prompt("Enter slash command trigger (e.g. /sql, /deploy, /explain):");
    if (!trigger) return;
    const label = prompt("Enter button label (e.g. SQL Specialist, Deploy Helper):", trigger.replace("/", ""));
    const modelId = prompt("Enter target model ID (e.g. auto/coding, openrouter/free, groq/openai/gpt-oss-120b):", "auto");
    const sysPrompt = prompt("Enter custom system prompt for this command (optional):", "");
    const webSearch = confirm("Enable live Google web search for this command?");

    if (window.customStore) {
      window.customStore.addSlashCommand({
        trigger,
        label,
        icon: "⚡",
        modelId: modelId || "auto",
        temperature: 0.3,
        systemPrompt: sysPrompt || "",
        webSearch,
        osint: false
      });
      this.renderSlashCommandManager();
      if (window.app && window.app.renderDynamicSlashBar) {
        window.app.renderDynamicSlashBar();
      }
    }
  }

  editSlashCommandPrompt(id) {
    if (!window.customStore) return;
    const cmd = window.customStore.getSlashCommands().find(c => c.id === id);
    if (!cmd) return;
    const label = prompt(`Edit label for ${cmd.trigger}:`, cmd.label);
    const modelId = prompt(`Edit target model ID for ${cmd.trigger}:`, cmd.modelId);
    const temp = prompt(`Edit temperature for ${cmd.trigger}:`, cmd.temperature);
    const sysPrompt = prompt(`Edit system prompt for ${cmd.trigger}:`, cmd.systemPrompt || "");

    window.customStore.updateSlashCommand(id, {
      label: label || cmd.label,
      modelId: modelId || cmd.modelId,
      temperature: temp ? parseFloat(temp) : cmd.temperature,
      systemPrompt: sysPrompt !== null ? sysPrompt : cmd.systemPrompt
    });
    this.renderSlashCommandManager();
    if (window.app && window.app.renderDynamicSlashBar) {
      window.app.renderDynamicSlashBar();
    }
  }

  deleteSlashCommand(id) {
    if (confirm("Delete this slash preset?")) {
      if (window.customStore) {
        window.customStore.deleteSlashCommand(id);
        this.renderSlashCommandManager();
        if (window.app && window.app.renderDynamicSlashBar) {
          window.app.renderDynamicSlashBar();
        }
      }
    }
  }

  // --- Add Custom Model UI ---
  addCustomModelFromForm() {
    const name = document.getElementById("custom-model-name")?.value.trim();
    const slug = document.getElementById("custom-model-slug")?.value.trim();
    const provider = document.getElementById("custom-model-provider")?.value;
    const endpoint = document.getElementById("custom-model-endpoint")?.value.trim();
    const key = document.getElementById("custom-model-key")?.value.trim();

    if (!name || !slug) {
      alert("Please provide both a Display Name and exact Model Slug.");
      return;
    }

    if (window.customStore) {
      const added = window.customStore.addCustomModel({
        name,
        slug,
        provider: provider || "custom",
        custom_url: endpoint || null,
        custom_key: key || null
      });
      alert(`Custom model "${name}" added successfully!`);
      if (window.modelSelector) {
        window.modelSelector.refreshCatalog();
        window.modelSelector.renderModalContent();
      }
    }
  }

  // --- Backup Export / Import ---
  exportBackupFile() {
    if (!window.customStore) return;
    const data = window.customStore.exportBackupData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `llmhub-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  importBackupFile(inputEl) {
    const file = inputEl.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target.result);
        if (window.customStore) {
          window.customStore.importBackupData(json);
          alert("Backup imported successfully! Reloading workspace...");
          window.location.reload();
        }
      } catch (err) {
        alert("Failed to parse backup JSON: " + err.message);
      }
    };
    reader.readAsText(file);
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

    // Settings tab buttons
    document.querySelectorAll(".settings-tab-btn").forEach(btn => {
      btn.addEventListener("click", () => this.switchTab(btn.dataset.tab));
    });
  }
}

window.getOmniRouteBaseUrl = function() {
  if (typeof localStorage !== "undefined") {
    const stored = localStorage.getItem("omniroute_url");
    if (stored) return stored.replace(/\/+$/, "");
  }
  if (window.settings && window.settings.omnirouteUrl) {
    return window.settings.omnirouteUrl.replace(/\/+$/, "");
  }
  const isLocalhost = typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
  return isLocalhost ? "http://localhost:5000" : "https://treasure-millennium-ivory-prizes.trycloudflare.com";
};

window.SettingsManager = SettingsManager;
