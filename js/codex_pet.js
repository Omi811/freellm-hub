/**
 * ============================================================================
 * CODEX PET COMPANION — INTERACTIVE BACKGROUND VIRTUAL WORKSPACE PET
 * ============================================================================
 * Inspired by VS Code Pets / Codex Pet companions.
 *
 * Features:
 *  1. Multi-Species Companion Suite:
 *     - 'cat'    : Cyber Neko with twitching ears, swishing tail & glowing collar
 *     - 'dog'    : Cyber Corgi with bouncy trot, wagging tail & happy tongue
 *     - 'robot'  : ByteBot with CRT glowing matrix eyes, antenna & hover thruster
 *     - 'dragon' : Neon Drake with flapping wings & harmless cyber ember sparks
 *     - 'duck'   : Rubber Ducker (the legendary debugging mascot)
 *
 *  2. Reactive State Machine:
 *     - IDLE     : Gentle breathing squash/stretch, blinking, tail wagging
 *     - WALK     : Smooth roaming across bottom workspace dock with footstep sparks
 *     - SLEEP    : Curls up with floating animated "Zzz" after 15s inactivity
 *     - TYPING   : Pairs with you! Pulls out a glowing holographic laptop & emits code sparks
 *     - THINKING : Emits a glowing lightbulb & cyber gear during LLM inference
 *     - PETTED   : Clicking pet triggers a joyful backflip with bursting hearts ❤️
 *
 *  3. Interactive Controls & Toggle:
 *     - One-click toggle button in top action bar ("🐾 Pet: ON" / "🐾 Pet: OFF")
 *     - Remembers preference & species in localStorage
 *     - Completely unhooks and stops rAF when disabled for 0% CPU consumption
 *     - Window click-through pass-through (non-blocking for UI elements)
 * ============================================================================
 */

(function (global) {
  'use strict';

  const STORAGE_KEY_ENABLED = 'freellm_codex_pet_enabled';
  const STORAGE_KEY_SPECIES = 'freellm_codex_pet_species';

  class CodexPet {
    constructor(options = {}) {
      this.enabled = localStorage.getItem(STORAGE_KEY_ENABLED) !== 'false';
      this.species = localStorage.getItem(STORAGE_KEY_SPECIES) || 'cat'; // cat | dog | robot | dragon | duck

      // Pet position & physics
      this.x = 220;
      this.y = 0;
      this.targetX = 220;
      this.vx = 0;
      this.facing = 1; // 1 = right, -1 = left
      this.scale = 1.0;
      this.baseY = 0;

      // State machine
      this.state = 'IDLE'; // IDLE | WALK | SLEEP | TYPING | THINKING | PETTED
      this.stateTimer = 0;
      this.blinkTimer = 0;
      this.isBlinking = false;
      this.lastActivityTime = Date.now();
      this.jumpY = 0;
      this.flipRotation = 0;

      // Particles (hearts, Zzz, code symbols, footsteps)
      this.particles = [];

      // Mouse tracking
      this.mouseX = -1000;
      this.mouseY = -1000;

      // Animation loop
      this.rafId = null;
      this.lastFrameTime = performance.now();

      // Typing reactivity
      this.typingTimeout = null;

      this.init();
    }

    init() {
      // Create canvas
      this.canvas = document.createElement('canvas');
      this.canvas.id = 'codex-pet-canvas';
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

      this.resize();
      window.addEventListener('resize', () => this.resize());

      // Bind input events for typing velocity
      this.bindInputEvents();

      // Bind mouse & click interactions
      this.bindMouseEvents();

      // Hook up toggle button
      this.updateButtonUi();

      if (this.enabled) {
        this.startLoop();
      }
    }

    resize() {
      if (!this.canvas) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.width = window.innerWidth;
      this.height = window.innerHeight;
      this.canvas.width = this.width * dpr;
      this.canvas.height = this.height * dpr;
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Ground ledge: just above the prompt dock or bottom bar
      // Find prompt box if available to sit right above it
      const promptBox = document.getElementById('prompt-form') || document.querySelector('form');
      if (promptBox) {
        const rect = promptBox.getBoundingClientRect();
        this.baseY = rect.top - 20;
      } else {
        this.baseY = this.height - 75;
      }

      if (this.baseY < 120) this.baseY = this.height - 75;
      this.y = this.baseY;

      // Keep within bounds
      if (this.x > this.width - 60) this.x = this.width - 80;
      if (this.x < 60) this.x = 80;
    }

    bindInputEvents() {
      const handleTyping = () => {
        this.lastActivityTime = Date.now();
        if (this.state !== 'THINKING' && this.state !== 'PETTED') {
          this.setState('TYPING');
          clearTimeout(this.typingTimeout);
          this.typingTimeout = setTimeout(() => {
            if (this.state === 'TYPING') {
              this.setState('IDLE');
            }
          }, 1800);
        }
      };

      window.addEventListener('keydown', handleTyping, { passive: true });
      window.addEventListener('input', handleTyping, { passive: true });
    }

    bindMouseEvents() {
      window.addEventListener('mousemove', (e) => {
        this.mouseX = e.clientX;
        this.mouseY = e.clientY;
        this.lastActivityTime = Date.now();
      }, { passive: true });

      // Click to pet interaction
      window.addEventListener('click', (e) => {
        if (!this.enabled) return;
        const petRadius = 40 * this.scale;
        const dx = e.clientX - this.x;
        const dy = e.clientY - (this.y - 15 - this.jumpY);
        const dist = Math.hypot(dx, dy);

        if (dist <= petRadius) {
          this.pet();
        }
      });
    }

    pet() {
      this.lastActivityTime = Date.now();
      this.setState('PETTED');
      this.flipRotation = 0;

      // Spawn burst of hearts
      for (let i = 0; i < 7; i++) {
        const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.5;
        const speed = 2 + Math.random() * 3;
        this.particles.push({
          type: 'heart',
          x: this.x + (Math.random() - 0.5) * 20,
          y: this.y - 30,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: 14 + Math.random() * 8,
          alpha: 1.0,
          life: 1.0,
          decay: 0.015 + Math.random() * 0.01
        });
      }
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

      this.updateButtonUi();

      if (this.enabled) {
        this.resize();
        this.startLoop();
      } else {
        this.stopLoop();
      }

      return this.enabled;
    }

    cycleSpecies() {
      const list = ['cat', 'dog', 'robot', 'dragon', 'duck'];
      const curIdx = list.indexOf(this.species);
      const nextIdx = (curIdx + 1) % list.length;
      this.setSpecies(list[nextIdx]);
    }

    setSpecies(newSpecies) {
      const list = ['cat', 'dog', 'robot', 'dragon', 'duck'];
      if (!list.includes(newSpecies)) return;
      this.species = newSpecies;
      localStorage.setItem(STORAGE_KEY_SPECIES, newSpecies);
      this.updateButtonUi();
      this.pet(); // mini celebrate species swap
    }

    updateButtonUi() {
      const btn = document.getElementById('codex-pet-toggle-btn');
      const label = document.getElementById('codex-pet-btn-label');
      const settingsToggle = document.getElementById('settings-codex-pet-toggle');
      if (settingsToggle) settingsToggle.checked = this.enabled;
      if (!btn) return;

      const icons = {
        cat: '🐱',
        dog: '🐶',
        robot: '🤖',
        dragon: '🐲',
        duck: '🦆'
      };
      const icon = icons[this.species] || '🐾';

      if (this.enabled) {
        btn.className = "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono bg-emerald-950/40 hover:bg-emerald-900/40 border border-emerald-500/50 text-emerald-300 hover:text-emerald-200 transition-all cursor-pointer shadow-sm";
        if (label) label.textContent = `${this.species.toUpperCase()}: ON`;
        const iconSpan = btn.querySelector('.pet-btn-icon');
        if (iconSpan) iconSpan.textContent = icon;
      } else {
        btn.className = "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono bg-stone-900 hover:bg-stone-850 border border-stone-800 text-stone-500 transition-all cursor-pointer";
        if (label) label.textContent = `PET: OFF`;
        const iconSpan = btn.querySelector('.pet-btn-icon');
        if (iconSpan) iconSpan.textContent = '🐾';
      }
    }

    setState(newState) {
      if (this.state === newState) return;
      this.state = newState;
      this.stateTimer = 0;
      if (newState === 'WALK') {
        // pick random destination on screen
        const minX = 70;
        const maxX = Math.max(minX + 100, this.width - 70);
        this.targetX = minX + Math.random() * (maxX - minX);
      }
    }

    startLoop() {
      if (this.rafId) return;
      this.lastFrameTime = performance.now();
      const loop = (now) => {
        if (!this.enabled) return;
        const dt = Math.min((now - this.lastFrameTime) / 1000, 0.1);
        this.lastFrameTime = now;
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
      this.stateTimer += dt;
      this.blinkTimer += dt;

      // Handle blinking
      if (this.blinkTimer > 3.2) {
        this.isBlinking = true;
        if (this.blinkTimer > 3.4) {
          this.isBlinking = false;
          this.blinkTimer = Math.random() * 0.8;
        }
      }

      // Check for inactivity sleep
      const inactiveSeconds = (Date.now() - this.lastActivityTime) / 1000;
      if (inactiveSeconds > 18 && this.state !== 'SLEEP' && this.state !== 'THINKING') {
        this.setState('SLEEP');
      } else if (inactiveSeconds < 18 && this.state === 'SLEEP') {
        this.setState('IDLE');
      }

      // State machine transitions
      if (this.state === 'IDLE') {
        this.jumpY = 0;
        if (this.stateTimer > 4.5 && Math.random() < 0.4) {
          this.setState('WALK');
        }
      } else if (this.state === 'WALK') {
        const dx = this.targetX - this.x;
        const dist = Math.abs(dx);
        if (dist < 4) {
          this.x = this.targetX;
          this.setState('IDLE');
        } else {
          this.facing = dx > 0 ? 1 : -1;
          const speed = 45; // pixels per sec
          this.x += this.facing * speed * dt;
          this.jumpY = Math.abs(Math.sin(now * 0.008)) * 4;

          // Footstep sparkle particle
          if (Math.random() < 0.1) {
            this.particles.push({
              type: 'dust',
              x: this.x - this.facing * 8,
              y: this.y + 4,
              vx: (Math.random() - 0.5) * 8,
              vy: -Math.random() * 8,
              size: 2.5,
              alpha: 0.6,
              life: 1.0,
              decay: 0.03
            });
          }
        }
      } else if (this.state === 'TYPING') {
        // Joyful typing bounces
        this.jumpY = Math.abs(Math.sin(now * 0.015)) * 3;
        // Spawn small code symbols
        if (Math.random() < 0.07) {
          const symbols = ['{ }', '</>', 'fn()', '01', 'λ', 'const', '★', '⚡'];
          const sym = symbols[Math.floor(Math.random() * symbols.length)];
          this.particles.push({
            type: 'code',
            text: sym,
            x: this.x + (Math.random() - 0.5) * 24,
            y: this.y - 25,
            vx: (Math.random() - 0.5) * 20,
            vy: -20 - Math.random() * 25,
            size: 11,
            alpha: 1.0,
            life: 1.0,
            decay: 0.02
          });
        }
      } else if (this.state === 'THINKING') {
        // Floating cyber levitation
        this.jumpY = 6 + Math.sin(now * 0.005) * 4;
        if (Math.random() < 0.08) {
          this.particles.push({
            type: 'gear',
            x: this.x + (Math.random() - 0.5) * 30,
            y: this.y - 35,
            vx: (Math.random() - 0.5) * 10,
            vy: -15 - Math.random() * 15,
            size: 10,
            alpha: 0.9,
            life: 1.0,
            decay: 0.02
          });
        }
      } else if (this.state === 'PETTED') {
        // 360 degree backflip
        this.flipRotation += dt * 10;
        this.jumpY = Math.sin(Math.min(this.flipRotation / (Math.PI * 2), 1) * Math.PI) * 22;
        if (this.flipRotation >= Math.PI * 2) {
          this.flipRotation = 0;
          this.jumpY = 0;
          this.setState('IDLE');
        }
      } else if (this.state === 'SLEEP') {
        this.jumpY = 0;
        // Float Zzz
        if (Math.random() < 0.04) {
          this.particles.push({
            type: 'zzz',
            text: Math.random() > 0.5 ? 'Z' : 'z',
            x: this.x + 8 * this.facing,
            y: this.y - 18,
            vx: 8 + Math.random() * 6,
            vy: -14 - Math.random() * 10,
            size: 11 + Math.random() * 4,
            alpha: 0.9,
            life: 1.0,
            decay: 0.015
          });
        }
      }

      // Update particles
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.x += (p.vx || 0) * dt;
        p.y += (p.vy || 0) * dt;
        p.life -= p.decay || 0.02;
        p.alpha = Math.max(0, p.life);
        if (p.life <= 0) {
          this.particles.splice(i, 1);
        }
      }
    }

    draw(now) {
      const ctx = this.ctx;
      ctx.clearRect(0, 0, this.width, this.height);

      // Draw active particles
      this.drawParticles(ctx);

      // Render the pet companion
      ctx.save();
      const drawX = Math.round(this.x);
      const drawY = Math.round(this.y - this.jumpY);

      ctx.translate(drawX, drawY);

      // Backflip rotation when petted
      if (this.flipRotation > 0) {
        ctx.rotate(this.facing * -this.flipRotation);
      }

      // Horizontal flip for facing direction
      ctx.scale(this.facing * this.scale, this.scale);

      // Species specific rendering
      switch (this.species) {
        case 'cat':
          this.drawCat(ctx, now);
          break;
        case 'dog':
          this.drawDog(ctx, now);
          break;
        case 'robot':
          this.drawRobot(ctx, now);
          break;
        case 'dragon':
          this.drawDragon(ctx, now);
          break;
        case 'duck':
          this.drawDuck(ctx, now);
          break;
        default:
          this.drawCat(ctx, now);
      }

      ctx.restore();

      // Draw state adornments (Lightbulb for thinking, mini laptop for typing)
      this.drawAdornments(ctx, drawX, drawY, now);
    }

    drawCat(ctx, now) {
      const breathe = Math.sin(now * 0.004) * 0.04;
      const tailWag = Math.sin(now * 0.006) * 0.35;
      const sleeping = this.state === 'SLEEP';

      // Drop shadow / Floor glow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
      ctx.beginPath();
      ctx.ellipse(0, 3, 18, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Tail
      ctx.save();
      ctx.translate(-14, -6);
      ctx.rotate(tailWag);
      ctx.strokeStyle = '#27272a';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(-12, -8, -14, -18);
      ctx.stroke();

      // Tail tip glow
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.arc(-14, -18, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Body
      ctx.save();
      ctx.scale(1, 1 + breathe);
      ctx.fillStyle = '#18181b';
      ctx.strokeStyle = '#3f3f46';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(-2, -10, 16, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Cyber belly stripe
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(-2, -10, 8, 0.4, Math.PI - 0.4);
      ctx.stroke();

      // Head
      ctx.translate(10, -18);
      ctx.fillStyle = '#27272a';
      ctx.strokeStyle = '#52525b';
      ctx.beginPath();
      ctx.ellipse(0, 0, 11, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Cat Ears
      ctx.fillStyle = '#18181b';
      ctx.strokeStyle = '#3f3f46';
      // Left ear
      ctx.beginPath();
      ctx.moveTo(-7, -7);
      ctx.lineTo(-10, -17);
      ctx.lineTo(-2, -10);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // Right ear
      ctx.beginPath();
      ctx.moveTo(2, -10);
      ctx.lineTo(8, -17);
      ctx.lineTo(8, -6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Glowing inner ears
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.moveTo(-6, -8);
      ctx.lineTo(-8, -14);
      ctx.lineTo(-3, -9);
      ctx.fill();

      // Cyber Collar with glowing bell
      ctx.strokeStyle = '#059669';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 6, 7, 0.2, Math.PI - 0.2);
      ctx.stroke();
      ctx.fillStyle = '#34d399';
      ctx.beginPath();
      ctx.arc(0, 10, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Eyes
      if (sleeping || this.isBlinking) {
        // Closed happy eyes
        ctx.strokeStyle = '#34d399';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(-3, -1, 3, 0.2, Math.PI - 0.2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(4, -1, 3, 0.2, Math.PI - 0.2);
        ctx.stroke();
      } else {
        // Glowing cyber eyes
        ctx.fillStyle = '#34d399';
        ctx.shadowColor = '#10b981';
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.ellipse(-3, -1, 2.2, 3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(4, -1, 2.2, 3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Pupil highlights
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(-2.5, -2, 1, 0, Math.PI * 2);
        ctx.arc(4.5, -2, 1, 0, Math.PI * 2);
        ctx.fill();
      }

      // Little nose
      ctx.fillStyle = '#f43f5e';
      ctx.beginPath();
      ctx.moveTo(0, 2);
      ctx.lineTo(-1.5, 3.5);
      ctx.lineTo(1.5, 3.5);
      ctx.closePath();
      ctx.fill();

      ctx.restore();

      // Paws
      ctx.fillStyle = '#27272a';
      ctx.beginPath();
      ctx.arc(6, 2, 3.5, 0, Math.PI * 2);
      ctx.arc(-8, 2, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }

    drawDog(ctx, now) {
      const breathe = Math.sin(now * 0.005) * 0.05;
      const tailWag = Math.sin(now * 0.012) * 0.6;
      const sleeping = this.state === 'SLEEP';

      // Drop shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
      ctx.beginPath();
      ctx.ellipse(0, 3, 20, 6, 0, 0, Math.PI * 2);
      ctx.fill();

      // Wagging tail
      ctx.save();
      ctx.translate(-15, -8);
      ctx.rotate(tailWag);
      ctx.fillStyle = '#d97706';
      ctx.beginPath();
      ctx.ellipse(-6, -4, 4, 10, -0.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Body (Golden Corgi/Shiba)
      ctx.save();
      ctx.scale(1, 1 + breathe);
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.ellipse(-2, -10, 17, 12, 0, 0, Math.PI * 2);
      ctx.fill();

      // White chest
      ctx.fillStyle = '#fef3c7';
      ctx.beginPath();
      ctx.ellipse(4, -8, 8, 9, 0, 0, Math.PI * 2);
      ctx.fill();

      // Head
      ctx.translate(11, -19);
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.ellipse(0, 0, 11, 11, 0, 0, Math.PI * 2);
      ctx.fill();

      // Snout
      ctx.fillStyle = '#fef3c7';
      ctx.beginPath();
      ctx.ellipse(5, 3, 6, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Nose
      ctx.fillStyle = '#18181b';
      ctx.beginPath();
      ctx.ellipse(8, 2, 2.5, 2, 0, 0, Math.PI * 2);
      ctx.fill();

      // Tongue (if active/not sleeping)
      if (!sleeping && this.state !== 'SLEEP') {
        ctx.fillStyle = '#fb7185';
        ctx.beginPath();
        ctx.ellipse(6, 7, 2.2, 4, 0.3, 0, Math.PI * 2);
        ctx.fill();
      }

      // Ears (Perked Shiba ears)
      ctx.fillStyle = '#d97706';
      ctx.beginPath();
      ctx.moveTo(-6, -7);
      ctx.lineTo(-9, -17);
      ctx.lineTo(-2, -10);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(1, -9);
      ctx.lineTo(6, -17);
      ctx.lineTo(7, -7);
      ctx.closePath();
      ctx.fill();

      // Eyes
      if (sleeping || this.isBlinking) {
        ctx.strokeStyle = '#78350f';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, -2, 3, 0.2, Math.PI - 0.2);
        ctx.stroke();
      } else {
        ctx.fillStyle = '#1c1917';
        ctx.beginPath();
        ctx.arc(0, -2, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0.8, -3, 1, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();

      // Paws
      ctx.fillStyle = '#fef3c7';
      ctx.beginPath();
      ctx.arc(6, 2, 4, 0, Math.PI * 2);
      ctx.arc(-7, 2, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    drawRobot(ctx, now) {
      const hover = Math.sin(now * 0.006) * 3;
      const sleeping = this.state === 'SLEEP';

      // Shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
      ctx.beginPath();
      ctx.ellipse(0, 5, 14, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.save();
      ctx.translate(0, hover);

      // Hover thruster spark
      ctx.fillStyle = '#38bdf8';
      ctx.shadowColor = '#0284c7';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(-4, 0);
      ctx.lineTo(4, 0);
      ctx.lineTo(0, 6 + Math.sin(now * 0.02) * 3);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;

      // Chassis Body
      ctx.fillStyle = '#27272a';
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(-12, -18, 24, 18, 6);
      ctx.fill();
      ctx.stroke();

      // Antenna
      ctx.strokeStyle = '#71717a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, -18);
      ctx.lineTo(0, -26);
      ctx.stroke();

      // Pulsing antenna bulb
      const pulse = 0.5 + Math.sin(now * 0.008) * 0.5;
      ctx.fillStyle = `rgba(56, 189, 248, ${0.4 + pulse * 0.6})`;
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(0, -28, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // CRT Face Screen
      ctx.fillStyle = '#09090b';
      ctx.beginPath();
      ctx.roundRect(-9, -15, 18, 11, 3);
      ctx.fill();

      // OLED Pixel Eyes
      ctx.fillStyle = '#38bdf8';
      ctx.shadowColor = '#0284c7';
      ctx.shadowBlur = 5;

      if (sleeping) {
        ctx.fillRect(-6, -10, 4, 1.5);
        ctx.fillRect(2, -10, 4, 1.5);
      } else if (this.isBlinking) {
        ctx.fillRect(-6, -10, 4, 1.5);
        ctx.fillRect(2, -10, 4, 1.5);
      } else if (this.state === 'THINKING') {
        // Gear / binary look
        ctx.font = '8px monospace';
        ctx.fillText('01', -5, -7);
      } else {
        // Cute square eyes [• •]
        ctx.fillRect(-6, -12, 3.5, 4);
        ctx.fillRect(2.5, -12, 3.5, 4);
      }
      ctx.shadowBlur = 0;

      ctx.restore();
    }

    drawDragon(ctx, now) {
      const flap = Math.sin(now * 0.01) * 0.5;
      const breathe = Math.sin(now * 0.004) * 0.04;

      // Drop shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
      ctx.beginPath();
      ctx.ellipse(0, 4, 16, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Wings
      ctx.save();
      ctx.translate(-4, -14);
      ctx.rotate(flap);
      ctx.fillStyle = '#8b5cf6';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-14, -16);
      ctx.lineTo(-4, -10);
      ctx.lineTo(-16, -6);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // Body (Purple Neon Drake)
      ctx.save();
      ctx.scale(1, 1 + breathe);
      ctx.fillStyle = '#6d28d9';
      ctx.beginPath();
      ctx.ellipse(-2, -9, 14, 11, 0, 0, Math.PI * 2);
      ctx.fill();

      // Spikes on back
      ctx.fillStyle = '#c084fc';
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(-12 + i * 5, -16);
        ctx.lineTo(-10 + i * 5, -20);
        ctx.lineTo(-8 + i * 5, -16);
        ctx.closePath();
        ctx.fill();
      }

      // Head
      ctx.translate(9, -16);
      ctx.fillStyle = '#7c3aed';
      ctx.beginPath();
      ctx.ellipse(0, 0, 10, 8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Horns
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.moveTo(-4, -6);
      ctx.lineTo(-8, -14);
      ctx.lineTo(-2, -8);
      ctx.closePath();
      ctx.fill();

      // Dragon Eye
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(2, -1, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#000000';
      ctx.fillRect(1.5, -2.5, 1, 3);

      ctx.restore();
    }

    drawDuck(ctx, now) {
      const bob = Math.sin(now * 0.006) * 2;
      const breathe = Math.sin(now * 0.005) * 0.04;

      // Shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
      ctx.beginPath();
      ctx.ellipse(0, 4, 18, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.save();
      ctx.translate(0, bob);

      // Body (Rubber Duck Yellow)
      ctx.scale(1, 1 + breathe);
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.ellipse(-2, -9, 15, 10, 0, 0, Math.PI * 2);
      ctx.fill();

      // Wing
      ctx.fillStyle = '#eab308';
      ctx.beginPath();
      ctx.ellipse(-4, -9, 8, 5, -0.2, 0, Math.PI * 2);
      ctx.fill();

      // Head
      ctx.translate(9, -16);
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.arc(0, 0, 9, 0, Math.PI * 2);
      ctx.fill();

      // Beak
      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.ellipse(9, 2, 5, 3, 0, 0, Math.PI * 2);
      ctx.fill();

      // Eye
      ctx.fillStyle = '#18181b';
      ctx.beginPath();
      ctx.arc(1, -2, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(1.6, -2.5, 0.8, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    drawAdornments(ctx, x, y, now) {
      // 1. TYPING: Mini holographic glowing laptop
      if (this.state === 'TYPING') {
        ctx.save();
        ctx.translate(x + this.facing * 16, y - 4);
        ctx.scale(this.facing, 1);

        // Laptop base
        ctx.fillStyle = '#3f3f46';
        ctx.beginPath();
        ctx.roundRect(-6, 0, 14, 3, 1);
        ctx.fill();

        // Screen
        ctx.fillStyle = '#10b981';
        ctx.shadowColor = '#34d399';
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.moveTo(6, 0);
        ctx.lineTo(8, -10);
        ctx.lineTo(-2, -10);
        ctx.lineTo(0, 0);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.restore();
      }

      // 2. THINKING: Lightbulb & spinning gears
      if (this.state === 'THINKING') {
        ctx.save();
        ctx.translate(x, y - 48);

        // Glowing lightbulb
        ctx.fillStyle = '#f59e0b';
        ctx.shadowColor = '#fbbf24';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(0, 0, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Base of bulb
        ctx.fillStyle = '#71717a';
        ctx.fillRect(-2, 6, 4, 3);

        ctx.restore();
      }
    }

    drawParticles(ctx) {
      for (const p of this.particles) {
        ctx.save();
        ctx.globalAlpha = p.alpha;

        if (p.type === 'heart') {
          ctx.fillStyle = '#f43f5e';
          ctx.font = `${p.size}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.fillText('❤️', p.x, p.y);
        } else if (p.type === 'zzz') {
          ctx.fillStyle = '#38bdf8';
          ctx.font = `bold ${p.size}px monospace`;
          ctx.fillText(p.text, p.x, p.y);
        } else if (p.type === 'code') {
          ctx.fillStyle = '#34d399';
          ctx.font = `bold ${p.size}px monospace`;
          ctx.fillText(p.text, p.x, p.y);
        } else if (p.type === 'gear') {
          ctx.fillStyle = '#fbbf24';
          ctx.font = `${p.size}px sans-serif`;
          ctx.fillText('⚙️', p.x, p.y);
        } else if (p.type === 'dust') {
          ctx.fillStyle = '#a1a1aa';
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      }
    }

    destroy() {
      this.stopLoop();
      if (this.canvas && this.canvas.parentNode) {
        this.canvas.parentNode.removeChild(this.canvas);
      }
    }
  }

  // Mount on global window
  global.CodexPetSuite = CodexPet;

  // Auto initialize when DOM is ready
  function autoMount() {
    if (!global.codexPet) {
      global.codexPet = new CodexPet();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoMount);
  } else {
    autoMount();
  }

})(typeof window !== 'undefined' ? window : this);
