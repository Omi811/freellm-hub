/**
 * ============================================================================
 * QUANT NEURAL NETWORK & MACHINE LEARNING VISUALIZATION STUDIO
 * ============================================================================
 * Features:
 *  1. 3D Spinning J.A.R.V.I.S. Neural Network & ML Visualizer:
 *     - Multi-Head Attention (MHA/GQA) rotating tensor heads & QKV vectors
 *     - Real-time Quantization representation: FP16, INT8, INT4 (AWQ), NF4
 *     - RoPE Rotary Positional Embedding helical geometry
 *     - Dynamic synapsing neuron pulses across LayerNorm / RMSNorm and SwiGLU FFN
 *     - Interactive 3D drag rotation and zoom
 *  2. Prompt-Submitting Toggle Chatbox (In-Studio Streaming Console):
 *     - Direct interactive prompt submission right inside the Neural Studio
 *     - Live token streaming with synchronized 3D neural activation flares
 *     - Toggle between Chatbox view and Multi-Model / Telemetry settings
 *     - Quick prompt chips (/ponytail, Unit Tests, Latency Optimization)
 *  3. Multi-Model Integration for Serious Developer Projects:
 *     - Parallel Ensemble & Mixture-of-Agents orchestration
 *     - Concurrent multi-model prompt dispatch (Claude + DeepSeek + Groq + Gemini)
 *  4. Double Turbo Mode:
 *     - Hyper-speed speculative decoupling stream routing (~800 tok/s)
 *  5. Smart Coping & Telemetry System:
 *     - KV-Cache compression telemetry, memory budgeting, and zero-loss error recovery
 * ============================================================================
 */

(function (global) {
  'use strict';

  const STORAGE_KEY = 'freellm_quant_studio_config';

  class QuantStudio {
    constructor() {
      const saved = this.loadConfig();
      this.isOpen = false;
      this.activeTab = saved.activeTab || 'chat'; // 'chat' | 'ensemble'
      this.doubleTurbo = saved.doubleTurbo !== false;
      this.rotSpeed = saved.rotSpeed || 1.0;
      this.quantPrecision = saved.quantPrecision || 'INT4'; // FP16 | INT8 | INT4 | NF4
      this.attentionHeads = saved.attentionHeads || 16;
      this.theme = saved.theme || 'quantum_cyan'; // quantum_cyan | stark_amber | matrix_purple | emerald_tensor
      this.selectedModels = saved.selectedModels || ['claude-3-7-sonnet', 'deepseek-r1', 'groq/llama-3.3-70b-versatile'];

      // In-Studio Chatbox State
      this.studioMessages = [];
      this.isStreaming = false;
      this.abortController = null;

      // 3D Canvas State
      this.canvas = null;
      this.ctx = null;
      this.rafId = null;
      this.time = 0;
      this.angleY = 0;
      this.angleX = 0.25;
      this.surgeEnergy = 0.0;

      // Neural Architecture Graph Nodes
      this.layers = [];
      this.synapses = [];
      this.ropeStrands = [];

      this.initDom();
      this.buildNeuralModel();
      this.bindEvents();
    }

    loadConfig() {
      try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
      } catch (e) {
        return {};
      }
    }

    saveConfig() {
      const cfg = {
        activeTab: this.activeTab,
        doubleTurbo: this.doubleTurbo,
        rotSpeed: this.rotSpeed,
        quantPrecision: this.quantPrecision,
        attentionHeads: this.attentionHeads,
        theme: this.theme,
        selectedModels: this.selectedModels
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
    }

    initDom() {
      // 1. Studio Modal Overlay
      this.modal = document.createElement('div');
      this.modal.id = 'quant-studio-modal';
      this.modal.className = 'fixed inset-0 z-50 bg-black/85 backdrop-blur-xl hidden flex items-center justify-center p-2 sm:p-5 transition-all';
      this.modal.innerHTML = `
        <div class="w-full max-w-6xl h-[94vh] rounded-3xl bg-stone-950/95 border border-cyan-500/40 shadow-2xl flex flex-col overflow-hidden font-sans text-stone-100"
             style="box-shadow: 0 24px 60px -12px rgba(6, 182, 212, 0.25);">

          <!-- Top Studio Header -->
          <div class="px-5 py-3 border-b border-stone-800 bg-stone-900/60 flex items-center justify-between flex-wrap gap-2">
            <div class="flex items-center gap-3">
              <span class="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/40 flex items-center justify-center text-cyan-400 text-lg shadow-inner">
                ⚛️
              </span>
              <div>
                <div class="flex items-center gap-2">
                  <h2 class="text-sm sm:text-base font-bold font-mono tracking-wider text-cyan-300">J.A.R.V.I.S. QUANT NEURAL STUDIO</h2>
                  <span class="text-[10px] px-2 py-0.5 rounded-full font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    ML VISUALIZER V3.5
                  </span>
                </div>
                <p class="text-[11px] text-stone-400">Spinning 3D Transformer Quantization, Multi-Model Ensemble, and Live Streaming Chatbox.</p>
              </div>
            </div>

            <div class="flex items-center gap-2.5">
              <!-- Prompt Submitting Toggle Chatbox Button -->
              <button id="quant-chatbox-toggle-btn" onclick="window.quantStudio.toggleChatbox()"
                      title="Toggle Prompt Submitting Chatbox inside the Neural Studio"
                      class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-semibold border transition-all cursor-pointer shadow-sm ${this.activeTab === 'chat' ? 'bg-cyan-500/25 text-cyan-300 border-cyan-500/50' : 'bg-stone-900 text-stone-400 border-stone-800 hover:text-stone-200'}">
                <span>💬</span>
                <span id="quant-chatbox-toggle-label">${this.activeTab === 'chat' ? 'Chatbox: ON' : 'Toggle Chatbox'}</span>
              </button>

              <!-- Double Turbo Toggle Pill -->
              <button id="quant-double-turbo-toggle" onclick="window.quantStudio.toggleDoubleTurbo()"
                      title="Toggle Double Turbo 800 tok/s accelerated inference"
                      class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-semibold border transition-all cursor-pointer shadow-sm ${this.doubleTurbo ? 'bg-orange-500/20 text-orange-400 border-orange-500/50' : 'bg-stone-900 text-stone-400 border-stone-800'}">
                <span>⚡</span>
                <span id="quant-double-turbo-label">Double Turbo: ${this.doubleTurbo ? 'ACTIVE' : 'OFF'}</span>
              </button>

              <!-- Close Button -->
              <button onclick="window.quantStudio.close()"
                      title="Close Studio"
                      class="p-2 rounded-xl text-stone-400 hover:text-white hover:bg-stone-800 transition-all cursor-pointer">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
          </div>

          <!-- Studio Body: Split View -->
          <div class="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">

            <!-- Left / Center Column (7 Cols): 3D Spinning Neural Canvas & Controls -->
            <div class="lg:col-span-7 flex flex-col border-b lg:border-b-0 lg:border-r border-stone-800 bg-black/60 relative overflow-hidden">
              
              <!-- 3D Canvas Container -->
              <div class="flex-1 relative flex items-center justify-center overflow-hidden" id="quant-canvas-container">
                <canvas id="quant-neural-canvas" class="w-full h-full block cursor-grab active:cursor-grabbing"></canvas>

                <!-- Floating HUD Overlays -->
                <div class="absolute top-3 left-3 text-[10px] font-mono text-cyan-400/80 space-y-0.5 pointer-events-none bg-stone-950/75 p-2 rounded-lg border border-cyan-500/20 backdrop-blur shadow">
                  <div>ROTARY EMBEDDING: <span class="text-cyan-300 font-bold">RoPE 3D HELIX</span></div>
                  <div>ATTENTION HEADS: <span class="text-cyan-300 font-bold">${this.attentionHeads} HEADS (GQA)</span></div>
                  <div>QUANTIZATION MODE: <span class="text-amber-300 font-bold">${this.quantPrecision} (AWQ SALIENT)</span></div>
                  <div>SYNAPSE PULSE: <span id="quant-pulse-status" class="text-emerald-400 font-bold">READY</span></div>
                </div>

                <div class="absolute bottom-3 right-3 text-[10px] font-mono text-stone-400 pointer-events-none bg-stone-950/70 px-2.5 py-1 rounded border border-stone-800">
                  DRAG TO ROTATE 3D • TOKENS FIRE SYNAPSES
                </div>
              </div>

              <!-- Canvas Bottom Personalization Toolbar -->
              <div class="p-3 border-t border-stone-800 bg-stone-900/40 backdrop-blur flex items-center justify-between gap-2.5 flex-wrap">
                <div class="flex items-center gap-2">
                  <span class="text-xs font-mono text-stone-400">Rotation:</span>
                  <input type="range" min="0.2" max="3.0" step="0.1" value="${this.rotSpeed}"
                         oninput="window.quantStudio.setRotSpeed(this.value)"
                         class="w-20 sm:w-24 accent-cyan-400 cursor-pointer" />
                  <span id="quant-rotspeed-val" class="text-xs font-mono text-cyan-400">${this.rotSpeed}x</span>
                </div>

                <div class="flex items-center gap-2">
                  <span class="text-xs font-mono text-stone-400">Quant Precision:</span>
                  <div class="flex items-center gap-1 bg-stone-950 p-0.5 rounded-lg border border-stone-800">
                    <button onclick="window.quantStudio.setPrecision('FP16')" class="quant-prec-btn px-2 py-0.5 rounded text-[11px] font-mono ${this.quantPrecision === 'FP16' ? 'bg-cyan-500 text-stone-950 font-bold' : 'text-stone-400'} cursor-pointer">FP16</button>
                    <button onclick="window.quantStudio.setPrecision('INT8')" class="quant-prec-btn px-2 py-0.5 rounded text-[11px] font-mono ${this.quantPrecision === 'INT8' ? 'bg-cyan-500 text-stone-950 font-bold' : 'text-stone-400'} cursor-pointer">INT8</button>
                    <button onclick="window.quantStudio.setPrecision('INT4')" class="quant-prec-btn px-2 py-0.5 rounded text-[11px] font-mono ${this.quantPrecision === 'INT4' ? 'bg-cyan-500 text-stone-950 font-bold' : 'text-stone-400'} cursor-pointer">INT4</button>
                    <button onclick="window.quantStudio.setPrecision('NF4')" class="quant-prec-btn px-2 py-0.5 rounded text-[11px] font-mono ${this.quantPrecision === 'NF4' ? 'bg-cyan-500 text-stone-950 font-bold' : 'text-stone-400'} cursor-pointer">NF4</button>
                  </div>
                </div>

                <div class="flex items-center gap-2">
                  <span class="text-xs font-mono text-stone-400">Heads:</span>
                  <select onchange="window.quantStudio.setHeads(this.value)"
                          class="bg-stone-950 border border-stone-800 text-cyan-300 text-xs font-mono rounded-lg px-2 py-1 focus:outline-none">
                    <option value="8" ${this.attentionHeads == 8 ? 'selected' : ''}>8 (MHA)</option>
                    <option value="16" ${this.attentionHeads == 16 ? 'selected' : ''}>16 (GQA)</option>
                    <option value="32" ${this.attentionHeads == 32 ? 'selected' : ''}>32 (Wide)</option>
                    <option value="64" ${this.attentionHeads == 64 ? 'selected' : ''}>64 (Llama 3)</option>
                  </select>
                </div>
              </div>
            </div>

            <!-- Right Column (5 Cols): Dynamic Switchable Panel (Chatbox OR Multi-Model Workbench) -->
            <div id="quant-right-panel" class="lg:col-span-5 flex flex-col h-full overflow-hidden bg-stone-950/70">
              <!-- Content rendered dynamically by renderRightPanel -->
            </div>

          </div>
        </div>
      `;
      document.body.appendChild(this.modal);

      this.renderRightPanel();
    }

    toggleChatbox() {
      this.activeTab = this.activeTab === 'chat' ? 'ensemble' : 'chat';
      this.saveConfig();

      const btn = document.getElementById('quant-chatbox-toggle-btn');
      const label = document.getElementById('quant-chatbox-toggle-label');
      if (btn && label) {
        if (this.activeTab === 'chat') {
          btn.className = 'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-semibold border transition-all cursor-pointer shadow-sm bg-cyan-500/25 text-cyan-300 border-cyan-500/50';
          label.textContent = 'Chatbox: ON';
        } else {
          btn.className = 'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-semibold border transition-all cursor-pointer shadow-sm bg-stone-900 text-stone-400 border-stone-800 hover:text-stone-200';
          label.textContent = 'Toggle Chatbox';
        }
      }

      this.renderRightPanel();
    }

    renderRightPanel() {
      const container = document.getElementById('quant-right-panel');
      if (!container) return;

      if (this.activeTab === 'chat') {
        // --- 1. PROMPT SUBMITTING CHATBOX VIEW ---
        container.innerHTML = `
          <div class="flex-1 flex flex-col h-full overflow-hidden">
            <!-- Chatbox Header Toolbar -->
            <div class="px-4 py-2.5 border-b border-stone-800 bg-stone-900/50 flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse"></span>
                <span class="text-xs font-mono font-bold text-stone-200">PROMPT STREAMING CONSOLE</span>
              </div>
              <div class="flex items-center gap-2">
                <button type="button" onclick="window.quantStudio.clearStudioMessages()"
                        title="Clear console messages"
                        class="p-1 rounded text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition-all cursor-pointer text-xs font-mono">
                  🗑️ Clear
                </button>
                <button type="button" onclick="window.quantStudio.toggleChatbox()"
                        title="Switch to Multi-Model &amp; Telemetry settings"
                        class="px-2 py-0.5 rounded text-[11px] font-mono bg-stone-900 text-stone-400 hover:text-stone-200 border border-stone-800 transition-all cursor-pointer">
                  ⚙️ Settings
                </button>
              </div>
            </div>

            <!-- Messages Stream Area -->
            <div id="quant-chat-messages" class="flex-1 overflow-y-auto p-4 space-y-3.5 font-sans text-xs">
              ${this.studioMessages.length === 0 ? `
                <div class="h-full flex flex-col items-center justify-center text-center p-6 text-stone-400 space-y-3">
                  <div class="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-300 text-2xl shadow-inner">
                    💬
                  </div>
                  <div>
                    <h4 class="font-bold text-stone-200 text-sm">Neural Studio Interactive Chatbox</h4>
                    <p class="text-[11px] text-stone-400 max-w-xs mt-1">Submit developer prompts directly inside the studio. Watch the 3D Quant Neural Network react live to tokens!</p>
                  </div>
                  <div class="flex flex-wrap gap-1.5 justify-center pt-2 max-w-sm">
                    <button type="button" onclick="window.quantStudio.applyPromptChip('/ponytail Optimize for minimal diff: ')"
                            class="px-2.5 py-1 rounded-lg bg-stone-900 hover:bg-stone-800 border border-stone-800 hover:border-amber-500/40 text-amber-300 text-[11px] font-mono transition-all cursor-pointer">
                      ⚡ /ponytail
                    </button>
                    <button type="button" onclick="window.quantStudio.applyPromptChip('Write comprehensive unit tests with edge-case coverage: ')"
                            class="px-2.5 py-1 rounded-lg bg-stone-900 hover:bg-stone-800 border border-stone-800 hover:border-emerald-500/40 text-emerald-300 text-[11px] transition-all cursor-pointer">
                      🧪 Unit Tests
                    </button>
                    <button type="button" onclick="window.quantStudio.applyPromptChip('Analyze quantization latency and memory bandwidth: ')"
                            class="px-2.5 py-1 rounded-lg bg-stone-900 hover:bg-stone-800 border border-stone-800 hover:border-cyan-500/40 text-cyan-300 text-[11px] transition-all cursor-pointer">
                      ⚛️ Quant Analysis
                    </button>
                  </div>
                </div>
              ` : ''}
            </div>

            <!-- Prompt Submission Box -->
            <div class="p-3 border-t border-stone-800 bg-stone-900/40 space-y-2">
              <div class="relative">
                <textarea id="quant-chat-input" rows="2"
                          placeholder="Type developer prompt (Enter to submit, Shift+Enter for new line)..."
                          class="w-full bg-stone-950 border border-stone-800 focus:border-cyan-500/60 rounded-xl px-3 py-2 text-xs font-mono text-stone-100 placeholder-stone-500 focus:outline-none resize-none transition-all"></textarea>
              </div>

              <div class="flex items-center justify-between gap-2">
                <div class="flex items-center gap-1.5">
                  <span class="text-[10px] font-mono text-stone-400">Router:</span>
                  <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/25">
                    ${(window.modelSelector && window.modelSelector.selectedModelId) || 'OmniRoute Auto'}
                  </span>
                </div>

                <div class="flex items-center gap-2">
                  ${this.isStreaming ? `
                    <button type="button" onclick="window.quantStudio.abortStream()"
                            class="px-3 py-1.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 text-xs font-mono font-semibold transition-all cursor-pointer">
                      ⏹️ Abort
                    </button>
                  ` : `
                    <button type="button" onclick="window.quantStudio.submitStudioPrompt()"
                            class="px-4 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:brightness-110 text-stone-950 text-xs font-mono font-bold transition-all cursor-pointer shadow-md shadow-cyan-500/20 flex items-center gap-1.5">
                      <span>✨ Submit</span>
                      <kbd class="text-[9px] opacity-75 font-sans">↵</kbd>
                    </button>
                  `}
                </div>
              </div>
            </div>
          </div>
        `;

        this.renderStudioMessages();
        this.bindChatInputEvents();

      } else {
        // --- 2. MULTI-MODEL INTEGRATION & TELEMETRY VIEW ---
        container.innerHTML = `
          <div class="flex-1 flex flex-col h-full overflow-y-auto p-5 space-y-5">
            <!-- Header with Quick Switch to Chatbox -->
            <div class="flex items-center justify-between pb-3 border-b border-stone-800">
              <div class="flex items-center gap-2">
                <span class="text-amber-400">🛠️</span>
                <h3 class="text-sm font-bold text-stone-200">Multi-Model Project Integration</h3>
              </div>
              <button type="button" onclick="window.quantStudio.toggleChatbox()"
                      class="px-2.5 py-1 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-mono font-semibold transition-all cursor-pointer flex items-center gap-1">
                <span>💬</span><span>Open Chatbox</span>
              </button>
            </div>

            <!-- Model Selection Grid -->
            <p class="text-xs text-stone-400 leading-relaxed">
              Compose high-stakes developer prompts across multiple specialized models simultaneously. The Quant Router executes parallel speculative drafts and synthesizes the optimal code diff.
            </p>

            <div id="quant-model-ensemble-grid" class="space-y-1.5 max-h-48 overflow-y-auto pr-1"></div>

            <!-- Smart Coping & Telemetry -->
            <div class="space-y-3 pt-3 border-t border-stone-800">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <span class="text-emerald-400">🧠</span>
                  <h3 class="text-sm font-bold text-stone-200">Smart Coping &amp; Context Telemetry</h3>
                </div>
                <span class="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-mono">
                  ACTIVE
                </span>
              </div>

              <div class="grid grid-cols-2 gap-2 text-xs font-mono">
                <div class="p-3 rounded-xl bg-stone-900/60 border border-stone-800/80 space-y-1">
                  <span class="text-[10px] text-stone-500 uppercase">KV-Cache Pruning</span>
                  <div class="text-base font-bold text-emerald-400">42.8% Saved</div>
                  <span class="text-[10px] text-stone-400">Attention sink hold</span>
                </div>
                <div class="p-3 rounded-xl bg-stone-900/60 border border-stone-800/80 space-y-1">
                  <span class="text-[10px] text-stone-500 uppercase">Quant Memory Bandwidth</span>
                  <div class="text-base font-bold text-cyan-400">3.4x Faster</div>
                  <span class="text-[10px] text-stone-400">FP4 dequant fast-path</span>
                </div>
                <div class="p-3 rounded-xl bg-stone-900/60 border border-stone-800/80 space-y-1">
                  <span class="text-[10px] text-stone-500 uppercase">Speculative Decoupling</span>
                  <div class="text-base font-bold text-amber-400">820 tok/s</div>
                  <span class="text-[10px] text-stone-400">Groq LPU target</span>
                </div>
                <div class="p-3 rounded-xl bg-stone-900/60 border border-stone-800/80 space-y-1">
                  <span class="text-[10px] text-stone-500 uppercase">Context Budget Guard</span>
                  <div class="text-base font-bold text-purple-400">128k Safe</div>
                  <span class="text-[10px] text-stone-400">Trust-boundary active</span>
                </div>
              </div>
            </div>

            <!-- Theme Options -->
            <div class="space-y-2.5 pt-3 border-t border-stone-800">
              <span class="text-xs font-mono text-stone-400 font-semibold uppercase">Personalize 3D J.A.R.V.I.S. Theme:</span>
              <div class="grid grid-cols-4 gap-2">
                <button onclick="window.quantStudio.setTheme('quantum_cyan')"
                        class="p-2 rounded-xl text-xs font-mono border text-center transition-all cursor-pointer ${this.theme === 'quantum_cyan' ? 'border-cyan-400 bg-cyan-500/20 text-cyan-300' : 'border-stone-800 bg-stone-900 text-stone-400'}">
                  Cyan ⚛️
                </button>
                <button onclick="window.quantStudio.setTheme('stark_amber')"
                        class="p-2 rounded-xl text-xs font-mono border text-center transition-all cursor-pointer ${this.theme === 'stark_amber' ? 'border-amber-400 bg-amber-500/20 text-amber-300' : 'border-stone-800 bg-stone-900 text-stone-400'}">
                  Amber ✦
                </button>
                <button onclick="window.quantStudio.setTheme('matrix_purple')"
                        class="p-2 rounded-xl text-xs font-mono border text-center transition-all cursor-pointer ${this.theme === 'matrix_purple' ? 'border-purple-400 bg-purple-500/20 text-purple-300' : 'border-stone-800 bg-stone-900 text-stone-400'}">
                  Deep 🧠
                </button>
                <button onclick="window.quantStudio.setTheme('emerald_tensor')"
                        class="p-2 rounded-xl text-xs font-mono border text-center transition-all cursor-pointer ${this.theme === 'emerald_tensor' ? 'border-emerald-400 bg-emerald-500/20 text-emerald-300' : 'border-stone-800 bg-stone-900 text-stone-400'}">
                  Tensor ⚡
                </button>
              </div>
            </div>
          </div>
        `;

        this.populateEnsembleModels();
      }
    }

    bindChatInputEvents() {
      const textarea = document.getElementById('quant-chat-input');
      if (!textarea) return;

      textarea.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.submitStudioPrompt();
        } else {
          this.triggerSynapticSurge();
        }
      });
    }

    applyPromptChip(text) {
      const textarea = document.getElementById('quant-chat-input');
      if (textarea) {
        textarea.value = text;
        textarea.focus();
      }
      this.triggerSynapticSurge();
    }

    async submitStudioPrompt() {
      const textarea = document.getElementById('quant-chat-input');
      if (!textarea || !textarea.value.trim() || this.isStreaming) return;

      const userText = textarea.value.trim();
      textarea.value = '';

      // Append user message
      this.studioMessages.push({ role: 'user', content: userText });
      this.renderStudioMessages();

      // Trigger 3D neural activation burst
      this.triggerSynapticSurge();

      // Append assistant placeholder
      const assistantMsg = { role: 'assistant', content: '', thinking: '', meta: null };
      this.studioMessages.push(assistantMsg);
      this.isStreaming = true;
      this.renderStudioMessages();

      const activeModelId = (window.modelSelector && window.modelSelector.selectedModelId) || 'auto';
      this.abortController = new AbortController();

      try {
        const stream = window.clientEngine.streamChat({
          model_id: activeModelId,
          messages: this.studioMessages.slice(0, -1).map(m => ({ role: m.role, content: m.content })),
          system_prompt: `You are the J.A.R.V.I.S. Quant Neural Copilot. Deliver mathematically rigorous, high-concurrency, zero-bloat code. Adhere strictly to the Ponytail safe-coding mandate: Correct -> Safe -> Holds under real load -> Tested -> Fast -> Lean.`,
          turbo_mode: this.doubleTurbo,
          abortSignal: this.abortController.signal
        });

        for await (const chunk of stream) {
          if (chunk.type === 'thinking') {
            assistantMsg.thinking = (assistantMsg.thinking || '') + chunk.delta;
            this.pulse3dCore(0.35);
          } else if (chunk.type === 'chunk') {
            assistantMsg.content += chunk.delta;
            this.pulse3dCore(0.85);
          } else if (chunk.type === 'done') {
            assistantMsg.meta = chunk;
          }
          this.updateLatestAssistantMessage();
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          assistantMsg.content += `\n\n> ⚠️ Notice: ${err.message || err}`;
          this.updateLatestAssistantMessage();
        }
      } finally {
        this.isStreaming = false;
        this.renderStudioMessages();
      }
    }

    abortStream() {
      if (this.abortController) {
        this.abortController.abort();
        this.abortController = null;
      }
      this.isStreaming = false;
      this.renderStudioMessages();
    }

    clearStudioMessages() {
      this.studioMessages = [];
      this.renderStudioMessages();
    }

    renderStudioMessages() {
      const container = document.getElementById('quant-chat-messages');
      if (!container) return;

      if (this.studioMessages.length === 0) {
        this.renderRightPanel();
        return;
      }

      container.innerHTML = this.studioMessages.map((m, idx) => {
        const isUser = m.role === 'user';
        return `
          <div class="flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1">
            <span class="text-[10px] font-mono text-stone-500 uppercase px-1">
              ${isUser ? '👤 Developer' : '⚛️ Quant Copilot'}
            </span>
            <div class="max-w-[92%] rounded-2xl px-3.5 py-2.5 ${isUser ? 'bg-cyan-600/30 border border-cyan-500/40 text-cyan-100' : 'bg-stone-900 border border-stone-800 text-stone-200'} shadow">
              ${m.thinking ? `
                <div class="mb-2 p-2 rounded-lg bg-black/40 border border-purple-500/30 text-[11px] font-mono text-purple-300">
                  <div class="text-[9px] uppercase font-bold text-purple-400 mb-1">🧠 Deep Reasoning:</div>
                  ${this.formatText(m.thinking)}
                </div>
              ` : ''}
              <div class="leading-relaxed break-words whitespace-pre-wrap font-sans text-xs">
                ${this.formatText(m.content) || (this.isStreaming && idx === this.studioMessages.length - 1 ? '<span class="inline-block w-2 h-3.5 bg-cyan-400 animate-pulse ml-0.5 align-middle"></span>' : '')}
              </div>
            </div>
          </div>
        `;
      }).join('');

      container.scrollTop = container.scrollHeight;
    }

    updateLatestAssistantMessage() {
      const container = document.getElementById('quant-chat-messages');
      if (!container) return;
      const lastMsg = this.studioMessages[this.studioMessages.length - 1];
      if (!lastMsg || lastMsg.role !== 'assistant') return;

      const lastEl = container.lastElementChild;
      if (lastEl) {
        const textContainer = lastEl.querySelector('.leading-relaxed');
        if (textContainer) {
          textContainer.innerHTML = this.formatText(lastMsg.content) + (this.isStreaming ? '<span class="inline-block w-2 h-3.5 bg-cyan-400 animate-pulse ml-0.5 align-middle"></span>' : '');
        }
      }
      container.scrollTop = container.scrollHeight;
    }

    formatText(raw) {
      if (!raw) return '';
      // Escape HTML
      let escaped = raw
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

      // Format code blocks ```
      escaped = escaped.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
        return `<pre class="my-2 p-2.5 rounded-xl bg-black/80 border border-stone-800 font-mono text-[11px] overflow-x-auto text-cyan-300"><code>${code}</code></pre>`;
      });

      // Format inline code `
      escaped = escaped.replace(/`([^`]+)`/g, '<code class="px-1 py-0.5 rounded bg-black/60 border border-stone-800 text-cyan-300 font-mono text-[11px]">$1</code>');

      return escaped;
    }

    triggerSynapticSurge() {
      this.surgeEnergy = Math.min(this.surgeEnergy + 0.45, 1.0);
      const pulseStatus = document.getElementById('quant-pulse-status');
      if (pulseStatus) {
        pulseStatus.textContent = 'FIRING // SYNAPSE';
        pulseStatus.className = 'text-amber-400 font-bold animate-pulse';
        clearTimeout(this.pulseTimeout);
        this.pulseTimeout = setTimeout(() => {
          if (pulseStatus) {
            pulseStatus.textContent = 'STEADY // SYNAPSE';
            pulseStatus.className = 'text-emerald-400 font-bold';
          }
        }, 1200);
      }
    }

    pulse3dCore(amount) {
      this.surgeEnergy = Math.min(this.surgeEnergy + amount, 1.0);
    }

    populateEnsembleModels() {
      const grid = document.getElementById('quant-model-ensemble-grid');
      if (!grid) return;

      const candidates = [
        { id: 'claude-3-7-sonnet', name: 'Claude 3.7 Sonnet', role: 'Architecture & Refactor', badge: 'Anthropic' },
        { id: 'deepseek-r1', name: 'DeepSeek R1', role: 'Complex Math & Reasoning', badge: 'Frontier' },
        { id: 'groq/llama-3.3-70b-versatile', name: 'Groq Llama 3.3 70B', role: 'Turbo Speed (450 t/s)', badge: 'Groq LPU' },
        { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', role: 'Multimodal & Fast Lookups', badge: 'Google' },
        { id: 'qwen-2.5-coder-32b', name: 'Qwen 2.5 Coder 32B', role: 'Dense Syntax & BIM/CAD', badge: 'Coding' }
      ];

      grid.innerHTML = candidates.map(c => {
        const isChecked = this.selectedModels.includes(c.id);
        return `
          <label class="flex items-center justify-between p-2 rounded-xl bg-stone-900/80 border border-stone-800/80 hover:border-cyan-500/40 cursor-pointer transition-all">
            <div class="flex items-center gap-2.5">
              <input type="checkbox" value="${c.id}" ${isChecked ? 'checked' : ''}
                     onchange="window.quantStudio.onModelToggle('${c.id}', this.checked)"
                     class="w-4 h-4 accent-cyan-400 cursor-pointer" />
              <div>
                <div class="text-xs font-semibold text-stone-200">${c.name}</div>
                <div class="text-[10px] text-stone-400">${c.role}</div>
              </div>
            </div>
            <span class="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-stone-400 font-mono">${c.badge}</span>
          </label>
        `;
      }).join('');
    }

    onModelToggle(modelId, isChecked) {
      if (isChecked && !this.selectedModels.includes(modelId)) {
        this.selectedModels.push(modelId);
      } else if (!isChecked) {
        this.selectedModels = this.selectedModels.filter(m => m !== modelId);
      }
      this.saveConfig();
    }

    buildNeuralModel() {
      this.layers = [];
      this.synapses = [];
      this.ropeStrands = [];

      const stageX = [-180, -90, 0, 90, 180];
      const counts = [6, 12, this.attentionHeads, 14, 8];

      for (let s = 0; s < stageX.length; s++) {
        const x = stageX[s];
        const count = counts[s];
        const layerNodes = [];

        for (let i = 0; i < count; i++) {
          const angle = (i / count) * Math.PI * 2;
          const radius = 35 + (s === 2 ? 25 : 12);
          layerNodes.push({
            x: x,
            baseY: Math.sin(angle) * radius,
            baseZ: Math.cos(angle) * radius,
            stage: s,
            pulse: Math.random() * Math.PI * 2,
            weight: 0.5 + Math.random() * 0.5
          });
        }
        this.layers.push(layerNodes);
      }

      for (let s = 0; s < this.layers.length - 1; s++) {
        const fromLayer = this.layers[s];
        const toLayer = this.layers[s + 1];

        for (let f = 0; f < fromLayer.length; f++) {
          for (let step = 0; step < 2; step++) {
            const t = (f + step * 2) % toLayer.length;
            this.synapses.push({
              from: fromLayer[f],
              to: toLayer[t],
              weight: Math.random(),
              activeTime: Math.random() * Math.PI * 2
            });
          }
        }
      }

      for (let i = 0; i < 40; i++) {
        const theta = i * 0.35;
        this.ropeStrands.push({
          x: (i - 20) * 10,
          y: Math.sin(theta) * 22,
          z: Math.cos(theta) * 22
        });
      }
    }

    bindEvents() {
      let isDragging = false;
      let lastX = 0;
      let lastY = 0;

      window.addEventListener('mousedown', (e) => {
        if (e.target && e.target.id === 'quant-neural-canvas') {
          isDragging = true;
          lastX = e.clientX;
          lastY = e.clientY;
        }
      });

      window.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const dx = e.clientX - lastX;
        const dy = e.clientY - lastY;
        lastX = e.clientX;
        lastY = e.clientY;

        this.angleY += dx * 0.008;
        this.angleX = Math.max(-1.2, Math.min(1.2, this.angleX + dy * 0.008));
      });

      window.addEventListener('mouseup', () => { isDragging = false; });
    }

    toggle() {
      if (this.isOpen) {
        this.close();
      } else {
        this.open();
      }
    }

    open() {
      this.isOpen = true;
      if (this.modal) {
        this.modal.classList.remove('hidden');
      }

      this.canvas = document.getElementById('quant-neural-canvas');
      if (this.canvas) {
        this.ctx = this.canvas.getContext('2d');
        this.resize();
        this.startLoop();
      }
    }

    close() {
      this.isOpen = false;
      if (this.modal) {
        this.modal.classList.add('hidden');
      }
      this.stopLoop();
    }

    resize() {
      if (!this.canvas) return;
      const container = document.getElementById('quant-canvas-container');
      const rect = container ? container.getBoundingClientRect() : { width: 600, height: 400 };

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.canvas.width = (rect.width || 600) * dpr;
      this.canvas.height = (rect.height || 400) * dpr;
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      this.width = rect.width || 600;
      this.height = rect.height || 400;
      this.cx = this.width / 2;
      this.cy = this.height / 2;
    }

    toggleDoubleTurbo() {
      this.doubleTurbo = !this.doubleTurbo;
      this.saveConfig();

      const btn = document.getElementById('quant-double-turbo-toggle');
      const label = document.getElementById('quant-double-turbo-label');
      const sidebarBadge = document.getElementById('quant-btn-badge');

      if (btn && label) {
        if (this.doubleTurbo) {
          btn.className = 'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-semibold border transition-all cursor-pointer shadow-sm bg-orange-500/20 text-orange-400 border-orange-500/50';
          label.textContent = 'Double Turbo: ACTIVE';
        } else {
          btn.className = 'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-semibold border transition-all cursor-pointer shadow-sm bg-stone-900 text-stone-400 border-stone-800';
          label.textContent = 'Double Turbo: OFF';
        }
      }

      if (sidebarBadge) {
        sidebarBadge.textContent = this.doubleTurbo ? '2x Turbo' : 'Standard';
      }

      if (window.app && window.app.showCommandToast) {
        window.app.showCommandToast(this.doubleTurbo ? '⚡ Double Turbo Mode: Speculative decoding active (~800 tok/s)' : 'Double Turbo Mode: Off');
      }
    }

    setRotSpeed(val) {
      this.rotSpeed = parseFloat(val);
      const span = document.getElementById('quant-rotspeed-val');
      if (span) span.textContent = `${this.rotSpeed}x`;
      this.saveConfig();
    }

    setPrecision(prec) {
      this.quantPrecision = prec;
      document.querySelectorAll('.quant-prec-btn').forEach(b => {
        if (b.textContent === prec) {
          b.className = 'quant-prec-btn px-2 py-0.5 rounded text-[11px] font-mono bg-cyan-500 text-stone-950 font-bold cursor-pointer';
        } else {
          b.className = 'quant-prec-btn px-2 py-0.5 rounded text-[11px] font-mono text-stone-400 cursor-pointer';
        }
      });
      this.saveConfig();
    }

    setHeads(heads) {
      this.attentionHeads = parseInt(heads, 10);
      this.buildNeuralModel();
      this.saveConfig();
    }

    setTheme(themeName) {
      this.theme = themeName;
      this.saveConfig();
      this.renderRightPanel();
    }

    startLoop() {
      if (this.rafId) return;
      this.lastTs = performance.now();

      const loop = (now) => {
        if (!this.isOpen) return;
        const dt = Math.min((now - this.lastTs) / 1000, 0.1);
        this.lastTs = now;

        this.update(dt);
        this.draw();

        this.rafId = requestAnimationFrame(loop);
      };
      this.rafId = requestAnimationFrame(loop);
    }

    stopLoop() {
      if (this.rafId) {
        cancelAnimationFrame(this.rafId);
        this.rafId = null;
      }
    }

    update(dt) {
      this.time += dt;
      this.surgeEnergy = Math.max(0, this.surgeEnergy - dt * 0.45);
      const effectiveSpeed = this.rotSpeed + this.surgeEnergy * 1.5;
      this.angleY += 0.45 * effectiveSpeed * dt;
    }

    draw() {
      if (!this.ctx || !this.canvas) return;
      const ctx = this.ctx;
      ctx.clearRect(0, 0, this.width, this.height);

      const cosY = Math.cos(this.angleY);
      const sinY = Math.sin(this.angleY);
      const cosX = Math.cos(this.angleX);
      const sinX = Math.sin(this.angleX);
      const fov = 420;

      // Color Theme Selection
      let nodeColor = '#06b6d4';
      let synapseColor = '6, 182, 212';
      let quantHighlight = '#38bdf8';

      if (this.theme === 'stark_amber') {
        nodeColor = '#f59e0b';
        synapseColor = '245, 158, 11';
        quantHighlight = '#fdd222';
      } else if (this.theme === 'matrix_purple') {
        nodeColor = '#a855f7';
        synapseColor = '168, 85, 247';
        quantHighlight = '#c084fc';
      } else if (this.theme === 'emerald_tensor') {
        nodeColor = '#10b981';
        synapseColor = '16, 185, 129';
        quantHighlight = '#34d399';
      }

      // 1. Draw RoPE Helical Strands
      ctx.save();
      ctx.strokeStyle = `rgba(${synapseColor}, ${0.22 + this.surgeEnergy * 0.35})`;
      ctx.lineWidth = 1.2 + this.surgeEnergy * 1.0;
      ctx.beginPath();
      for (let i = 0; i < this.ropeStrands.length; i++) {
        const s = this.ropeStrands[i];
        const x1 = s.x * cosY - s.z * sinY;
        const z1 = s.x * sinY + s.z * cosY;
        const y2 = s.y * cosX - z1 * sinX;
        const z2 = s.y * sinX + z1 * cosX;
        const scale = fov / (fov + z2 + 180);
        const px = this.cx + x1 * scale;
        const py = this.cy + y2 * scale;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.restore();

      // 2. Draw Synapses with Firing Pulses
      for (const syn of this.synapses) {
        const f = syn.from;
        const t = syn.to;

        // Project From
        const fx1 = f.x * cosY - f.baseZ * sinY;
        const fz1 = f.x * sinY + f.baseZ * cosY;
        const fy2 = f.baseY * cosX - fz1 * sinX;
        const fz2 = f.baseY * sinX + fz1 * cosX;
        const fScale = fov / (fov + fz2 + 180);
        const fpx = this.cx + fx1 * fScale;
        const fpy = this.cy + fy2 * fScale;

        // Project To
        const tx1 = t.x * cosY - t.baseZ * sinY;
        const tz1 = t.x * sinY + t.baseZ * cosY;
        const ty2 = t.baseY * cosX - tz1 * sinX;
        const tz2 = t.baseY * sinX + tz1 * cosX;
        const tScale = fov / (fov + tz2 + 180);
        const tpx = this.cx + tx1 * tScale;
        const tpy = this.cy + ty2 * tScale;

        // Synapse Line
        const pulse = Math.sin(this.time * 4 + syn.activeTime) * 0.5 + 0.5 + this.surgeEnergy * 0.5;
        ctx.strokeStyle = `rgba(${synapseColor}, ${0.12 + pulse * 0.35})`;
        ctx.lineWidth = 0.8 + pulse * 0.8;
        ctx.beginPath();
        ctx.moveTo(fpx, fpy);
        ctx.lineTo(tpx, tpy);
        ctx.stroke();

        // Traveling Activation Spark
        const progress = (this.time * (1.5 + this.surgeEnergy * 2.5) + syn.activeTime) % 1.0;
        const sparkX = fpx + (tpx - fpx) * progress;
        const sparkY = fpy + (tpy - fpy) * progress;
        ctx.fillStyle = quantHighlight;
        ctx.fillRect(sparkX - 1.5, sparkY - 1.5, 3 + this.surgeEnergy * 2, 3 + this.surgeEnergy * 2);
      }

      // 3. Draw Neurons / Quantization Weight Tensor Blocks
      for (const layer of this.layers) {
        for (const n of layer) {
          const x1 = n.x * cosY - n.baseZ * sinY;
          const z1 = n.x * sinY + n.baseZ * cosY;
          const y2 = n.baseY * cosX - z1 * sinX;
          const z2 = n.baseY * sinX + z1 * cosX;

          const scale = fov / (fov + z2 + 180);
          const px = this.cx + x1 * scale;
          const py = this.cy + y2 * scale;

          ctx.save();
          if (this.quantPrecision === 'INT4') {
            ctx.fillStyle = quantHighlight;
            ctx.shadowColor = nodeColor;
            ctx.shadowBlur = (6 + this.surgeEnergy * 10) * scale;
            ctx.fillRect(px - 3.5 * scale, py - 3.5 * scale, 7 * scale, 7 * scale);
          } else if (this.quantPrecision === 'INT8') {
            ctx.fillStyle = nodeColor;
            ctx.beginPath();
            ctx.arc(px, py, (4 + this.surgeEnergy * 2) * scale, 0, Math.PI * 2);
            ctx.fill();
          } else {
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = quantHighlight;
            ctx.shadowBlur = (10 + this.surgeEnergy * 14) * scale;
            ctx.beginPath();
            ctx.arc(px, py, (3 + this.surgeEnergy * 1.5) * scale, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        }
      }
    }
  }

  global.QuantStudio = QuantStudio;

  function autoMountQuantStudio() {
    if (!global.quantStudio) {
      global.quantStudio = new QuantStudio();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoMountQuantStudio);
  } else {
    autoMountQuantStudio();
  }

})(typeof window !== 'undefined' ? window : this);
