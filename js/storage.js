/**
 * FreeLLM Hub — Robust Storage & Security Layer
 * - IndexedDB for unlimited chat & Artifact storage (bypasses 5MB localStorage limit)
 * - Automatic migration from legacy localStorage
 * - One-click JSON backup export and import
 * - Optional Web Crypto API (AES-GCM) encryption for stored API keys
 */

class HubStorage {
  constructor() {
    this.dbName = "FreeLLMHubDB";
    this.dbVersion = 1;
    this.db = null;
    this.initPromise = null;
  }

  async init() {
    if (this.initPromise) return this.initPromise;
    this.initPromise = new Promise((resolve, reject) => {
      if (!window.indexedDB) {
        console.warn("IndexedDB not supported, falling back to localStorage");
        resolve(false);
        return;
      }
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains("chats")) {
          const store = db.createObjectStore("chats", { keyPath: "id" });
          store.createIndex("updatedAt", "updatedAt", { unique: false });
        }
        if (!db.objectStoreNames.contains("arena_votes")) {
          db.createObjectStore("arena_votes", { keyPath: "id", autoIncrement: true });
        }
        if (!db.objectStoreNames.contains("meta")) {
          db.createObjectStore("meta", { keyPath: "key" });
        }
      };

      request.onsuccess = async (e) => {
        this.db = e.target.result;
        await this.autoMigrateFromLocalStorage();
        resolve(true);
      };

      request.onerror = (e) => {
        console.error("IndexedDB open error:", e);
        resolve(false);
      };
    });
    return this.initPromise;
  }

  async autoMigrateFromLocalStorage() {
    try {
      const raw = localStorage.getItem("freellm_chats");
      if (raw) {
        const legacyChats = JSON.parse(raw);
        if (Array.isArray(legacyChats) && legacyChats.length > 0) {
          const existing = await this.getAllChats();
          if (existing.length === 0) {
            console.log(`Migrating ${legacyChats.length} chats from localStorage to IndexedDB...`);
            for (const chat of legacyChats) {
              await this.saveChat(chat);
            }
          }
        }
      }
    } catch (err) {
      console.warn("Auto-migration skipped or failed:", err);
    }
  }

  async getAllChats() {
    if (!this.db) {
      try {
        return JSON.parse(localStorage.getItem("freellm_chats") || "[]");
      } catch (e) {
        return [];
      }
    }
    return new Promise((resolve) => {
      const tx = this.db.transaction("chats", "readonly");
      const store = tx.objectStore("chats");
      const req = store.getAll();
      req.onsuccess = () => {
        const chats = req.result || [];
        chats.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
        resolve(chats);
      };
      req.onerror = () => resolve([]);
    });
  }

  async saveChat(chat) {
    if (!chat || !chat.id) return;
    if (!chat.updatedAt) chat.updatedAt = Date.now();

    if (!this.db) {
      const chats = await this.getAllChats();
      const idx = chats.findIndex(c => c.id === chat.id);
      if (idx > -1) chats[idx] = chat;
      else chats.unshift(chat);
      try {
        localStorage.setItem("freellm_chats", JSON.stringify(chats));
      } catch (e) {
        console.error("localStorage full:", e);
      }
      return;
    }

    return new Promise((resolve) => {
      const tx = this.db.transaction("chats", "readwrite");
      const store = tx.objectStore("chats");
      store.put(chat);
      tx.oncomplete = () => resolve(true);
      tx.onerror = (e) => {
        console.error("Failed to save chat to IndexedDB:", e);
        resolve(false);
      };
    });
  }

  async deleteChat(chatId) {
    if (!this.db) {
      const chats = (await this.getAllChats()).filter(c => c.id !== chatId);
      localStorage.setItem("freellm_chats", JSON.stringify(chats));
      return;
    }
    return new Promise((resolve) => {
      const tx = this.db.transaction("chats", "readwrite");
      const store = tx.objectStore("chats");
      store.delete(chatId);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  }

  async clearAllChats() {
    if (!this.db) {
      localStorage.removeItem("freellm_chats");
      return;
    }
    return new Promise((resolve) => {
      const tx = this.db.transaction("chats", "readwrite");
      tx.objectStore("chats").clear();
      tx.oncomplete = () => resolve(true);
    });
  }

  // --- Export & Import Backup (.json) ---
  async exportBackup() {
    const chats = await this.getAllChats();
    const backupData = {
      version: "2.0",
      exportedAt: new Date().toISOString(),
      chats: chats,
      settings: {
        systemPrompt: localStorage.getItem("freellm_system_prompt") || "",
        temperature: localStorage.getItem("freellm_temperature") || "0.7",
        backendUrl: localStorage.getItem("freellm_backend_url") || "",
        zeroRetention: localStorage.getItem("freellm_zero_retention") === "true",
        intentRouting: localStorage.getItem("freellm_intent_routing") !== "false"
      }
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `freellm-hub-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async importBackup(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      if (!data || !Array.isArray(data.chats)) {
        throw new Error("Invalid backup format: 'chats' array missing");
      }
      for (const chat of data.chats) {
        await this.saveChat(chat);
      }
      if (data.settings) {
        if (data.settings.systemPrompt !== undefined) localStorage.setItem("freellm_system_prompt", data.settings.systemPrompt);
        if (data.settings.temperature !== undefined) localStorage.setItem("freellm_temperature", data.settings.temperature);
      }
      return { success: true, count: data.chats.length };
    } catch (err) {
      console.error("Backup import failed:", err);
      return { success: false, error: err.message };
    }
  }

  // --- Web Crypto API Key Encryption ---
  async deriveKey(passphrase, salt) {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      enc.encode(passphrase),
      { name: "PBKDF2" },
      false,
      ["deriveKey"]
    );
    return crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: salt,
        iterations: 100000,
        hash: "SHA-256"
      },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );
  }

  async encryptApiKey(plainKey, passphrase) {
    if (!plainKey || !passphrase || !window.crypto?.subtle) return plainKey;
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await this.deriveKey(passphrase, salt);
    const enc = new TextEncoder();
    const cipher = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: iv },
      key,
      enc.encode(plainKey)
    );
    const payload = {
      salt: Array.from(salt),
      iv: Array.from(iv),
      cipher: Array.from(new Uint8Array(cipher))
    };
    return "enc:" + btoa(JSON.stringify(payload));
  }

  async decryptApiKey(encryptedPayload, passphrase) {
    if (!encryptedPayload || !encryptedPayload.startsWith("enc:") || !passphrase || !window.crypto?.subtle) {
      return encryptedPayload;
    }
    try {
      const json = atob(encryptedPayload.slice(4));
      const payload = JSON.parse(json);
      const salt = new Uint8Array(payload.salt);
      const iv = new Uint8Array(payload.iv);
      const cipher = new Uint8Array(payload.cipher);
      const key = await this.deriveKey(passphrase, salt);
      const decrypted = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: iv },
        key,
        cipher
      );
      return new TextDecoder().decode(decrypted);
    } catch (e) {
      console.warn("Failed to decrypt API key:", e);
      return null;
    }
  }

  // --- Personal Arena Win-Rate Tracker ---
  async recordArenaVote(modelA, modelB, winner) {
    if (!this.db) return;
    const vote = {
      modelA,
      modelB,
      winner, // 'A', 'B', or 'tie'
      timestamp: Date.now()
    };
    const tx = this.db.transaction("arena_votes", "readwrite");
    tx.objectStore("arena_votes").add(vote);
  }

  async getArenaLeaderboard() {
    if (!this.db) return {};
    return new Promise((resolve) => {
      const tx = this.db.transaction("arena_votes", "readonly");
      const req = tx.objectStore("arena_votes").getAll();
      req.onsuccess = () => {
        const votes = req.result || [];
        const stats = {};
        votes.forEach(v => {
          if (!stats[v.modelA]) stats[v.modelA] = { wins: 0, losses: 0, ties: 0 };
          if (!stats[v.modelB]) stats[v.modelB] = { wins: 0, losses: 0, ties: 0 };
          if (v.winner === 'A') {
            stats[v.modelA].wins++;
            stats[v.modelB].losses++;
          } else if (v.winner === 'B') {
            stats[v.modelB].wins++;
            stats[v.modelA].losses++;
          } else {
            stats[v.modelA].ties++;
            stats[v.modelB].ties++;
          }
        });
        resolve(stats);
      };
      req.onerror = () => resolve({});
    });
  }
}

window.hubStorage = new HubStorage();
