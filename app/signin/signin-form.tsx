"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowRight, ShieldCheck, Wrench, Mic2 } from "lucide-react";
import { initializeApp, getApps } from "firebase/app";
import {
  getAuth,
  signInAnonymously,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  browserLocalPersistence,
  setPersistence,
  linkWithCredential,
  EmailAuthProvider,
} from "firebase/auth";
import { safeReturnPath } from "@/lib/return-path";
import config from "@/lib/firebase-config.json";
function auth() {
  return getAuth(getApps()[0] || initializeApp(config));
}
function explain(code: string) {
  const messages: Record<string, string> = {
    "auth/invalid-credential":
      "That email and password did not match. Please try again or reset your password.",
    "auth/email-already-in-use":
      "An account already uses this email. Choose Sign in instead.",
    "auth/weak-password": "Choose a password with at least 10 characters.",
    "auth/too-many-requests":
      "Too many attempts. Please wait a few minutes and try again.",
    "auth/network-request-failed":
      "Could not connect. Check your connection and try again.",
    "auth/invalid-email": "Enter a valid email address.",
  };
  return messages[code] || "Could not sign in. Please try again in a moment.";
}
export default function SignIn({
  initialMode = "signin",
}: {
  initialMode?: "signin" | "signup";
}) {
  const [mode, setMode] = useState<"signin" | "signup" | "reset">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  async function enter(guest = false) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const a = auth();
      await setPersistence(a, browserLocalPersistence);
      if (mode === "reset" && !guest) {
        await sendPasswordResetEmail(a, email);
        setMessage(
          "If this email has an account, a reset link is on its way. Check your inbox.",
        );
        return;
      }
      let credential;
      if (guest)
        credential = a.currentUser?.isAnonymous
          ? { user: a.currentUser }
          : await signInAnonymously(a);
      else if (mode === "signup") {
        credential = a.currentUser?.isAnonymous
          ? await linkWithCredential(
              a.currentUser,
              EmailAuthProvider.credential(email, password),
            )
          : await createUserWithEmailAndPassword(a, email, password);
        if (name.trim())
          await updateProfile(credential.user, { displayName: name.trim() });
      } else credential = await signInWithEmailAndPassword(a, email, password);
      const idToken = await credential.user.getIdToken(true);
      const r = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      const data = (await r.json()) as { error?: string };
      if (!r.ok) throw new Error(data.error);
      const target = new URLSearchParams(location.search).get("return_to");
      location.assign(safeReturnPath(target));
    } catch (e) {
      setError(
        "code" in (e as object)
          ? explain((e as { code: string }).code)
          : (e as Error).message,
      );
    } finally {
      setBusy(false);
    }
  }
  function submit(e: FormEvent) {
    e.preventDefault();
    void enter();
  }
  return (
    <main className="auth-page">
      <section className="auth-story">
        <Link href="/" className="auth-brand">
          <Wrench size={26} /> Benchback
        </Link>
        <span className="auth-eyebrow">FROM PARTS SHELF TO PAID BACK</span>
        <h1>
          Your old parts.
          <br />
          Your money back.
        </h1>
        <p>
          Match the purchase. Prepare the return. Follow every dollar through to
          the supplier credit.
        </p>
        <div className="auth-value">
          <Mic2 />
          <div>
            <strong>A parts desk you can talk to</strong>
            <span>Speak naturally. Review every important action.</span>
          </div>
        </div>
        <div className="auth-value">
          <ShieldCheck />
          <div>
            <strong>A workspace that belongs to you</strong>
            <span>
              Private records, clear approvals, and a complete audit trail.
            </span>
          </div>
        </div>
        <small>Built by Shivam Gupta · Powered by AssemblyAI</small>
      </section>
      <section className="auth-panel">
        <Link href="/" className="auth-back">
          ← Explore the example desk
        </Link>
        <div className="auth-card">
          <span className="auth-eyebrow">WELCOME TO BENCHBACK</span>
          <h2>
            {mode === "signup"
              ? "Create your workspace"
              : mode === "reset"
                ? "Reset your password"
                : "Open your parts desk"}
          </h2>
          <p>
            {mode === "signup"
              ? "Start with a blank desk or practice with fictional records."
              : mode === "reset"
                ? "We will send a link to help you sign in again."
                : "Sign in to save records and use the live voice assistant."}
          </p>
          <form onSubmit={submit}>
            {mode === "signup" && (
              <label>
                Your name
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  maxLength={100}
                  required
                />
              </label>
            )}
            <label>
              Email
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </label>
            {mode !== "reset" && (
              <label>
                Password
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={
                    mode === "signup" ? "new-password" : "current-password"
                  }
                  minLength={mode === "signup" ? 10 : undefined}
                  required
                />
                {mode === "signup" && (
                  <small>Use at least 10 characters.</small>
                )}
              </label>
            )}
            {error && (
              <div role="alert" className="auth-error">
                {error}
              </div>
            )}
            {message && (
              <div role="status" className="auth-message">
                {message}
              </div>
            )}
            <button className="btn primary" disabled={busy}>
              {busy
                ? "Connecting…"
                : mode === "signup"
                  ? "Create workspace"
                  : mode === "reset"
                    ? "Send reset link"
                    : "Sign in"}
              <ArrowRight size={17} />
            </button>
          </form>
          <div className="auth-switch">
            <button
              disabled={busy}
              onClick={() => {
                setMode(mode === "signup" ? "signin" : "signup");
                setError("");
                setMessage("");
              }}
            >
              {mode === "signup"
                ? "Already have an account? Sign in"
                : "New here? Create an account"}
            </button>
            {mode !== "reset" && (
              <button
                disabled={busy}
                onClick={() => {
                  setMode("reset");
                  setError("");
                }}
              >
                Forgot password?
              </button>
            )}
          </div>
          <div className="auth-divider">
            <span>JUST EXPLORING?</span>
          </div>
          <button
            className="auth-guest"
            disabled={busy}
            onClick={() => void enter(true)}
          >
            Try a private guest workspace <ArrowRight size={17} />
          </button>
          <p className="auth-note">
            No email needed. Guest access stays in this browser. Create an
            account later to keep it across devices. Voice sessions have daily
            limits.
          </p>
          <Link href="/privacy" className="auth-privacy">
            How your data is handled
          </Link>
        </div>
      </section>
    </main>
  );
}
