// ==========================================================
// BOOTSTRAP
// ==========================================================

function initTextarea() {
  el.chatInput.addEventListener("input", () => {
    el.chatInput.style.height = "auto";
    el.chatInput.style.height = `${el.chatInput.scrollHeight}px`;
    updateSendButtonState();
  });

  el.chatInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!isLoading) el.chatForm.requestSubmit();
    }
  });
}

function initApp() {
  Store.load();
  if (!Store.currentSessionId || !Store.getCurrent()) {
    if (Store.sessions.length > 0) {
      Store.currentSessionId = Store.sessions[0].id;
    } else {
      Store.createSession();
    }
  }

  renderSuggestions();
  renderSidebar();
  renderCurrentChat();
  initTextarea();
  updateSendButtonState();
  fetchModels();
}

document.addEventListener("DOMContentLoaded", initApp);
