# FreeLLM Hub — Claude & Antigravity Multi-Model Suite

> **A 100% Free, Serverless Web LLM Hub** with Claude-style Side-by-Side Artifacts, Antigravity Model Selector, DeepThink (REA Cognitive Protocol), and Turbo Speed (~450 tok/s).

[![Deploy to GitHub Pages](https://github.com/Omi811/freellm-hub/actions/workflows/deploy.yml/badge.svg)](https://github.com/Omi811/freellm-hub/actions)

---

## 🌟 Highlights & Capabilities

- 🧠 **42+ Frontier Models**: DeepSeek R1 (671B Full MoE), Moonshot Kimi (K2.5, Thinking, Code), Zhipu GLM 5.3 Flash & Prime, IBM Granite 4.2 8B, Alibaba QwQ 32B, Qwen 2.5 Coder 32B, and Meta Llama 3.1 405B.
- 🎨 **Side-by-Side Artifacts Canvas**: Real-time sandboxed preview for interactive HTML5 games, web applications, SVG graphics, and syntax-highlighted code.
- ⚡ **Turbo Mode (`Ctrl+T`)**: Force-routes inference through Groq LPU hardware acceleration (~450+ tokens/sec).
- 🧠 **DeepThink Mode (`Ctrl+D`)**: Injects the REA (Reverse Engineer Anything) evidence-driven cognitive protocol with collapsible `<think>` reasoning traces.
- ⚔️ **Multi-Model Arena**: Benchmark up to 3 models simultaneously side-by-side on the exact same prompt.
- 🔒 **100% Serverless & Private**: Runs directly inside your browser! API keys are stored strictly in your browser's `localStorage`—no backend server required, zero secrets ever touch GitHub!
- 🌉 **Hybrid Bridge Option**: Can optionally connect to your self-hosted local backend (FastAPI/Ollama) to unlock local air-gapped models and autonomous file-editing agents.

---

## 🚀 Publish to GitHub Pages in 3 Simple Steps

### Step 1: Create a New GitHub Repository
1. Go to [github.com/new](https://github.com/new).
2. Name the repository: `freellm-hub` (or your preferred name).
3. Set visibility to **Public**.
4. Click **Create repository**.

### Step 2: Push This Folder to GitHub
Open your terminal in this directory and run:

```bash
git init
git add .
git commit -m "Initial commit: FreeLLM Hub on GitHub Pages"
git branch -M main
git remote add origin https://github.com/Omi811/freellm-hub.git
git push -u origin main
```

### Step 3: Enable GitHub Pages
1. On GitHub, go to your repository **Settings** → **Pages**.
2. Under **Build and deployment** → **Source**, select **GitHub Actions**.
3. That's it! GitHub will automatically run the deployment workflow and give you your permanent live URL:
   ```text
   https://omi811.github.io/freellm-hub/
   ```

---

## 🔑 Adding Your API Keys (Zero Cost)

1. Open your live site `https://omi811.github.io/freellm-hub/`.
2. Click the **API Keys & Config** button in the sidebar or top bar.
3. Paste your [OpenRouter API Key](https://openrouter.ai/keys) or [Groq Key](https://console.groq.com/keys).
4. Click **Save Settings** — your keys are saved securely in your browser's local storage and you can chat with any model instantly!

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `Ctrl + K` / `Cmd + K` | Start a New Conversation |
| `Ctrl + T` / `Cmd + T` | Toggle ⚡ Turbo Mode |
| `Ctrl + D` / `Cmd + D` | Toggle 🧠 DeepThink (REA) Mode |
| `Shift + Enter` | Insert Newline |
| `Enter` | Send Message |
| `Esc` | Close Modals / Artifacts Canvas |

---

## 📄 License
MIT License. Created with Antigravity 2026.
