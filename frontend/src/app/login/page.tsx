"use client";

import { useEffect, useId, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { login, type ApiError } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useT } from "@/lib/i18n";
import { PasswordField } from "@/components/auth/PasswordField";

function safeRedirectTarget(from: string | null): string {
  if (from && from.startsWith("/") && !from.startsWith("//")) return from;
  return "/";
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading, setUser } = useAuth();
  const t = useT();
  const usernameId = useId();
  const passwordId = useId();
  const errorId = useId();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const from = searchParams.get("from");

  // 既ログインなら即リダイレクト
  useEffect(() => {
    if (!authLoading && user) {
      router.replace(safeRedirectTarget(from));
    }
  }, [authLoading, user, from, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const loggedIn = await login(username, password);
      setUser(loggedIn);
      router.push(safeRedirectTarget(from));
    } catch (err) {
      const apiErr = err as ApiError;
      const message = apiErr.message && apiErr.status !== 500 ? apiErr.message : t.loginFailed;
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  // 既ログイン or 認証ロード中はフォームを描画しない（チラつき防止）
  if (authLoading || user) {
    return (
      <div style={{ padding: 32, color: "var(--text-muted)" }}>{t.loading}</div>
    );
  }

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
          {t.loginTitle}
        </h1>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label
              htmlFor={usernameId}
              style={{
                display: "block",
                fontSize: 13,
                fontWeight: 700,
                marginBottom: 6,
                color: "var(--text-muted)",
              }}
            >
              {t.username}
            </label>
            <input
              id={usernameId}
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? errorId : undefined}
              style={{
                width: "100%",
                padding: "9px 12px",
                border: "1px solid rgba(140, 75, 235, 0.35)",
                borderRadius: 8,
                background: "rgba(255, 255, 255, 0.05)",
                color: "var(--text)",
                fontSize: 14,
                fontFamily: "inherit",
              }}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label
              htmlFor={passwordId}
              style={{
                display: "block",
                fontSize: 13,
                fontWeight: 700,
                marginBottom: 6,
                color: "var(--text-muted)",
              }}
            >
              {t.password}
            </label>
            <PasswordField
              id={passwordId}
              value={password}
              onChange={setPassword}
              autoComplete="current-password"
              required
              ariaInvalid={error ? true : undefined}
              ariaDescribedby={error ? errorId : undefined}
              inputStyle={{
                padding: "9px 12px",
                border: "1px solid rgba(140, 75, 235, 0.35)",
                borderRadius: 8,
                background: "rgba(255, 255, 255, 0.05)",
                color: "var(--text)",
                fontSize: 14,
                fontFamily: "inherit",
              }}
            />
          </div>

          {error && (
            <p
              id={errorId}
              role="alert"
              aria-live="polite"
              style={{ color: "#ef4444", fontSize: 13, marginBottom: 16 }}
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            style={{
              width: "100%",
              padding: "11px",
              background: submitting ? "rgba(120, 30, 190, 0.5)" : "linear-gradient(135deg, #7618c5, #d81e80)",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontWeight: 700,
              fontSize: 14,
              cursor: submitting ? "not-allowed" : "pointer",
              opacity: submitting ? 0.6 : 1,
              fontFamily: "inherit",
              boxShadow: submitting ? "none" : "0 0 18px rgba(198, 44, 170, 0.45)",
            }}
          >
            {submitting ? t.loggingIn : t.loginTitle}
          </button>
        </form>

        <p style={{ textAlign: "center", marginTop: 20, fontSize: 13, color: "var(--text-muted)" }}>
          {t.noAccount}{" "}
          <Link href="/register" style={{ color: "var(--accent)", textDecoration: "underline" }}>
            {t.register}
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  const t = useT();
  return (
    <Suspense fallback={<div style={{ padding: 32, color: "var(--text-muted)" }}>{t.loading}</div>}>
      <LoginForm />
    </Suspense>
  );
}
