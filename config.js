// ==========================================================
// KONFIGURASI
// ==========================================================
// PERHATIAN KEAMANAN:
// Karena situs ini di-hosting sebagai static site (GitHub Pages),
// API_KEY di bawah ini akan terlihat oleh siapa saja yang membuka
// "view source" atau tab Network di browser. Untuk penggunaan
// publik/produksi, sebaiknya request diarahkan lewat backend/proxy
// kecil yang menyimpan key di server, bukan langsung dari browser.
const CONFIG = {
  API_KEY: "cutad-a8d0cc0231f84e87858059e0d143b818",
  BASE_URL: "https://mimo.lokerin.net/v1",
  APP_NAME: "Sya Ai",
  STORAGE_KEYS: {
    sessions: "sya_ai_sessions",
    currentId: "sya_ai_current_id",
    model: "sya_ai_model"
  },
  MODEL_LABELS: {
    "cutad-agent": "Agent (Cepat)",
    "cutad-agent-pro": "Agent Pro (Pintar)"
  },
  DEFAULT_SYSTEM_PROMPT: "You are Sya Ai, a helpful and friendly AI assistant. Answer in Indonesian unless asked otherwise.",
  SUGGESTIONS: [
    "Jelaskan konsep AI ke anak SD",
    "Buatkan draf email profesional",
    "Bantu debug kode JavaScript saya",
    "Rangkum artikel yang panjang"
  ]
};
