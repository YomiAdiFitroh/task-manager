const TOKEN_KEY = "todo-token";
let onUnauthorized = () => {};

export const auth = {
  getToken() {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch (err) {
      return null;
    }
  },
  setToken(token) {
    try {
      if (token) localStorage.setItem(TOKEN_KEY, token);
      else localStorage.removeItem(TOKEN_KEY);
    } catch (err) {
      // Storage can be blocked; the user just has to log in again next visit.
    }
  },
  onUnauthorized(handler) {
    onUnauthorized = handler;
  },
};

async function request(path, options = {}) {
  const token = auth.getToken();
  const res = await fetch(`/api${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const isLoginAttempt = path === "/auth/login" || path === "/auth/register";
    if (res.status === 401 && !isLoginAttempt) {
      // Token missing, expired, or invalid: drop it and send the user to the login screen.
      auth.setToken(null);
      onUnauthorized();
    }
    throw new Error(body.error || "Could not reach the server. Is the API running?");
  }
  return res.status === 204 ? null : res.json();
}

const send = (method, body) => ({ method, body: JSON.stringify(body) });

export const api = {
  register: (email, password) => request("/auth/register", send("POST", { email, password })),
  login: (email, password) => request("/auth/login", send("POST", { email, password })),
  me: () => request("/auth/me"),
  list: () => request("/tasks"),
  create: (task) => request("/tasks", send("POST", task)),
  update: (id, changes) => request(`/tasks/${id}`, send("PATCH", changes)),
  remove: (id) => request(`/tasks/${id}`, { method: "DELETE" }),
  clearDone: () => request("/tasks/completed", { method: "DELETE" }),
};
