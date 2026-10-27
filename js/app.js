// FreeLLM Hub — Client-Side Application Controller for GitHub Pages
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

  init() {
    this.modelSelector.init();
    this.settings.init();
    this.loadChats();
    this.setupEventListeners();
    this.setupArtifactsPanel();

    if (this.chats.length > 0) {
      this.selectChat(this.chats[0].id);
    } else {
      this.newChat();
    }
  }

  loadChats() {
    try {
      const data = localStorage.getItem("freellm_chats");
      this.chats = data ? JSON.parse(data) : [];
      this.renderSidebarChats();
    } catch (e) {
      this.chats = [];
    }
  }

  saveChats() {
    try {
      localStorage.setItem("freellm_chats", JSON.stringify(this.chats));
      this.renderSidebarChats();
    } catch (e) {
      console.error("Failed to save chats:", e);
    }
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

  deleteChat(chatId) {
    if (!confirm("Are you sure you want to delete this chat?")) return;
    this.chats = this.chats.filter(c => c.id !== chatId);
    this.saveChats();
    if (this.currentChat && this.currentChat.id === chatId) {
      this.newChat();
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

        const statsPill = msg.meta ? `
          <div class="flex items-center gap-2 text-[11px] font-mono text-stone-400">
            <span>⚡ ${msg.meta.tps || 0} tok/s</span>
            <span>•</span>
            <span>⏱️ ${msg.meta.elapsed || 0}s</span>
            <span>•</span>
            <span>${msg.meta.tokens || 0} tokens</span>
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
                <div class="text-[10px] text-stone-400 font-mono">${type.toUpperCase()} · Click to open Artifact Canvas</div>
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

      header.querySelector(".code-copy-btn").addEventListener("click", () => {
        navigator.clipboard.writeText(el.innerText).then(() => {
          header.querySelector(".code-copy-btn span").textContent = "Copied!";
          setTimeout(() => {
            header.querySelector(".code-copy-btn span").textContent = "Copy";
          }, 2000);
        });
      });

      pre.parentNode.insertBefore(wrapper, pre);
      wrapper.appendChild(header);
      wrapper.appendChild(pre);
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
        system_prompt: this.settings.systemPrompt,
        temperature: this.settings.temperature,
        max_tokens: this.settings.maxTokens,
        turbo_mode: this.turboMode,
        deepthink_mode: this.deepthinkMode,
        image_mode: this.imageMode,
        abortSignal: this.abortController.signal
      });

      for await (const chunk of stream) {
        if (chunk.type === "thinking") {
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
            tps: chunk.tps,
            elapsed: chunk.elapsed,
            tokens: chunk.tokens
          };
          this.renderMessages();
        }
      }

      // Save to chats list
      const existingIdx = this.chats.findIndex(c => c.id === this.currentChat.id);
      if (existingIdx > -1) {
        this.chats[existingIdx] = this.currentChat;
      } else {
        this.chats.unshift(this.currentChat);
      }
      this.saveChats();

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

  setupArtifactsPanel() {
    const closeBtn = document.getElementById("close-artifacts-btn");
    if (closeBtn) closeBtn.addEventListener("click", () => this.closeArtifact());

    const codeTab = document.getElementById("artifact-tab-code");
    const previewTab = document.getElementById("artifact-tab-preview");

    if (codeTab && previewTab) {
      codeTab.addEventListener("click", () => {
        codeTab.classList.add("bg-stone-800", "text-stone-100");
        previewTab.classList.remove("bg-stone-800", "text-stone-100");
        document.getElementById("artifact-code-view")?.classList.remove("hidden");
        document.getElementById("artifact-preview-view")?.classList.add("hidden");
      });

      previewTab.addEventListener("click", () => {
        previewTab.classList.add("bg-stone-800", "text-stone-100");
        codeTab.classList.remove("bg-stone-800", "text-stone-100");
        document.getElementById("artifact-preview-view")?.classList.remove("hidden");
        document.getElementById("artifact-code-view")?.classList.add("hidden");
      });
    }
  }

  openArtifact(title, type, content) {
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
      if (type === "html" || type === "svg" || content.includes("<html") || content.includes("<svg")) {
        previewFrame.srcdoc = content;
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
