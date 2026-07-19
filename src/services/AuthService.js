export class AuthService {
  constructor({
    enabled = import.meta.env?.VITE_ACCOUNT_MODE === "api",
    fetchRequest = globalThis.fetch?.bind(globalThis),
    apiUrl = browserApiUrl()
  } = {}) {
    this.configured = Boolean(enabled && fetchRequest);
    this.fetchRequest = fetchRequest;
    this.apiUrl = apiUrl;
    this.listeners = new Set();
  }

  async getSession() {
    if (!this.configured) return null;
    const data = await this.request("auth/session");
    return data.user ? { user: data.user } : null;
  }

  onAuthStateChange(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async register(email, password) {
    const data = await this.request("auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password })
    });
    this.emit(data.user ? { user: data.user } : null);
    return data.user;
  }

  async signIn(email, password) {
    const data = await this.request("auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password })
    });
    this.emit(data.user ? { user: data.user } : null);
    return data.user;
  }

  async signOut() {
    if (!this.configured) return;
    await this.request("auth/logout", { method: "POST" });
    this.emit(null);
  }

  async request(path, options = {}) {
    if (!this.configured) throw new Error("Authentication is not enabled for this demo.");
    const response = await this.fetchRequest(new URL(path, this.apiUrl), {
      credentials: "same-origin",
      headers: { "Content-Type": "application/json", ...options.headers },
      ...options
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Authentication request failed.");
    return data;
  }

  emit(session) {
    this.listeners.forEach(listener => listener(session));
  }
}

function browserApiUrl() {
  if (typeof window === "undefined") return "http://localhost:3000/api/";
  return new URL(`${import.meta.env?.BASE_URL ?? "/"}api/`, window.location.origin).href;
}
