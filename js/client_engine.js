/**
 * FreeLLM Hub — Client-Side Serverless Streaming Engine
 * Supports direct client-side OpenRouter / Groq streaming with CORS,
 * as well as hybrid bridge connection to self-hosted FastAPI backend.
 */

class ClientEngine {
  constructor() {
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

    this.openrouterKey = localStorage.getItem("freellm_openrouter_key") || "";
    this.groqKey = localStorage.getItem("freellm_groq_key") || "";
    this.backendUrl = localStorage.getItem("freellm_backend_url") || "";
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
    return Boolean(this.openrouterKey || this.groqKey);
  }

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
    let thinkingContent = "";

    // 1. If backend URL is set, prioritize self-hosted server
    if (this.backendUrl) {
      const response = await fetch(`${this.backendUrl}/api/chat/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Hub-Token": localStorage.getItem("freellm_auth_token") || ""
        },
        signal: abortSignal,
        body: JSON.stringify({
          model_id,
          messages,
          system_prompt,
          temperature,
          max_tokens,
          turbo_mode,
          deepthink_mode,
          image_mode
        })
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ detail: `HTTP ${response.status}` }));
        throw new Error(err.detail || `Server error ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop();

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith("data: ")) {
            const data = JSON.parse(trimmed.slice(6));
            yield data;
          }
        }
      }
      return;
    }

    // 2. Check for image mode trigger in serverless mode
    const userPrompt = [...messages].reverse().find(m => m.role === "user")?.content || "";
    const isImageReq = image_mode || (model_id && model_id.startsWith("image/")) || ["/image", "@image", "image:"].some(p => userPrompt.trim().toLowerCase().startsWith(p));

    if (isImageReq) {
      let cleanPrompt = userPrompt.trim();
      for (const prefix of ["/image", "@image", "image:"]) {
        if (cleanPrompt.toLowerCase().startsWith(prefix)) {
          cleanPrompt = cleanPrompt.substring(prefix.length).trim();
        }
      }
      if (!cleanPrompt) cleanPrompt = "a futuristic neon cyberpunk aesthetic artwork, 8k render, photorealistic";

      yield { type: "chunk", delta: `🎨 **Initializing Image Generation...**\n\n*Prompt:* "${cleanPrompt}"\n\nRendering visual artwork...\n\n` };
      
      const seed = Math.floor(Math.random() * 999999);
      const imgUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(cleanPrompt)}?width=512&height=512&nologo=true&seed=${seed}`;
      
      const artifactCard = `<antArtifact identifier="gen-img-${Date.now()}" type="html" title="Visual Artwork: ${cleanPrompt.substring(0, 25)}">\n` +
        `<div style="text-align: center; background: #0c0c0e; padding: 18px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.1);">\n` +
        `  <img src="${imgUrl}" alt="${cleanPrompt}" style="max-width: 100%; border-radius: 12px; box-shadow: 0 8px 30px rgba(0,0,0,0.6); margin: 0 auto; display: block;" />\n` +
        `  <div style="margin-top: 12px; font-family: -apple-system, BlinkMacSystemFont, sans-serif; color: #a1a1aa; font-size: 13px;">\n` +
        `    <span style="color: #f59e0b; font-weight: 600;">✦ AI Visual Diffusion Engine</span> · 512x512 · Seed: ${seed}\n` +
        `  </div>\n` +
        `</div>\n` +
        `</antArtifact>\n\n` +
        `![Artwork](${imgUrl})\n\n` +
        `✨ **Generation Complete**\n- **Prompt:** ${cleanPrompt}\n- **Seed:** \`${seed}\`\n- **Renderer:** Cloud Diffusion Node`;

      yield { type: "chunk", delta: artifactCard };
      yield { type: "done", tokens: 35, elapsed: 1.5, tps: 35, content: artifactCard };
      return;
    }

    // 2. Direct Browser Client-Side Streaming (OpenRouter / Groq)
    let activeKey = this.openrouterKey;
    let activeModel = model_id || "openrouter/deepseek/deepseek-r1-0528";

    // Auto-map internal/smart-router and local IDs in serverless mode
    if (activeModel === "freellm/auto" || activeModel === "auto") {
      activeModel = "deepseek/deepseek-r1-0528";
    } else if (activeModel === "freellm/keyless-llama" || activeModel === "keyless-llama") {
      activeModel = "meta-llama/llama-3.3-70b-instruct";
    } else if (activeModel === "zai/glm-4-flash") {
      activeModel = "z-ai/glm-5.3-flash";
    } else if (activeModel.startsWith("groq/")) {
      activeModel = activeModel.replace("groq/", "");
    } else if (activeModel.startsWith("ollama/")) {
      const offlineWarn = `\n\n> 💻 **Offline Model Selected**\n>\n> \`${model_id}\` runs locally on your PC via Ollama.\n>\n> To use it in serverless mode, please select a Cloud model (like **DeepSeek R1**, **Meta Llama 3.3 70B**, or **Qwen Coder**) from the top model pill!`;
      yield { type: "chunk", delta: offlineWarn };
      yield { type: "done", tokens: 25, elapsed: 0.1, tps: 25, content: offlineWarn };
      return;
    }

    activeModel = activeModel.replace(/^openrouter\//, "");

    if (turbo_mode) {
      activeModel = "groq/openai/gpt-oss-20b";
      temperature = 0.4;
    } else if (deepthink_mode) {
      activeModel = "deepseek/deepseek-r1-0528";
      const REA_PROMPT = `You are operating in REA (Reverse Engineer Anything) DeepThink Mode.\nFollow Evidence-Driven Reasoning:\n1. [OBSERVED]: Explicit facts and constraints.\n2. [HYPOTHESES]: Formulate candidate solutions.\n3. [FALSIFICATION]: Challenge assumptions and test edge cases.\n4. [SYNTHESIS]: Final mathematically verified response.`;
      system_prompt = system_prompt ? `${REA_PROMPT}\n\n${system_prompt}` : REA_PROMPT;
    }

    if (!activeKey) {
      if (window.settings && window.settings.openModal) {
        setTimeout(() => window.settings.openModal(), 300);
      }
      const promptKeyMsg = `\n\n> 🔑 **API Key Setup Required**\n>\n> To chat directly in serverless mode, your browser needs your OpenRouter API Key.\n>\n> 👉 **Click [API Keys & Config] in the bottom-left sidebar** and paste your OpenRouter key, then click **Save Settings**.\n>\n> *Your key is saved privately inside your browser's localStorage and never leaves your device.*`;
      yield { type: "chunk", delta: promptKeyMsg };
      yield { type: "done", tokens: 20, elapsed: 0.1, tps: 20, content: promptKeyMsg };
      return;
    }

    const formattedMessages = [];
    if (system_prompt) {
      formattedMessages.push({ role: "system", content: system_prompt });
    }
    for (const m of messages) {
      formattedMessages.push({
        role: String(m.role || "user"),
        content: String(m.content || "")
      });
    }

    const payload = {
      model: activeModel,
      messages: formattedMessages,
      temperature,
      max_tokens,
      stream: true
    };

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${activeKey}`,
        "HTTP-Referer": window.location.origin,
        "X-Title": "FreeLLM Hub"
      },
      signal: abortSignal,
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      const errMsg = errData.error?.message || `OpenRouter Error ${response.status}`;
      throw new Error(errMsg);
    }

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
        if (!trimmed || !trimmed.startsWith("data: ")) continue;
        const jsonStr = trimmed.slice(6);
        if (jsonStr === "[DONE]") break;

        try {
          const parsed = JSON.parse(jsonStr);
          const delta = parsed.choices?.[0]?.delta;
          if (!delta) continue;

          // Check for reasoning / thinking tokens
          const reasoning = delta.reasoning_content || delta.reasoning || delta.thinking;
          if (reasoning) {
            thinkingContent += reasoning;
            yield { type: "thinking", delta: reasoning };
          }

          if (delta.content) {
            tokenCount++;
            fullContent += delta.content;
            yield { type: "chunk", delta: delta.content };
          }
        } catch (e) {
          // ignore stream parse glitches
        }
      }
    }

    const elapsed = Math.max(0.1, Number(((Date.now() - startTime) / 1000).toFixed(2)));
    const tps = Math.round((tokenCount / elapsed) * 10) / 10;

    yield {
      type: "done",
      tokens: tokenCount,
      elapsed,
      tps,
      content: fullContent,
      thinking: thinkingContent
    };
  }
}

window.clientEngine = new ClientEngine();
