"use client";

import { useEffect, useId, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { register, type ApiError } from "@/lib/api";
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
