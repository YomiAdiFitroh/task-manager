import { useState } from "react";
import { api } from "./api";

export default function AuthForm({ onAuth }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const isLogin = mode === "login";

  async function submit(event) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const result = isLogin
        ? await api.login(email, password)
        : await api.register(email, password);
      onAuth(result); // this screen unmounts on success
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  function switchMode() {
    setMode(isLogin ? "register" : "login");
    setError("");
  }

  return (
    <main className="app">
      <header className="app-header">
        <h1>{isLogin ? "Log in" : "Create account"}</h1>
      </header>

      <form className="auth" onSubmit={submit}>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          autoComplete={isLogin ? "current-password" : "new-password"}
          minLength={isLogin ? undefined : 8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {!isLogin && <p className="hint">Use at least 8 characters.</p>}

        {error && <p className="error" role="alert">{error}</p>}

        <button type="submit" className="auth-submit" disabled={busy}>
          {busy ? "Please wait…" : isLogin ? "Log in" : "Create account"}
        </button>
      </form>

      <p className="auth-switch">
        {isLogin ? "New here?" : "Already have an account?"}{" "}
        <button type="button" className="link-button" onClick={switchMode}>
          {isLogin ? "Create an account" : "Log in"}
        </button>
      </p>
    </main>
  );
}
