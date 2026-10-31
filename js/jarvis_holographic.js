/**
 * ============================================================================
 * J.A.R.V.I.S. INTERACTIVE MATRIX HOLOGRAPHIC SUITE — DROP-IN WEB MODULE
 * ============================================================================
 * Spec Features:
 *  1. 3D Volumetric Multi-Shell Fibonacci Particle Sphere (with hollow inner
 *     acoustic core cavity matching Iron Man J.A.R.V.I.S. UI).
 *  2. Counter-Rotating Tactical Vector Rings with custom dashed arcs.
 *  3. Tri-Axis Reactivity Pipeline:
 *     - Axis A: Typing Velocity Dynamics (Δt keystroke frequency -> ω, scale, spread)
 *     - Axis B: Cursor Proximity 3D Tilt & Particle Magnetism Pull
 *     - Axis C: LLM Lifecycle States (IDLE | COMPUTATIONAL_THINKING | STREAMING_RESPONSE)
 *  4. Custom Requested Color Palette Blend:
 *     - #fdd222 (Vibrant Stark Gold / Kinetic Sparks)
 *     - #8a99a5 (Sleek Metallic Slate / Structural Mid-Shells)
 *     - #541e18 (Deep Crimson Burgundy / Inner Core Cavity)
 *     - #a92e22 (Stark Arc Reactor Crimson / Anomaly Red)
 *     - #191919 (Rich Obsidian Canvas & Ambient Depth Base)
 *  5. Text-Only Metric Parser & Secret JSON Payload Trigger Extractor:
 *     - Word-length kinetic ring shockwaves
 *     - Strips `|||{"pulse_intensity": X, "matrix_mode": "Y", "data_packet_size": Z}|||`
 * ============================================================================
 */

(function (global) {
  'use strict';

  const PAYLOAD_REGEX = /\|\|\|\s*(\{[\s\S]*?\})\s*\|\|\|/g;

  const JarvisHolographicSuite = {
    SYSTEM_PROMPT_ADDON:
      'CRITICAL TELEMETRY RULE: At the very end of EVERY response, you MUST append a single-line minified JSON telemetry wrapper enclosed in triple pipes with NO text after it: ' +
      '|||{"pulse_intensity": 0.85, "matrix_mode": "STANDARD_OPTICS", "data_packet_size": 1024}||| ' +
      'Valid values for "matrix_mode" are "STANDARD_OPTICS", "TACTICAL_ALERT", "OVERDRIVE", or "DIAGNOSTIC".',

    mount(options = {}) {
      const config = Object.assign(
        {
          container: document.body,
          inputSelector: 'textarea, input[type="text"]',
          palette: 'stark_matrix', // 'stark_matrix' | 'movie_cyan_gold' | 'stark_amber'
          showRings: true,
          particleCount: 2000,
          hollowCavityRatio: 0.38,
          dampening: 0.08,
          zIndex: 0,
          enabled: true
        },
        options
      );

      // Create & mount full-bleed <canvas>
      const canvas = document.createElement('canvas');
      canvas.id = 'jarvis-holographic-canvas';
      Object.assign(canvas.style, {
        position: config.container === document.body ? 'fixed' : 'absolute',
        inset: '0',
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: String(config.zIndex),
        background: 'transparent',
        opacity: config.enabled ? '1' : '0',
        transition: 'opacity 0.4s ease'
      });
      config.container.appendChild(canvas);
      const ctx = canvas.getContext('2d');

      // Internal Tri-Axis Physics State
      const state = {
        enabled: config.enabled !== false,
        width: window.innerWidth,
        height: window.innerHeight,
        cx: window.innerWidth / 2,
        cy: window.innerHeight / 2,
        dampening: config.dampening,
        hollowCavityRatio: config.hollowCavityRatio,
        palette: config.palette,
        showRings: config.showRings,

        // Axis A: Typing Velocity Dynamics
        lastKeyTime: 0,
        keystrokeDeltaMs: 0,
        typingCps: 0,
        targetOmega: 1.0,
        currentOmega: 1.0,
        targetScale: 1.0,
        currentScale: 1.0,
        targetSpread: 0.0,
        currentSpread: 0.0,

        // Axis B: Cursor Proximity Grid Tracking
        mouseX: window.innerWidth / 2,
        mouseY: window.innerHeight / 2,
        relX: 0,
        relY: 0,
        euclideanDist: 0,
        targetTiltX: 0,
        targetTiltY: 0,
        currentTiltX: 0,
        currentTiltY: 0,
        rotY: 0,
        rotX: 0.2,

        // Axis C: LLM Processing State Telemetry
        lifecycle: 'IDLE', // 'IDLE' | 'COMPUTATIONAL_THINKING' | 'STREAMING_RESPONSE'
        matrixMode: 'STANDARD_OPTICS', // 'STANDARD_OPTICS' | 'TACTICAL_ALERT' | 'OVERDRIVE' | 'DIAGNOSTIC'
        targetAlertBlend: 0.0,
        currentAlertBlend: 0.0,
        targetRippleAmp: 0.035,
        currentRippleAmp: 0.035,
        tokenPulseBoost: 0.0,
        micEnergy: 0.0,
        lastWordWeight: 0,
        packetSize: 0,
        lastPayload: null,

        time: 0,
        lastFrameTs: performance.now(),
        rafId: null
      };

      // Build 3D Multi-Shell Fibonacci Volumetric Sphere
      let sphereNodes = [];
      function buildSphere(count) {
        sphereNodes = [];
        const goldenAngle = Math.PI * (3 - Math.sqrt(5));
        const shells = [0.42, 0.56, 0.70, 0.82, 0.92, 1.0];

        for (let i = 0; i < count; i++) {
          const yNorm = 1 - (i / Math.max(count - 1, 1)) * 2;
          const rAtY = Math.sqrt(Math.max(0, 1 - yNorm * yNorm));
          const theta = goldenAngle * i;
          const shellIdx = i % shells.length;
          const shellRadius = shells[shellIdx] + (Math.random() - 0.5) * 0.035;

          sphereNodes.push({
            ux: Math.cos(theta) * rAtY,
            uy: yNorm,
            uz: Math.sin(theta) * rAtY,
            shell: shellRadius,
            shellIdx,
            phase: Math.random() * Math.PI * 2,
            size: shellIdx >= 4 ? 1.85 : 1.35
          });
        }
      }
      buildSphere(config.particleCount);

      // Counter-Rotating Tactical Rings
      const tacticalRings = [
        { radiusOffset: 1.12, weight: 1.5, dir: 1, speed: 0.55, dash: [32, 16, 8, 16], angle: 0 },
        { radiusOffset: 1.25, weight: 1.2, dir: -1, speed: 0.38, dash: [10, 14], angle: 1.4 },
        { radiusOffset: 1.38, weight: 1.8, dir: 1, speed: 0.24, dash: [90, 35, 18, 35], angle: 2.7 }
      ];

      // Fluid Decay Interpolation
      function damp(current, target, factor) {
        return current + (target - current) * factor;
      }

      function resize() {
        const rect =
          config.container === document.body
            ? { width: window.innerWidth, height: window.innerHeight }
            : config.container.getBoundingClientRect();
        state.width = rect.width || window.innerWidth;
        state.height = rect.height || window.innerHeight;
        const dpr = window.devicePixelRatio || 1;
        canvas.width = state.width * dpr;
        canvas.height = state.height * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        state.cx = state.width / 2;
        state.cy = state.height / 2;
      }
      window.addEventListener('resize', resize);
      resize();

      // Custom Requested Palette:
      // #fdd222 (253, 210, 34)  - Vibrant Stark Gold
      // #8a99a5 (138, 153, 165) - Sleek Metallic Slate
      // #541e18 (84, 30, 24)    - Deep Crimson Burgundy
      // #a92e22 (169, 46, 34)   - Stark Arc Reactor Crimson
      // #191919 (25, 25, 25)    - Rich Obsidian Dark Base
      function getParticleColor(node, depthNorm, alertBlend, pulseEnergy) {
        const alpha = Math.min(
          0.95,
          Math.max(0.12, (0.24 + depthNorm * 0.76) * (0.85 + pulseEnergy * 0.32))
        );

        // Alert / Computational Thinking / Anomaly Red State
        if (alertBlend > 0.35) {
          // Inner core blends from deep burgundy (#541e18) to bright crimson (#a92e22)
          // High pulse energy adds brilliant gold highlights (#fdd222)
          if (pulseEnergy > 0.45 && node.shell > 0.85) {
            // Gold sparks on outer shells during bursts
            const r = Math.round(253);
            const g = Math.round(180 + pulseEnergy * 30);
            const b = Math.round(34);
            return `rgba(${r},${g},${b},${alpha.toFixed(2)})`;
          }
          const t = Math.min(1, Math.max(0, node.shell));
          const r = Math.round(84 + (169 - 84) * t + alertBlend * 20);
          const g = Math.round(30 + (46 - 30) * t);
          const b = Math.round(24 + (34 - 24) * t);
          return `rgba(${r},${g},${b},${alpha.toFixed(2)})`;
        }

        // Standard Optics Palette: Harmonious mix of #fdd222, #8a99a5, #541e18, #a92e22
        if (state.palette === 'stark_matrix') {
          if (node.shell > 0.82) {
            // Outer shells: Vibrant Stark Gold (#fdd222) with depth warmth
            const r = 253;
            const g = Math.round(200 + depthNorm * 10);
            const b = Math.round(34 + depthNorm * 25);
            return `rgba(${r},${g},${b},${alpha.toFixed(2)})`;
          } else if (node.shell > 0.58) {
            // Middle shells: Sleek Metallic Slate (#8a99a5)
            const r = Math.round(138 + pulseEnergy * 40);
            const g = Math.round(153 + depthNorm * 15);
            const b = Math.round(165 + depthNorm * 20);
            return `rgba(${r},${g},${b},${alpha.toFixed(2)})`;
          } else if (node.shell > 0.44) {
            // Inner mid: Stark Arc Reactor Crimson (#a92e22)
            const r = Math.round(169 + pulseEnergy * 30);
            const g = Math.round(46 + depthNorm * 20);
            const b = Math.round(34);
            return `rgba(${r},${g},${b},${alpha.toFixed(2)})`;
          }
          // Deep acoustic core: Deep Crimson Burgundy (#541e18) fading to obsidian (#191919)
          const r = Math.round(84 + depthNorm * 30);
          const g = Math.round(30 + depthNorm * 10);
          const b = Math.round(24);
          return `rgba(${r},${g},${b},${alpha.toFixed(2)})`;
        }

        if (state.palette === 'movie_cyan_gold') {
          if (node.shell > 0.86) {
            const r = Math.round(145 + pulseEnergy * 80);
            const g = Math.round(235 + depthNorm * 20);
            const b = Math.round(215 + depthNorm * 35);
            return `rgba(${r},${g},${b},${alpha.toFixed(2)})`;
          } else if (node.shell > 0.62) {
            const r = Math.round(215 + depthNorm * 40);
            const g = Math.round(230 + depthNorm * 25);
            const b = Math.round(140 + pulseEnergy * 60);
            return `rgba(${r},${g},${b},${alpha.toFixed(2)})`;
          }
          const r = 255;
          const g = Math.round(205 + depthNorm * 45);
          const b = Math.round(120 + depthNorm * 85);
          return `rgba(${r},${g},${b},${alpha.toFixed(2)})`;
        }

        // Monochromatic Warm Stark Amber/Orange (#ffaa00)
        const r = 255;
        const g = Math.round(136 + (1 - node.shell * 0.45) * 65);
        const b = Math.round(node.shell < 0.55 ? 85 * depthNorm : 15);
        return `rgba(${r},${g},${b},${alpha.toFixed(2)})`;
      }

      // Axis A: Keystroke Velocity Listener
      function recordKeystroke() {
        const now = performance.now();
        const delta = state.lastKeyTime > 0 ? now - state.lastKeyTime : 180;
        state.lastKeyTime = now;
        state.keystrokeDeltaMs = Math.round(Math.min(delta, 999));

        const instCps = Math.min(1000 / Math.max(delta, 25), 22);
        state.typingCps = damp(state.typingCps, instCps, 0.45);
        state.targetOmega = Math.min(1.0 + state.typingCps * 0.38, 7.5);
        state.targetScale = Math.min(1.0 + state.typingCps * 0.028, 1.48);
        state.targetSpread = Math.min(state.typingCps * 2.8, 45);
        state.tokenPulseBoost = Math.min(state.tokenPulseBoost + 0.14, 0.85);
      }

      window.addEventListener('keydown', function (e) {
        if (e.target && e.target.matches && e.target.matches(config.inputSelector)) {
          recordKeystroke();
        }
      });

      // Axis B: Cursor Proximity Listener
      window.addEventListener('mousemove', function (e) {
        state.mouseX = e.clientX;
        state.mouseY = e.clientY;
        state.relX = e.clientX - state.cx;
        state.relY = e.clientY - state.cy;
        state.euclideanDist = Math.hypot(state.relX, state.relY);
        state.targetTiltX = (state.relX / Math.max(state.width * 0.5, 1)) * 24;
        state.targetTiltY = (state.relY / Math.max(state.height * 0.5, 1)) * 24;
      });

      // Main Animation Loop
      function render(now) {
        if (!state.enabled) {
          ctx.clearRect(0, 0, state.width, state.height);
          state.rafId = requestAnimationFrame(render);
          return;
        }

        const dt = Math.min((now - state.lastFrameTs) / 1000, 0.1);
        state.lastFrameTs = now;
        state.time += dt;

        if (now - state.lastKeyTime > 160) {
          state.typingCps = damp(state.typingCps, 0, 0.08);
        }

        const isThinking = state.lifecycle === 'COMPUTATIONAL_THINKING';
        const isStreaming = state.lifecycle === 'STREAMING_RESPONSE';
        const isAlert = isThinking || state.matrixMode === 'TACTICAL_ALERT';
        const activePulse = Math.min(1.0, state.tokenPulseBoost + state.micEnergy);

        const baseOmega = isThinking ? 3.4 : isStreaming ? 2.1 : 1.0;
        const baseScale = isThinking ? 1.18 : isStreaming ? 1.08 : 1.0;
        const baseSpread = isThinking ? 26 : isStreaming ? 14 : 0;

        state.targetAlertBlend = isAlert ? 1.0 : state.matrixMode === 'OVERDRIVE' ? 0.45 : 0.0;
        state.targetRippleAmp = isThinking
          ? 0.22
          : isStreaming
            ? 0.14
            : 0.035 + activePulse * 0.18;

        const alpha = state.dampening;
        state.tokenPulseBoost = damp(state.tokenPulseBoost, 0, alpha * 0.8);
        state.targetOmega = damp(state.targetOmega, baseOmega + activePulse * 1.8, alpha * 0.7);
        state.targetScale = damp(state.targetScale, baseScale + activePulse * 0.28, alpha);
        state.targetSpread = damp(state.targetSpread, baseSpread + activePulse * 24, alpha);

        state.currentOmega = damp(state.currentOmega, state.targetOmega, alpha);
        state.currentScale = damp(state.currentScale, state.targetScale, alpha);
        state.currentSpread = damp(state.currentSpread, state.targetSpread, alpha);
        state.currentAlertBlend = damp(state.currentAlertBlend, state.targetAlertBlend, alpha);
        state.currentRippleAmp = damp(state.currentRippleAmp, state.targetRippleAmp, alpha);
        state.currentTiltX = damp(state.currentTiltX, state.targetTiltX, alpha * 1.2);
        state.currentTiltY = damp(state.currentTiltY, state.targetTiltY, alpha * 1.2);

        state.rotY += 0.42 * state.currentOmega * dt;
        const rotX = 0.22 + state.currentTiltY * 0.025;
        const rotY = state.rotY + state.currentTiltX * 0.025;

        ctx.clearRect(0, 0, state.width, state.height);

        const cx = state.cx + state.currentTiltX * 0.6;
        const cy = state.cy + state.currentTiltY * 0.6;
        const sphereBaseR = Math.min(state.width, state.height) * 0.28 * state.currentScale;

        // Render Counter-Rotating Tactical Rings with the custom palette
        if (state.showRings) {
          for (let rIdx = 0; rIdx < tacticalRings.length; rIdx++) {
            const tr = tacticalRings[rIdx];
            tr.angle += tr.dir * tr.speed * state.currentOmega * dt;
            const rr = sphereBaseR * tr.radiusOffset + state.currentSpread * (0.6 + rIdx * 0.35);

            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(tr.angle);

            if (state.currentAlertBlend > 0.4) {
              // Tactical alert: stark crimson ring (#a92e22)
              ctx.strokeStyle = `rgba(169, 46, 34, ${0.45 - rIdx * 0.08})`;
            } else if (rIdx === 0) {
              // Inner ring: vibrant gold (#fdd222)
              ctx.strokeStyle = `rgba(253, 210, 34, 0.38)`;
            } else if (rIdx === 1) {
              // Mid ring: sleek metallic slate (#8a99a5)
              ctx.strokeStyle = `rgba(138, 153, 165, 0.32)`;
            } else {
              // Outer ring: deep burgundy-crimson (#541e18)
              ctx.strokeStyle = `rgba(84, 30, 24, 0.35)`;
            }

            ctx.lineWidth = tr.weight;
            ctx.setLineDash(tr.dash);
            ctx.beginPath();
            ctx.arc(0, 0, rr, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
          }
        }

        // Render 3D Volumetric Fibonacci Particle Sphere
        const cosY = Math.cos(rotY);
        const sinY = Math.sin(rotY);
        const cosX = Math.cos(rotX);
        const sinX = Math.sin(rotX);
        const fov = 560;
        const hollowRadius =
          sphereBaseR *
          state.hollowCavityRatio *
          (1.0 + Math.sin(state.time * 6) * 0.04 - activePulse * 0.18);

        for (let i = 0; i < sphereNodes.length; i++) {
          const n = sphereNodes[i];
          const waveHarmonic =
            Math.sin(state.time * 8.5 + n.ux * 6.0 + n.uy * 6.0 + n.phase) *
            Math.cos(state.time * 5.2 - n.uz * 5.0) *
            state.currentRippleAmp;

          const shellInf =
            n.shell +
            waveHarmonic +
            (n.shellIdx / 5) * (state.currentSpread / Math.max(sphereBaseR, 1));

          const x0 = n.ux * shellInf;
          const y0 = n.uy * shellInf;
          const z0 = n.uz * shellInf;

          const x1 = x0 * cosY - z0 * sinY;
          const z1 = x0 * sinY + z0 * cosY;
          const y2 = y0 * cosX - z1 * sinX;
          const z2 = y0 * sinX + z1 * cosX;

          const perspective = fov / Math.max(fov + z2 * sphereBaseR + 220, 80);
          let sx = cx + x1 * sphereBaseR * perspective;
          let sy = cy + y2 * sphereBaseR * perspective;

          // Cursor magnetism pull
          const dMouseX = state.mouseX - sx;
          const dMouseY = state.mouseY - sy;
          const mouseDist = Math.hypot(dMouseX, dMouseY);
          if (mouseDist < 190) {
            const pull = (1 - mouseDist / 190) * 18 * perspective;
            sx += (dMouseX / Math.max(mouseDist, 1)) * pull;
            sy += (dMouseY / Math.max(mouseDist, 1)) * pull;
          }

          // Hollow inner acoustic cavity (Iron Man J.A.R.V.I.S. center ring)
          const radialDist = Math.hypot(sx - cx, sy - cy);
          if (radialDist < hollowRadius && z2 > -0.35) {
            const rimPush = hollowRadius / Math.max(radialDist, 1);
            if (rimPush < 1.35) {
              sx = cx + (sx - cx) * rimPush;
              sy = cy + (sy - cy) * rimPush;
            } else {
              continue;
            }
          }

          const depthNorm = Math.min(1, Math.max(0, (z2 + 1) * 0.5));
          const dotSize = n.size * (0.65 + depthNorm * 0.85) * (1 + activePulse * 0.25);

          ctx.fillStyle = getParticleColor(n, depthNorm, state.currentAlertBlend, activePulse);
          ctx.fillRect(sx - dotSize * 0.5, sy - dotSize * 0.5, dotSize, dotSize);
        }

        state.rafId = requestAnimationFrame(render);
      }

      state.rafId = requestAnimationFrame(render);

      // Public Controller API
      return {
        canvas,
        state,
        recordKeystroke,
        setState(newLifecycle) {
          state.lifecycle = newLifecycle;
          this.updateHudBadge();
        },
        setPalette(newPalette) {
          state.palette = newPalette;
        },
        toggle(enable) {
          state.enabled = enable !== undefined ? Boolean(enable) : !state.enabled;
          canvas.style.opacity = state.enabled ? '1' : '0';
          this.updateHudBadge();
          return state.enabled;
        },
        ingestToken(word) {
          const clean = String(word || '').trim();
          if (!clean) return;
          state.lastWordWeight = clean.length;
          const boost = Math.min(clean.length * 0.048, 0.68);
          state.tokenPulseBoost = Math.min(state.tokenPulseBoost + boost, 0.98);
          state.targetSpread = Math.min(state.targetSpread + clean.length * 2.1, 50);
          state.targetOmega = Math.min(state.targetOmega + clean.length * 0.16, 6.0);
        },
        parseAndStripPayload(fullText) {
          let match;
          while ((match = PAYLOAD_REGEX.exec(fullText)) !== null) {
            try {
              const parsed = JSON.parse(match[1]);
              state.lastPayload = parsed;
              if (typeof parsed.pulse_intensity === 'number') {
                state.tokenPulseBoost = Math.max(
                  state.tokenPulseBoost,
                  Math.min(Math.max(parsed.pulse_intensity, 0.05), 1.0) * 0.8
                );
              }
              if (parsed.matrix_mode) {
                state.matrixMode = String(parsed.matrix_mode).toUpperCase();
              }
              if (parsed.data_packet_size !== undefined) {
                state.packetSize = Number(parsed.data_packet_size) || 0;
              }
            } catch (e) {}
          }
          this.updateHudBadge();
          return String(fullText || '').replace(PAYLOAD_REGEX, '').trim();
        },
        updateHudBadge() {
          const badge = document.getElementById('jarvis-hud-badge');
          if (!badge) return;
          if (!state.enabled) {
            badge.innerHTML = `<span class="opacity-50">✦ J.A.R.V.I.S. Standby</span>`;
            badge.className = "text-[10px] px-2 py-0.5 rounded-full bg-stone-900/60 border border-stone-800 text-stone-500 font-mono transition-all cursor-pointer";
            return;
          }
          if (state.lifecycle === 'COMPUTATIONAL_THINKING') {
            badge.innerHTML = `<span class="animate-pulse text-[#a92e22]">✦ COMPUTING MATRIX...</span>`;
            badge.className = "text-[10px] px-2 py-0.5 rounded-full bg-[#541e18]/40 border border-[#a92e22]/60 text-[#fdd222] font-mono font-semibold transition-all cursor-pointer shadow-sm shadow-[#a92e22]/20";
          } else if (state.lifecycle === 'STREAMING_RESPONSE') {
            badge.innerHTML = `<span class="animate-pulse text-[#fdd222]">✦ STREAMING MATRIX (${state.currentOmega.toFixed(1)}ω)</span>`;
            badge.className = "text-[10px] px-2 py-0.5 rounded-full bg-[#fdd222]/10 border border-[#fdd222]/40 text-[#fdd222] font-mono font-medium transition-all cursor-pointer";
          } else {
            badge.innerHTML = `<span class="text-[#8a99a5]">✦ J.A.R.V.I.S. // ${state.matrixMode}</span>`;
            badge.className = "text-[10px] px-2 py-0.5 rounded-full bg-[#191919]/70 border border-[#8a99a5]/30 text-[#8a99a5] hover:text-[#fdd222] hover:border-[#fdd222]/40 font-mono transition-all cursor-pointer";
          }
        },
        destroy() {
          if (state.rafId) cancelAnimationFrame(state.rafId);
          window.removeEventListener('resize', resize);
          canvas.remove();
        }
      };
    }
  };

  global.JarvisHolographicSuite = JarvisHolographicSuite;
})(typeof window !== 'undefined' ? window : this);
