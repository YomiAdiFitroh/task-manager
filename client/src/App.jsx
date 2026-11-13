import { useEffect, useState } from "react";
import { api, auth } from "./api";
import AuthForm from "./AuthForm.jsx";
import Tasks from "./Tasks.jsx";

export default function App() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(Boolean(auth.getToken()));

  useEffect(() => {
    auth.onUnauthorized(() => setUser(null));
    if (!auth.getToken()) return;

    api.me()
      .then(setUser)
      .catch(() => {})
      .finally(() => setChecking(false));
  }, []);

  function handleAuth({ token, user }) {
    auth.setToken(token);
    setUser(user);
  }

  function logout() {
    auth.setToken(null);
    setUser(null);
  }

  if (checking) {
    return (
      <main className="app">
        <p className="empty">Loading…</p>
      </main>
    );
  }

  return user ? <Tasks user={user} onLogout={logout} /> : <AuthForm onAuth={handleAuth} />;
}
