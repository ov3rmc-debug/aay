// ==========================================================
// MARKDOWN RENDERING
// ==========================================================

marked.setOptions({
  breaks: true,
  highlight: function (code, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try { return hljs.highlight(code, { language: lang }).value; } catch (_) { /* noop */ }
    }
    try { return hljs.highlightAuto(code).value; } catch (_) { return escapeHtml(code); }
  }
});

const copySvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>`;
const checkSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>`;

// Registry so we don't need to stuff raw code text into DOM attributes
// (safer for very long / quote-heavy snippets).
let codeBlockRegistry = {};
let codeBlockCounter = 0;

function formatMarkdownForUI(text) {
  let html;
  try {
    html = marked.parse(text || "");
  } catch (_) {
    html = `<p>${escapeHtml(text || "")}</p>`;
  }

  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = html;

  tempDiv.querySelectorAll("pre").forEach((pre) => {
    const code = pre.querySelector("code");
    if (!code) return;
    const lang = (code.className || "").replace("language-", "").trim() || "text";
    const codeText = code.innerText;

    const id = `cb_${++codeBlockCounter}`;
    codeBlockRegistry[id] = codeText;

    const wrapper = document.createElement("div");
    wrapper.className = "code-wrap";

    const header = document.createElement("div");
    header.className = "code-header";
    header.innerHTML = `
      <span>${escapeHtml(lang)}</span>
      <button type="button" class="code-copy-btn" data-code-id="${id}">
        ${copySvg}<span class="copy-label">Salin</span>
      </button>`;

    pre.parentNode.insertBefore(wrapper, pre);
    wrapper.appendChild(header);
    wrapper.appendChild(pre);
  });

  return tempDiv.innerHTML;
}

// Event delegation for code-copy buttons (works for dynamically added content)
document.addEventListener("click", async (e) => {
  const btn = e.target.closest(".code-copy-btn");
  if (!btn) return;
  const id = btn.getAttribute("data-code-id");
  const code = codeBlockRegistry[id];
  if (code === undefined) return;

  const ok = await copyText(code);
  const label = btn.querySelector(".copy-label");
  if (ok && label) {
    const original = btn.innerHTML;
    btn.innerHTML = `${checkSvg}<span class="copy-label">Disalin</span>`;
    setTimeout(() => { btn.innerHTML = original; }, 1800);
  } else if (!ok) {
    showToast("Gagal menyalin kode", "error");
  }
});
