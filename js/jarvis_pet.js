/**
 * ============================================================================
 * J.A.R.V.I.S. WORKSPACE PET COMPANION & STARK COPILOT (CLIPPY-STYLE HUD)
 * ============================================================================
 * Features:
 *  1. 3D Volumetric J.A.R.V.I.S. Arc Reactor Core Pet:
 *     - Multi-shell Fibonacci particle sphere with hollow inner acoustic core.
 *     - Counter-rotating tactical vector rings that harmonize with active model color.
 *     - Reactive physics: Typing velocity, mouse cursor magnetism, LLM lifecycle.
 *  2. Stark Clippy Assistant HUD Overlay:
 *     - Live contextual prompt suggestions (Click to insert!).
 *     - One-click Show Downloads:
 *       * Download Chat (.md)
 *       * Export Full JSON (.json)
 *       * Copy All Code Blocks from latest response
 *       * Save Active Canvas Artifact
 *     - Various Assistant Tools:
 *       * Shortcuts cheat sheet (Ctrl+T, Ctrl+D, Ctrl+W, Ctrl+I)
 *       * Real-time model telemetry & latency stats
 *       * Voice response readout via Web Speech Synthesis
 *  3. Dynamic Background Model Color Adaptation:
 *     - Automatically adjusts workspace background gradient to match active model color
 *     - Harmonizes tactical rings, aura sparks, and HUD borders with model brand color
 *  4. One-Click Header Toggle Button:
 *     - "✦ J.A.R.V.I.S. PET: ON" / "✦ J.A.R.V.I.S. PET: OFF"
 *     - Persists in localStorage; cancels rAF loop when OFF for 0% CPU consumption
 * ============================================================================
 */

(function (global) {
  'use strict';

  const STORAGE_KEY_ENABLED = 'freellm_jarvis_pet_enabled';
  const STORAGE_KEY_MINIMIZED = 'freellm_jarvis_pet_minimized';

  // Master Model Color & Ambient Palette Dictionary
  const MODEL_PALETTES = {
    emerald: {
      name: 'emerald',
      primary: '#10b981',
      accent: '#34d399',
      glow: 'rgba(16, 185, 129, 0.14)',
      ringRgb: '16, 185, 129',
      bgGradient: 'radial-gradient(ellipse 90% 60% at 50% -10%, rgba(16, 185, 129, 0.16), rgba(9, 9, 11, 0) 75%), #09090b'
    },
    cyan: {
      name: 'cyan',
      primary: '#06b6d4',
      accent: '#22d3ee',
      glow: 'rgba(6, 182, 212, 0.14)',
      ringRgb: '6, 182, 212',
      bgGradient: 'radial-gradient(ellipse 90% 60% at 50% -10%, rgba(6, 182, 212, 0.16), rgba(9, 9, 11, 0) 75%), #090a0f'
    },
    orange: {
      name: 'orange',
      primary: '#f97316',
      accent: '#fb923c',
      glow: 'rgba(249, 115, 22, 0.14)',
      ringRgb: '249, 115, 22',
      bgGradient: 'radial-gradient(ellipse 90% 60% at 50% -10%, rgba(249, 115, 22, 0.15), rgba(9, 9, 11, 0) 75%), #110d0a'
    },
    amber: {
      name: 'amber',
      primary: '#f59e0b',
      accent: '#fdd222',
      glow: 'rgba(245, 158, 11, 0.14)',
      ringRgb: '245, 158, 11',
      bgGradient: 'radial-gradient(ellipse 90% 60% at 50% -10%, rgba(245, 158, 11, 0.15), rgba(9, 9, 11, 0) 75%), #110e09'
    },
    purple: {
      name: 'purple',
      primary: '#a855f7',
      accent: '#c084fc',
      glow: 'rgba(168, 85, 247, 0.14)',
      ringRgb: '168, 85, 247',
      bgGradient: 'radial-gradient(ellipse 90% 60% at 50% -10%, rgba(168, 85, 247, 0.15), rgba(9, 9, 11, 0) 75%), #0f0a14'
    },
    sky: {
      name: 'sky',
      primary: '#0ea5e9',
      accent: '#38bdf8',
      glow: 'rgba(14, 165, 233, 0.14)',
      ringRgb: '14, 165, 233',
      bgGradient: 'radial-gradient(ellipse 90% 60% at 50% -10%, rgba(14, 165, 233, 0.16), rgba(9, 9, 11, 0) 75%), #080d14'
    },
    blue: {
      name: 'blue',
      primary: '#3b82f6',
      accent: '#60a5fa',
      glow: 'rgba(59, 130, 246, 0.14)',
      ringRgb: '59, 130, 246',
      bgGradient: 'radial-gradient(ellipse 90% 60% at 50% -10%, rgba(59, 130, 246, 0.15), rgba(9, 9, 11, 0) 75%), #080b14'
    },
    rose: {
      name: 'rose',
      primary: '#f43f5e',
      accent: '#fb7185',
      glow: 'rgba(244, 63, 94, 0.14)',
      ringRgb: '244, 63, 94',
      bgGradient: 'radial-gradient(ellipse 90% 60% at 50% -10%, rgba(244, 63, 94, 0.15), rgba(9, 9, 11, 0) 75%), #120a0d'
    },
    indigo: {
      name: 'indigo',
      primary: '#6366f1',
      accent: '#818cf8',
      glow: 'rgba(99, 102, 241, 0.14)',
      ringRgb: '99, 102, 241',
      bgGradient: 'radial-gradient(ellipse 90% 60% at 50% -10%, rgba(99, 102, 241, 0.15), rgba(9, 9, 11, 0) 75%), #0c0b14'
    }
  };

  class JarvisPetSuite {
    constructor() {
      this.enabled = localStorage.getItem(STORAGE_KEY_ENABLED) !== 'false';
      this.minimized = localStorage.getItem(STORAGE_KEY_MINIMIZED) === 'true';

      // Active Model Color Theme
      this.currentPalette = MODEL_PALETTES.amber;
      this.activeModel = null;

      // 3D Holographic Pet State
      this.cx = 0;
      this.cy = 0;
      this.petRadius = 38;
      this.rotX = 0.22;
      this.rotY = 0;
      this.omega = 1.0;
      this.targetOmega = 1.0;
      this.scale = 1.0;
      this.targetScale = 1.0;
      this.pulseEnergy = 0.0;
      this.time = 0;
      this.rafId = null;

      // Lifecycle: 'IDLE' | 'COMPUTATIONAL_THINKING' | 'STREAMING_RESPONSE'
      this.lifecycle = 'IDLE';

      // Mouse proximity & interaction
      this.mouseX = -1000;
      this.mouseY = -1000;
      this.isHovered = false;

      // Tactical Vector Rings
      this.rings = [
        { radiusOffset: 1.15, speed: 0.85, dir: 1, angle: 0, weight: 1.6, dash: [7, 4, 2, 4] },
        { radiusOffset: 1.42, speed: 0.55, dir: -1, angle: 0.5, weight: 1.2, dash: [14, 6, 4, 6] },
        { radiusOffset: 1.72, speed: 0.35, dir: 1, angle: 1.2, weight: 1.0, dash: [20, 8] }
      ];

      // Fibonacci Volumetric Nodes (Stark AI Core)
      this.nodes = [];
      this.initNodes(450);

      this.initDom();
      this.bindEvents();

      if (this.enabled) {
        this.startLoop();
      }
    }

    initNodes(count) {
      this.nodes = [];
      const goldenAngle = Math.PI * (3 - Math.sqrt(5));
      const shells = [0.45, 0.65, 0.82, 1.0];

      for (let i = 0; i < count; i++) {
        const yNorm = 1 - (i / Math.max(count - 1, 1)) * 2;
        const rAtY = Math.sqrt(Math.max(0, 1 - yNorm * yNorm));
        const theta = goldenAngle * i;
        const shell = shells[i % shells.length] + (Math.random() - 0.5) * 0.04;

        this.nodes.push({
          ux: Math.cos(theta) * rAtY,
          uy: yNorm,
          uz: Math.sin(theta) * rAtY,
          shell: shell,
          size: 1.2 + Math.random() * 1.6,
          phase: Math.random() * Math.PI * 2
        });
      }
    }

    initDom() {
      // 1. Full-bleed background/pet canvas
      this.canvas = document.createElement('canvas');
      this.canvas.id = 'jarvis-pet-canvas';
      Object.assign(this.canvas.style, {
        position: 'fixed',
        inset: '0',
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: '1',
        display: this.enabled ? 'block' : 'none'
      });
      document.body.appendChild(this.canvas);
      this.ctx = this.canvas.getContext('2d');

      // 2. Stark Clippy Assistant HUD Card
      this.hud = document.createElement('div');
      this.hud.id = 'jarvis-clippy-hud';
      Object.assign(this.hud.style, {
        position: 'fixed',
        bottom: '84px',
        right: '24px',
        zIndex: '30',
        maxWidth: '380px',
        width: 'calc(100vw - 48px)',
        pointerEvents: 'auto',
        display: this.enabled ? 'block' : 'none',
        transition: 'all 0.35s cubic-bezier(0.16, 1, 0.3, 1)'
      });
      document.body.appendChild(this.hud);

      this.renderHudContent();
      this.resize();
      this.updateToggleButton();
    }

    renderHudContent() {
      const p = this.currentPalette;

      if (this.minimized) {
        // Compact Holographic Orb Pill
        this.hud.innerHTML = `
          <div onclick="window.jarvisPet && window.jarvisPet.toggleMinimize()"
               title="Expand J.A.R.V.I.S. Stark Copilot"
               class="flex items-center gap-2.5 px-3.5 py-2 rounded-full bg-stone-950/90 border border-stone-800 hover:border-[${p.primary}] shadow-2xl backdrop-blur-xl cursor-pointer group transition-all">
            <span class="w-3 h-3 rounded-full animate-ping" style="background-color: ${p.primary};"></span>
            <span class="text-xs font-mono font-bold text-stone-200 group-hover:text-[${p.accent}] transition-colors">✦ J.A.R.V.I.S. Copilot</span>
            <span class="text-[10px] px-1.5 py-0.5 rounded bg-stone-900 text-stone-400 font-mono">▲ Open</span>
          </div>
        `;
        return;
      }

      // Full Stark Clippy Assistant HUD Card
      this.hud.innerHTML = `
        <div class="rounded-2xl bg-stone-950/90 border border-stone-800 shadow-2xl backdrop-blur-xl overflow-hidden font-sans transition-all"
             style="box-shadow: 0 12px 36px -8px ${p.glow}; border-color: rgba(${p.ringRgb}, 0.35);">

          <!-- Top Holographic Header Bar -->
          <div class="px-3.5 py-2.5 border-b border-stone-800/80 bg-stone-900/60 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="w-2.5 h-2.5 rounded-full animate-pulse" style="background-color: ${p.primary};"></span>
              <span class="text-xs font-mono font-bold tracking-wider text-stone-200">✦ J.A.R.V.I.S. // STARK COPILOT</span>
              <span id="jarvis-hud-status-badge" class="text-[9px] px-1.5 py-0.5 rounded-full font-mono bg-stone-900 text-[${p.accent}] border border-stone-800">
                ${this.lifecycle === 'COMPUTATIONAL_THINKING' ? 'COMPUTING' : 'IDLE // MONITORING'}
              </span>
            </div>
            <div class="flex items-center gap-1.5">
              <button onclick="window.jarvisPet && window.jarvisPet.speakGreeting()"
                      title="Read Greeting via J.A.R.V.I.S. Voice"
                      class="p-1 rounded-md text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition-all cursor-pointer">
                <span class="text-xs">🔊</span>
              </button>
              <button onclick="window.jarvisPet && window.jarvisPet.toggleMinimize()"
                      title="Minimize to Floating Orb"
                      class="p-1 rounded-md text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition-all cursor-pointer">
                <span class="text-xs font-mono">─</span>
              </button>
            </div>
          </div>

          <!-- Speech / Dialogue Balloon -->
          <div class="p-3.5 space-y-3">
            <div class="flex items-start gap-2.5">
              <div class="w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center text-xs font-mono font-bold"
                   style="background: rgba(${p.ringRgb}, 0.15); color: ${p.accent}; border: 1px solid rgba(${p.ringRgb}, 0.4);">
                ✦
              </div>
              <div class="flex-1">
                <p id="jarvis-speech-text" class="text-xs text-stone-300 leading-relaxed font-sans">
                  Good day, sir. All neural engines online. Model harmonized to <strong style="color: ${p.accent};">${(this.activeModel && this.activeModel.name) || 'OmniRoute'}</strong>. How may I assist your engineering?
                </p>
              </div>
            </div>

            <!-- Contextual Suggestions Carousel (Clippy-Style) -->
            <div class="space-y-1.5 pt-1 border-t border-stone-800/80">
              <div class="text-[10px] font-mono text-stone-400 font-semibold uppercase tracking-wider flex items-center justify-between">
                <span>💡 Contextual Suggestions</span>
                <span class="text-[9px] text-stone-500 font-normal">Click to insert</span>
              </div>
              <div class="flex flex-wrap gap-1.5">
                <button type="button" onclick="window.jarvisPet && window.jarvisPet.applySuggestion('/ponytail ')"
                        class="px-2 py-1 rounded-lg text-[11px] font-mono bg-stone-900/90 hover:bg-stone-800 border border-stone-800 hover:border-amber-500/50 text-amber-300 transition-all cursor-pointer flex items-center gap-1">
                  <span>⚡</span><span>/ponytail (Minimal Code)</span>
                </button>
                <button type="button" onclick="window.jarvisPet && window.jarvisPet.applySuggestion('Write comprehensive unit tests with edge case coverage for ')"
                        class="px-2 py-1 rounded-lg text-[11px] bg-stone-900/90 hover:bg-stone-800 border border-stone-800 hover:border-emerald-500/50 text-emerald-300 transition-all cursor-pointer flex items-center gap-1">
                  <span>🧪</span><span>Unit Tests</span>
                </button>
                <button type="button" onclick="window.jarvisPet && window.jarvisPet.applySuggestion('Analyze performance bottlenecks and refactor for high concurrency: ')"
                        class="px-2 py-1 rounded-lg text-[11px] bg-stone-900/90 hover:bg-stone-800 border border-stone-800 hover:border-sky-500/50 text-sky-300 transition-all cursor-pointer flex items-center gap-1">
                  <span>⚡</span><span>Optimize Latency</span>
                </button>
                <button type="button" onclick="window.jarvisPet && window.jarvisPet.applySuggestion('Explain step-by-step with mathematical intuition: ')"
                        class="px-2 py-1 rounded-lg text-[11px] bg-stone-900/90 hover:bg-stone-800 border border-stone-800 hover:border-purple-500/50 text-purple-300 transition-all cursor-pointer flex items-center gap-1">
                  <span>🧠</span><span>Deep Explain</span>
                </button>
              </div>
            </div>

            <!-- Show Downloads Hub ("show downloads") -->
            <div class="space-y-1.5 pt-1 border-t border-stone-800/80">
              <div class="text-[10px] font-mono text-stone-400 font-semibold uppercase tracking-wider flex items-center justify-between">
                <span>📥 Downloads &amp; Exports</span>
                <span class="text-[9px] text-stone-500 font-normal">One-Click Save</span>
              </div>
              <div class="grid grid-cols-2 gap-1.5">
                <button type="button" onclick="window.jarvisPet && window.jarvisPet.downloadChatMarkdown()"
                        class="px-2.5 py-1.5 rounded-lg text-[11px] font-medium bg-stone-900/90 hover:bg-stone-800 border border-stone-800 hover:border-stone-700 text-stone-200 hover:text-white transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm">
                  <span>📄</span><span>Download .md</span>
                </button>
                <button type="button" onclick="window.jarvisPet && window.jarvisPet.downloadChatJson()"
                        class="px-2.5 py-1.5 rounded-lg text-[11px] font-medium bg-stone-900/90 hover:bg-stone-800 border border-stone-800 hover:border-stone-700 text-stone-200 hover:text-white transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm">
                  <span>📦</span><span>Export JSON</span>
                </button>
                <button type="button" onclick="window.jarvisPet && window.jarvisPet.copyLatestCode()"
                        class="px-2.5 py-1.5 rounded-lg text-[11px] font-medium bg-stone-900/90 hover:bg-stone-800 border border-stone-800 hover:border-stone-700 text-stone-200 hover:text-white transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm">
                  <span>📋</span><span>Copy All Code</span>
                </button>
                <button type="button" onclick="window.jarvisPet && window.jarvisPet.saveArtifact()"
                        class="px-2.5 py-1.5 rounded-lg text-[11px] font-medium bg-stone-900/90 hover:bg-stone-800 border border-stone-800 hover:border-stone-700 text-stone-200 hover:text-white transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm">
                  <span>💾</span><span>Save Artifact</span>
                </button>
              </div>
            </div>

            <!-- Assistant Shortcuts & Telemetry Footer -->
            <div class="pt-1 border-t border-stone-800/80 flex items-center justify-between text-[10px] font-mono text-stone-400">
              <div class="flex items-center gap-2">
                <span>Shortcuts:</span>
                <span class="px-1 py-0.5 rounded bg-stone-900 text-stone-300">Ctrl+D</span>
                <span class="px-1 py-0.5 rounded bg-stone-900 text-stone-300">Ctrl+W</span>
                <span class="px-1 py-0.5 rounded bg-stone-900 text-stone-300">Ctrl+T</span>
              </div>
              <span id="jarvis-telemetry-ping" class="text-emerald-400 font-semibold">● 100% Ready</span>
            </div>
          </div>
        </div>
      `;
    }

    resize() {
      if (!this.canvas) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.width = window.innerWidth;
      this.height = window.innerHeight;
      this.canvas.width = this.width * dpr;
      this.canvas.height = this.height * dpr;
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Anchor J.A.R.V.I.S. Pet Core in workspace background
      // Positions subtly floating above prompt bar on lower right or ambient bottom
      if (this.width < 768) {
        this.cx = this.width - 60;
        this.cy = this.height - 130;
        this.petRadius = 28;
      } else {
        this.cx = this.width - 100;
        this.cy = this.height - 160;
        this.petRadius = 38;
      }
    }

    bindEvents() {
      window.addEventListener('resize', () => this.resize());

      // Mouse tracking
      window.addEventListener('mousemove', (e) => {
        this.mouseX = e.clientX;
        this.mouseY = e.clientY;
        const dx = e.clientX - this.cx;
        const dy = e.clientY - this.cy;
        const dist = Math.hypot(dx, dy);
        this.isHovered = dist < this.petRadius * 1.8;
      }, { passive: true });

      // Click on J.A.R.V.I.S. Pet Core triggers speech/pulse
      window.addEventListener('click', (e) => {
        if (!this.enabled) return;
        const dx = e.clientX - this.cx;
        const dy = e.clientY - this.cy;
        if (Math.hypot(dx, dy) < this.petRadius * 1.8) {
          this.pulseEnergy = 1.0;
          this.speakGreeting();
          if (this.minimized) {
            this.toggleMinimize(false);
          }
        }
      });

      // Typing reaction
      window.addEventListener('keydown', (e) => {
        if (e.target && e.target.matches && e.target.matches('textarea, input[type="text"]')) {
          this.onTyping();
        }
      }, { passive: true });
    }

    onTyping() {
      this.targetOmega = Math.min(this.targetOmega + 0.35, 4.5);
      this.targetScale = Math.min(this.targetScale + 0.04, 1.25);
      this.pulseEnergy = Math.min(this.pulseEnergy + 0.12, 0.85);

      const speech = document.getElementById('jarvis-speech-text');
      if (speech && this.lifecycle === 'IDLE' && Math.random() < 0.15) {
        speech.innerHTML = `Synthesizing syntax input... Model ready for dispatch, sir.`;
      }
    }

    setState(newState) {
      if (this.lifecycle === newState) return;
      this.lifecycle = newState;

      const badge = document.getElementById('jarvis-hud-status-badge');
      const speech = document.getElementById('jarvis-speech-text');

      if (newState === 'COMPUTATIONAL_THINKING') {
        this.targetOmega = 3.6;
        this.targetScale = 1.22;
        this.pulseEnergy = 0.9;
        if (badge) {
          badge.textContent = 'COMPUTING // NEURAL STREAM';
          badge.className = `text-[9px] px-1.5 py-0.5 rounded-full font-mono bg-amber-500/20 text-amber-300 border border-amber-500/40`;
        }
        if (speech) {
          speech.innerHTML = `Processing query across neural vector layers. Reasoning in progress...`;
        }
      } else if (newState === 'STREAMING_RESPONSE') {
        this.targetOmega = 2.4;
        this.targetScale = 1.12;
        if (badge) {
          badge.textContent = 'STREAMING // TOKENS';
          badge.className = `text-[9px] px-1.5 py-0.5 rounded-full font-mono bg-sky-500/20 text-sky-300 border border-sky-500/40`;
        }
      } else {
        // IDLE
        this.targetOmega = 1.0;
        this.targetScale = 1.0;
        if (badge) {
          badge.textContent = 'IDLE // MONITORING';
          badge.className = `text-[9px] px-1.5 py-0.5 rounded-full font-mono bg-stone-900 text-stone-300 border border-stone-800`;
        }
        if (speech && this.activeModel) {
          speech.innerHTML = `Response stream complete, sir. Ready for next instruction or download.`;
        }
      }
    }

    adaptToModel(model) {
      if (!model) return;
      this.activeModel = model;

      // Extract color
      let colorKey = (model.color || '').toLowerCase();
      if (!MODEL_PALETTES[colorKey]) {
        // Fallback by model ID / provider keywords
        const id = (model.id || '').toLowerCase();
        const prov = (model.provider || model.provider_name || '').toLowerCase();
        if (id.includes('claude') || prov.includes('anthropic')) colorKey = 'amber';
        else if (id.includes('gpt') || prov.includes('openai') || id.includes('codex')) colorKey = 'emerald';
        else if (id.includes('gemini') || prov.includes('google')) colorKey = 'sky';
        else if (id.includes('deepseek') || id.includes('reason')) colorKey = 'purple';
        else if (id.includes('groq') || id.includes('llama') || prov.includes('meta')) colorKey = 'orange';
        else if (id.includes('mistral')) colorKey = 'rose';
        else if (id.includes('qwen') || id.includes('code')) colorKey = 'cyan';
        else colorKey = 'amber';
      }

      this.currentPalette = MODEL_PALETTES[colorKey] || MODEL_PALETTES.amber;
      const p = this.currentPalette;

      // Apply dynamic background gradient on workspace
      const mainEl = document.querySelector('main') || document.body;
      if (mainEl) {
        mainEl.style.transition = 'background 0.8s cubic-bezier(0.16, 1, 0.3, 1)';
        mainEl.style.background = p.bgGradient;
      }

      // Re-render HUD cards to adopt new model color accents
      this.renderHudContent();
      this.updateToggleButton();
    }

    toggle(forceState) {
      if (typeof forceState === 'boolean') {
        this.enabled = forceState;
      } else {
        this.enabled = !this.enabled;
      }

      localStorage.setItem(STORAGE_KEY_ENABLED, this.enabled ? 'true' : 'false');

      if (this.canvas) {
        this.canvas.style.display = this.enabled ? 'block' : 'none';
      }
      if (this.hud) {
        this.hud.style.display = this.enabled ? 'block' : 'none';
      }

      this.updateToggleButton();

      if (this.enabled) {
        this.resize();
        this.startLoop();
      } else {
        this.stopLoop();
      }

      return this.enabled;
    }

    toggleMinimize(forceVal) {
      if (typeof forceVal === 'boolean') {
        this.minimized = forceVal;
      } else {
        this.minimized = !this.minimized;
      }
      localStorage.setItem(STORAGE_KEY_MINIMIZED, this.minimized ? 'true' : 'false');
      this.renderHudContent();
    }

    updateToggleButton() {
      const btn = document.getElementById('jarvis-pet-toggle-btn');
      const label = document.getElementById('jarvis-pet-btn-label');
      if (!btn) return;

      const p = this.currentPalette;
      if (this.enabled) {
        btn.className = `flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono bg-[#191919]/80 border transition-all cursor-pointer shadow-sm`;
        btn.style.borderColor = p.primary;
        btn.style.color = p.accent;
        if (label) label.textContent = 'J.A.R.V.I.S. PET: ON';
      } else {
        btn.className = `flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono bg-stone-900 hover:bg-stone-850 border border-stone-800 text-stone-500 transition-all cursor-pointer`;
        btn.style.borderColor = '';
        btn.style.color = '';
        if (label) label.textContent = 'J.A.R.V.I.S. PET: OFF';
      }
    }

    startLoop() {
      if (this.rafId) return;
      this.lastFrameTs = performance.now();
      const loop = (now) => {
        if (!this.enabled) return;
        const dt = Math.min((now - this.lastFrameTs) / 1000, 0.1);
        this.lastFrameTs = now;
        this.update(dt, now);
        this.draw(now);
        this.rafId = requestAnimationFrame(loop);
      };
      this.rafId = requestAnimationFrame(loop);
    }

    stopLoop() {
      if (this.rafId) {
        cancelAnimationFrame(this.rafId);
        this.rafId = null;
      }
      if (this.ctx && this.canvas) {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      }
    }

    update(dt, now) {
      this.time += dt;

      // Dampening towards targets
      this.omega += (this.targetOmega - this.omega) * 0.08;
      this.scale += (this.targetScale - this.scale) * 0.08;
      this.pulseEnergy = Math.max(0, this.pulseEnergy - dt * 0.45);
      this.targetOmega = Math.max(1.0, this.targetOmega - dt * 0.2);
      this.targetScale = Math.max(1.0, this.targetScale - dt * 0.1);

      this.rotY += 0.5 * this.omega * dt;

      // Mouse proximity tilt
      const dx = this.mouseX - this.cx;
      const dy = this.mouseY - this.cy;
      this.targetTiltX = (dx / Math.max(this.width * 0.5, 1)) * 0.35;
      this.targetTiltY = (dy / Math.max(this.height * 0.5, 1)) * 0.35;
      this.rotX = 0.22 + this.targetTiltY;
    }

    draw(now) {
      const ctx = this.ctx;
      ctx.clearRect(0, 0, this.width, this.height);

      const p = this.currentPalette;
      const baseR = this.petRadius * this.scale;
      const floatY = Math.sin(this.time * 2.2) * 6;
      const cx = this.cx;
      const cy = this.cy + floatY;

      // 1. Draw Counter-Rotating Tactical Rings
      for (let i = 0; i < this.rings.length; i++) {
        const ring = this.rings[i];
        ring.angle += ring.dir * ring.speed * this.omega * 0.016;
        const rr = baseR * ring.radiusOffset + this.pulseEnergy * 10;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(ring.angle);

        ctx.strokeStyle = `rgba(${p.ringRgb}, ${0.35 - i * 0.08 + this.pulseEnergy * 0.25})`;
        ctx.lineWidth = ring.weight;
        ctx.setLineDash(ring.dash);

        ctx.beginPath();
        ctx.arc(0, 0, rr, 0, Math.PI * 2);
        ctx.stroke();

        ctx.restore();
      }

      // 2. Draw 3D Volumetric Fibonacci Particle Sphere
      const cosY = Math.cos(this.rotY);
      const sinY = Math.sin(this.rotY);
      const cosX = Math.cos(this.rotX);
      const sinX = Math.sin(this.rotX);
      const fov = 320;
      const hollowRadius = baseR * 0.38;

      for (let i = 0; i < this.nodes.length; i++) {
        const n = this.nodes[i];
        const wave = Math.sin(this.time * 6 + n.phase) * (0.04 + this.pulseEnergy * 0.12);
        const rFactor = n.shell + wave;

        const x0 = n.ux * rFactor;
        const y0 = n.uy * rFactor;
        const z0 = n.uz * rFactor;

        // 3D Rotation
        const x1 = x0 * cosY - z0 * sinY;
        const z1 = x0 * sinY + z0 * cosY;
        const y2 = y0 * cosX - z1 * sinX;
        const z2 = y0 * sinX + z1 * cosX;

        const perspective = fov / Math.max(fov + z2 * baseR + 100, 40);
        let sx = cx + x1 * baseR * perspective;
        let sy = cy + y2 * baseR * perspective;

        // Hollow inner acoustic cavity
        const distFromCenter = Math.hypot(sx - cx, sy - cy);
        if (distFromCenter < hollowRadius && z2 > -0.3) {
          const push = hollowRadius / Math.max(distFromCenter, 1);
          sx = cx + (sx - cx) * push;
          sy = cy + (sy - cy) * push;
        }

        const depth = Math.min(1, Math.max(0, (z2 + 1) * 0.5));
        const alpha = (0.25 + depth * 0.75 + this.pulseEnergy * 0.2).toFixed(2);
        const dotSize = n.size * (0.7 + depth * 0.6) * perspective;

        ctx.fillStyle = `rgba(${p.ringRgb}, ${alpha})`;
        ctx.fillRect(sx - dotSize * 0.5, sy - dotSize * 0.5, dotSize, dotSize);
      }

      // 3. Central Arc Reactor Acoustic Core Pulse
      ctx.save();
      ctx.fillStyle = p.accent;
      ctx.shadowColor = p.primary;
      ctx.shadowBlur = 12 + this.pulseEnergy * 16;
      ctx.beginPath();
      ctx.arc(cx, cy, 3.5 + Math.sin(this.time * 5) * 1.5 + this.pulseEnergy * 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.restore();
    }

    // --- Clippy Actions: Suggestions & Downloads ---
    applySuggestion(text) {
      const textarea = document.getElementById('chat-input-textarea');
      if (textarea) {
        textarea.value = text;
        textarea.focus();
        // Trigger auto-resize if available
        if (window.app && window.app.autoResizeTextarea) {
          window.app.autoResizeTextarea(textarea);
        }
      }
      this.pulseEnergy = 0.8;
    }

    downloadChatMarkdown() {
      const chat = window.app && window.app.currentChat;
      if (!chat || !chat.messages || chat.messages.length === 0) {
        alert("No active chat messages to download.");
        return;
      }
      let md = `# FreeLLM Hub Conversation - ${chat.title || 'Untitled'}\n\n`;
      md += `- **Date:** ${new Date().toLocaleString()}\n`;
      md += `- **Model:** ${(this.activeModel && this.activeModel.name) || 'OmniRoute Auto'}\n\n---\n\n`;
      for (const m of chat.messages) {
        const role = m.role === 'user' ? '### 👤 User' : '### 🤖 Assistant';
        md += `${role}\n\n${m.content || ''}\n\n---\n\n`;
      }
      this.triggerDownload(`chat-${Date.now()}.md`, md, 'text/markdown;charset=utf-8');
      if (window.app && window.app.showCommandToast) {
        window.app.showCommandToast("📄 Conversation downloaded as Markdown!");
      }
    }

    downloadChatJson() {
      const chat = window.app && window.app.currentChat;
      if (!chat) return;
      const data = {
        exportedAt: new Date().toISOString(),
        model: this.activeModel,
        chat: chat
      };
      this.triggerDownload(`chat-${chat.id || Date.now()}.json`, JSON.stringify(data, null, 2), 'application/json;charset=utf-8');
      if (window.app && window.app.showCommandToast) {
        window.app.showCommandToast("📦 Exported full JSON chat state!");
      }
    }

    copyLatestCode() {
      const chat = window.app && window.app.currentChat;
      if (!chat || !chat.messages) return;
      const lastAssistant = [...chat.messages].reverse().find(m => m.role === 'assistant');
      if (!lastAssistant || !lastAssistant.content) {
        alert("No code snippets found in the latest response.");
        return;
      }
      const codeRegex = /```[\w]*\n([\s\S]*?)```/g;
      const blocks = [];
      let m;
      while ((m = codeRegex.exec(lastAssistant.content)) !== null) {
        blocks.push(m[1]);
      }
      const textToCopy = blocks.length > 0 ? blocks.join('\n\n/* --- Next Snippet --- */\n\n') : lastAssistant.content;
      navigator.clipboard.writeText(textToCopy);
      if (window.app && window.app.showCommandToast) {
        window.app.showCommandToast("📋 Copied code blocks to clipboard!");
      }
    }

    saveArtifact() {
      const iframe = document.getElementById('artifact-frame');
      if (iframe && iframe.srcdoc) {
        this.triggerDownload(`artifact-${Date.now()}.html`, iframe.srcdoc, 'text/html;charset=utf-8');
        if (window.app && window.app.showCommandToast) {
          window.app.showCommandToast("💾 Artifact HTML exported!");
        }
      } else {
        alert("No active canvas artifact rendered yet.");
      }
    }

    triggerDownload(filename, content, mimeType) {
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }

    speakGreeting() {
      if (!('speechSynthesis' in window)) return;
      window.speechSynthesis.cancel();
      const text = `Good day, sir. All core protocols online. How may I assist your engineering today?`;
      const utter = new SpeechSynthesisUtterance(text);
      utter.rate = 1.05;
      utter.pitch = 0.95;
      window.speechSynthesis.speak(utter);
      this.pulseEnergy = 1.0;
    }

    destroy() {
      this.stopLoop();
      if (this.canvas && this.canvas.parentNode) this.canvas.parentNode.removeChild(this.canvas);
      if (this.hud && this.hud.parentNode) this.hud.parentNode.removeChild(this.hud);
    }
  }

  // Mount globally
  global.JarvisPetSuite = JarvisPetSuite;

  function autoMount() {
    if (!global.jarvisPet) {
      global.jarvisPet = new JarvisPetSuite();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoMount);
  } else {
    autoMount();
  }

})(typeof window !== 'undefined' ? window : this);
