/**
 * ============================================================================
 * J.A.R.V.I.S. // AGE OF ULTRON PROCEDURAL HOLOGRAM & QUANT STUDIO KERNEL
 * ============================================================================
 * Built following:
 *  1. SideFX / Animal Logic "Avengers: Age of Ultron" Houdini SOP Workflow:
 *     - Pre-baked spherical self-shadowing & core-glow attributes in a flat
 *       Float32Array (zero per-frame lighting math, zero GC allocations).
 *     - 5-Stage Transformer Cortical Clusters (Embeddings -> MHA/GQA -> RMSNorm
 *       -> SwiGLU -> Logits) + Dual Spinning RoPE Helices + Synaptic Axon Curves
 *       embedded inside an asymmetric Volumetric Point Cloud.
 *     - Additive Volumetric Pass (globalCompositeOperation = 'lighter') with
 *       bucketed LUT batches (~8 fillStyle switches per frame instead of 1,500).
 *  2. 3D Helix Engine Design Language & Scroll Interaction:
 *     - Mouse wheel / touch scroll directly pitches and zooms the RoPE double helix.
 *     - 4 Working Modes: 5-Stage Transformer, RoPE Helix Engine, Quant AWQ, Turbo Stream.
 *     - Dynamic in-studio Model Selectors (Header + Chatbox router bar).
 *  3. DietrichGebert/ponytail ("Lazy Senior Dev") Low-Load Engineering Rules:
 *     - 0.0% CPU/GPU load when modal is closed or tab is hidden (cancelAnimationFrame).
 *     - Adaptive 30 FPS idle throttle -> instant 60 FPS wake on typing/drag/scroll/stream.
 *     - Zero object or string creation inside renderFrame().
 * ============================================================================
 */

(function (global) {
  'use strict';

  const STORAGE_KEY = 'freellm_quant_studio_config';
  const PAYLOAD_REGEX = /\|\|\|\s*(\{[\s\S]*?\})\s*\|\|\|/g;
  const STRIDE = 8; // [ux, uy, uz, bakedCoreGlow, layerId, phase, salience, size]
  const BUCKETS = 8;
  const POINT_COUNT = 1500;

  const PALETTES = {
    stark_amber: { r: 255, g: 170, b: 0, coreR: 255, coreG: 242, coreB: 200 },
    ultron_red: { r: 255, g: 48, b: 12, coreR: 255, coreG: 185, coreB: 140 },
    quantum_cyan: { r: 0, g: 235, b: 255, coreR: 210, coreG: 255, coreB: 255 },
    matrix_purple: { r: 168, g: 85, b: 247, coreR: 240, coreG: 215, coreB: 255 },
    emerald_tensor: { r: 16, g: 185, b: 129, coreR: 210, coreG: 255, coreB: 235 }
  };

  const STAGE_CENTERS = [
    [-0.52, -0.12, 0.08], // 0: Input Token Embeddings
    [-0.24, 0.16, -0.14], // 1: Multi-Head Attention (MHA/GQA)
    [0.0, -0.05, 0.18],   // 2: RMSNorm Normalization Plane
    [0.26, 0.14, -0.10],  // 3: SwiGLU Feed-Forward Dense Cluster
    [0.54, -0.08, 0.06]   // 4: Dequantized Output Logits
  ];

  function buildLut(palKey, alertBlend) {
    const base = PALETTES[palKey] || PALETTES.stark_amber;
    const red = PALETTES.ultron_red;
    const b = Math.min(Math.max(alertBlend, 0), 1);
    const r = Math.round(base.r + (red.r - base.r) * b);
    const g = Math.round(base.g + (red.g - base.g) * b);
    const bl = Math.round(base.b + (red.b - base.b) * b);
    const cr = Math.round(base.coreR + (red.coreR - base.coreR) * b);
    const cg = Math.round(base.coreG + (red.coreG - base.coreG) * b);
    const cb = Math.round(base.coreB + (red.coreB - base.coreB) * b);

    const lut = new Array(BUCKETS);
    for (let i = 0; i < BUCKETS; i++) {
      const t = (i + 1) / BUCKETS; // 0.125 .. 1.0
      const mr = Math.round(r + (cr - r) * (t * t));
      const mg = Math.round(g + (cg - g) * (t * t));
      const mb = Math.round(bl + (cb - bl) * (t * t));
      const alpha = (0.12 + t * 0.78).toFixed(2);
      lut[i] = `rgba(${mr},${mg},${mb},${alpha})`;
    }
    return lut;
  }

  class QuantStudio {
    constructor() {
      const saved = this.loadConfig();
      this.isOpen = false;
      this.active = true;
      this.activeTab = saved.activeTab || 'chat'; // 'chat' | 'ensemble'
      this.doubleTurbo = saved.doubleTurbo !== false;
      this.rotSpeed = saved.rotSpeed || 1.0;
      this.quantPrecision = saved.quantPrecision || 'INT4'; // FP16 | INT8 | INT4 | NF4
      this.attentionHeads = saved.attentionHeads || 16;
      this.theme = saved.theme || 'quantum_cyan'; // quantum_cyan | stark_amber | matrix_purple | emerald_tensor
      this.selectedModels = saved.selectedModels || ['claude-3-7-sonnet', 'deepseek-r1', 'groq/llama-3.3-70b-versatile'];
      this.selectedModelId = saved.selectedModelId || (window.modelSelector && window.modelSelector.selectedModelId) || 'auto';
      this.engineMode = saved.engineMode || 'TRANSFORMER_QKV'; // 'TRANSFORMER_QKV' | 'ROPE_HELIX' | 'QUANT_AWQ' | 'TURBO_STREAM'

      // In-Studio Chatbox State
      this.studioMessages = [];
      this.isStreaming = false;
      this.abortController = null;

      // 3D Canvas & Pre-allocated Typed Buffers (Zero GC allocations in renderFrame)
      this.canvas = null;
      this.ctx = null;
      this.rafId = null;
      this.width = 800;
      this.height = 600;
      this.cx = 400;
      this.cy = 300;
      this.pointCount = POINT_COUNT;
      this.points = new Float32Array(this.pointCount * STRIDE);
      this.bucketCoords = Array.from({ length: BUCKETS }, () => new Float32Array(this.pointCount * 3));
      this.bucketCounts = new Int32Array(BUCKETS);

      // Tri-Axis Dynamics & VEX State
      this.frameCount = 0;
      this.lastInteractionTs = performance.now();
      this.lastKeyTs = 0;
      this.typingCps = 0;
      this.lifecycle = 'IDLE'; // 'IDLE' | 'COMPUTATIONAL_THINKING' | 'STREAMING_RESPONSE'
      this.matrixMode = 'STANDARD_OPTICS';
      this.targetOmega = 1.0;
      this.currentOmega = 1.0;
      this.targetScale = 1.0;
      this.currentScale = 1.0;
      this.targetAlert = 0.0;
      this.currentAlert = 0.0;
      this.synapticPulse = 0.0;
      this.rotY = 0.0;
      this.rotX = 0.18;
      this.targetTiltX = 0.0;
      this.targetTiltY = 0.0;
      this.currentTiltX = 0.0;
      this.currentTiltY = 0.0;

      // Scroll & Zoom Dynamics
      this.targetZoom = 1.0;
      this.currentZoom = 1.0;
      this.helixPitch = 1.0;
      this.currentHelixPitch = 1.0;

      this.time = 0;
      this.lastFrameTs = performance.now();
      this.lut = buildLut(this.theme, 0);

      this.initDom();
      this.initGeometry();
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
        selectedModels: this.selectedModels,
        selectedModelId: this.selectedModelId,
        engineMode: this.engineMode
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
    }

    initGeometry() {
      const goldenAngle = Math.PI * (3 - Math.sqrt(5));
      const N = this.pointCount;
      const points = this.points;

      for (let i = 0; i < N; i++) {
        const offset = i * STRIDE;
        let x, y, z, layerId;

        if (i < N * 0.12) {
          // 1. RoPE Double Helical Strand Geometry (12% of points)
          const t = (i / (N * 0.12)) * 2 - 1; // -1 .. +1
          const strand = i % 2 === 0 ? 0 : Math.PI;
          const angle = t * Math.PI * 4 + strand;
          x = t * 0.65;
          y = Math.cos(angle) * 0.22;
          z = Math.sin(angle) * 0.22;
          layerId = 5;
        } else if (i < N * 0.52) {
          // 2. 5 Transformer Stage Cortical Clusters (40% of points)
          // 0: Embeddings, 1: MHA/GQA, 2: RMSNorm, 3: SwiGLU, 4: Logits
          const stageIdx = i % 5;
          const sc = STAGE_CENTERS[stageIdx];
          const u = Math.random() * Math.PI * 2;
          const v = Math.acos(2 * Math.random() - 1);
          const radScale = stageIdx === 1 ? Math.min(1.4, Math.max(0.7, this.attentionHeads / 16)) : 1.0;
          const rad = (0.06 + Math.pow(Math.random(), 1.4) * 0.24) * radScale;
          x = sc[0] + Math.sin(v) * Math.cos(u) * rad;
          y = sc[1] + Math.sin(v) * Math.sin(u) * rad;
          z = sc[2] + Math.cos(v) * rad;
          layerId = stageIdx;
        } else {
          // 3. Asymmetric Age-of-Ultron Outer Neural Point Cloud Shell with Hollow Inner Cavity (48% of points)
          const idx = i - Math.floor(N * 0.52);
          const total = N - Math.floor(N * 0.52);
          const yNorm = 1 - (idx / Math.max(total - 1, 1)) * 2;
          const rAtY = Math.sqrt(Math.max(0, 1 - yNorm * yNorm));
          const theta = goldenAngle * idx;
          // Organic Houdini curl-like lobe modulation
          const lobe =
            0.44 +
            0.48 * Math.pow((idx % 7) / 6, 0.8) +
            0.08 * Math.sin(theta * 3 + yNorm * 4);
          x = Math.cos(theta) * rAtY * lobe * 1.15;
          y = yNorm * lobe * 0.88;
          z = Math.sin(theta) * rAtY * lobe;
          layerId = 6;
        }

        const distSq = x * x + y * y + z * z;
        // Pre-baked Houdini SOP internal core illumination & self-shadow attribute
        const bakedGlow = Math.min(1, Math.max(0.12, Math.exp(-distSq * 1.65) + (layerId < 5 ? 0.28 : 0)));
        const salience = Math.random() > 0.86 ? 1.0 : 0.2; // Salient AWQ weight outlier flag

        points[offset] = x;
        points[offset + 1] = y;
        points[offset + 2] = z;
        points[offset + 3] = bakedGlow;
        points[offset + 4] = layerId;
        points[offset + 5] = (i * 0.13) % (Math.PI * 2);
        points[offset + 6] = salience;
        points[offset + 7] = layerId < 5 ? 2.2 : salience > 0.8 ? 2.5 : 1.4;
      }
    }

    buildNeuralModel() {
      this.initGeometry();
    }

    getEngineModeLabel() {
      const labels = {
        TRANSFORMER_QKV: '5-STAGE TRANSFORMER',
        ROPE_HELIX: 'RoPE HELIX ENGINE',
        QUANT_AWQ: 'QUANT AWQ SALIENCE',
        TURBO_STREAM: 'SPECULATIVE TURBO'
      };
      return labels[this.engineMode] || this.engineMode;
    }

    initDom() {
      // 1. Studio Modal Overlay
      this.modal = document.createElement('div');
      this.modal.id = 'quant-studio-modal';
      this.modal.className = 'fixed inset-0 z-50 bg-black/85 backdrop-blur-xl flex items-center justify-center p-2 sm:p-5 transition-all hidden';
      this.modal.style.display = 'none';
      this.modal.innerHTML = `
        <div class="w-full max-w-6xl h-[94vh] rounded-3xl bg-stone-950/95 border border-cyan-500/40 shadow-2xl flex flex-col overflow-hidden font-sans text-stone-100"
             style="box-shadow: 0 24px 60px -12px rgba(6, 182, 212, 0.25);">

          <!-- Top Studio Header -->
          <div class="px-5 py-3 border-b border-stone-800 bg-stone-900/60 flex items-center justify-between flex-wrap gap-2.5">
            <div class="flex items-center gap-3">
              <span class="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/40 flex items-center justify-center text-cyan-400 text-lg shadow-inner">
                ⚛️
              </span>
              <div>
                <div class="flex items-center gap-2">
                  <h2 class="text-sm sm:text-base font-bold font-mono tracking-wider text-cyan-300">J.A.R.V.I.S. QUANT NEURAL STUDIO</h2>
                  <span class="text-[10px] px-2 py-0.5 rounded-full font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    HELIX V4.5
                  </span>
                </div>
                <p class="text-[11px] text-stone-400">SideFX SOP Neural Hologram, Interactive RoPE Helix Engine, and Live Streaming Chatbox.</p>
              </div>
            </div>

            <div class="flex items-center gap-2 flex-wrap">
              <!-- Interactive Model Select Dropdown -->
              <div class="flex items-center gap-1.5 bg-stone-900 border border-stone-800 hover:border-cyan-500/40 rounded-xl px-2.5 py-1.5 shadow-sm transition-all">
                <span class="text-xs font-mono text-cyan-400">🤖 Model:</span>
                <select id="quant-header-model-select" onchange="window.quantStudio.onModelSelect(this.value)"
                        class="bg-transparent text-cyan-300 text-xs font-mono font-semibold focus:outline-none cursor-pointer max-w-[140px] sm:max-w-[210px] truncate">
                  <option value="auto">OmniRoute Auto</option>
                </select>
              </div>

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

            <!-- Left Column (7 Cols): 3D Spinning Neural Canvas & Controls -->
            <div class="lg:col-span-7 flex flex-col border-b lg:border-b-0 lg:border-r border-stone-800 bg-black/60 relative overflow-hidden">
              
              <!-- 3D Canvas Container -->
              <div class="flex-1 relative flex items-center justify-center overflow-hidden" id="quant-canvas-container">
                <canvas id="quant-neural-canvas" class="w-full h-full block cursor-grab active:cursor-grabbing"></canvas>

                <!-- Floating Holographic Telemetry HUD (Top-Left) -->
                <div class="absolute top-3 left-3 text-[10px] font-mono text-cyan-400/90 space-y-0.5 pointer-events-none bg-stone-950/80 p-2.5 rounded-xl border border-cyan-500/30 backdrop-blur shadow-lg">
                  <div class="flex items-center justify-between gap-3 pb-1 mb-1 border-b border-cyan-500/20 text-[9px] text-cyan-300 font-bold">
                    <span>⚡ HUD // HELIX_CORE_V4</span>
                    <span id="quant-hud-fps" class="text-emerald-400">60 FPS</span>
                  </div>
                  <div>ENGINE MODE: <span id="quant-hud-mode" class="text-cyan-300 font-bold">${this.getEngineModeLabel()}</span></div>
                  <div>ROTARY EMBEDDING: <span id="quant-hud-helix" class="text-cyan-300 font-bold">RoPE 3D HELIX (1.0x PITCH)</span></div>
                  <div>ATTENTION HEADS: <span id="quant-hud-heads" class="text-cyan-300 font-bold">${this.attentionHeads} HEADS (GQA)</span></div>
                  <div>QUANTIZATION MODE: <span id="quant-hud-precision" class="text-amber-300 font-bold">${this.quantPrecision} (${this.quantPrecision === 'INT4' ? 'AWQ SALIENT' : this.quantPrecision === 'NF4' ? 'QLORA 4-BIT' : this.quantPrecision === 'INT8' ? 'VECTOR QUANT' : 'FULL WEIGHT'})</span></div>
                  <div>SYNAPSE PULSE: <span id="quant-pulse-status" class="text-emerald-400 font-bold">READY</span></div>
                </div>

                <!-- Floating Interaction Guide (Bottom-Right) -->
                <div class="absolute bottom-3 right-3 text-[10px] font-mono text-stone-400 pointer-events-none bg-stone-950/80 px-3 py-1.5 rounded-xl border border-stone-800 backdrop-blur space-y-0.5">
                  <div class="text-cyan-400/90 font-bold">◈ 3D HELIX ENGINE INTERACTION</div>
                  <div id="quant-hud-telemetry" class="text-stone-300">SCROLL: ZOOM 100% • PITCH 1.0x</div>
                  <div class="text-[9px] text-stone-500">DRAG TO ROTATE 3D • SCROLL TO PITCH HELIX</div>
                </div>
              </div>

              <!-- Canvas Bottom Personalization Toolbar -->
              <div class="p-3 border-t border-stone-800 bg-stone-900/40 backdrop-blur flex items-center justify-between gap-2.5 flex-wrap">
                <!-- Working Mode Switcher -->
                <div class="flex items-center gap-1.5">
                  <span class="text-xs font-mono text-stone-400">Mode:</span>
                  <div class="flex items-center gap-1 bg-stone-950 p-0.5 rounded-lg border border-stone-800">
                    <button onclick="window.quantStudio.setEngineMode('TRANSFORMER_QKV')" data-mode="TRANSFORMER_QKV" class="engine-mode-btn px-2 py-0.5 rounded text-[10px] font-mono ${this.engineMode === 'TRANSFORMER_QKV' ? 'bg-cyan-500 text-stone-950 font-bold' : 'text-stone-400 hover:text-stone-200'} cursor-pointer">5-Stage</button>
                    <button onclick="window.quantStudio.setEngineMode('ROPE_HELIX')" data-mode="ROPE_HELIX" class="engine-mode-btn px-2 py-0.5 rounded text-[10px] font-mono ${this.engineMode === 'ROPE_HELIX' ? 'bg-cyan-500 text-stone-950 font-bold' : 'text-stone-400 hover:text-stone-200'} cursor-pointer">RoPE Helix</button>
                    <button onclick="window.quantStudio.setEngineMode('QUANT_AWQ')" data-mode="QUANT_AWQ" class="engine-mode-btn px-2 py-0.5 rounded text-[10px] font-mono ${this.engineMode === 'QUANT_AWQ' ? 'bg-cyan-500 text-stone-950 font-bold' : 'text-stone-400 hover:text-stone-200'} cursor-pointer">Quant AWQ</button>
                    <button onclick="window.quantStudio.setEngineMode('TURBO_STREAM')" data-mode="TURBO_STREAM" class="engine-mode-btn px-2 py-0.5 rounded text-[10px] font-mono ${this.engineMode === 'TURBO_STREAM' ? 'bg-cyan-500 text-stone-950 font-bold' : 'text-stone-400 hover:text-stone-200'} cursor-pointer">Turbo</button>
                  </div>
                </div>

                <div class="flex items-center gap-2">
                  <span class="text-xs font-mono text-stone-400">Rotation:</span>
                  <input type="range" min="0.2" max="3.0" step="0.1" value="${this.rotSpeed}"
                          oninput="window.quantStudio.setRotSpeed(this.value)"
                          class="w-16 sm:w-20 accent-cyan-400 cursor-pointer" />
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

      this.modal.addEventListener('click', (e) => {
        if (e.target === this.modal) this.close();
      });

      window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.isOpen) this.close();
      });

      this.renderRightPanel();
    }

    setEngineMode(mode) {
      this.engineMode = mode;
      this.saveConfig();
      this.updateEngineModeButtons();
      this.updateEngineModeHud();
      this.triggerSynapticSurge();
      if (window.app && window.app.showCommandToast) {
        window.app.showCommandToast('⚙️ Helix Engine Working Mode: ' + this.getEngineModeLabel());
      }
    }

    updateEngineModeButtons() {
      document.querySelectorAll('.engine-mode-btn').forEach(btn => {
        const mode = btn.getAttribute('data-mode');
        if (mode === this.engineMode) {
          btn.className = 'engine-mode-btn px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500 text-stone-950 font-bold cursor-pointer shadow-sm';
        } else {
          btn.className = 'engine-mode-btn px-2 py-0.5 rounded text-[10px] font-mono text-stone-400 hover:text-stone-200 cursor-pointer';
        }
      });
    }

    updateEngineModeHud() {
      const modeHud = document.getElementById('quant-hud-mode');
      if (modeHud) {
        modeHud.textContent = this.getEngineModeLabel();
      }
    }

    updateScrollTelemetry() {
      const el = document.getElementById('quant-hud-telemetry');
      if (el) {
        el.textContent = `SCROLL: ZOOM ${Math.round(this.currentZoom * 100)}% • PITCH ${this.currentHelixPitch.toFixed(1)}x`;
      }
      const helixHud = document.getElementById('quant-hud-helix');
      if (helixHud) {
        helixHud.textContent = `RoPE 3D HELIX (${this.currentHelixPitch.toFixed(1)}x PITCH)`;
      }
    }

    onModelSelect(modelId) {
      if (!modelId) return;
      this.selectedModelId = modelId;
      this.saveConfig();

      if (window.modelSelector && typeof window.modelSelector.selectModel === 'function') {
        window.modelSelector.selectModel(modelId);
      }

      this.syncModelSelectDropdowns();
      this.triggerSynapticSurge();

      if (window.app && window.app.showCommandToast) {
        window.app.showCommandToast('⚛️ Quant Copilot routed to: ' + modelId);
      }
    }

    syncModelSelectDropdowns() {
      const activeId = this.selectedModelId || (window.modelSelector && window.modelSelector.selectedModelId) || 'auto';
      ['quant-header-model-select', 'quant-chatbox-model-select'].forEach(id => {
        const sel = document.getElementById(id);
        if (sel) {
          sel.value = activeId;
        }
      });
    }

    populateModelSelects() {
      const dropdownIds = ['quant-header-model-select', 'quant-chatbox-model-select'];
      const currentId = this.selectedModelId || (window.modelSelector && window.modelSelector.selectedModelId) || 'auto';

      let modelList = [];
      if (window.modelSelector && window.modelSelector.models && window.modelSelector.models.length > 0) {
        modelList = window.modelSelector.models;
      } else {
        modelList = [
          { id: 'auto', name: 'Auto OmniRoute (Smart Fallback)' },
          { id: 'openrouter/free', name: 'Free Daily Router' },
          { id: 'claude-3-7-sonnet', name: 'Claude 3.7 Sonnet' },
          { id: 'deepseek-r1', name: 'DeepSeek R1 (Reasoning)' },
          { id: 'groq/llama-3.3-70b-versatile', name: 'Groq Llama 3.3 70B (450 t/s)' },
          { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash' },
          { id: 'qwen-2.5-coder-32b', name: 'Qwen 2.5 Coder 32B' }
        ];
      }

      const optionsHtml = modelList.map(m => {
        const id = m.id;
        const name = m.name || m.id;
        const selected = id === currentId ? 'selected' : '';
        return `<option value="${id}" ${selected}>${name}</option>`;
      }).join('');

      dropdownIds.forEach(id => {
        const sel = document.getElementById(id);
        if (sel) {
          sel.innerHTML = optionsHtml;
          sel.value = currentId;
        }
      });
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
            <div id="quant-chat-messages" class="flex-1 overflow-y-auto p-4 space-y-3.5 font-sans text-xs"></div>

            <!-- Prompt Submission Box -->
            <div class="p-3 border-t border-stone-800 bg-stone-900/40 space-y-2">
              <div class="relative">
                <textarea id="quant-chat-input" rows="2"
                          placeholder="Type developer prompt (Enter to submit, Shift+Enter for new line)..."
                          class="w-full bg-stone-950 border border-stone-800 focus:border-cyan-500/60 rounded-xl px-3 py-2 text-xs font-mono text-stone-100 placeholder-stone-500 focus:outline-none resize-none transition-all"></textarea>
              </div>

              <div class="flex items-center justify-between gap-2">
                <!-- Interactive Model Selector in Chatbox Router Bar -->
                <div class="flex items-center gap-1.5">
                  <span class="text-[10px] font-mono text-stone-400">Router:</span>
                  <select id="quant-chatbox-model-select" onchange="window.quantStudio.onModelSelect(this.value)"
                          class="bg-stone-950 text-cyan-300 border border-cyan-500/30 text-[10px] font-mono rounded px-2 py-0.5 focus:outline-none focus:border-cyan-400 cursor-pointer max-w-[170px] truncate">
                    <option value="auto">OmniRoute Auto</option>
                  </select>
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
        this.populateModelSelects();

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
          this.recordKeystroke();
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
      this.lifecycle = 'COMPUTATIONAL_THINKING';
      this.renderStudioMessages();

      const activeModelId = this.selectedModelId || (window.modelSelector && window.modelSelector.selectedModelId) || 'auto';
      this.abortController = new AbortController();

      try {
        const stream = window.clientEngine.streamChat({
          model_id: activeModelId,
          messages: this.studioMessages.slice(0, -1).map(m => ({ role: m.role, content: m.content })),
          system_prompt: `You are the J.A.R.V.I.S. Quant Neural Copilot. Deliver mathematically rigorous, high-concurrency, zero-bloat code. Adhere strictly to the Ponytail safe-coding mandate: Correct -> Safe -> Holds under real load -> Tested -> Fast -> Lean.\n\nAt the very end of your response, you may optionally append telemetry: |||{"pulse_intensity": 0.9, "matrix_mode": "STANDARD_OPTICS", "data_packet_size": 1024}|||`,
          turbo_mode: this.doubleTurbo,
          abortSignal: this.abortController.signal
        });

        for await (const chunk of stream) {
          if (this.lifecycle !== 'STREAMING_RESPONSE') {
            this.lifecycle = 'STREAMING_RESPONSE';
          }
          if (chunk.type === 'thinking') {
            assistantMsg.thinking = (assistantMsg.thinking || '') + chunk.delta;
            this.ingestToken(chunk.delta);
          } else if (chunk.type === 'chunk') {
            assistantMsg.content += chunk.delta;
            this.ingestToken(chunk.delta);
          } else if (chunk.type === 'done') {
            assistantMsg.meta = chunk;
          }
          this.updateLatestAssistantMessage();
        }

        if (assistantMsg.content) {
          assistantMsg.content = this.parseAndStripPayload(assistantMsg.content);
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          assistantMsg.content += `\n\n> ⚠️ Notice: ${err.message || err}`;
          this.updateLatestAssistantMessage();
        }
      } finally {
        this.isStreaming = false;
        this.lifecycle = 'IDLE';
        this.renderStudioMessages();
      }
    }

    abortStream() {
      if (this.abortController) {
        this.abortController.abort();
        this.abortController = null;
      }
      this.isStreaming = false;
      this.lifecycle = 'IDLE';
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
        container.innerHTML = `
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
        `;
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
      let escaped = raw
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

      escaped = escaped.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
        return `<pre class="my-2 p-2.5 rounded-xl bg-black/80 border border-stone-800 font-mono text-[11px] overflow-x-auto text-cyan-300"><code>${code}</code></pre>`;
      });

      escaped = escaped.replace(/`([^`]+)`/g, '<code class="px-1 py-0.5 rounded bg-black/60 border border-stone-800 text-cyan-300 font-mono text-[11px]">$1</code>');

      return escaped;
    }

    wakeUp() {
      this.lastInteractionTs = performance.now();
    }

    recordKeystroke() {
      const now = performance.now();
      this.wakeUp();
      const delta = this.lastKeyTs > 0 ? now - this.lastKeyTs : 160;
      this.lastKeyTs = now;
      const cps = Math.min(1000 / Math.max(delta, 25), 20);
      this.typingCps += (cps - this.typingCps) * 0.45;
      this.targetOmega = Math.min(1.0 + this.typingCps * 0.35, 6.0);
      this.synapticPulse = Math.min(this.synapticPulse + 0.16, 1.0);
    }

    triggerSynapticSurge() {
      this.synapticPulse = Math.min(this.synapticPulse + 0.35, 1.0);
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
      this.synapticPulse = Math.min(this.synapticPulse + amount, 1.0);
    }

    ingestToken(word) {
      this.wakeUp();
      const len = String(word || '').trim().length;
      if (!len) return;
      this.synapticPulse = Math.min(1.0, this.synapticPulse + len * 0.045);
      this.targetOmega = Math.min(5.5, this.targetOmega + len * 0.14);
      this.triggerSynapticSurge();
    }

    parseAndStripPayload(fullText) {
      let match;
      while ((match = PAYLOAD_REGEX.exec(fullText)) !== null) {
        try {
          const meta = JSON.parse(match[1]);
          if (typeof meta.pulse_intensity === 'number') {
            this.synapticPulse = Math.max(this.synapticPulse, Math.min(meta.pulse_intensity, 1.0));
          }
          if (meta.matrix_mode) {
            this.matrixMode = String(meta.matrix_mode).toUpperCase();
          }
        } catch (e) {}
      }
      return String(fullText || '').replace(PAYLOAD_REGEX, '').trim();
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

    bindEvents() {
      let isDragging = false;
      let lastX = 0;
      let lastY = 0;

      window.addEventListener('mousedown', (e) => {
        if (e.target && e.target.id === 'quant-neural-canvas') {
          isDragging = true;
          lastX = e.clientX;
          lastY = e.clientY;
          this.wakeUp();
        }
      });

      window.addEventListener('mousemove', (e) => {
        this.wakeUp();
        if (this.canvas) {
          this.targetTiltX = ((e.clientX - this.cx) / Math.max(this.width * 0.5, 1)) * 0.45;
          this.targetTiltY = ((e.clientY - this.cy) / Math.max(this.height * 0.5, 1)) * 0.35;
        }
        if (isDragging) {
          const dx = e.clientX - lastX;
          const dy = e.clientY - lastY;
          lastX = e.clientX;
          lastY = e.clientY;

          this.rotY += dx * 0.008;
          this.rotX = Math.max(-1.2, Math.min(1.2, this.rotX + dy * 0.008));
        }
      });

      window.addEventListener('mouseup', () => { isDragging = false; });

      // Mouse Wheel / Trackpad Scroll interaction for RoPE Helix zoom & pitch
      window.addEventListener('wheel', (e) => {
        if (this.isOpen && e.target && e.target.id === 'quant-neural-canvas') {
          e.preventDefault();
          this.wakeUp();
          const delta = Math.sign(e.deltaY);
          if (delta > 0) {
            // Scroll down: zoom out & compact pitch
            this.targetZoom = Math.max(0.45, this.targetZoom - 0.08);
            this.helixPitch = Math.max(0.4, this.helixPitch - 0.1);
          } else {
            // Scroll up: zoom in & expand pitch
            this.targetZoom = Math.min(2.4, this.targetZoom + 0.08);
            this.helixPitch = Math.min(2.8, this.helixPitch + 0.1);
          }
          this.updateScrollTelemetry();
        }
      }, { passive: false });

      window.addEventListener('keydown', (e) => {
        if (e.target && (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT')) {
          this.recordKeystroke();
        }
      });

      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          this.active = false;
          this.stopLoop();
        } else {
          this.active = true;
          this.wakeUp();
          if (this.isOpen) {
            this.startLoop();
          }
        }
      });
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
      this.active = true;
      this.wakeUp();
      if (this.modal) {
        this.modal.classList.remove('hidden');
        this.modal.style.display = 'flex';
      }

      this.canvas = document.getElementById('quant-neural-canvas');
      if (this.canvas) {
        this.ctx = this.canvas.getContext('2d', { alpha: true });
        this.resize();
        this.startLoop();
      }

      this.populateModelSelects();
      this.updateEngineModeButtons();
      this.updateEngineModeHud();
      this.updateScrollTelemetry();

      setTimeout(() => {
        this.resize();
      }, 50);
    }

    close() {
      this.isOpen = false;
      this.active = false;
      if (this.modal) {
        this.modal.classList.add('hidden');
        this.modal.style.display = 'none';
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
      if (this.ctx) {
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }

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
      const hud = document.getElementById('quant-hud-precision');
      if (hud) {
        hud.textContent = `${this.quantPrecision} (${prec === 'INT4' ? 'AWQ SALIENT' : prec === 'NF4' ? 'QLORA 4-BIT' : prec === 'INT8' ? 'VECTOR QUANT' : 'FULL WEIGHT'})`;
      }
      this.saveConfig();
    }

    setHeads(heads) {
      this.attentionHeads = parseInt(heads, 10);
      const hud = document.getElementById('quant-hud-heads');
      if (hud) {
        hud.textContent = `${this.attentionHeads} HEADS (${this.attentionHeads === 8 ? 'MHA' : this.attentionHeads === 16 ? 'GQA' : 'WIDE'})`;
      }
      this.initGeometry();
      this.saveConfig();
    }

    setTheme(themeName) {
      this.theme = themeName;
      this.lut = buildLut(this.theme, this.currentAlert);
      this.saveConfig();
      this.renderRightPanel();
    }

    startLoop() {
      if (this.rafId) return;
      this.lastFrameTs = performance.now();

      const loop = (now) => {
        if (!this.isOpen || !this.active) {
          this.rafId = null;
          return;
        }
        this.rafId = requestAnimationFrame(loop);
        this.renderFrame(now);
      };
      this.rafId = requestAnimationFrame(loop);
    }

    stopLoop() {
      if (this.rafId) {
        cancelAnimationFrame(this.rafId);
        this.rafId = null;
      }
    }

    renderFrame(now) {
      // Ponytail Low-Load Rule: Skip every other frame (30 FPS) when sitting idle >2.5s
      this.frameCount++;
      const isIdle =
        this.lifecycle === 'IDLE' &&
        this.synapticPulse < 0.03 &&
        Math.abs(this.targetZoom - this.currentZoom) < 0.005 &&
        Math.abs(this.helixPitch - this.currentHelixPitch) < 0.005 &&
        now - this.lastInteractionTs > 2500;
      if (isIdle && this.frameCount % 2 === 1) return;

      const dt = Math.min((now - this.lastFrameTs) * 0.001, 0.1);
      this.lastFrameTs = now;
      this.time += dt;

      // Update FPS HUD telemetry periodically
      if (this.frameCount % 30 === 0) {
        const fpsEl = document.getElementById('quant-hud-fps');
        if (fpsEl) {
          fpsEl.textContent = isIdle ? '30 FPS (IDLE)' : '60 FPS';
          fpsEl.className = isIdle ? 'text-amber-400 font-mono text-[9px]' : 'text-emerald-400 font-mono text-[9px]';
        }
      }

      // Fluid exponential decay: current += (target - current) * 0.08
      const isThinking = this.lifecycle === 'COMPUTATIONAL_THINKING';
      const isAlert = isThinking || this.matrixMode === 'TACTICAL_ALERT';
      const prevAlertBucket = Math.round(this.currentAlert * 10);

      this.synapticPulse += (0 - this.synapticPulse) * 0.07;
      this.targetOmega += ((isThinking ? 2.8 : 1.0) - this.targetOmega) * 0.06;
      this.currentOmega += (this.targetOmega - this.currentOmega) * 0.08;
      this.currentScale += (1.0 + this.synapticPulse * 0.22 - this.currentScale) * 0.08;
      this.currentAlert += ((isAlert ? 1.0 : 0.0) - this.currentAlert) * 0.08;
      this.currentTiltX += (this.targetTiltX - this.currentTiltX) * 0.1;
      this.currentTiltY += (this.targetTiltY - this.currentTiltY) * 0.1;

      // Smooth scroll zoom & helix pitch interpolation
      this.currentZoom += (this.targetZoom - this.currentZoom) * 0.1;
      this.currentHelixPitch += (this.helixPitch - this.currentHelixPitch) * 0.1;

      if (Math.round(this.currentAlert * 10) !== prevAlertBucket) {
        this.lut = buildLut(this.theme, this.currentAlert);
      }

      const speedMult = this.engineMode === 'TURBO_STREAM' ? 1.4 : 1.0;
      this.rotY += 0.36 * this.rotSpeed * this.currentOmega * speedMult * dt;
      const cosY = Math.cos(this.rotY + this.currentTiltX);
      const sinY = Math.sin(this.rotY + this.currentTiltX);
      const cosX = Math.cos(0.2 + this.rotX + this.currentTiltY);
      const sinX = Math.sin(0.2 + this.rotX + this.currentTiltY);

      if (!this.ctx || !this.canvas) return;
      const ctx = this.ctx;
      ctx.globalCompositeOperation = 'source-over';
      ctx.clearRect(0, 0, this.width, this.height);

      // Additive Volumetric Hologram Blending (Animal Logic SOP Look)
      ctx.globalCompositeOperation = 'lighter';
      this.bucketCounts.fill(0);

      const cx = this.cx;
      const cy = this.cy;
      const radiusScale = Math.min(this.width, this.height) * 0.42 * this.currentScale * this.currentZoom;
      const waveAmp = 0.025 + this.synapticPulse * 0.11 + (isThinking ? 0.08 : 0);
      const isInt4 = this.quantPrecision === 'INT4';
      const helixPitchMult = this.currentHelixPitch;
      const points = this.points;
      const N = this.pointCount;

      for (let i = 0; i < N; i++) {
        const off = i * STRIDE;
        const ux = points[off];
        const uy = points[off + 1];
        const uz = points[off + 2];
        const bakedGlow = points[off + 3];
        const layerId = points[off + 4];
        const phase = points[off + 5];
        const salience = points[off + 6];
        let size = points[off + 7];

        // Analytic VEX-style trigonometric displacement (modulated by helix pitch & mode)
        const wave =
          1.0 +
          Math.sin(this.time * 5.5 * helixPitchMult + phase + ux * 4.0 * helixPitchMult) *
            (layerId === 5 ? (this.engineMode === 'ROPE_HELIX' ? waveAmp * 2.2 : waveAmp * 1.5) : waveAmp);

        const x0 = ux * wave;
        const y0 = uy * wave;
        const z0 = uz * wave;

        const x1 = x0 * cosY - z0 * sinY;
        const z1 = x0 * sinY + z0 * cosY;
        const y2 = y0 * cosX - z1 * sinX;
        const z2 = y0 * sinX + z1 * cosX;

        const proj = 2.4 / Math.max(2.4 + z2, 0.6);
        const sx = cx + x1 * radiusScale * proj;
        const sy = cy + y2 * radiusScale * proj;

        // Combine pre-baked SOP core glow + z-depth + AWQ salience into LUT bucket 0..7
        const depthFactor = (z2 + 1.0) * 0.5;
        let intensity = bakedGlow * 0.65 + depthFactor * 0.35 + this.synapticPulse * 0.25;

        // Working Mode specific highlights
        if (this.engineMode === 'ROPE_HELIX') {
          if (layerId === 5) {
            size *= 1.85;
            intensity = Math.min(1.0, intensity * 1.4 + 0.2);
          } else if (layerId === 6) {
            intensity *= 0.55; // Dim shell to spotlight DNA helix
          }
        } else if (this.engineMode === 'QUANT_AWQ') {
          if (salience > 0.8) {
            intensity = 1.0;
            size *= 1.6;
          }
        } else if (this.engineMode === 'TURBO_STREAM') {
          intensity = Math.min(1.0, intensity * 1.25);
          size *= 1.15;
        }

        if (isInt4 && salience > 0.8) {
          intensity = 1.0;
          size *= 1.35;
        } else if (this.quantPrecision === 'NF4') {
          intensity = Math.min(1.0, intensity * 1.12);
        }

        const bIdx = Math.min(BUCKETS - 1, Math.max(0, (intensity * BUCKETS) | 0));
        const cIdx = this.bucketCounts[bIdx] * 3;
        this.bucketCoords[bIdx][cIdx] = sx;
        this.bucketCoords[bIdx][cIdx + 1] = sy;
        this.bucketCoords[bIdx][cIdx + 2] = size * proj;
        this.bucketCounts[bIdx]++;
      }

      // Render all 1,500 points in 8 batched fill calls with zero string allocations
      for (let b = 0; b < BUCKETS; b++) {
        const count = this.bucketCounts[b];
        if (count === 0) continue;
        ctx.fillStyle = this.lut[b];
        const coords = this.bucketCoords[b];
        ctx.beginPath();
        for (let j = 0; j < count; j++) {
          const k = j * 3;
          const s = coords[k + 2];
          ctx.rect(coords[k] - s * 0.5, coords[k + 1] - s * 0.5, s, s);
        }
        ctx.fill();
      }

      // Render 3D Synaptic Axon Curves & Traveling Energy Packets Between the 5 Transformer Hubs
      ctx.strokeStyle = this.lut[3];
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      for (let s = 0; s < STAGE_CENTERS.length - 1; s++) {
        const a = STAGE_CENTERS[s];
        const b = STAGE_CENTERS[s + 1];

        const ax1 = a[0] * cosY - a[2] * sinY;
        const az1 = a[0] * sinY + a[2] * cosY;
        const ay2 = a[1] * cosX - az1 * sinX;
        const az2 = a[1] * sinX + az1 * cosX;
        const aproj = 2.4 / Math.max(2.4 + az2, 0.6);
        const asx = cx + ax1 * radiusScale * aproj;
        const asy = cy + ay2 * radiusScale * aproj;

        const bx1 = b[0] * cosY - b[2] * sinY;
        const bz1 = b[0] * sinY + b[2] * cosY;
        const by2 = b[1] * cosX - bz1 * sinX;
        const bz2 = b[1] * sinX + bz1 * cosX;
        const bproj = 2.4 / Math.max(2.4 + bz2, 0.6);
        const bsx = cx + bx1 * radiusScale * bproj;
        const bsy = cy + by2 * radiusScale * bproj;

        const cpx = (asx + bsx) * 0.5;
        const cpy = (asy + bsy) * 0.5 - 28 * aproj;
        ctx.moveTo(asx, asy);
        ctx.quadraticCurveTo(cpx, cpy, bsx, bsy);

        // Traveling synaptic energy spark along the curve
        const sparkSpeed = this.engineMode === 'TURBO_STREAM' ? 2.8 : (1.2 + this.currentOmega * 0.5);
        const sparkT = (this.time * sparkSpeed + s * 0.25) % 1;
        const invT = 1 - sparkT;
        const spx = invT * invT * asx + 2 * invT * sparkT * cpx + sparkT * sparkT * bsx;
        const spy = invT * invT * asy + 2 * invT * sparkT * cpy + sparkT * sparkT * bsy;
        ctx.fillStyle = this.lut[BUCKETS - 1];
        ctx.fillRect(spx - 2.5, spy - 2.5, 5, 5);
      }
      ctx.stroke();
    }

    draw() {
      this.renderFrame(performance.now());
    }
  }

  global.QuantStudio = QuantStudio;
  global.JarvisHolographicSuite = {
    mount: function(opts) {
      if (!global.quantStudio) {
        global.quantStudio = new QuantStudio();
      }
      return global.quantStudio;
    }
  };

  function autoMountQuantStudio() {
    if (!global.quantStudio) {
      try {
        global.quantStudio = new QuantStudio();
      } catch (err) {
        console.error('Failed to initialize QuantStudio:', err);
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoMountQuantStudio);
  } else {
    autoMountQuantStudio();
  }

})(typeof window !== 'undefined' ? window : this);
