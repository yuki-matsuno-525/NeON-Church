"use client";

import { useEffect, useId, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { register, type ApiError } from "@/lib/api";

const OAUTH_GOOGLE_ENABLED = process.env.NEXT_PUBLIC_OAUTH_GOOGLE_ENABLED === "true";
const OAUTH_GITHUB_ENABLED = process.env.NEXT_PUBLIC_OAUTH_GITHUB_ENABLED === "true";
import { useAuth } from "@/contexts/AuthContext";
import { useT } from "@/lib/i18n";
import { PasswordField } from "@/components/auth/PasswordField";

const PASSWORD_MIN_LENGTH = 8;

function safeRedirectTarget(from: string | null): string {
  if (from && from.startsWith("/") && !from.startsWith("//")) return from;
  return "/";
}

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading, setUser } = useAuth();
  const t = useT();
  const usernameId = useId();
  const emailId = useId();
  const passwordId = useId();
  const errorId = useId();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const from = searchParams.get("from");

  useEffect(() => {
    if (!authLoading && user) {
      router.replace(safeRedirectTarget(from));
    }
  }, [authLoading, user, from, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < PASSWORD_MIN_LENGTH) {
      setError(t.passwordTooShort);
      return;
    }

    setSubmitting(true);
    try {
      const registered = await register(username, email, password);
      setUser(registered);
      router.push(safeRedirectTarget(from));
    } catch (err) {
      const apiErr = err as ApiError;
      const message = apiErr.message && apiErr.status !== 500 ? apiErr.message : t.registerFailed;
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || user) {
    return (
      <div style={{ padding: 32, color: "var(--text-muted)" }}>{t.loading}</div>
    );
  }

  const fieldStyle: React.CSSProperties = {
    width: "100%",
    padding: "9px 12px",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-md)",
    background: "var(--bg-alt)",
    color: "var(--text)",
    fontSize: "var(--font-size-sm)",
    fontFamily: "inherit",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: 13,
    fontWeight: 700,
    marginBottom: 6,
    color: "var(--text-muted)",
  };

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "calc(100vh - var(--navbar-height))",
        padding: 24,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 380,
          background: "rgba(16, 9, 50, 0.80)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          border: "1px solid rgba(145, 80, 240, 0.35)",
          borderRadius: 16,
          padding: "36px 32px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.06)",
        }}
      >
        <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 24 }}>
          {t.registerTitle}
        </h1>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label htmlFor={usernameId} style={labelStyle}>{t.username}</label>
            <input
              id={usernameId}
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? errorId : undefined}
              style={fieldStyle}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label htmlFor={emailId} style={labelStyle}>{t.email}</label>
            <input
              id={emailId}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? errorId : undefined}
              style={fieldStyle}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label htmlFor={passwordId} style={labelStyle}>{t.passwordHint}</label>
            <PasswordField
              id={passwordId}
              value={password}
              onChange={setPassword}
              autoComplete="new-password"
              required
              minLength={PASSWORD_MIN_LENGTH}
              ariaInvalid={error ? true : undefined}
              ariaDescribedby={error ? errorId : undefined}
              inputStyle={fieldStyle}
            />
          </div>

          {error && (
            <p
              id={errorId}
              role="alert"
              aria-live="polite"
              style={{ color: "var(--state-danger)", fontSize: "var(--font-size-sm)", marginBottom: "var(--space-4)" }}
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="btn btn-primary"
            style={{ width: "100%" }}
          >
            {submitting ? t.registering : t.registerBtn}
          </button>
        </form>

        {(OAUTH_GOOGLE_ENABLED || OAUTH_GITHUB_ENABLED) && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "20px 0 0" }}>
              <hr style={{ flex: 1, border: "none", borderTop: "1px solid var(--border)" }} />
              <span style={{ fontSize: 12, color: "var(--text-faint)" }}>{t.oauthOr}</span>
              <hr style={{ flex: 1, border: "none", borderTop: "1px solid var(--border)" }} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 14 }}>
              {OAUTH_GOOGLE_ENABLED && (
                <a
                  href={`/api/auth/oauth/google/${from ? `?next=${encodeURIComponent(from)}` : ""}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 10,
                    padding: "10px 16px",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-md)",
                    background: "transparent",
                    color: "var(--text)",
                    textDecoration: "none",
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  {t.oauthGoogle}
                </a>
              )}
              {OAUTH_GITHUB_ENABLED && (
                <a
                  href={`/api/auth/oauth/github/${from ? `?next=${encodeURIComponent(from)}` : ""}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 10,
                    padding: "10px 16px",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-md)",
                    background: "transparent",
                    color: "var(--text)",
                    textDecoration: "none",
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
                  </svg>
                  {t.oauthGithub}
                </a>
              )}
            </div>
          </>
        )}

        <p style={{ textAlign: "center", marginTop: 20, fontSize: 13, color: "var(--text-muted)" }}>
          {t.hasAccount}{" "}
          <Link href="/login" style={{ color: "var(--accent)", textDecoration: "underline" }}>
            {t.login}
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  const t = useT();
  return (
    <Suspense fallback={<div style={{ padding: 32, color: "var(--text-muted)" }}>{t.loading}</div>}>
      <RegisterForm />
    </Suspense>
  );
}
