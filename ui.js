// ==========================================================
// UI RENDERING
// ==========================================================

const el = {
  sidebar: document.getElementById("sidebar"),
  overlay: document.getElementById("mobile-overlay"),
  btnOpenSidebar: document.getElementById("btn-open-sidebar"),
  btnCloseSidebar: document.getElementById("btn-close-sidebar"),
  btnNewChat: document.getElementById("btn-new-chat"),
  btnClearAll: document.getElementById("btn-clear-all"),
  searchInput: document.getElementById("search-input"),
  historyList: document.getElementById("chat-history-list"),
  historyEmpty: document.getElementById("history-empty"),
  chatContainer: document.getElementById("chat-container"),
  messagesWrapper: document.getElementById("messages-wrapper"),
  welcomeScreen: document.getElementById("welcome-screen"),
  suggestions: document.getElementById("suggestions"),
  scrollFab: document.getElementById("scroll-to-bottom"),
  modelSelector: document.getElementById("model-selector"),
  apiStatus: document.getElementById("api-status"),
  chatForm: document.getElementById("chat-form"),
  chatInput: document.getElementById("chat-input"),
  submitBtn: document.getElementById("submit-btn"),
  stopBtnContainer: document.getElementById("stop-btn-container"),
  btnStop: document.getElementById("btn-stop")
};

const userSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
const botSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>`;
const historyIconSvg = `<svg class="h-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`;
const trashIconSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4h8v2m-9 0 1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14"/></svg>`;

// ---------------- Sidebar toggle ----------------
function openSidebar() {
  el.sidebar.classList.add("open");
  el.overlay.hidden = false;
  requestAnimationFrame(() => el.overlay.classList.add("show"));
}
function closeSidebar() {
  el.sidebar.classList.remove("open");
  el.overlay.classList.remove("show");
  setTimeout(() => { el.overlay.hidden = true; }, 250);
}
function toggleSidebar() {
  el.sidebar.classList.contains("open") ? closeSidebar() : openSidebar();
}

// ---------------- Sidebar / history list ----------------
function renderSidebar(filter = "") {
  el.historyList.innerHTML = "";
  const q = filter.trim().toLowerCase();
  const list = q ? Store.sessions.filter((s) => s.title.toLowerCase().includes(q)) : Store.sessions;

  el.historyEmpty.hidden = list.length > 0;

  list.forEach((session) => {
    const isActive = session.id === Store.currentSessionId;
    const item = document.createElement("div");
    item.className = `history-item${isActive ? " active" : ""}`;
    item.innerHTML = `
      ${historyIconSvg}
      <input class="history-title" value="${escapeHtml(session.title)}" readonly aria-label="Judul chat">
      <button class="history-del" aria-label="Hapus chat">${trashIconSvg}</button>
    `;

    const titleInput = item.querySelector(".history-title");
    item.addEventListener("click", (e) => {
      if (e.target === titleInput && !titleInput.readOnly) return;
      switchSession(session.id);
    });
    titleInput.addEventListener("dblclick", (e) => {
      e.stopPropagation();
      titleInput.readOnly = false;
      titleInput.focus();
      titleInput.select();
    });
    titleInput.addEventListener("blur", () => {
      titleInput.readOnly = true;
      Store.renameSession(session.id, titleInput.value || "Chat Baru");
      renderSidebar(el.searchInput.value);
    });
    titleInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); titleInput.blur(); }
      if (e.key === "Escape") { titleInput.value = session.title; titleInput.blur(); }
    });

    item.querySelector(".history-del").addEventListener("click", (e) => {
      e.stopPropagation();
      handleDeleteSession(session.id);
    });

    el.historyList.appendChild(item);
  });
}

// ---------------- Welcome suggestions ----------------
function renderSuggestions() {
  el.suggestions.innerHTML = "";
  CONFIG.SUGGESTIONS.forEach((s) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "suggestion-chip";
    chip.textContent = s;
    chip.addEventListener("click", () => {
      el.chatInput.value = s;
      el.chatInput.dispatchEvent(new Event("input"));
      el.chatInput.focus();
    });
    el.suggestions.appendChild(chip);
  });
}

// ---------------- Model selector ----------------
function populateModelSelector(models) {
  el.modelSelector.innerHTML = "";
  if (!models || models.length === 0) {
    el.modelSelector.innerHTML = `
      <option value="cutad-agent">Agent (Default)</option>
      <option value="cutad-agent-pro">Agent Pro</option>`;
  } else {
    models.forEach((model) => {
      const opt = document.createElement("option");
      opt.value = model.id;
      opt.textContent = CONFIG.MODEL_LABELS[model.id] || model.id;
      el.modelSelector.appendChild(opt);
    });
  }

  const savedModel = localStorage.getItem(CONFIG.STORAGE_KEYS.model);
  if (savedModel && el.modelSelector.querySelector(`option[value="${CSS.escape(savedModel)}"]`)) {
    el.modelSelector.value = savedModel;
  }
}

function setApiStatus(status) {
  el.apiStatus.className = `status-dot status-${status}`;
  el.apiStatus.title = status === "online" ? "Terhubung ke server" : status === "offline" ? "Tidak dapat terhubung ke server" : "Memeriksa koneksi…";
}

// ---------------- Chat rendering ----------------
function renderCurrentChat() {
  const session = Store.getCurrent();
  el.messagesWrapper.innerHTML = "";
  if (!session) return;

  const displayMessages = session.messages.filter((m) => m.role !== "system");
  if (displayMessages.length === 0) {
    el.messagesWrapper.appendChild(el.welcomeScreen);
    el.welcomeScreen.hidden = false;
  } else {
    el.welcomeScreen.hidden = true;
    displayMessages.forEach((msg) => appendMessageUI(msg.role, msg.content, false));
    scrollToBottom(true);
  }
  updateScrollFabVisibility();
}

function scrollToBottom(force = false) {
  if (force || isNearBottom(el.chatContainer, 200)) {
    el.chatContainer.scrollTop = el.chatContainer.scrollHeight;
  }
}

function updateScrollFabVisibility() {
  const shouldShow = el.chatContainer.scrollHeight - el.chatContainer.scrollTop - el.chatContainer.clientHeight > 200;
  el.scrollFab.hidden = !shouldShow;
}

function appendMessageUI(role, content, animate = true) {
  el.welcomeScreen.hidden = true;
  const isUser = role === "user";

  const row = document.createElement("div");
  row.className = `msg-row ${isUser ? "user" : "bot"}${animate ? " msg-enter" : ""}`;

  const avatar = document.createElement("div");
  avatar.className = `avatar ${isUser ? "user" : "bot"}`;
  avatar.innerHTML = isUser ? userSvg : botSvg;

  const contentBox = document.createElement("div");
  if (isUser) {
    contentBox.className = "bubble-user";
    contentBox.textContent = content;
  } else {
    contentBox.className = "bubble-bot";
    const inner = document.createElement("div");
    inner.className = "markdown-body";
    inner.innerHTML = content === ""
      ? `<div class="typing-dots"><span></span><span></span><span></span></div>`
      : formatMarkdownForUI(content);
    contentBox.appendChild(inner);
  }

  if (isUser) {
    row.appendChild(contentBox);
    row.appendChild(avatar);
  } else {
    row.appendChild(avatar);
    row.appendChild(contentBox);
  }

  el.messagesWrapper.appendChild(row);
  scrollToBottom(true);
  return { row, contentBox, markdownEl: isUser ? null : contentBox.querySelector(".markdown-body") };
}

function setComposerState(loading) {
  el.chatInput.disabled = loading;
  const sendIcon = document.getElementById("send-icon");
  const loadIcon = document.getElementById("loading-icon");

  if (loading) {
    sendIcon.hidden = true;
    loadIcon.hidden = false;
    el.submitBtn.disabled = true;
    el.stopBtnContainer.hidden = false;
  } else {
    sendIcon.hidden = false;
    loadIcon.hidden = true;
    el.stopBtnContainer.hidden = true;
    updateSendButtonState();
    el.chatInput.focus();
  }
}

function updateSendButtonState() {
  el.submitBtn.disabled = el.chatInput.value.trim().length === 0;
}

// ---------------- Wiring: sidebar/global controls ----------------
el.btnOpenSidebar.addEventListener("click", openSidebar);
el.btnCloseSidebar.addEventListener("click", closeSidebar);
el.overlay.addEventListener("click", closeSidebar);

el.searchInput.addEventListener("input", debounce((e) => renderSidebar(e.target.value), 120));

el.chatContainer.addEventListener("scroll", debounce(updateScrollFabVisibility, 80));
el.scrollFab.addEventListener("click", () => scrollToBottom(true));

window.addEventListener("resize", () => {
  if (window.innerWidth >= 1024) closeSidebar();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && el.sidebar.classList.contains("open")) closeSidebar();
  if ((e.ctrlKey || e.metaKey) && e.key === "/") {
    e.preventDefault();
    handleNewChat();
  }
});
