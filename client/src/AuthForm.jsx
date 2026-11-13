import { useState } from "react";
import { api } from "./api";
import "./auth.css";

// The winding path and its checkpoints in the hero illustration.
const PATH = "M60 460 C60 380 200 400 190 320 S80 250 160 190 S320 160 300 80";
const CHECKPOINTS = [
  [60, 460],
  [190, 320],
  [160, 190],
];

const STRENGTH_LABEL = ["", "Too short", "Okay", "Good", "Strong"];

function passwordScore(password) {
  if (!password) return 0;
  if (password.length < 8) return 1;
  let score = 2;
  if (password.length >= 12) score += 1;
  if (/[A-Za-z]/.test(password) && /\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  return Math.min(score, 4);
}

function FieldIcon({ children }) {
  return (
    <svg className="field-icon" width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

function Hero() {
  const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  return (
    <section className="login-hero" aria-hidden="true">
      <div className="hero-brand">
        <span className="brand-mark">✓</span>
        Tasks
      </div>

      <svg className="hero-art" viewBox="0 0 400 520" preserveAspectRatio="xMidYMid slice">
        <path d={PATH} className="hero-path" />

        {CHECKPOINTS.map(([cx, cy], i) => (
          <g className="node" key={i} style={{ animationDelay: `${0.3 + i * 0.25}s` }}>
            <circle cx={cx} cy={cy} r="15" fill="#34d399" />
            <path d={`M${cx - 6} ${cy} l4 4 l8 -8`} fill="none" stroke="#064e3b"
              strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        ))}

        <g className="node" style={{ animationDelay: "1.05s" }}>
          <circle cx="300" cy="80" r="17" fill="#ffffff" />
          <path d="M294 90 V70 M294 70 H310 L305 76 L310 82 H294" fill="#047857"
            stroke="#047857" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </g>

        {!reduceMotion && (
          <circle r="7" className="hero-walker">
            <animateMotion dur="9s" repeatCount="indefinite" path={PATH} />
          </circle>
        )}
      </svg>

      <div className="hero-chip chip-1">
        <i className="chip-dot" style={{ background: "#fb7185" }} />
        <span>Finalize Q4 roadmap</span>
        <span className="chip-meta">Today</span>
      </div>
      <div className="hero-chip chip-2">
        <i className="chip-dot" style={{ background: "#38bdf8" }} />
        <span>Refactor task filtering</span>
        <span className="chip-meta">Tomorrow</span>
      </div>
      <div className="hero-chip chip-3">
        <i className="chip-dot" style={{ background: "#34d399" }} />
        <span>Book dentist checkup</span>
        <span className="chip-meta">Done</span>
      </div>

      <div className="hero-copy">
        <h2>Take your tasks one step at a time.</h2>
        <p>Plan your day, track your progress, and finish what matters.</p>
      </div>
    </section>
  );
}

export default function AuthForm({ onAuth }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const isLogin = mode === "login";
  const score = isLogin ? 0 : passwordScore(password);

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

  function switchMode(next) {
    setMode(next);
    setError("");
  }

  return (
    <main className="login">
      <Hero />

      <section className="login-panel">
        <div className="login-card">
          <div className="login-tabs" role="group" aria-label="Log in or sign up">
            <button type="button" className="login-tab" aria-pressed={isLogin}
              onClick={() => switchMode("login")}>
              Log in
            </button>
            <button type="button" className="login-tab" aria-pressed={!isLogin}
              onClick={() => switchMode("register")}>
              Sign up
            </button>
          </div>

          <h1 className="login-title">{isLogin ? "Welcome back" : "Create your account"}</h1>
          <p className="login-sub">
            {isLogin
              ? "Log in to pick up where you left off."
              : "Start organizing your tasks in under a minute."}
          </p>

          <form onSubmit={submit}>
            <label className="field">
              <span className="field-label">Email</span>
              <span className="field-box">
                <FieldIcon>
                  <rect x="3" y="5" width="18" height="14" rx="2" />
                  <path d="m3 7 9 6 9-6" />
                </FieldIcon>
                <input
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </span>
            </label>

            <label className="field">
              <span className="field-label">Password</span>
              <span className="field-box">
                <FieldIcon>
                  <rect x="4" y="11" width="16" height="10" rx="2" />
                  <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                </FieldIcon>
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete={isLogin ? "current-password" : "new-password"}
                  placeholder={isLogin ? "Your password" : "At least 8 characters"}
                  minLength={isLogin ? undefined : 8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="toggle"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    {showPassword ? (
                      <>
                        <path d="M3 3l18 18" />
                        <path d="M10.6 6.1A9.7 9.7 0 0 1 12 6c6.5 0 10 6 10 6a17 17 0 0 1-3.2 3.9M6.6 7.6C3.9 9.3 2 12 2 12s3.5 7 10 7c1.6 0 3-.4 4.3-1" />
                      </>
                    ) : (
                      <>
                        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
                        <circle cx="12" cy="12" r="3" />
                      </>
                    )}
                  </svg>
                </button>
              </span>
            </label>

            {!isLogin && password.length > 0 && (
              <div className="strength" aria-live="polite">
                <span className="strength-bars">
                  {[1, 2, 3, 4].map((n) => (
                    <span key={n} className={"strength-bar" + (n <= score ? ` level-${score}` : "")} />
                  ))}
                </span>
                <span className="strength-label">{STRENGTH_LABEL[score]}</span>
              </div>
            )}

            {error && <p className="login-error" role="alert">{error}</p>}

            <button type="submit" className="login-submit" disabled={busy}>
              {busy ? "Please wait…" : isLogin ? "Log in" : "Create account"}
              {!busy && <span aria-hidden="true">→</span>}
            </button>
          </form>

          <p className="login-note">Your tasks stay private to your account.</p>
        </div>
      </section>
    </main>
  );
}