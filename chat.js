// ==========================================================
// CHAT / SESSION CONTROLLERS
// ==========================================================

let isLoading = false;
let abortController = null;

function handleNewChat() {
  Store.createSession();
  renderSidebar(el.searchInput.value);
  renderCurrentChat();
  if (window.innerWidth < 1024) closeSidebar();
  el.chatInput.focus();
}

function switchSession(id) {
  if (isLoading) {
    showToast("Tunggu hingga respons selesai sebelum berpindah chat");
    return;
  }
  Store.currentSessionId = id;
  Store.persist();
  renderSidebar(el.searchInput.value);
  renderCurrentChat();
  if (window.innerWidth < 1024) closeSidebar();
}

function handleDeleteSession(id) {
  if (isLoading && id === Store.currentSessionId) {
    showToast("Tidak bisa menghapus chat yang sedang berjalan");
    return;
  }
  if (!confirm("Hapus percakapan ini? Tindakan ini tidak bisa dibatalkan.")) return;

  Store.deleteSession(id);
  if (!Store.getCurrent()) Store.createSession();
  renderSidebar(el.searchInput.value);
  renderCurrentChat();
}

function handleClearAll() {
  if (isLoading) {
    showToast("Tunggu hingga respons selesai");
    return;
  }
  if (!confirm("Hapus SEMUA riwayat percakapan di perangkat ini?")) return;
  Store.clearAll();
  Store.createSession();
  renderSidebar();
  renderCurrentChat();
}

// ---------------- API: models & connectivity ----------------
async function fetchModels() {
  try {
    const res = await fetch(`${CONFIG.BASE_URL}/models`, {
      headers: { Authorization: `Bearer ${CONFIG.API_KEY}` }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    populateModelSelector(data.data || []);
    setApiStatus("online");
  } catch (err) {
    console.error("Gagal memuat daftar model", err);
    populateModelSelector(null);
    setApiStatus("offline");
    showToast("Tidak dapat memuat daftar model. Memakai default.", "error");
  }
}

el.modelSelector.addEventListener("change", (e) => {
  localStorage.setItem(CONFIG.STORAGE_KEYS.model, e.target.value);
});

// ---------------- Sending messages / streaming ----------------
function stopGeneration() {
  if (abortController) {
    abortController.abort();
    abortController = null;
  }
}

async function sendMessage(text) {
  const session = Store.getCurrent();
  if (!session) return;

  session.messages.push({ role: "user", content: text });
  Store.updateTitleFromFirstMessage(session, text);
  Store.persist();
  renderSidebar(el.searchInput.value);

  appendMessageUI("user", text);
  el.chatInput.value = "";
  el.chatInput.style.height = "auto";
  updateSendButtonState();

  isLoading = true;
  setComposerState(true);

  const { markdownEl } = appendMessageUI("assistant", "");
  abortController = new AbortController();
  const model = el.modelSelector.value;
  let fullResponse = "";

  // Manual, cancelable throttle so we can guarantee the final render
  // is never clobbered by a stale trailing update after the stream ends.
  let renderTimer = null;
  let lastRenderAt = 0;
  function renderStreaming() {
    const now = Date.now();
    const doRender = () => {
      lastRenderAt = Date.now();
      markdownEl.innerHTML = formatMarkdownForUI(fullResponse) + '<span class="cursor-blink"></span>';
      scrollToBottom();
    };
    if (now - lastRenderAt >= 90) {
      clearTimeout(renderTimer);
      doRender();
    } else {
      clearTimeout(renderTimer);
      renderTimer = setTimeout(doRender, 90);
    }
  }
  function cancelPendingRender() {
    clearTimeout(renderTimer);
  }

  try {
    const response = await fetch(`${CONFIG.BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${CONFIG.API_KEY}`
      },
      body: JSON.stringify({
        model,
        messages: session.messages,
        stream: true,
        temperature: 0.7
      }),
      signal: abortController.signal
    });

    if (!response.ok) {
      if (response.status === 401) throw new Error("API key tidak valid.");
      if (response.status === 429) throw new Error("Terlalu banyak permintaan. Tunggu sebentar lalu coba lagi.");
      throw new Error(`Server error (${response.status})`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop(); // keep any partial line for next chunk

      for (const line of lines) {
        if (!line.startsWith("data: ") || line === "data: [DONE]") continue;
        try {
          const data = JSON.parse(line.slice(6));
          const textChunk = data.choices?.[0]?.delta?.content || "";
          if (textChunk) {
            fullResponse += textChunk;
            renderStreaming();
          }
        } catch (_) {
          // Skip unparsable chunk (partial JSON, keep-alive, etc.)
        }
      }
    }

    cancelPendingRender();
    markdownEl.innerHTML = formatMarkdownForUI(fullResponse);
    setApiStatus("online");
  } catch (error) {
    cancelPendingRender();
    if (error.name === "AbortError") {
      markdownEl.innerHTML = formatMarkdownForUI(fullResponse) +
        '<span class="stopped-note">— Dihentikan —</span>';
    } else {
      console.error(error);
      setApiStatus("offline");
      if (fullResponse) {
        markdownEl.innerHTML = formatMarkdownForUI(fullResponse) +
          `<div class="error-note">Terputus: ${escapeHtml(error.message)}</div>`;
      } else {
        markdownEl.innerHTML = `<div class="error-note">Maaf, terjadi kesalahan: ${escapeHtml(error.message)}</div>`;
      }
      showToast(error.message, "error");
    }
  } finally {
    if (fullResponse) {
      session.messages.push({ role: "assistant", content: fullResponse });
      session.updatedAt = Date.now();
      Store.persist();
    }
    isLoading = false;
    setComposerState(false);
    scrollToBottom(true);
  }
}

el.chatForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = el.chatInput.value.trim();
  if (!text || isLoading) return;
  sendMessage(text);
});

el.btnStop.addEventListener("click", stopGeneration);
el.btnNewChat.addEventListener("click", handleNewChat);
el.btnClearAll.addEventListener("click", handleClearAll);
