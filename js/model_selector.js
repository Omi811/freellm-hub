// Antigravity-Style Model Selector Component for GitHub Pages
class ModelSelector {
  constructor(app) {
    this.app = app;
    this.models = window.MODELS_CATALOG || [];
    this.providers = window.PROVIDERS_CONFIG || {};
    this.selectedModelId = "openrouter/deepseek/deepseek-r1-0528";
    this.arenaSelectedModelIds = ["openrouter/deepseek/deepseek-r1-0528", "openrouter/qwen/qwen-2.5-coder-32b-instruct"];
    this.activeCategory = "all";
    this.activeProvider = "all";
    this.searchQuery = "";
    this.isOpen = false;
  }

  init() {
    this.models = window.MODELS_CATALOG || [];
    this.providers = window.PROVIDERS_CONFIG || {};

    const saved = localStorage.getItem("freellm_selected_model");
    if (saved && this.models.some(m => m.id === saved)) {
      this.selectedModelId = saved;
    } else if (this.models.length > 0) {
      this.selectedModelId = this.models[0].id;
    }

    this.renderTriggerPill();
    this.renderArenaPills();
    this.setupModalEvents();
  }

  getSelectedModel() {
    return this.models.find(m => m.id === this.selectedModelId) || this.models[0] || {
      id: "openrouter/deepseek/deepseek-r1-0528",
      name: "DeepSeek R1",
      provider_name: "DeepSeek",
      speed_rating: "🧠 Deep CoT"
    };
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

    trigger.innerHTML = `
      <div class="flex items-center gap-2 max-w-[280px] sm:max-w-[340px]">
        <span class="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium border ${badgeClass}">
          ${current.provider_name ? current.provider_name.split(' ')[0] : 'LLM'}
        </span>
        <span class="font-medium text-sm text-stone-200 truncate">${current.name}</span>
        <span class="text-xs text-stone-500 hidden sm:inline truncate">(${current.speed_rating ? current.speed_rating.split(' ')[0] : ''})</span>
      </div>
      <svg class="w-4 h-4 text-stone-400 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
      </svg>
    `;
  }

  renderArenaPills() {
    const container = document.getElementById("arena-selected-tags");
    if (!container) return;

    container.innerHTML = this.arenaSelectedModelIds.map(mid => {
      const m = this.models.find(x => x.id === mid) || { name: mid };
      return `
        <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-amber-500/10 text-amber-400 border border-amber-500/30">
          <span>${m.name}</span>
          <button type="button" class="text-stone-400 hover:text-white" onclick="window.modelSelector.toggleArenaModel('${mid}')">&times;</button>
        </span>
      `;
    }).join('');
  }

  openModal() {
    this.isOpen = true;
    const modal = document.getElementById("model-selector-modal");
    if (modal) {
      modal.classList.remove("hidden");
      this.renderModalContent();
      const search = document.getElementById("model-search-input");
      if (search) search.focus();
    }
  }

  closeModal() {
    this.isOpen = false;
    const modal = document.getElementById("model-selector-modal");
    if (modal) {
      modal.classList.add("hidden");
    }
  }

  filterModels() {
    const q = this.searchQuery.toLowerCase().trim();
    return this.models.filter(m => {
      if (this.activeCategory !== "all") {
        if (this.activeCategory === "fast" && m.category !== "fast") return false;
        if (this.activeCategory === "reasoning" && m.category !== "reasoning") return false;
        if (this.activeCategory === "code" && m.category !== "code") return false;
        if (this.activeCategory === "offline" && m.category !== "offline") return false;
      }

      if (q) {
        const matchName = m.name.toLowerCase().includes(q);
        const matchProvider = (m.provider_name || "").toLowerCase().includes(q);
        const matchDesc = (m.description || "").toLowerCase().includes(q);
        const matchTags = (m.tags || []).some(t => t.toLowerCase().includes(q));
        return matchName || matchProvider || matchDesc || matchTags;
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
        <div class="py-12 text-center text-stone-500">
          <p class="text-sm">No models match your search criteria.</p>
        </div>
      `;
      return;
    }

    listContainer.innerHTML = filtered.map(m => {
      const isSelected = m.id === this.selectedModelId;
      const isArena = this.arenaSelectedModelIds.includes(m.id);

      return `
        <div class="p-3.5 rounded-xl border ${isSelected ? 'border-amber-500/80 bg-amber-500/5' : 'border-stone-800 bg-stone-900/60'} hover:border-stone-700 transition-all flex flex-col justify-between">
          <div>
            <div class="flex items-start justify-between gap-2 mb-1.5">
              <div class="flex items-center gap-2">
                <span class="text-sm font-semibold text-stone-100">${m.name}</span>
                ${isSelected ? '<span class="px-1.5 py-0.5 rounded text-[10px] bg-amber-500 text-stone-950 font-bold">ACTIVE</span>' : ''}
              </div>
              <span class="text-[11px] font-mono text-stone-400">${m.speed_rating || ''}</span>
            </div>
            <p class="text-xs text-stone-400 line-clamp-2 mb-2 leading-relaxed">${m.description || ''}</p>
            <div class="flex flex-wrap gap-1 mb-3">
              ${(m.tags || []).slice(0, 3).map(t => `<span class="px-1.5 py-0.5 rounded text-[10px] bg-stone-800 text-stone-400 font-mono">${t}</span>`).join('')}
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
        this.activeCategory = btn.dataset.category;
        this.renderModalContent();
      });
    });
  }
}

window.ModelSelector = ModelSelector;
