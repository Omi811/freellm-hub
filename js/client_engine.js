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
          deepthink_mode
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

    // 2. Direct Browser Client-Side Streaming (OpenRouter / Groq)
    let activeKey = this.openrouterKey;
    let activeModel = model_id.replace(/^openrouter\//, "");

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
