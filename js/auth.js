// Authentication & Security Manager for Claude & Antigravity Free LLM Hub
class AuthManager {
  constructor() {
    this.tokenKey = "freellm_hub_token";
    this.token = localStorage.getItem(this.tokenKey) || "";
    this.authRequired = false;
    this.isAuthenticated = false;
    this.setupFetchInterceptor();
  }

  setupFetchInterceptor() {
    const originalFetch = window.fetch;
    const self = this;
    window.fetch = async function (url, options = {}) {
      options.headers = options.headers || {};
      if (typeof options.headers.set === "function") {
        if (self.token) options.headers.set("X-Hub-Token", self.token);
      } else {
        if (self.token) options.headers["X-Hub-Token"] = self.token;
      }

      const res = await originalFetch(url, options);

      // If backend returns 401 Unauthorized on an API call, trigger lock screen
      if (res.status === 401 && typeof url === "string" && url.startsWith("/api/") && !url.includes("/api/auth/login")) {
        self.isAuthenticated = false;
        self.showLockScreen("Session expired or password required.");
      }

      return res;
    };
  }

  async init() {
    try {
      const res = await fetch("/api/auth/status");
      const data = await res.json();
      this.authRequired = data.auth_required;
      this.isAuthenticated = data.authenticated;

      if (this.authRequired && !this.isAuthenticated) {
        this.showLockScreen();
      } else {
        this.hideLockScreen();
      }
    } catch (e) {
      console.warn("Auth check warning:", e);
    }
  }

  showLockScreen(errorMsg = "") {
    const lockScreen = document.getElementById("hub-lock-screen");
    const pwdInput = document.getElementById("hub-password-input");
    const errBox = document.getElementById("hub-lock-error");

    if (errBox) {
      if (errorMsg) {
        errBox.textContent = errorMsg;
        errBox.classList.remove("hidden");
      } else {
        errBox.classList.add("hidden");
      }
    }

    if (lockScreen) {
      lockScreen.classList.remove("hidden");
      if (pwdInput) {
        pwdInput.value = "";
        setTimeout(() => pwdInput.focus(), 100);
      }
    }
  }

  hideLockScreen() {
    const lockScreen = document.getElementById("hub-lock-screen");
    if (lockScreen) {
      lockScreen.classList.add("hidden");
    }
  }

  async login(password) {
    const errBox = document.getElementById("hub-lock-error");
    const btn = document.getElementById("hub-unlock-btn");

    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<span class="animate-spin inline-block w-4 h-4 border-2 border-stone-900 border-t-transparent rounded-full mr-2"></span>Unlocking...`;
    }

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: password.trim() })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        this.token = data.token;
        localStorage.setItem(this.tokenKey, this.token);
        this.isAuthenticated = true;
        this.hideLockScreen();

        // Refresh app state
        if (window.modelSelector && window.modelSelector.init) {
          window.modelSelector.init();
        }
        if (window.app && window.app.loadChats) {
          window.app.loadChats();
        }
        return true;
      } else {
        if (errBox) {
          errBox.textContent = data.detail || data.message || "Incorrect Hub password. Try again.";
          errBox.classList.remove("hidden");
        }
        return false;
      }
    } catch (err) {
      if (errBox) {
        errBox.textContent = "Network error while validating password.";
        errBox.classList.remove("hidden");
      }
      return false;
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `<span>Unlock Hub ➔</span>`;
      }
    }
  }

  lockHub() {
    this.token = "";
    localStorage.removeItem(this.tokenKey);
    this.isAuthenticated = false;
    this.showLockScreen("Hub locked. Enter password to re-open.");
  }

  async changePassword(currentPassword, newPassword) {
    const res = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        current_password: currentPassword,
        new_password: newPassword
      })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      this.token = data.token;
      localStorage.setItem(this.tokenKey, this.token);
      return { success: true, message: data.message };
    } else {
      return { success: false, message: data.detail || data.message || "Failed to update password." };
    }
  }
}

window.authManager = new AuthManager();
document.addEventListener("DOMContentLoaded", () => {
  window.authManager.init();
});
