// Antigravity-Style Model Selector Component for GitHub Pages (v3.5)
// Audited model registry, custom model manager, health latency pings, pinning & hiding.

class ModelSelector {
  constructor(app) {
    this.app = app;
    window.modelSelector = this;
    this.models = window.MODELS_CATALOG || [];
    this.providers = window.PROVIDERS_CONFIG || {};
    this.selectedModelId = "auto";
    this.arenaSelectedModelIds = ["auto", "deepseek/deepseek-v4-pro"];
    this.activeCategory = "all";
    this.activeProvider = "all";
    this.searchQuery = "";
    this.zeroRetentionOnly = localStorage.getItem("freellm_zero_retention") === "true";
    this.isOpen = false;
    this.latencyMap = new Map(); // { [modelId]: { ms, status } }
  }

  init() {
    this.refreshCatalog();

    const saved = localStorage.getItem("freellm_selected_model");
    if (saved && saved !== "freellm/auto" && saved !== "freellm/keyless-llama" && this.models.some(m => m.id === saved)) {
      this.selectedModelId = saved;
    } else {
      const hasAuto = this.models.some(m => m.id === "auto");
      this.selectedModelId = hasAuto ? "auto" : "openrouter/free";
      localStorage.setItem("freellm_selected_model", this.selectedModelId);
    }

    if (window.loadDynamicOpenRouterModels) {
      window.loadDynamicOpenRouterModels().catch(() => {});
    }

    this.renderTriggerPill();
    this.renderArenaPills();
    this.setupModalEvents();
  }

  refreshCatalog() {
    const baseCatalog = [...(window.MODELS_CATALOG || [])];
    const customModels = window.customStore ? window.customStore.getCustomModels() : [];
    
    // Merge custom models without duplicating
    for (const cm of customModels) {
      if (!baseCatalog.some(m => m.id === cm.id)) {
        baseCatalog.unshift(cm);
      }
    }
    this.models = baseCatalog;
  }

  getSelectedModel() {
    this.refreshCatalog();
    return this.models.find(m => m.id === this.selectedModelId) || this.models[0] || {
      id: "auto",
      name: "OmniRoute Auto (15-Factor Smart Score)",
      provider_name: "OmniRoute Gateway",
      speed_rating: "⚡⚡⚡ 352 Providers"
    };
  }

  selectAutoModel() {
    this.selectModel("auto");
    if (this.app) {
      this.app.showCommandToast("✨ OmniRoute Auto Enabled: 15-Factor Smart Router active");
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
    if (current.provider === "omniroute") badgeClass = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    if (current.provider === "google") badgeClass = "bg-blue-500/10 text-blue-400 border-blue-500/20";
    if (current.provider === "groq") badgeClass = "bg-orange-500/10 text-orange-400 border-orange-500/20";
    if (current.provider === "openrouter") badgeClass = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";

    const health = window.clientEngine ? window.clientEngine.getModelHealth(current.id) : "healthy";
    const healthDot = health === "healthy" ? "🟢" : (health === "degraded" ? "🟡" : "🔴");

    let routeType = "Cloud Keyless";
    if (current.provider === "omniroute" || (current.group && current.group.startsWith("omniroute"))) {
      routeType = "OmniRoute Gateway";
    } else if (current.provider === "ollama" || current.group === "local_ollama" || (current.id && current.id.startsWith("ollama/"))) {
      routeType = "Local Ollama";
    } else if (current.group === "byok" || current.group === "custom") {
      routeType = "BYOK / Custom";
    } else if (window.clientEngine && window.clientEngine.backendUrl && (window.clientEngine.backendUrl.includes("trycloudflare.com") || window.clientEngine.backendUrl.includes(":5000"))) {
      routeType = "OCI Tunnel Online";
    }

    trigger.innerHTML = `
      <div class="flex items-center gap-2 max-w-[280px] sm:max-w-[340px]">
        <span class="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium border ${badgeClass}">
          ${current.provider_name ? current.provider_name.split(' ')[0] : 'LLM'}
        </span>
        <span class="font-medium text-sm text-stone-200 truncate">${current.name}</span>
        <span class="text-xs cursor-help" title="Active Route: ${routeType} · Status: ${health}">${healthDot}</span>
        <span class="hidden md:inline-block text-[10px] px-1.5 py-0.5 rounded font-mono bg-stone-900 border border-stone-800 text-stone-400" title="Active Routing Architecture">${routeType}</span>
      </div>
      <svg class="w-4 h-4 text-stone-400 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
      </svg>
    `;

    const autoBtn = document.getElementById("auto-model-btn");
    const autoLabel = document.getElementById("auto-model-btn-label");
    const isAuto = this.selectedModelId === "auto" || this.selectedModelId === "openrouter/free" || this.selectedModelId === "freellm/auto";

    if (autoBtn && autoLabel) {
      if (isAuto) {
        autoBtn.className = "flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-500/50 bg-emerald-500/20 text-emerald-300 font-bold text-xs transition-all cursor-pointer shadow-sm shadow-emerald-500/10";
        autoLabel.textContent = "Auto Active";
      } else {
        autoBtn.className = "flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-stone-800 bg-stone-900 hover:bg-stone-850 text-stone-400 hover:text-stone-200 font-medium text-xs transition-all cursor-pointer";
        autoLabel.textContent = "Auto Select";
      }
    }
  }

  async scanLocalOllama() {
    if (window.clientEngine && window.clientEngine.scanLocalOllamaModels) {
      if (this.app) this.app.showCommandToast("🔄 Scanning http://localhost:11434 for local models...");
      const models = await window.clientEngine.scanLocalOllamaModels();
      this.refreshCatalog();
      this.renderModalContent();
      if (this.app) {
        if (models && models.length > 0) {
          this.app.showCommandToast(`✅ Discovered ${models.length} local Ollama models!`);
        } else {
          this.app.showCommandToast("⚠️ No running Ollama instance detected at localhost:11434");
        }
      }
    }
  }

  async syncOmniRouteModels() {
    const btn = document.getElementById("sync-omniroute-btn");
    const originalText = btn ? btn.innerHTML : "";
    if (btn) btn.innerHTML = `<span>⏳ Syncing...</span>`;
    try {
      const omnirouteBaseUrl = window.getOmniRouteBaseUrl ? window.getOmniRouteBaseUrl() : "http://localhost:20128";
      if (this.app) this.app.showCommandToast(`🔄 Connecting to OmniRoute gateway (${omnirouteBaseUrl})...`);
      
      const res = await window.loadDynamicOmniRouteModels(omnirouteBaseUrl);
      if (res && res.success) {
        this.refreshCatalog();
        this.renderModalContent();
        this.renderTriggerPill();
        if (this.app) {
          this.app.showCommandToast(`⚡ OmniRoute Synced: ${res.count} models active (${res.added} new added)`);
        }
      } else {
        const errorMsg = res?.error || "Connection refused";
        if (this.app) {
          this.app.showCommandToast(`⚠️ OmniRoute Offline at ${omnirouteBaseUrl}`);
        }
        alert(`Cannot connect to OmniRoute Gateway at:\n${omnirouteBaseUrl}\n\nError: ${errorMsg}`);
      }
    } catch (e) {
      alert(`OmniRoute Sync Error: ${e.message}`);
    } finally {
      if (btn) btn.innerHTML = originalText;
    }
  }

  // --- One-Click Test All Models Health ---
  async testAllModelsHealth() {
    if (this.app) this.app.showCommandToast("⚡ Pinging model endpoints for live latency...");
    const testPromises = this.models.slice(0, 30).map(async (m) => {
      const start = Date.now();
      try {
        const candidate = window.clientEngine.buildCandidateWaterfall(m.id, "", [{ role: "user", content: "ping" }], 0.1, 5)[0];
        if (candidate) {
          const controller = new AbortController();
          const tid = setTimeout(() => controller.abort(), 2500);
          const r = await fetch(candidate.endpoint, {
            method: "POST",
            headers: candidate.headers,
            body: JSON.stringify(candidate.body),
            signal: controller.signal
          });
          clearTimeout(tid);
          const latency = Date.now() - start;
          if (r.ok) {
            this.latencyMap.set(m.id, { ms: latency, status: "healthy", label: `${latency}ms` });
          } else {
            this.latencyMap.set(m.id, { ms: latency, status: "degraded", label: `HTTP ${r.status}` });
          }
        }
      } catch (e) {
        this.latencyMap.set(m.id, { ms: 9999, status: "offline", label: "Timed out" });
      }
    });

    await Promise.allSettled(testPromises);
    this.renderModalContent();
    if (this.app) this.app.showCommandToast("✅ Model health test complete!");
  }

  renderArenaPills() {
    const container = document.getElementById("arena-selected-tags");
    if (!container) return;

    container.innerHTML = this.arenaSelectedModelIds.map(mid => {
      const m = this.models.find(x => x.id === mid) || { name: mid };
      return `
        <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-amber-500/10 text-amber-400 border border-amber-500/30">
          <span>${m.name}</span>
          <button onclick="window.modelSelector.toggleArenaModel('${mid}')" class="hover:text-amber-200 cursor-pointer">&times;</button>
        </span>
      `;
    }).join('');
  }

  openModal() {
    const modal = document.getElementById("model-selector-modal");
    if (modal) {
      this.refreshCatalog();
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
      const override = window.customStore ? window.customStore.getModelOverride(m.id) : {};
      
      // Hidden filter (unless user explicitly searches for it)
      if (override.hidden && !q) return false;

      // Privacy filter
      if (this.zeroRetentionOnly && m.data_retention !== "zero_retention" && m.provider !== "ollama" && m.provider !== "omniroute") {
        return false;
      }

      // Category filters
      if (this.activeCategory !== "all") {
        if (this.activeCategory === "daily") {
          const defaultDaily = ["auto", "auto/coding", "auto/fast", "openrouter/free", "deepseek/deepseek-v4-pro", "moonshot/kimi-k3", "groq/openai/gpt-oss-120b"];
          if (!defaultDaily.includes(m.id) && !override.pinned && m.provider !== "ollama") return false;
        } else if (this.activeCategory === "omniroute") {
          if (m.provider !== "omniroute" && m.group !== "omniroute_combos" && m.group !== "omniroute_live") return false;
        } else if (this.activeCategory === "keyless") {
          if (m.group !== "verified_keyless" && m.group !== "omniroute_combos") return false;
        } else if (this.activeCategory === "byok") {
          if (m.group !== "byok" && m.group !== "custom") return false;
        } else if (this.activeCategory === "offline") {
          if (m.provider !== "ollama" && m.id !== "auto/offline") return false;
        } else if (this.activeCategory === "uncensored") {
          if (m.category !== "uncensored") return false;
        } else if (this.activeCategory === "fast") {
          if (m.category !== "fast") return false;
        } else if (this.activeCategory === "reasoning") {
          if (m.category !== "reasoning") return false;
        } else if (this.activeCategory === "code") {
          if (m.category !== "code") return false;
        } else if (this.activeCategory === "image") {
          if (m.category !== "image") return false;
        }
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

  editModelSlug(modelId) {
    const current = this.models.find(m => m.id === modelId);
    if (!current) return;
    const currentSlug = (window.customStore && window.customStore.getModelOverride(modelId).slug) || current.litellm_model || modelId;
    const newSlug = prompt(`Edit target upstream model slug for "${current.name}":`, currentSlug);
    if (newSlug && newSlug.trim()) {
      if (window.customStore) {
        window.customStore.setModelOverride(modelId, { slug: newSlug.trim() });
      }
      current.litellm_model = newSlug.trim();
      this.renderModalContent();
      if (this.app) this.app.showCommandToast(`✏️ Updated slug for ${current.name} -> ${newSlug.trim()}`);
    }
  }

  togglePin(modelId) {
    if (window.customStore) {
      window.customStore.togglePinModel(modelId);
      this.renderModalContent();
    }
  }

  toggleHide(modelId) {
    if (window.customStore) {
      window.customStore.toggleHideModel(modelId);
      this.renderModalContent();
      if (this.app) this.app.showCommandToast("Card visibility updated");
    }
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
      const override = window.customStore ? window.customStore.getModelOverride(m.id) : {};
      const isPinned = !!override.pinned;

      // Latency badge if tested
      const latencyRecord = this.latencyMap.get(m.id);
      let latencyPill = "";
      if (latencyRecord) {
        const dot = latencyRecord.status === "healthy" ? "🟢" : (latencyRecord.status === "degraded" ? "🟡" : "🔴");
        latencyPill = `<span class="px-1.5 py-0.5 rounded text-[10px] bg-stone-900 border border-stone-800 font-mono text-stone-300">${dot} ${latencyRecord.label}</span>`;
      }

      const health = window.clientEngine ? window.clientEngine.getModelHealth(m.id) : "healthy";
      const healthDot = health === "healthy" ? '<span class="text-emerald-400" title="Endpoint Status: Healthy">🟢</span>' : 
                        (health === "degraded" ? '<span class="text-amber-400" title="Endpoint Status: Degraded / Rate Limited">🟡</span>' : 
                        '<span class="text-red-400" title="Endpoint Status: Offline / 503">🔴</span>');

      const isZeroRetention = m.data_retention === "zero_retention" || m.provider === "ollama" || m.provider === "omniroute";
      const privacyBadge = isZeroRetention 
        ? '<span class="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">🛡️ Zero-Retention</span>'
        : '<span class="px-1.5 py-0.5 rounded text-[10px] bg-stone-800 text-stone-400 font-mono">🌐 Cloud Logged</span>';

      let groupBadge = '<span class="px-1.5 py-0.5 rounded text-[10px] bg-purple-500/10 text-purple-400 border border-purple-500/20 font-mono">🔑 BYOK</span>';
      if (m.group === "omniroute_combos" || m.group === "omniroute_live") {
        groupBadge = '<span class="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 font-mono">⚡ OmniRoute</span>';
      } else if (m.group === "verified_keyless") {
        groupBadge = '<span class="px-1.5 py-0.5 rounded text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono">⚡ Keyless</span>';
      } else if (m.group === "local_ollama" || m.provider === "ollama") {
        groupBadge = '<span class="px-1.5 py-0.5 rounded text-[10px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-mono">💻 100% Offline</span>';
      } else if (m.group === "custom") {
        groupBadge = '<span class="px-1.5 py-0.5 rounded text-[10px] bg-sky-500/10 text-sky-400 border border-sky-500/20 font-mono">🎨 Custom</span>';
      }

      return `
        <div class="p-3.5 rounded-xl border ${isSelected ? 'border-amber-500/80 bg-amber-500/5' : 'border-stone-800 bg-stone-900/60'} hover:border-stone-700 transition-all flex flex-col justify-between group">
          <div>
            <div class="flex items-start justify-between gap-2 mb-1.5">
              <div class="flex items-center gap-2">
                ${healthDot}
                <span class="text-sm font-semibold text-stone-100">${m.name}</span>
                ${isPinned ? '<span title="Pinned to Daily Drivers">⭐</span>' : ''}
                ${isSelected ? '<span class="px-1.5 py-0.5 rounded text-[10px] bg-amber-500 text-stone-950 font-bold">ACTIVE</span>' : ''}
              </div>
              <div class="flex items-center gap-1.5">
                ${latencyPill}
                <span class="text-[11px] font-mono text-stone-400">${m.speed_rating || ''}</span>
              </div>
            </div>
            <p class="text-xs text-stone-400 line-clamp-2 mb-2 leading-relaxed">${m.description || ''}</p>
            <div class="flex flex-wrap items-center gap-1.5 mb-3">
              ${groupBadge}
              ${privacyBadge}
              ${(m.tags || []).slice(0, 2).map(t => `<span class="px-1.5 py-0.5 rounded text-[10px] bg-stone-800 text-stone-400 font-mono">${t}</span>`).join('')}
            </div>
          </div>
          <div class="flex items-center justify-between pt-2 border-t border-stone-800/80 text-xs">
            <div class="flex items-center gap-1 text-stone-500 font-mono text-[11px]">
              <button onclick="window.modelSelector.togglePin('${m.id}')" title="Pin / Unpin to Daily Drivers" class="p-1 hover:text-amber-400 cursor-pointer">
                ${isPinned ? '⭐' : '☆'}
              </button>
              <button onclick="window.modelSelector.editModelSlug('${m.id}')" title="Edit Upstream Model Slug" class="p-1 hover:text-amber-400 cursor-pointer">
                ✏️
              </button>
              <button onclick="window.modelSelector.toggleHide('${m.id}')" title="Hide Card" class="p-1 hover:text-red-400 cursor-pointer">
                👁️
              </button>
              <span class="truncate max-w-[100px] sm:max-w-[130px]">${override.slug || m.litellm_model || m.id}</span>
            </div>
            <div class="flex items-center gap-2">
              <button onclick="window.modelSelector.toggleArenaModel('${m.id}')"
                      class="px-2 py-1 rounded text-[11px] ${isArena ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' : 'bg-stone-800 text-stone-400 hover:text-stone-200'} transition-all cursor-pointer">
                ${isArena ? '✓ In Arena' : '+ Arena'}
              </button>
              <button onclick="window.modelSelector.selectModel('${m.id}')"
                      class="px-3 py-1 rounded font-medium ${isSelected ? 'bg-amber-500 text-stone-950' : 'bg-stone-800 hover:bg-stone-700 text-stone-200'} transition-all cursor-pointer">
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
        if (this.activeCategory === "offline" && window.clientEngine && !window.clientEngine.hasScannedLocalOllama) {
          window.clientEngine.hasScannedLocalOllama = true;
          this.scanLocalOllama();
        } else {
          this.renderModalContent();
        }
      });
    });
  }
}

window.ModelSelector = ModelSelector;
