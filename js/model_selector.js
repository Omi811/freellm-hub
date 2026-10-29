// Antigravity-Style Model Selector Component for GitHub Pages (v2.0)
// Audited model registry, health status dots, data retention indicators, and verified groups.

class ModelSelector {
  constructor(app) {
    this.app = app;
    window.modelSelector = this;
    this.models = window.MODELS_CATALOG || [];
    this.providers = window.PROVIDERS_CONFIG || {};
    this.selectedModelId = "openrouter/free";
    this.arenaSelectedModelIds = ["openrouter/free", "openrouter/deepseek/deepseek-r1-0528"];
    this.activeCategory = "all";
    this.activeProvider = "all";
    this.searchQuery = "";
    this.zeroRetentionOnly = localStorage.getItem("freellm_zero_retention") === "true";
    this.isOpen = false;
  }

  init() {
    this.models = window.MODELS_CATALOG || [];
    this.providers = window.PROVIDERS_CONFIG || {};

    const saved = localStorage.getItem("freellm_selected_model");
    if (saved && saved !== "freellm/auto" && saved !== "freellm/keyless-llama" && this.models.some(m => m.id === saved)) {
      this.selectedModelId = saved;
    } else {
      this.selectedModelId = "openrouter/free";
      localStorage.setItem("freellm_selected_model", this.selectedModelId);
    }

    // Call dynamic OpenRouter check if available
    if (window.loadDynamicOpenRouterModels) {
      window.loadDynamicOpenRouterModels().catch(() => {});
    }

    this.renderTriggerPill();
    this.renderArenaPills();
    this.setupModalEvents();
  }

  getSelectedModel() {
    return this.models.find(m => m.id === this.selectedModelId) || this.models[0] || {
      id: "openrouter/free",
      name: "Auto Free Smart Router",
      provider_name: "OpenRouter Free",
      speed_rating: "⚡ Fast"
    };
  }

  selectAutoModel() {
    this.selectModel("openrouter/free");
    if (this.app) {
      this.app.showCommandToast("✨ Auto Model Selector Enabled: Intelligently routing prompts");
    }
  }

  selectModel(modelId) {
    this.selectedModelId = modelId;
    localStorage.setItem("freellm_selected_model", modelId);
    this.renderTriggerPill();
    this.closeModal();
    if (this.app && this.app.onModelChange) {
      this.app.onModelChange(this.getSelectedModel());
    }
  }

  toggleArenaModel(modelId) {
    const idx = this.arenaSelectedModelIds.indexOf(modelId);
    if (idx > -1) {
      if (this.arenaSelectedModelIds.length > 1) {
        this.arenaSelectedModelIds.splice(idx, 1);
      }
    } else {
      if (this.arenaSelectedModelIds.length < 3) {
        this.arenaSelectedModelIds.push(modelId);
      } else {
        alert("Arena supports comparing up to 3 models simultaneously.");
      }
    }
    this.renderArenaPills();
  }

  renderTriggerPill() {
    const trigger = document.getElementById("model-trigger-btn");
    if (!trigger) return;

    const current = this.getSelectedModel();
    let badgeClass = "bg-amber-500/10 text-amber-400 border-amber-500/20";
    if (current.provider === "google") badgeClass = "bg-blue-500/10 text-blue-400 border-blue-500/20";
    if (current.provider === "groq") badgeClass = "bg-orange-500/10 text-orange-400 border-orange-500/20";
    if (current.provider === "openrouter") badgeClass = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";

    const health = window.clientEngine ? window.clientEngine.getModelHealth(current.id) : "healthy";
    const healthDot = health === "healthy" ? "🟢" : (health === "degraded" ? "🟡" : "🔴");

    trigger.innerHTML = `
      <div class="flex items-center gap-2 max-w-[280px] sm:max-w-[340px]">
        <span class="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium border ${badgeClass}">
          ${current.provider_name ? current.provider_name.split(' ')[0] : 'LLM'}
        </span>
        <span class="font-medium text-sm text-stone-200 truncate">${current.name}</span>
        <span class="text-xs" title="Endpoint Status: ${health}">${healthDot}</span>
      </div>
      <svg class="w-4 h-4 text-stone-400 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
      </svg>
    `;

    const autoBtn = document.getElementById("auto-model-btn");
    const autoLabel = document.getElementById("auto-model-btn-label");
    const isAuto = this.selectedModelId === "openrouter/free" || this.selectedModelId === "auto" || this.selectedModelId === "freellm/auto";

    if (autoBtn && autoLabel) {
      if (isAuto) {
        autoBtn.className = "flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-amber-500/50 bg-amber-500/20 text-amber-300 font-bold text-xs transition-all cursor-pointer shadow-sm shadow-amber-500/10";
        autoLabel.textContent = "Auto Active";
      } else {
        autoBtn.className = "flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-stone-800 bg-stone-900 hover:bg-stone-850 text-stone-400 hover:text-stone-200 font-medium text-xs transition-all cursor-pointer";
        autoLabel.textContent = "Auto Select";
      }
    }
  }

  renderArenaPills() {
    const container = document.getElementById("arena-selected-tags");
    if (!container) return;

    container.innerHTML = this.arenaSelectedModelIds.map(mid => {
      const m = this.models.find(x => x.id === mid) || { name: mid };
      return `
        <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-amber-500/10 text-amber-400 border border-amber-500/30">
          <span>${m.name}</span>
          <button onclick="window.modelSelector.toggleArenaModel('${mid}')" class="hover:text-amber-200">&times;</button>
        </span>
      `;
    }).join('');
  }

  openModal() {
    const modal = document.getElementById("model-selector-modal");
    if (modal) {
      modal.classList.remove("hidden");
      this.renderModalContent();
      const input = document.getElementById("model-search-input");
      if (input) setTimeout(() => input.focus(), 50);
    }
  }

  closeModal() {
    const modal = document.getElementById("model-selector-modal");
    if (modal) {
      modal.classList.add("hidden");
    }
  }

  toggleZeroRetentionFilter() {
    this.zeroRetentionOnly = !this.zeroRetentionOnly;
    localStorage.setItem("freellm_zero_retention", String(this.zeroRetentionOnly));
    this.renderModalContent();
  }

  filterModels() {
    const q = this.searchQuery.toLowerCase().trim();
    return this.models.filter(m => {
      // Privacy filter
      if (this.zeroRetentionOnly && m.data_retention !== "zero_retention" && m.provider !== "ollama") {
        return false;
      }

      // Category filters
      if (this.activeCategory !== "all") {
        if (this.activeCategory === "daily") {
          const dailyIds = [
            "openrouter/free",
            "deepseek/deepseek-v4-pro",
            "moonshot/kimi-k3",
            "meta-llama/llama-4-scout-109b",
            "groq/openai/gpt-oss-120b",
            "openrouter/qwen/qwen-2.5-coder-32b-instruct",
            "openrouter/deepseek/deepseek-r1-0528",
            "openrouter/cognitivecomputations/dolphin-mistral-24b-venice-edition",
            "gemini/gemini-2.5-flash",
            "image/pollinations/flux-2-dev",
            "ollama/qwen3.6-35b-a3b",
            "ollama/ternary-bonsai-2-27b"
          ];
          if (!dailyIds.includes(m.id) && m.provider !== "ollama") return false;
        }
        if (this.activeCategory === "keyless" && m.group !== "verified_keyless") return false;
        if (this.activeCategory === "byok" && m.group !== "byok") return false;
        if (this.activeCategory === "offline" && m.provider !== "ollama") return false;
        if (this.activeCategory === "uncensored" && m.category !== "uncensored") return false;
        if (this.activeCategory === "fast" && m.category !== "fast") return false;
        if (this.activeCategory === "reasoning" && m.category !== "reasoning") return false;
        if (this.activeCategory === "code" && m.category !== "code") return false;
        if (this.activeCategory === "image" && m.category !== "image") return false;
      }

      if (q) {
        const matchName = m.name.toLowerCase().includes(q);
        const matchProvider = (m.provider_name || "").toLowerCase().includes(q);
        const matchDesc = (m.description || "").toLowerCase().includes(q);
        const matchTags = (m.tags || []).some(t => t.toLowerCase().includes(q));
        const matchGroup = (m.group || "").toLowerCase().includes(q);
        return matchName || matchProvider || matchDesc || matchTags || matchGroup;
      }
      return true;
    });
  }

  renderModalContent() {
    const listContainer = document.getElementById("model-cards-list");
    if (!listContainer) return;

    const filtered = this.filterModels();
    if (filtered.length === 0) {
      listContainer.innerHTML = `
        <div class="py-12 text-center text-stone-500 col-span-2">
          <p class="text-sm">No models match your search or privacy criteria.</p>
          ${this.zeroRetentionOnly ? '<p class="text-xs text-amber-500 mt-2">Zero-Retention Filter is active. Toggle it off to view standard models.</p>' : ''}
        </div>
      `;
      return;
    }

    listContainer.innerHTML = filtered.map(m => {
      const isSelected = m.id === this.selectedModelId;
      const isArena = this.arenaSelectedModelIds.includes(m.id);

      const health = window.clientEngine ? window.clientEngine.getModelHealth(m.id) : "healthy";
      const healthDot = health === "healthy" ? '<span class="text-emerald-400" title="Endpoint Status: Healthy">🟢</span>' : 
                        (health === "degraded" ? '<span class="text-amber-400" title="Endpoint Status: Degraded / Rate Limited">🟡</span>' : 
                        '<span class="text-red-400" title="Endpoint Status: Offline / 503">🔴</span>');

      const isZeroRetention = m.data_retention === "zero_retention" || m.provider === "ollama";
      const privacyBadge = isZeroRetention 
        ? '<span class="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">🛡️ Zero-Retention</span>'
        : '<span class="px-1.5 py-0.5 rounded text-[10px] bg-stone-800 text-stone-400 font-mono">🌐 Cloud Logged</span>';

      const groupBadge = m.group === "verified_keyless"
        ? '<span class="px-1.5 py-0.5 rounded text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono">⚡ Keyless</span>'
        : (m.group === "local_ollama" 
           ? '<span class="px-1.5 py-0.5 rounded text-[10px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-mono">💻 100% Offline</span>'
           : '<span class="px-1.5 py-0.5 rounded text-[10px] bg-purple-500/10 text-purple-400 border border-purple-500/20 font-mono">🔑 BYOK</span>');

      return `
        <div class="p-3.5 rounded-xl border ${isSelected ? 'border-amber-500/80 bg-amber-500/5' : 'border-stone-800 bg-stone-900/60'} hover:border-stone-700 transition-all flex flex-col justify-between">
          <div>
            <div class="flex items-start justify-between gap-2 mb-1.5">
              <div class="flex items-center gap-2">
                ${healthDot}
                <span class="text-sm font-semibold text-stone-100">${m.name}</span>
                ${isSelected ? '<span class="px-1.5 py-0.5 rounded text-[10px] bg-amber-500 text-stone-950 font-bold">ACTIVE</span>' : ''}
              </div>
              <span class="text-[11px] font-mono text-stone-400">${m.speed_rating || ''}</span>
            </div>
            <p class="text-xs text-stone-400 line-clamp-2 mb-2 leading-relaxed">${m.description || ''}</p>
            <div class="flex flex-wrap items-center gap-1.5 mb-3">
              ${groupBadge}
              ${privacyBadge}
              ${(m.tags || []).slice(0, 2).map(t => `<span class="px-1.5 py-0.5 rounded text-[10px] bg-stone-800 text-stone-400 font-mono">${t}</span>`).join('')}
            </div>
          </div>
          <div class="flex items-center justify-between pt-2 border-t border-stone-800/80 text-xs">
            <span class="text-stone-500 font-mono text-[11px]">${m.context_window || ''}</span>
            <div class="flex items-center gap-2">
              <button onclick="window.modelSelector.toggleArenaModel('${m.id}')"
                      class="px-2 py-1 rounded text-[11px] ${isArena ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' : 'bg-stone-800 text-stone-400 hover:text-stone-200'} transition-all">
                ${isArena ? '✓ In Arena' : '+ Arena'}
              </button>
              <button onclick="window.modelSelector.selectModel('${m.id}')"
                      class="px-3 py-1 rounded font-medium ${isSelected ? 'bg-amber-500 text-stone-950' : 'bg-stone-800 hover:bg-stone-700 text-stone-200'} transition-all">
                ${isSelected ? 'Selected' : 'Use Model'}
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  setupModalEvents() {
    const trigger = document.getElementById("model-trigger-btn");
    if (trigger) trigger.addEventListener("click", () => this.openModal());

    const closeBtn = document.getElementById("close-model-modal-btn");
    if (closeBtn) closeBtn.addEventListener("click", () => this.closeModal());

    const searchInput = document.getElementById("model-search-input");
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        this.searchQuery = e.target.value;
        this.renderModalContent();
      });
    }

    document.querySelectorAll(".category-pill").forEach(btn => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".category-pill").forEach(b => b.classList.remove("active-pill", "bg-amber-500", "text-stone-950"));
        btn.classList.add("active-pill", "bg-amber-500", "text-stone-950");
        this.activeCategory = btn.dataset.category || "all";
        this.renderModalContent();
      });
    });
  }
}

window.ModelSelector = ModelSelector;
