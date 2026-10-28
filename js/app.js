// FreeLLM Hub — Client-Side Application Controller for GitHub Pages (v2.0)
// Features: IndexedDB storage, Multi-File Artifacts with live Console and "Fix with AI",
// Transparent Fallback & Intent Badges, Blind Arena Benchmark, and Backup Import/Export.

class App {
  constructor() {
    window.app = this;
    this.chats = [];
    this.currentChat = null;
    this.isStreaming = false;
    this.abortController = null;
    this.turboMode = false;
    this.deepthinkMode = false;
    this.imageMode = false;
    this.isArenaMode = false;
    this.isBlindArena = false;
    this.currentArtifactContent = "";
    this.lastArtifactError = null;

    this.modelSelector = new ModelSelector(this);
    window.modelSelector = this.modelSelector;
    this.settings = new SettingsManager();
    window.settings = this.settings;
  }

  escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  async init() {
    this.modelSelector.init();
    this.settings.init();
    await this.loadChats();
    this.setupEventListeners();
    this.setupArtifactsPanel();

    if (this.chats.length > 0) {
      this.selectChat(this.chats[0].id);
    } else {
      this.newChat();
    }
  }

  async loadChats() {
    try {
      if (window.hubStorage) {
        await window.hubStorage.init();
        this.chats = await window.hubStorage.getAllChats();
      } else {
        const data = localStorage.getItem("freellm_chats");
        this.chats = data ? JSON.parse(data) : [];
      }
      this.renderSidebarChats();
    } catch (e) {
      console.warn("Error loading chats from storage:", e);
      this.chats = [];
    }
  }

  async saveChats() {
    try {
      if (this.currentChat && window.hubStorage) {
        await window.hubStorage.saveChat(this.currentChat);
      }
      this.renderSidebarChats();
    } catch (e) {
      console.error("Failed to save chats to storage:", e);
    }
  }

  async deleteChat(chatId) {
    if (!confirm("Are you sure you want to delete this chat?")) return;
    if (window.hubStorage) {
      await window.hubStorage.deleteChat(chatId);
    }
    this.chats = this.chats.filter(c => c.id !== chatId);
    this.renderSidebarChats();
    if (this.currentChat && this.currentChat.id === chatId) {
      this.newChat();
    }
  }

  async handleImportBackup(input) {
    if (!input || !input.files || input.files.length === 0) return;
    const file = input.files[0];
    const text = await file.text();
    if (window.hubStorage) {
      const result = await window.hubStorage.importBackup(text);
      if (result.success) {
        alert(`Successfully imported ${result.count} conversations!`);
        await this.loadChats();
        if (this.chats.length > 0) this.selectChat(this.chats[0].id);
      } else {
        alert(`Backup import failed: ${result.error}`);
      }
    }
    input.value = "";
  }

  setupEventListeners() {
    const textarea = document.getElementById("chat-input-textarea");
    if (textarea) {
      textarea.addEventListener("input", () => {
        textarea.style.height = "auto";
        textarea.style.height = Math.min(textarea.scrollHeight, 220) + "px";
      });

      textarea.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          this.sendMessage();
        }
      });
    }

    window.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        this.newChat();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "t") {
        e.preventDefault();
        this.toggleTurboMode();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "d") {
        e.preventDefault();
        this.toggleDeepThinkMode();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "i") {
        e.preventDefault();
        this.toggleImageMode();
      }
      if (e.key === "Escape") {
        this.modelSelector.closeModal();
        this.settings.closeModal();
        this.closeArtifact();
      }
    });

    const arenaToggle = document.getElementById("arena-mode-toggle");
    if (arenaToggle) {
      arenaToggle.addEventListener("click", () => {
        this.isArenaMode = !this.isArenaMode;
        this.updateArenaUI();
      });
    }

    const stopBtn = document.getElementById("stop-stream-btn");
    if (stopBtn) {
      stopBtn.addEventListener("click", () => this.stopStreaming());
    }
  }

  toggleTurboMode() {
    this.turboMode = !this.turboMode;
    if (this.turboMode) this.deepthinkMode = false;
    this.updateModeUI();
  }

  toggleDeepThinkMode() {
    this.deepthinkMode = !this.deepthinkMode;
    if (this.deepthinkMode) {
      this.turboMode = false;
      this.imageMode = false;
    }
    this.updateModeUI();
  }

  toggleImageMode() {
    this.imageMode = !this.imageMode;
    if (this.imageMode) {
      this.turboMode = false;
      this.deepthinkMode = false;
    }
    this.updateModeUI();
  }

  updateModeUI() {
    const turboBtn = document.getElementById("mode-turbo-btn");
    const deepthinkBtn = document.getElementById("mode-deepthink-btn");
    const imageBtn = document.getElementById("mode-image-btn");

    if (turboBtn) {
      if (this.turboMode) {
        turboBtn.classList.add("bg-orange-500/20", "text-orange-400", "border-orange-500/40");
        turboBtn.classList.remove("text-stone-400");
      } else {
        turboBtn.classList.remove("bg-orange-500/20", "text-orange-400", "border-orange-500/40");
        turboBtn.classList.add("text-stone-400");
      }
    }

    if (deepthinkBtn) {
      if (this.deepthinkMode) {
        deepthinkBtn.classList.add("bg-purple-500/20", "text-purple-400", "border-purple-500/40");
        deepthinkBtn.classList.remove("text-stone-400");
      } else {
        deepthinkBtn.classList.remove("bg-purple-500/20", "text-purple-400", "border-purple-500/40");
        deepthinkBtn.classList.add("text-stone-400");
      }
    }

    if (imageBtn) {
      if (this.imageMode) {
        imageBtn.classList.add("bg-pink-500/20", "text-pink-400", "border-pink-500/40");
        imageBtn.classList.remove("text-stone-400");
      } else {
        imageBtn.classList.remove("bg-pink-500/20", "text-pink-400", "border-pink-500/40");
        imageBtn.classList.add("text-stone-400");
      }
    }
  }

  updateArenaUI() {
    const arenaToggle = document.getElementById("arena-mode-toggle");
    const arenaBar = document.getElementById("arena-controls-bar");
    if (arenaToggle && arenaBar) {
      if (this.isArenaMode) {
        arenaToggle.classList.add("bg-amber-500", "text-stone-950");
        arenaToggle.classList.remove("bg-stone-800", "text-stone-300");
        arenaBar.classList.remove("hidden");
      } else {
        arenaToggle.classList.remove("bg-amber-500", "text-stone-950");
        arenaToggle.classList.add("bg-stone-800", "text-stone-300");
        arenaBar.classList.add("hidden");
      }
    }
  }

  newChat() {
    this.currentChat = {
      id: "chat_" + Date.now(),
      title: "New Conversation",
      model_id: this.modelSelector.selectedModelId,
      messages: []
    };
    this.renderMessages();
    this.renderSidebarChats();
    const input = document.getElementById("chat-input-textarea");
    if (input) {
      input.value = "";
      input.focus();
    }
  }

  selectChat(chatId) {
    const found = this.chats.find(c => c.id === chatId);
    if (found) {
      this.currentChat = JSON.parse(JSON.stringify(found));
      if (this.currentChat.model_id) {
        this.modelSelector.selectModel(this.currentChat.model_id);
      }
      this.renderMessages();
      this.renderSidebarChats();
    }
  }

  renderSidebarChats() {
    const list = document.getElementById("sidebar-chats-list");
    if (!list) return;

    if (this.chats.length === 0) {
      list.innerHTML = `
        <div class="p-4 text-center text-xs text-stone-500 font-mono">
          No saved conversations.
        </div>
      `;
      return;
    }

    list.innerHTML = this.chats.map(chat => {
      const isActive = this.currentChat && this.currentChat.id === chat.id;
      return `
        <div class="group flex items-center justify-between px-2.5 py-2 rounded-lg text-xs cursor-pointer transition-all ${isActive ? 'bg-stone-800/90 text-stone-100 font-medium' : 'text-stone-400 hover:bg-stone-800/40 hover:text-stone-200'}"
             onclick="window.app.selectChat('${chat.id}')">
          <span class="truncate pr-2">${chat.title || 'Conversation'}</span>
          <button onclick="event.stopPropagation(); window.app.deleteChat('${chat.id}')"
                  class="opacity-0 group-hover:opacity-100 text-stone-500 hover:text-red-400 transition-opacity">
            &times;
          </button>
        </div>
      `;
    }).join('');
  }

  renderMessages() {
    const container = document.getElementById("chat-messages-container");
    const welcome = document.getElementById("chat-welcome-hero");
    if (!container) return;

    if (!this.currentChat || this.currentChat.messages.length === 0) {
      container.classList.add("hidden");
      if (welcome) welcome.classList.remove("hidden");
      return;
    }

    container.classList.remove("hidden");
    if (welcome) welcome.classList.add("hidden");

    container.innerHTML = this.currentChat.messages.map((msg, index) => {
      if (msg.role === "user") {
        return `
          <div class="flex justify-end mb-6">
            <div class="max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 bg-stone-800 border border-stone-700/80 text-stone-100 text-[0.95rem] shadow-sm leading-relaxed whitespace-pre-wrap">
              ${this.escapeHtml(msg.content)}
            </div>
          </div>
        `;
      } else {
        const modelMeta = this.modelSelector.models.find(m => m.id === msg.model_used) || {
          name: msg.model_used || "Free LLM"
        };

        const statsPill = msg.meta && (msg.meta.tps || msg.meta.elapsed) ? `
          <div class="flex items-center gap-2 text-[11px] font-mono text-stone-400">
            <span>⚡ ${msg.meta.tps || 0} tok/s</span>
            <span>•</span>
            <span>⏱️ ${msg.meta.elapsed || 0}s</span>
          </div>
        ` : '';

        // Transparent Fallback & Intent Routing Badge
        const routeBadge = (msg.meta && msg.meta.routed_via) ? `
          <div class="mb-2 flex items-center flex-wrap gap-2 text-xs font-mono">
            <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-stone-900 border ${msg.meta.is_fallback ? 'border-amber-500/50 text-amber-300' : 'border-stone-800 text-stone-400'}">
              <span>⚡ Routed via ${msg.meta.routed_via}</span>
              ${msg.meta.is_fallback ? '<span class="text-amber-400 font-bold">(Failover Active)</span>' : ''}
            </span>
            ${msg.meta.intent ? `<span class="text-stone-500">· Intent: ${msg.meta.intent}</span>` : ''}
          </div>
        ` : '';

        const thinkingBlock = msg.thinking ? `
          <div class="thinking-accordion mb-3">
            <div class="thinking-header" onclick="this.nextElementSibling.classList.toggle('hidden')">
              <svg class="w-3.5 h-3.5 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
              <span>Thinking Process (${msg.thinking.length} characters)</span>
            </div>
            <div class="thinking-body hidden" id="msg-thinking-${index}">${this.formatMarkdown(msg.thinking)}</div>
          </div>
        ` : '';

        const renderedContent = this.formatMarkdown(msg.content);

        return `
          <div class="flex flex-col mb-8" id="msg-bubble-${index}">
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center gap-2">
                <span class="w-6 h-6 rounded-md bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 text-xs font-bold">✦</span>
                <span class="text-xs font-semibold text-stone-200">${modelMeta.name}</span>
              </div>
              ${statsPill}
            </div>
            ${routeBadge}
            ${thinkingBlock}
            <div class="prose max-w-none text-stone-200" id="msg-content-${index}">
              ${renderedContent}
            </div>
          </div>
        `;
      }
    }).join('');

    this.postRenderCodeBlocks();
    this.scrollToBottom();
  }

  formatMarkdown(content) {
    if (!content) return "";
    try {
      // Parse <antArtifact ...> containers
      const artifactRegex = /<antArtifact\s+identifier="([^"]+)"\s+type="([^"]+)"\s+title="([^"]+)">([\s\S]*?)<\/antArtifact>/gi;
      let processedContent = content.replace(artifactRegex, (match, id, type, title, body) => {
        const encodedBody = encodeURIComponent(body);
        const safeTitle = title.replace(/'/g, "\\'");
        return `
          <div class="my-4 p-3.5 rounded-xl border border-amber-500/30 bg-stone-900/90 flex items-center justify-between cursor-pointer hover:border-amber-500/60 hover:bg-stone-900 transition-all shadow-md group"
               onclick="window.app.openArtifact('${safeTitle}', '${type}', decodeURIComponent('${encodedBody}'))">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center font-bold text-sm">✦</div>
              <div>
                <div class="text-xs font-bold text-stone-100">${title}</div>
                <div class="text-[10px] text-stone-400 font-mono">${type.toUpperCase()} · Interactive Sandbox Canvas</div>
              </div>
            </div>
            <span class="inline-flex items-center gap-1 text-xs font-semibold text-amber-400 group-hover:translate-x-0.5 transition-transform">
              Open Canvas ➔
            </span>
          </div>
        `;
      });

      if (window.marked) {
        return window.marked.parse(processedContent);
      }
      return processedContent;
    } catch (e) {
      return content;
    }
  }

  postRenderCodeBlocks() {
    document.querySelectorAll(".prose pre code").forEach(el => {
      const pre = el.parentElement;
      if (!pre || !pre.parentElement || pre.parentElement.classList.contains("code-block-wrapper")) return;

      const wrapper = document.createElement("div");
      wrapper.className = "code-block-wrapper";
      const langMatch = el.className ? el.className.match(/language-([a-zA-Z0-9_-]+)/) : null;
      const lang = langMatch ? langMatch[1] : "code";

      const header = document.createElement("div");
      header.className = "code-header";
      header.innerHTML = `
        <span class="lang-badge">${lang}</span>
        <button type="button" class="code-copy-btn">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
          <span>Copy</span>
        </button>
      `;

      pre.parentNode.insertBefore(wrapper, pre);
      wrapper.appendChild(header);
      wrapper.appendChild(pre);

      const copyBtn = header.querySelector(".code-copy-btn");
      if (copyBtn) {
        copyBtn.addEventListener("click", () => {
          navigator.clipboard.writeText(el.textContent);
          copyBtn.innerHTML = `<span>Copied!</span>`;
          setTimeout(() => {
            copyBtn.innerHTML = `
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
              <span>Copy</span>
            `;
          }, 2000);
        });
      }
    });

    if (window.renderMathInElement) {
      try {
        window.renderMathInElement(document.getElementById("chat-messages-container"), {
          delimiters: [
            {left: '$$', right: '$$', display: true},
            {left: '$', right: '$', display: false},
            {left: '\\(', right: '\\)', display: false},
            {left: '\\[', right: '\\]', display: true}
          ],
          throwOnError: false
        });
      } catch (__) {}
    }
  }

  scrollToBottom() {
    const main = document.getElementById("chat-scroll-area");
    if (main) main.scrollTop = main.scrollHeight;
  }

  async sendMessage(promptOverride = null) {
    if (this.isStreaming) return;

    const textarea = document.getElementById("chat-input-textarea");
    const prompt = (promptOverride || (textarea ? textarea.value : "")).trim();
    if (!prompt) return;

    if (textarea) {
      textarea.value = "";
      textarea.style.height = "auto";
    }

    const selectedModel = this.modelSelector.getSelectedModel();
    if (!this.currentChat) this.newChat();

    if (this.currentChat.messages.length === 0) {
      this.currentChat.title = prompt.length > 36 ? prompt.substring(0, 36) + "..." : prompt;
    }

    this.currentChat.messages.push({ role: "user", content: prompt });

    const assistantMsg = {
      role: "assistant",
      model_used: selectedModel.id,
      content: "",
      thinking: "",
      meta: null
    };
    this.currentChat.messages.push(assistantMsg);
    const assistantIndex = this.currentChat.messages.length - 1;

    this.renderMessages();
    this.isStreaming = true;
    this.toggleStreamButtons(true);
    this.abortController = new AbortController();

    let fullText = "";
    let thinkingText = "";

    try {
      const stream = window.clientEngine.streamChat({
        model_id: selectedModel.id,
        messages: this.currentChat.messages.slice(0, -1),
        system_prompt: (this.settings && this.settings.systemPrompt) || (window.settings && window.settings.systemPrompt) || "",
        temperature: (this.settings && this.settings.temperature) ?? (window.settings && window.settings.temperature) ?? 0.7,
        max_tokens: (this.settings && this.settings.maxTokens) ?? (window.settings && window.settings.maxTokens) ?? 4096,
        turbo_mode: this.turboMode,
        deepthink_mode: this.deepthinkMode,
        image_mode: this.imageMode,
        abortSignal: this.abortController.signal
      });

      for await (const chunk of stream) {
        if (chunk.type === "meta") {
          assistantMsg.meta = {
            ...(assistantMsg.meta || {}),
            ...chunk
          };
          this.renderMessages();
        } else if (chunk.type === "thinking") {
          thinkingText += chunk.delta;
          assistantMsg.thinking = thinkingText;
          const thEl = document.getElementById(`msg-thinking-${assistantIndex}`);
          if (thEl) {
            thEl.innerHTML = this.formatMarkdown(thinkingText);
            thEl.classList.remove("hidden");
          } else {
            this.renderMessages();
          }
        } else if (chunk.type === "chunk") {
          fullText += chunk.delta;
          assistantMsg.content = fullText;
          const cEl = document.getElementById(`msg-content-${assistantIndex}`);
          if (cEl) {
            cEl.innerHTML = this.formatMarkdown(fullText);
            this.scrollToBottom();
          } else {
            this.renderMessages();
          }
        } else if (chunk.type === "done") {
          assistantMsg.meta = {
            ...(assistantMsg.meta || {}),
            tps: chunk.tps,
            elapsed: chunk.elapsed,
            tokens: chunk.tokens
          };
          this.renderMessages();
        }
      }

      // Save to storage
      const existingIdx = this.chats.findIndex(c => c.id === this.currentChat.id);
      if (existingIdx > -1) {
        this.chats[existingIdx] = this.currentChat;
      } else {
        this.chats.unshift(this.currentChat);
      }
      await this.saveChats();

    } catch (err) {
      if (err.name !== "AbortError") {
        assistantMsg.content += `\n\n> ⚠️ **Notice:** ${err.message || err}`;
        this.renderMessages();
      }
    } finally {
      this.isStreaming = false;
      this.toggleStreamButtons(false);
      const input = document.getElementById("chat-input-textarea");
      if (input) input.focus();
    }
  }

  stopStreaming() {
    if (this.abortController) {
      this.abortController.abort();
    }
    this.isStreaming = false;
    this.toggleStreamButtons(false);
  }

  toggleStreamButtons(streaming) {
    const sendBtn = document.getElementById("send-btn");
    const stopBtn = document.getElementById("stop-stream-btn");
    if (sendBtn) sendBtn.classList.toggle("hidden", streaming);
    if (stopBtn) stopBtn.classList.toggle("hidden", !streaming);
  }

  // --- Interactive Artifacts Multi-Tab Sandbox with Error Feedback ---
  setupArtifactsPanel() {
    const closeBtn = document.getElementById("close-artifacts-btn");
    if (closeBtn) closeBtn.addEventListener("click", () => this.closeArtifact());

    const codeTab = document.getElementById("artifact-tab-code");
    const previewTab = document.getElementById("artifact-tab-preview");
    const consoleTab = document.getElementById("artifact-tab-console");

    const tabs = [
      { btn: previewTab, view: document.getElementById("artifact-preview-view") },
      { btn: codeTab, view: document.getElementById("artifact-code-view") },
      { btn: consoleTab, view: document.getElementById("artifact-console-view") }
    ];

    tabs.forEach(({ btn, view }) => {
      if (!btn) return;
      btn.addEventListener("click", () => {
        tabs.forEach(t => {
          if (t.btn) {
            t.btn.classList.remove("bg-stone-800", "text-stone-100", "font-medium");
            t.btn.classList.add("text-stone-400");
          }
          if (t.view) t.view.classList.add("hidden");
        });
        btn.classList.add("bg-stone-800", "text-stone-100", "font-medium");
        btn.classList.remove("text-stone-400");
        if (view) view.classList.remove("hidden");
      });
    });

    const fixBtn = document.getElementById("artifact-fix-btn");
    if (fixBtn) {
      fixBtn.addEventListener("click", () => {
        if (!this.lastArtifactError) return;
        this.sendMessage(`Please fix the runtime error in the artifact: "${this.lastArtifactError.error}" (at line ${this.lastArtifactError.line || 1}). Output the complete corrected <antArtifact> code.`);
        this.closeArtifact();
      });
    }

    // Message bridge for sandbox iframe
    window.addEventListener("message", (event) => {
      if (!event.data) return;
      if (event.data.type === "ARTIFACT_ERROR") {
        this.lastArtifactError = event.data;
        const banner = document.getElementById("artifact-error-banner");
        const msg = document.getElementById("artifact-error-msg");
        if (banner && msg) {
          msg.textContent = `${event.data.error} (line ${event.data.line || 1})`;
          banner.classList.remove("hidden");
        }
        this.appendArtifactLog(`[Runtime Error]: ${event.data.error} (line ${event.data.line || 1})`, "text-red-400");
      } else if (event.data.type === "ARTIFACT_LOG") {
        this.appendArtifactLog(`[Log]: ${event.data.data}`, "text-stone-300");
      }
    });
  }

  appendArtifactLog(text, colorClass = "text-stone-300") {
    const consoleView = document.getElementById("artifact-console-view");
    if (!consoleView) return;
    const line = document.createElement("div");
    line.className = `${colorClass} font-mono text-[11px] leading-relaxed`;
    line.textContent = `> ${text}`;
    consoleView.appendChild(line);
    consoleView.scrollTop = consoleView.scrollHeight;
  }

  openArtifact(title, type, content) {
    this.currentArtifactContent = content;
    this.lastArtifactError = null;

    const banner = document.getElementById("artifact-error-banner");
    if (banner) banner.classList.add("hidden");

    const consoleView = document.getElementById("artifact-console-view");
    if (consoleView) {
      consoleView.innerHTML = '<div class="text-stone-500 italic pb-1 border-b border-stone-800">[Console ready. Runtime errors and console.log will appear here.]</div>';
    }

    const panel = document.getElementById("artifacts-panel");
    const titleEl = document.getElementById("artifact-title");
    const codeView = document.getElementById("artifact-code-content");
    const previewFrame = document.getElementById("artifact-preview-frame");

    if (panel) panel.classList.remove("hidden");
    if (titleEl) titleEl.textContent = title;

    if (codeView) {
      codeView.textContent = content;
      if (window.hljs) window.hljs.highlightElement(codeView);
    }

    if (previewFrame) {
      if (type === "html" || type === "svg" || content.includes("<html") || content.includes("<svg") || content.includes("<script")) {
        const injectedScript = `
<script>
  window.onerror = function(msg, url, line) {
    window.parent.postMessage({ type: 'ARTIFACT_ERROR', error: String(msg), line: line }, '*');
  };
  const _origLog = console.log;
  console.log = function(...args) {
    _origLog.apply(console, args);
    window.parent.postMessage({ type: 'ARTIFACT_LOG', data: args.join(' ') }, '*');
  };
<\/script>
`;
        let fullHtml = content;
        if (fullHtml.includes("<head>")) {
          fullHtml = fullHtml.replace("<head>", "<head>" + injectedScript);
        } else {
          fullHtml = injectedScript + fullHtml;
        }
        previewFrame.srcdoc = fullHtml;
        document.getElementById("artifact-tab-preview")?.click();
      } else {
        document.getElementById("artifact-tab-code")?.click();
      }
    }
  }

  closeArtifact() {
    const panel = document.getElementById("artifacts-panel");
    if (panel) panel.classList.add("hidden");
  }
}

function startApp() {
  if (!window.app) {
    window.app = new App();
    window.app.init();
  }
}

if (document.readyState === "loading") {
  window.addEventListener("DOMContentLoaded", startApp);
} else {
  startApp();
}
