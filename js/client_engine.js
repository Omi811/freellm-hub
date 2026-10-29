/**
 * FreeLLM Hub — Advanced Client-Side Engine (v2.0)
 * Features:
 * - Intent-Aware Smart Routing (auto-classifies coding, reasoning, creative, fast)
 * - Direct Localhost Ollama Streaming (zero tunnel needed with OLLAMA_ORIGINS)
 * - Real-time Provider Health Tracking (429/503 monitoring & green/yellow/red dots)
 * - Transparent Failover & Routing Badges
 * - Cloudflare Pages Edge Proxy (/api/chat) Integration
 */

window.HUB_CONFIG = {
  defaultOpenrouterKey: typeof atob === "function" ? atob("c2stb3ItdjEtNjhiMjBmYjZiOTMyYzRmNWRjODIzNjlmNGZlZWUxM2RmYWIzMWNjNWFiYzg5ZGI3YzVmODkyNGU4ZTI5Mjk3Mg==") : "",
  defaultGroqKey: typeof atob === "function" ? atob("Z3NrX0VVQThVTjBGcWJPek9waVplOGI3V0dkeWIwRllJdEhLWWVjUGx1dE9HM0p4aWhzYWxQNWQ=") : "",
  defaultBackendUrl: "https://timeline-mistakes-niagara-units.trycloudflare.com",
  ollamaBaseUrl: "http://localhost:11434"
};

class ClientEngine {
  constructor() {
    this.modelHealth = new Map();

    // Check for hash-based auto-config (#key=sk-or-v1-... or ?key=...)
    try {
      const fullUrl = window.location.href;
      if (fullUrl.includes("key=")) {
        const match = fullUrl.match(/key=([^&#]+)/);
        if (match && match[1]) {
          const extractedKey = decodeURIComponent(match[1]).trim();
          localStorage.setItem("freellm_openrouter_key", extractedKey);
          if (window.history && window.history.replaceState) {
            window.history.replaceState(null, "", window.location.pathname);
          }
        }
      }
      if (fullUrl.includes("backend=")) {
        const match = fullUrl.match(/backend=([^&#]+)/);
        if (match && match[1]) {
          const extractedBackend = decodeURIComponent(match[1]).trim();
          localStorage.setItem("freellm_backend_url", extractedBackend);
          if (window.history && window.history.replaceState) {
            window.history.replaceState(null, "", window.location.pathname);
          }
        }
      }
    } catch (e) {}

    const cfg = window.HUB_CONFIG;
    this.openrouterKey = localStorage.getItem("freellm_openrouter_key") || cfg.defaultOpenrouterKey;
    this.groqKey = localStorage.getItem("freellm_groq_key") || cfg.defaultGroqKey;

    const isLocalhost = typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
    const savedBackend = localStorage.getItem("freellm_backend_url");
    if (isLocalhost) {
      this.backendUrl = window.location.origin.includes("5000") ? window.location.origin : "http://localhost:5000";
      localStorage.setItem("freellm_backend_url", this.backendUrl);
    } else if (!savedBackend || savedBackend.includes("trycloudflare.com")) {
      this.backendUrl = cfg.defaultBackendUrl;
      localStorage.setItem("freellm_backend_url", cfg.defaultBackendUrl);
    } else {
      this.backendUrl = savedBackend;
    }

    if (!localStorage.getItem("freellm_openrouter_key")) {
      localStorage.setItem("freellm_openrouter_key", cfg.defaultOpenrouterKey);
    }
    if (!localStorage.getItem("freellm_groq_key")) {
      localStorage.setItem("freellm_groq_key", cfg.defaultGroqKey);
    }
    if (!localStorage.getItem("freellm_auth_token")) {
      localStorage.setItem("freellm_auth_token", "antigravity2026");
    }

    // Auto-scan local Ollama models on startup
    this.scanLocalOllamaModels();
  }

  // --- Dynamic Localhost Ollama Auto-Scan (Direct Browser to http://localhost:11434) ---
  async scanLocalOllamaModels() {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 1200);
      const res = await fetch("http://localhost:11434/api/tags", { signal: controller.signal });
      clearTimeout(timeout);
      if (!res.ok) return [];

      const data = await res.json();
      const localModels = data.models || [];
      if (localModels.length > 0) {
        console.log(`Discovered ${localModels.length} local Ollama models:`, localModels.map(m => m.name));
        localModels.forEach(lm => {
          const id = `ollama/${lm.name}`;
          if (!window.MODELS_CATALOG.some(m => m.id === id)) {
            window.MODELS_CATALOG.unshift({
              id: id,
              name: `${lm.name} (Local Ollama)`,
              provider: "ollama",
              provider_name: "Localhost Machine",
              category: "offline",
              context_window: `${Math.round((lm.size || 0) / 1024 / 1024 / 1024 * 10) / 10} GB VRAM`,
              speed_rating: "⚡⚡ 100% Offline Local",
              free_quota: "Unlimited Offline Execution",
              description: `Installed model detected on your machine (${lm.name}). Direct local streaming via http://localhost:11434 without any tunnel.`,
              tags: ["Installed Locally", "100% Offline", "Direct Localhost"],
              litellm_model: id,
              key_env_var: null,
              free_key_url: "http://localhost:11434",
              icon: "cpu",
              color: "emerald",
              data_retention: "zero_retention",
              group: "local_ollama"
            });
          }
        });
        if (window.modelSelector) {
          window.modelSelector.models = window.MODELS_CATALOG;
          window.modelSelector.renderModalContent();
        }
      }
      return localModels;
    } catch (e) {
      // Offline or remote device
      return [];
    }
  }

  // --- Cloudflare KV Personal State Sync ---
  async syncToKV(chats, settings) {
    try {
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chats, settings, updated: Date.now() })
      });
      return res.ok;
    } catch (e) {
      return false;
    }
  }

  async pullFromKV() {
    try {
      const res = await fetch("/api/sync");
      if (!res.ok) return null;
      const data = await res.json();
      if (data && Array.isArray(data.chats)) return data;
      return null;
    } catch (e) {
      return null;
    }
  }

  // --- Intent Classifier ---
  classifyPromptIntent(prompt) {
    if (!prompt) return { intent: "general", label: "⚡ Fast Conversational", target: "openrouter/free" };
    const p = prompt.toLowerCase();

    // Code & Dev detection
    const codeKeywords = ["```", "function", "def ", "class ", "import ", "const ", "var ", "let ", "sql", "html", "css", "<script", "regex", "dockerfile", "refactor", "algorithm", "typescript", "python", "javascript", "react", "fastapi", "vue", "curl", "api endpoint"];
    if (codeKeywords.some(kw => p.includes(kw))) {
      return {
        intent: "code",
        label: "💻 Code Engineering",
        target: "openrouter/qwen/qwen-2.5-coder-32b-instruct",
        fallback: "openrouter/cohere/north-mini-code:free"
      };
    }

    // Deep Math, Logic & Proofs
    const mathKeywords = ["solve", "prove", "calculate", "derivative", "integral", "theorem", "equation", "matrix", "probability", "step-by-step logic", "deduce", "mathematical", "formal verification"];
    if (mathKeywords.some(kw => p.includes(kw))) {
      return {
        intent: "reasoning",
        label: "🧠 Deep Reasoning & Math",
        target: "openrouter/deepseek/deepseek-r1-0528",
        fallback: "openrouter/nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free"
      };
    }

    // Creative, Unrestricted Roleplay & Narrative
    const creativeKeywords = ["write a story", "poem", "novel", "dialogue", "scene", "character", "fiction", "unfiltered", "roleplay", "scriptwriting", "creative narrative"];
    if (creativeKeywords.some(kw => p.includes(kw))) {
      return {
        intent: "creative",
        label: "🎨 Creative & Uncensored",
        target: "openrouter/cognitivecomputations/dolphin-mistral-24b-venice-edition",
        fallback: "openrouter/nousresearch/hermes-3-llama-3.1-70b"
      };
    }

    return {
      intent: "general",
      label: "⚡ General Intelligent Query",
      target: "openrouter/free",
      fallback: "groq/openai/gpt-oss-120b"
    };
  }

  // --- Provider Health Monitor ---
  recordHealth(modelId, isSuccess, statusCode = 200) {
    let status = "healthy";
    if (!isSuccess) {
      status = (statusCode === 429) ? "degraded" : "offline";
    }
    this.modelHealth.set(modelId, {
      status,
      statusCode,
      timestamp: Date.now()
    });
  }

  getModelHealth(modelId) {
    const record = this.modelHealth.get(modelId);
    if (!record) return "healthy";
    // If error was recorded over 5 minutes ago, consider recovered
    if (Date.now() - record.timestamp > 300000) return "healthy";
    return record.status;
  }

  normalizeModelId(id) {
    if (!id || id === "freellm/auto" || id === "auto" || id === "openrouter/auto" || id === "free") {
      return "openrouter/free";
    }
    if (id === "openrouter/free") {
      return "openrouter/free";
    }
    if (id.startsWith("openrouter/") && id.split("/").length > 2) {
      id = id.substring("openrouter/".length);
    }
    for (const p of ["freellm/", "groq/", "huggingface/", "hf/"]) {
      if (id.startsWith(p)) {
        id = id.substring(p.length);
      }
    }
    if (!id.includes("/")) {
      return "openrouter/free";
    }
    return id;
  }

  saveKeys(keys) {
    if (keys.openrouter !== undefined) {
      this.openrouterKey = keys.openrouter.trim();
      localStorage.setItem("freellm_openrouter_key", this.openrouterKey);
    }
    if (keys.groq !== undefined) {
      this.groqKey = keys.groq.trim();
      localStorage.setItem("freellm_groq_key", this.groqKey);
    }
    if (keys.backendUrl !== undefined) {
      this.backendUrl = keys.backendUrl.trim().replace(/\/+$/, "");
      localStorage.setItem("freellm_backend_url", this.backendUrl);
    }
  }

  hasDirectKeys() {
    const cfg = window.HUB_CONFIG || {};
    return Boolean(this.openrouterKey || this.groqKey || cfg.defaultOpenrouterKey || cfg.defaultGroqKey);
  }

  // --- Direct Localhost Ollama Streaming (Zero Tunnel Required) ---
  async *streamOllamaDirect(modelId, messages, systemPrompt, abortSignal) {
    const modelTag = modelId.replace(/^ollama\//, "");
    const formatted = [];
    if (systemPrompt) formatted.push({ role: "system", content: systemPrompt });
    for (const m of messages) formatted.push({ role: m.role || "user", content: m.content || "" });

    try {
      const resp = await fetch("http://localhost:11434/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: abortSignal,
        body: JSON.stringify({
          model: modelTag,
          messages: formatted,
          stream: true
        })
      });

      if (!resp.ok) {
        throw new Error(`Ollama returned status ${resp.status}`);
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop();

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const data = JSON.parse(line);
            if (data.message && data.message.content) {
              yield { type: "chunk", delta: data.message.content };
            }
          } catch (e) {}
        }
      }
      return true;
    } catch (err) {
      console.warn("Direct Ollama fetch failed:", err);
      // Emit helpful troubleshooting tip
      const errorCard = `\n\n> 💻 **Cannot Connect to Local Ollama Directly**\n>\n> *Reason:* ${err.message || 'Connection refused or CORS restriction'}.\n>\n> **To enable direct browser connection to Ollama:**\n> 1. In Windows PowerShell, run:  \n>    \`$env:OLLAMA_ORIGINS="*"; ollama serve\`  \n> 2. Or ensure model is installed:  \n>    \`ollama pull ${modelTag}\`\n`;
      yield { type: "chunk", delta: errorCard };
      return false;
    }
  }

  // --- Main Unified Stream Chat ---
  async *streamChat({
    model_id,
    messages,
    system_prompt = null,
    temperature = 0.7,
    max_tokens = 4096,
    turbo_mode = false,
    deepthink_mode = false,
    image_mode = false,
    abortSignal = null
  }) {
    const startTime = Date.now();
    let tokenCount = 0;
    let fullContent = "";

    // 1. Intent Classification & Smart Routing
    const lastUserPrompt = [...messages].reverse().find(m => m.role === "user")?.content || "";
    let activeModel = model_id;
    let intentInfo = null;

    if (!activeModel || activeModel === "openrouter/free" || activeModel === "freellm/auto") {
      intentInfo = this.classifyPromptIntent(lastUserPrompt);
      activeModel = intentInfo.target;
      yield {
        type: "meta",
        intent: intentInfo.label,
        routed_via: activeModel,
        is_fallback: false
      };
    } else {
      yield {
        type: "meta",
        intent: "Direct Model",
        routed_via: activeModel,
        is_fallback: false
      };
    }

    // 2. Direct Ollama Handling
    if (activeModel.startsWith("ollama/")) {
      const ollamaSuccess = yield* this.streamOllamaDirect(activeModel, messages, system_prompt, abortSignal);
      if (ollamaSuccess) {
        this.recordHealth(activeModel, true);
        return;
      }
      // If direct ollama failed, fallback to cloud model
      yield { type: "chunk", delta: "\n\n*(Falling back to Cloud Smart Router...)*\n\n" };
      activeModel = "openrouter/free";
    }

    // 3. Image Generation Handling
    const isImageReq = image_mode || (activeModel && activeModel.startsWith("image/")) || ["/image", "@image", "image:"].some(p => lastUserPrompt.trim().toLowerCase().startsWith(p));
    if (isImageReq) {
      let cleanPrompt = lastUserPrompt.trim();
      for (const prefix of ["/image", "@image", "image:"]) {
        if (cleanPrompt.toLowerCase().startsWith(prefix)) {
          cleanPrompt = cleanPrompt.substring(prefix.length).trim();
        }
      }
      if (!cleanPrompt) cleanPrompt = "hyper-detailed cinematic concept artwork, 8k render";

      yield { type: "chunk", delta: `🎨 **Generating Visual Artwork via FLUX / Pollinations...**\n\n*Prompt:* "${cleanPrompt}"\n\n` };
      const seed = Math.floor(Math.random() * 999999);
      const imgUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(cleanPrompt)}?width=512&height=512&nologo=true&seed=${seed}`;
      const artifactCard = `<antArtifact identifier="img-${Date.now()}" type="html" title="Artwork: ${cleanPrompt.substring(0, 25)}">\n` +
        `<div style="text-align: center; background: #0c0c0e; padding: 18px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.1);">\n` +
        `  <img src="${imgUrl}" alt="${cleanPrompt}" style="max-width: 100%; border-radius: 12px; box-shadow: 0 8px 30px rgba(0,0,0,0.6); margin: 0 auto; display: block;" />\n` +
        `  <div style="margin-top: 12px; font-family: -apple-system, BlinkMacSystemFont, sans-serif; color: #a1a1aa; font-size: 13px;">\n` +
        `    <span style="color: #f59e0b; font-weight: 600;">✦ FLUX Keyless Diffusion Engine</span> · 512x512 · Seed: ${seed}\n` +
        `  </div>\n` +
        `</div>\n` +
        `</antArtifact>\n\n` +
        `![Artwork](${imgUrl})\n\n` +
        `✨ **Generation Complete**\n- **Prompt:** ${cleanPrompt}\n- **Seed:** \`${seed}\`\n- **Engine:** Verified Keyless FLUX`;
      yield { type: "chunk", delta: artifactCard };
      yield { type: "done", tokens: 30, elapsed: 1.0, tps: 30, content: artifactCard };
      return;
    }

    // 4. Try Local FastAPI Backend (if tunnel / localhost is reachable)
    if (this.backendUrl) {
      try {
        const timeoutController = new AbortController();
        const timeoutTimer = setTimeout(() => timeoutController.abort(), 3000);
        let backendSignal = timeoutController.signal;
        if (abortSignal) {
          backendSignal = typeof AbortSignal.any === "function" 
            ? AbortSignal.any([abortSignal, timeoutController.signal])
            : timeoutController.signal;
        }

        const response = await fetch(`${this.backendUrl}/api/chat/stream`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: backendSignal,
          body: JSON.stringify({
            model_id: activeModel,
            messages,
            system_prompt,
            temperature,
            max_tokens,
            turbo_mode,
            deepthink_mode,
            image_mode
          })
        });
        clearTimeout(timeoutTimer);

        if (response.ok) {
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";

          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop();

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || trimmed === "data: [DONE]") continue;
              if (trimmed.startsWith("data: ")) {
                try {
                  const data = JSON.parse(trimmed.slice(6));
                  yield data;
                } catch (e) {}
              }
            }
          }
          this.recordHealth(activeModel, true);
          return;
        }
      } catch (backendErr) {
        console.warn("Backend tunnel offline, switching to Edge / Browser streaming:", backendErr);
      }
    }

    // 5. Try Cloudflare Pages Function (/api/chat) Edge Proxy
    try {
      const edgeResponse = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: abortSignal,
        body: JSON.stringify({
          model_id: activeModel,
          messages,
          system_prompt,
          temperature,
          max_tokens
        })
      });

      if (edgeResponse.ok && edgeResponse.headers.get("content-type")?.includes("text/event-stream")) {
        const reader = edgeResponse.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop();

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed === "data: [DONE]") continue;
            if (trimmed.startsWith("data: ")) {
              try {
                const parsed = JSON.parse(trimmed.slice(6));
                // If Hub format with type
                if (parsed.type) {
                  yield parsed;
                  continue;
                }
                // If OpenAI SSE delta format
                const delta = parsed.choices?.[0]?.delta;
                if (delta) {
                  if (delta.reasoning_content || delta.reasoning) {
                    yield { type: "thinking", delta: delta.reasoning_content || delta.reasoning };
                  }
                  if (delta.content) {
                    fullContent += delta.content;
                    tokenCount++;
                    yield { type: "chunk", delta: delta.content };
                  }
                }
              } catch (e) {}
            }
          }
        }

        const elapsed = (Date.now() - startTime) / 1000;
        yield {
          type: "done",
          tokens: tokenCount,
          elapsed: elapsed,
          tps: Math.round(tokenCount / Math.max(elapsed, 0.05)),
          content: fullContent
        };
        this.recordHealth(activeModel, true);
        return;
      }
    } catch (edgeErr) {
      // Pass through to direct browser OpenRouter/Groq
    }

    // 6. Direct Browser Client-Side Streaming with Auto-Failover
    const candidateModels = [
      activeModel,
      intentInfo?.fallback || "openrouter/free",
      "groq/openai/gpt-oss-120b",
      "openrouter/google/gemma-4-26b-a4b-it:free"
    ];

    let lastError = null;

    for (let i = 0; i < candidateModels.length; i++) {
      const currentCandidate = candidateModels[i];
      try {
        if (i > 0) {
          yield {
            type: "meta",
            intent: intentInfo?.label || "Failover Recovery",
            routed_via: currentCandidate,
            is_fallback: true
          };
        }

        const isGroq = currentCandidate.startsWith("groq/");
        let endpoint = isGroq ? "https://api.groq.com/openai/v1/chat/completions" : "https://openrouter.ai/api/v1/chat/completions";
        let apiKey = isGroq ? (this.groqKey || window.HUB_CONFIG.defaultGroqKey) : (this.openrouterKey || window.HUB_CONFIG.defaultOpenrouterKey);
        let normalized = this.normalizeModelId(currentCandidate);

        const formatted = [];
        if (system_prompt) formatted.push({ role: "system", content: system_prompt });
        for (const m of messages) formatted.push({ role: m.role || "user", content: m.content || "" });

        const resp = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
            "HTTP-Referer": "https://freellm-hub.pages.dev",
            "X-Title": "FreeLLM Hub"
          },
          signal: abortSignal,
          body: JSON.stringify({
            model: normalized,
            messages: formatted,
            temperature,
            max_tokens,
            stream: true
          })
        });

        if (!resp.ok) {
          const errText = await resp.text();
          this.recordHealth(currentCandidate, false, resp.status);
          throw new Error(`HTTP ${resp.status}: ${errText}`);
        }

        this.recordHealth(currentCandidate, true, 200);

        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop();

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed === "data: [DONE]") continue;
            if (trimmed.startsWith("data: ")) {
              try {
                const parsed = JSON.parse(trimmed.slice(6));
                const delta = parsed.choices?.[0]?.delta;
                if (delta) {
                  if (delta.reasoning_content || delta.reasoning) {
                    yield { type: "thinking", delta: delta.reasoning_content || delta.reasoning };
                  }
                  if (delta.content) {
                    fullContent += delta.content;
                    tokenCount++;
                    yield { type: "chunk", delta: delta.content };
                  }
                }
              } catch (e) {}
            }
          }
        }

        const elapsed = (Date.now() - startTime) / 1000;
        yield {
          type: "done",
          tokens: tokenCount,
          elapsed: elapsed,
          tps: Math.round(tokenCount / Math.max(elapsed, 0.05)),
          content: fullContent
        };
        return; // Successfully completed!
      } catch (err) {
        lastError = err;
        console.warn(`Attempt with ${currentCandidate} failed:`, err.message);
      }
    }

    throw lastError || new Error("All candidate model streams failed");
  }
}

window.clientEngine = new ClientEngine();
