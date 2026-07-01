// ==========================================================
// STATE & LOCAL STORAGE
// ==========================================================

const Store = {
  sessions: [],
  currentSessionId: null,

  load() {
    try {
      this.sessions = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.sessions)) || [];
    } catch (_) {
      this.sessions = [];
    }
    this.currentSessionId = localStorage.getItem(CONFIG.STORAGE_KEYS.currentId);
  },

  persist() {
    try {
      localStorage.setItem(CONFIG.STORAGE_KEYS.sessions, JSON.stringify(this.sessions));
      localStorage.setItem(CONFIG.STORAGE_KEYS.currentId, this.currentSessionId || "");
    } catch (err) {
      console.error("Gagal menyimpan ke localStorage", err);
      showToast("Penyimpanan lokal penuh atau tidak tersedia", "error");
    }
  },

  getCurrent() {
    return this.sessions.find((s) => s.id === this.currentSessionId) || null;
  },

  createSession() {
    const session = {
      id: uid("session"),
      title: "Chat Baru",
      messages: [{ role: "system", content: CONFIG.DEFAULT_SYSTEM_PROMPT }],
      updatedAt: Date.now()
    };
    this.sessions.unshift(session);
    this.currentSessionId = session.id;
    this.persist();
    return session;
  },

  deleteSession(id) {
    this.sessions = this.sessions.filter((s) => s.id !== id);
    if (this.currentSessionId === id) {
      this.currentSessionId = this.sessions[0]?.id || null;
    }
    this.persist();
  },

  renameSession(id, title) {
    const session = this.sessions.find((s) => s.id === id);
    if (session && title.trim()) {
      session.title = title.trim().slice(0, 60);
      this.persist();
    }
  },

  updateTitleFromFirstMessage(session, text) {
    if (session && session.title === "Chat Baru") {
      let title = text.split(" ").slice(0, 6).join(" ");
      if (title.length > 42) title = title.substring(0, 42) + "…";
      session.title = title || "Chat Baru";
    }
  },

  clearAll() {
    localStorage.removeItem(CONFIG.STORAGE_KEYS.sessions);
    localStorage.removeItem(CONFIG.STORAGE_KEYS.currentId);
    this.sessions = [];
    this.currentSessionId = null;
  }
};
