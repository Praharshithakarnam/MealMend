const API_BASE = (import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");

async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...options.headers,
      },
    });
  } catch {
    throw new Error(`Can't reach the backend at ${API_BASE}. Make sure your Express server is running on port 3000.`);
  }

  const text = await response.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; }
  catch { data = { message: text }; }

  if (!response.ok) {
    throw new Error(data.message || data.error || `Request failed (${response.status})`);
  }
  return data;
}


export const api = {
  getHousehold: () => request("/api/household"),

  // Existing cancelled-meal recovery
  getProposal: (payload) => request("/api/ai/recovery-proposal", {
    method: "POST",
    body: JSON.stringify(payload),
  }),

  // New: general chat and grocery questions
  sendChat: (message) => request("/api/chat", {
    method: "POST",
    body: JSON.stringify({ message }),
  }),

  confirmRecovery: (payload) => request("/api/ai/recovery-confirm", {
    method: "POST",
    body: JSON.stringify(payload),
  }),
};

