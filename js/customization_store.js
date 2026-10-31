/**
 * LLM Hub v3.5 - Customization Store
 * Manages in-app themes, editable slash command pills, custom models, and card overrides.
 * Persists in localStorage and IndexedDB with full Export/Import backup support.
 */

class CustomizationStore {
  constructor() {
    this.STORAGE_KEY = "llmhub_customization_v35";
    this.defaultThemes = {
      "apple-sequoia": {
        id: "apple-sequoia",
        name: "Apple Intelligence (macOS Sequoia Dark)",
        canvasBg: "#000000",
        surfaceBg: "rgba(28, 28, 30, 0.82)",
        cardBg: "rgba(44, 44, 46, 0.65)",
        borderColor: "rgba(255, 255, 255, 0.12)",
        textColor: "#f5f5f7",
        textMuted: "#86868b",
        accentPrimary: "#2997ff",
        accentGradient: "linear-gradient(135deg, #0A84FF 0%, #5E5CE6 35%, #BF5AF2 70%, #FF375F 100%)",
        isDark: true
      },
      "apple-cupertino": {
        id: "apple-cupertino",
        name: "Apple Cupertino (macOS Light)",
        canvasBg: "#f5f5f7",
        surfaceBg: "rgba(255, 255, 255, 0.82)",
        cardBg: "#ffffff",
        borderColor: "rgba(0, 0, 0, 0.08)",
        textColor: "#1d1d1f",
        textMuted: "#86868b",
        accentPrimary: "#0071e3",
        accentGradient: "linear-gradient(135deg, #0071e3 0%, #5e5ce6 50%, #bf5af2 100%)",
        isDark: false
      },
      "gemini-obsidian": {
        id: "gemini-obsidian",
        name: "Google Gemini Obsidian (Dark)",
        canvasBg: "#131314",
        surfaceBg: "#1e1f20",
        cardBg: "#282a2c",
        borderColor: "rgba(255, 255, 255, 0.1)",
        textColor: "#e3e3e3",
        textMuted: "#9aa0a6",
        accentPrimary: "#8ab4f8",
        accentGradient: "linear-gradient(135deg, #4285f4 0%, #9b72cb 50%, #d96570 100%)",
        isDark: true
      },
      "google-daylight": {
        id: "google-daylight",
        name: "Google Daylight (Light)",
        canvasBg: "#ffffff",
        surfaceBg: "#f0f4f9",
        cardBg: "#ffffff",
        borderColor: "rgba(0, 0, 0, 0.1)",
        textColor: "#1f1f1f",
        textMuted: "#5f6368",
        accentPrimary: "#0b57d0",
        accentGradient: "linear-gradient(135deg, #1a73e8 0%, #7c4dff 100%)",
        isDark: false
      },
      "claude-warm": {
        id: "claude-warm",
        name: "Claude Warm Studio",
        canvasBg: "#191816",
        surfaceBg: "#262522",
        cardBg: "#2d2c28",
        borderColor: "rgba(255, 255, 255, 0.08)",
        textColor: "#ece6de",
        textMuted: "#a8a29e",
        accentPrimary: "#d97757",
        accentGradient: "linear-gradient(135deg, #d97757 0%, #cc5f39 100%)",
        isDark: true
      },
      "cyber-gold": {
        id: "cyber-gold",
        name: "OLED Cyber Gold (Classic v1)",
        canvasBg: "#0c0c0e",
        surfaceBg: "#141417",
        cardBg: "#1c1c21",
        borderColor: "rgba(245, 158, 11, 0.15)",
        textColor: "#f4f4f5",
        textMuted: "#a1a1aa",
        accentPrimary: "#f59e0b",
        accentGradient: "linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)",
        isDark: true
      },
      "jarvis-matrix": {
        id: "jarvis-matrix",
        name: "J.A.R.V.I.S. Stark Holographic Matrix",
        canvasBg: "#191919",
        surfaceBg: "rgba(32, 28, 28, 0.82)",
        cardBg: "rgba(84, 30, 24, 0.28)",
        borderColor: "rgba(253, 210, 34, 0.22)",
        textColor: "#f5f5f7",
        textMuted: "#8a99a5",
        accentPrimary: "#fdd222",
        accentGradient: "linear-gradient(135deg, #fdd222 0%, #a92e22 50%, #541e18 100%)",
        isDark: true
      }
    };

    this.defaultSlashCommands = [
      {
        id: "cmd_search",
        trigger: "/search",
        label: "AI Search",
        icon: "🔍",
        modelId: "auto",
        temperature: 0.3,
        systemPrompt: "You are Google AI Search Assistant. Provide comprehensive, factual overviews with direct references. Synthesize insights clearly.",
        webSearch: true,
        osint: false
      },
      {
        id: "cmd_code",
        trigger: "/code",
        label: "Qwen 32B Coder",
        icon: "💻",
        modelId: "auto/coding",
        temperature: 0.2,
        systemPrompt: "You are an elite principal software engineer. Write clean, modular, production-ready code with complete implementations and zero placeholders.",
        webSearch: false,
        osint: false
      },
      {
        id: "cmd_review",
        trigger: "/review",
        label: "Audit & Security",
        icon: "🛡️",
        modelId: "openrouter/deepseek/deepseek-r1-0528",
        temperature: 0.2,
        systemPrompt: "You are a rigorous code reviewer and cybersecurity auditor. Analyze the code for edge cases, memory leaks, performance bottlenecks, and CVE vulnerabilities.",
        webSearch: false,
        osint: false
      },
      {
        id: "cmd_canvas",
        trigger: "/canvas",
        label: "Gemini Canvas",
        icon: "🎨",
        modelId: "auto",
        temperature: 0.7,
        systemPrompt: "You are a creative UI/UX architect and frontend engineer. Build modern, interactive web applications using HTML, Tailwind CSS, and JavaScript. Always wrap the complete standalone code in an <antArtifact identifier=\"...\" type=\"html\" title=\"...\"> container.",
        webSearch: false,
        osint: false
      },
      {
        id: "cmd_fast",
        trigger: "/fast",
        label: "Groq 450t/s",
        icon: "⚡",
        modelId: "auto/fast",
        temperature: 0.7,
        systemPrompt: "You are a high-speed AI assistant. Deliver concise, rapid, high-impact responses.",
        webSearch: false,
        osint: false
      },
      {
        id: "cmd_osint",
        trigger: "/osint",
        label: "OSINT Recon",
        icon: "🛰️",
        modelId: "auto/smart",
        temperature: 0.2,
        systemPrompt: "You are an elite OSINT & Attack-Surface Intelligence Analyst. Analyze the live reconnaissance telemetry injected in <osint_telemetry> tags. Cite exact Shodan ports, CVEs, DNS records, and subdomains.",
        webSearch: false,
        osint: true
      },
      {
        id: "cmd_refactor",
        trigger: "/refactor",
        label: "Clean Architecture",
        icon: "⚡",
        modelId: "auto/coding",
        temperature: 0.2,
        systemPrompt: "Refactor the provided code for maximum clarity, clean architecture, and testability while preserving 100% backward compatibility.",
        webSearch: false,
        osint: false
      },
      {
        id: "cmd_uncensored",
        trigger: "/uncensored",
        label: "Dolphin 24B",
        icon: "🔓",
        modelId: "openrouter/cognitivecomputations/dolphin-mistral-24b-venice-edition",
        temperature: 0.7,
        systemPrompt: "You are Dolphin, an uncensored, helpful assistant designed to explore scenarios without restrictions or moralizing lectures.",
        webSearch: false,
        osint: false
      },
      {
        id: "cmd_video",
        trigger: "/video",
        label: "Wan 2.1 Video Gen",
        icon: "🎥",
        modelId: "video/wan-2.1-pro",
        temperature: 0.3,
        systemPrompt: "Generate cinematic, coherent text-to-video diffusion renders with realistic motion and dynamic lighting.",
        webSearch: false,
        osint: false
      },
      {
        id: "cmd_interior",
        trigger: "/interior",
        label: "Interior Design & Materials",
        icon: "🛋️",
        modelId: "arch/flux-archviz-pro",
        temperature: 0.3,
        systemPrompt: "Render photorealistic modern interior architecture, material palettes (hardwood, brushed brass, fluted glass, polished concrete), natural daylighting, and spatial furniture layout.",
        webSearch: false,
        osint: false
      },
      {
        id: "cmd_exterior",
        trigger: "/exterior",
        label: "Architectural Exterior Facade",
        icon: "🏛️",
        modelId: "arch/flux-archviz-pro",
        temperature: 0.3,
        systemPrompt: "Render photorealistic architectural exterior elevations, modern parametric facades, landscape integration, and structural massing.",
        webSearch: false,
        osint: false
      },
      {
        id: "cmd_bim",
        trigger: "/bim",
        label: "Bonsai OpenBIM & IFC",
        icon: "📐",
        modelId: "arch/bonsai-openbim-agent",
        temperature: 0.2,
        systemPrompt: "You are the Bonsai OpenBIM & IfcOpenShell Principal Architect. Generate Python scripts for BlenderBIM, IFC4 schema compliance, spatial hierarchies, and parametric CAD macros.",
        webSearch: false,
        osint: false
      },
      {
        id: "cmd_estimate",
        trigger: "/estimate",
        label: "Construction Cost & BOQ",
        icon: "🏗️",
        modelId: "arch/construction-boq-estimator",
        temperature: 0.1,
        systemPrompt: "You are a Senior Construction Estimator and Quantity Surveyor. Structure your calculations using evidence tags. Break down Bill of Quantities (BOQ), material takeoff calculations, rebar/concrete volume, and labor schedules.",
        webSearch: false,
        osint: false
      },
      {
        id: "cmd_stock",
        trigger: "/stock",
        label: "FinGPT Stock Valuation",
        icon: "📊",
        modelId: "trading/fingpt-forecaster",
        temperature: 0.2,
        systemPrompt: "You are FinGPT-Forecaster from Columbia AI4Finance. Analyze corporate filings (10-K/10-Q), earnings call sentiment, debt-to-equity metrics, revenue growth, and catalyst-driven price action.",
        webSearch: true,
        osint: false
      },
      {
        id: "cmd_quant",
        trigger: "/quant",
        label: "Options Greeks & Algorithmic Trading",
        icon: "📈",
        modelId: "trading/deepseek-quant-reasoning",
        temperature: 0.1,
        systemPrompt: "You are a Senior Quantitative Analyst. Solve mathematical options pricing (Black-Scholes), Greeks sensitivities (Delta, Gamma, Vega, Theta), Value at Risk (VaR), and risk parity portfolio weights.",
        webSearch: false,
        osint: false
      },
      {
        id: "cmd_spatial_ai",
        trigger: "/spatial",
        label: "3D Spatial AI & ML Master",
        icon: "🧠",
        modelId: "auto/smart",
        temperature: 0.2,
        systemPrompt: "You are a Principal AI Architect and Spatial Computing Engineer mastering all 26 foundational Deep Machine Learning concepts mapped to 3D modeling, parametric CAD, mesh topology, BIM, and spatial graphics. Provide mathematically rigorous explanations and production-ready Blender/IfcOpenShell/PyTorch code.",
        webSearch: false,
        osint: false
      },
      {
        id: "cmd_jarvis",
        trigger: "/jarvis",
        label: "J.A.R.V.I.S. Holographic Matrix",
        icon: "✦",
        modelId: "auto/smart",
        temperature: 0.3,
        systemPrompt: "You are J.A.R.V.I.S. (Just A Rather Very Intelligent System). Deliver razor-sharp, technically brilliant, and sophisticated analysis. At the very end of EVERY response, append the single-line minified JSON telemetry wrapper: |||{\"pulse_intensity\": 0.85, \"matrix_mode\": \"STANDARD_OPTICS\", \"data_packet_size\": 1024}||| with no trailing text.",
        webSearch: false,
        osint: false
      }
    ];

    this.state = this.loadState();
    this.applyTheme(this.state.activeThemeId);
  }

  loadState() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        let themeId = parsed.activeThemeId;
        if (!themeId || themeId === "gemini-obsidian") {
          themeId = "apple-sequoia";
        }
        return {
          activeThemeId: themeId,
          customAccent: parsed.customAccent || null,
          chatMaxWidth: parsed.chatMaxWidth || "1040px",
          chatFontSize: parsed.chatFontSize || "14px",
          autoExpandThinking: parsed.autoExpandThinking !== undefined ? parsed.autoExpandThinking : false,
          slashCommands: Array.isArray(parsed.slashCommands) && parsed.slashCommands.length > 0 ? parsed.slashCommands : this.defaultSlashCommands,
          customModels: Array.isArray(parsed.customModels) ? parsed.customModels : [],
          modelOverrides: parsed.modelOverrides || {}, // { [modelId]: { slug, pinned, hidden, customTemp } }
          activeMode: parsed.activeMode || "gemini" // 'search', 'gemini', 'osint', 'arena'
        };
      }
    } catch (e) {
      console.warn("Failed to load customization state:", e);
    }

    return {
      activeThemeId: "apple-sequoia",
      customAccent: null,
      chatMaxWidth: "1040px",
      chatFontSize: "14px",
      autoExpandThinking: false,
      slashCommands: this.defaultSlashCommands,
      customModels: [],
      modelOverrides: {},
      activeMode: "gemini"
    };
  }

  saveState() {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.state));
    } catch (e) {
      console.warn("Failed to save customization state:", e);
    }
  }

  applyTheme(themeId) {
    const theme = this.defaultThemes[themeId] || this.defaultThemes["gemini-obsidian"];
    this.state.activeThemeId = theme.id;
    const root = document.documentElement;

    root.style.setProperty("--bg-canvas", theme.canvasBg);
    root.style.setProperty("--bg-surface", theme.surfaceBg);
    root.style.setProperty("--bg-card", theme.cardBg);
    root.style.setProperty("--border-subtle", theme.borderColor);
    root.style.setProperty("--text-main", theme.textColor);
    root.style.setProperty("--text-muted", theme.textMuted);
    
    const accent = this.state.customAccent || theme.accentPrimary;
    root.style.setProperty("--accent-primary", accent);
    root.style.setProperty("--accent-gradient", theme.accentGradient);
    root.style.setProperty("--chat-max-width", this.state.chatMaxWidth);
    root.style.setProperty("--chat-font-size", this.state.chatFontSize);

    if (theme.isDark) {
      root.classList.add("dark");
      root.classList.remove("light");
    } else {
      root.classList.remove("dark");
      root.classList.add("light");
    }

    this.saveState();
  }

  setCustomAccent(colorHex) {
    this.state.customAccent = colorHex;
    if (colorHex) {
      document.documentElement.style.setProperty("--accent-primary", colorHex);
    } else {
      const theme = this.defaultThemes[this.state.activeThemeId];
      if (theme) document.documentElement.style.setProperty("--accent-primary", theme.accentPrimary);
    }
    this.saveState();
  }

  setChatLayout(maxWidth, fontSize) {
    if (maxWidth) {
      this.state.chatMaxWidth = maxWidth;
      document.documentElement.style.setProperty("--chat-max-width", maxWidth);
    }
    if (fontSize) {
      this.state.chatFontSize = fontSize;
      document.documentElement.style.setProperty("--chat-font-size", fontSize);
    }
    this.saveState();
  }

  setThinkingPreference(autoExpand) {
    this.state.autoExpandThinking = !!autoExpand;
    this.saveState();
  }

  // --- Quick-Stack Slash Command Manager ---
  getSlashCommands() {
    return this.state.slashCommands;
  }

  addSlashCommand(cmd) {
    if (!cmd.trigger.startsWith("/")) cmd.trigger = "/" + cmd.trigger;
    const newCmd = {
      id: "cmd_" + Date.now(),
      trigger: cmd.trigger,
      label: cmd.label || cmd.trigger,
      icon: cmd.icon || "⚡",
      modelId: cmd.modelId || "auto",
      temperature: cmd.temperature !== undefined ? parseFloat(cmd.temperature) : 0.7,
      systemPrompt: cmd.systemPrompt || "",
      webSearch: !!cmd.webSearch,
      osint: !!cmd.osint
    };
    this.state.slashCommands.push(newCmd);
    this.saveState();
    return newCmd;
  }

  updateSlashCommand(id, updates) {
    const idx = this.state.slashCommands.findIndex(c => c.id === id);
    if (idx !== -1) {
      if (updates.trigger && !updates.trigger.startsWith("/")) updates.trigger = "/" + updates.trigger;
      this.state.slashCommands[idx] = { ...this.state.slashCommands[idx], ...updates };
      this.saveState();
      return this.state.slashCommands[idx];
    }
    return null;
  }

  deleteSlashCommand(id) {
    this.state.slashCommands = this.state.slashCommands.filter(c => c.id !== id);
    this.saveState();
  }

  reorderSlashCommands(newOrderIds) {
    const map = new Map(this.state.slashCommands.map(c => [c.id, c]));
    const reordered = [];
    for (const id of newOrderIds) {
      if (map.has(id)) reordered.push(map.get(id));
    }
    this.state.slashCommands = reordered;
    this.saveState();
  }

  // --- Custom Models & Overrides ---
  getCustomModels() {
    return this.state.customModels;
  }

  addCustomModel(model) {
    const id = model.id || `custom/${model.provider || 'openai'}/${model.slug || Date.now()}`;
    const newModel = {
      id: id,
      name: model.name || model.slug,
      provider: model.provider || "custom",
      provider_name: model.provider_name || "Custom Endpoint",
      category: model.category || "general",
      context_window: model.context_window || "128,000 tokens",
      speed_rating: model.speed_rating || "⚡ Custom API Speed",
      free_quota: model.free_quota || "BYOK / Custom",
      description: model.description || `Custom endpoint model (${model.slug}).`,
      tags: ["Custom", model.provider || "OpenAI"],
      litellm_model: model.slug || id,
      custom_url: model.custom_url || null,
      custom_key: model.custom_key || null,
      custom_temp: model.custom_temp !== undefined ? parseFloat(model.custom_temp) : 0.7,
      icon: model.icon || "cpu",
      color: model.color || "emerald",
      group: "custom",
      data_retention: "user_configured",
      is_custom: true
    };
    this.state.customModels.push(newModel);
    this.saveState();

    if (window.MODELS_CATALOG && !window.MODELS_CATALOG.some(m => m.id === id)) {
      window.MODELS_CATALOG.unshift(newModel);
    }
    return newModel;
  }

  deleteCustomModel(id) {
    this.state.customModels = this.state.customModels.filter(m => m.id !== id);
    this.saveState();
    if (window.MODELS_CATALOG) {
      window.MODELS_CATALOG = window.MODELS_CATALOG.filter(m => m.id !== id);
    }
  }

  setModelOverride(modelId, override) {
    if (!this.state.modelOverrides[modelId]) {
      this.state.modelOverrides[modelId] = {};
    }
    this.state.modelOverrides[modelId] = { ...this.state.modelOverrides[modelId], ...override };
    this.saveState();
  }

  getModelOverride(modelId) {
    return this.state.modelOverrides[modelId] || {};
  }

  togglePinModel(modelId) {
    const current = this.getModelOverride(modelId);
    this.setModelOverride(modelId, { pinned: !current.pinned });
  }

  toggleHideModel(modelId) {
    const current = this.getModelOverride(modelId);
    this.setModelOverride(modelId, { hidden: !current.hidden });
  }

  // --- Export / Import Backup ---
  exportBackupData() {
    return {
      version: "3.5",
      exportedAt: new Date().toISOString(),
      customization: this.state,
      keys: {
        openrouter: localStorage.getItem("freellm_openrouter_key") || "",
        groq: localStorage.getItem("freellm_groq_key") || "",
        gemini: localStorage.getItem("freellm_gemini_key") || "",
        mistral: localStorage.getItem("freellm_mistral_key") || "",
        omniroute: localStorage.getItem("omniroute_key") || "",
        customEndpoint: localStorage.getItem("freellm_custom_endpoint") || "",
        backendUrl: localStorage.getItem("freellm_backend_url") || "",
        omnirouteUrl: localStorage.getItem("omniroute_url") || ""
      }
    };
  }

  importBackupData(json) {
    if (!json || typeof json !== "object") throw new Error("Invalid backup JSON format");
    if (json.customization) {
      this.state = { ...this.state, ...json.customization };
      this.saveState();
      this.applyTheme(this.state.activeThemeId);
    }
    if (json.keys) {
      if (json.keys.openrouter) localStorage.setItem("freellm_openrouter_key", json.keys.openrouter);
      if (json.keys.groq) localStorage.setItem("freellm_groq_key", json.keys.groq);
      if (json.keys.gemini) localStorage.setItem("freellm_gemini_key", json.keys.gemini);
      if (json.keys.mistral) localStorage.setItem("freellm_mistral_key", json.keys.mistral);
      if (json.keys.omniroute) localStorage.setItem("omniroute_key", json.keys.omniroute);
      if (json.keys.customEndpoint) localStorage.setItem("freellm_custom_endpoint", json.keys.customEndpoint);
      if (json.keys.backendUrl) localStorage.setItem("freellm_backend_url", json.keys.backendUrl);
      if (json.keys.omnirouteUrl) localStorage.setItem("omniroute_url", json.keys.omnirouteUrl);
    }
    return true;
  }
}

window.CustomizationStore = CustomizationStore;
window.customStore = new CustomizationStore();
