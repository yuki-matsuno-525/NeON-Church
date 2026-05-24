"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { login, type ApiError } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useT } from "@/lib/i18n";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setUser } = useAuth();
  const t = useT();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const from = searchParams.get("from");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const user = await login(username, password);
      setUser(user);
      router.push(from && from.startsWith("/") ? from : "/");
    } catch (err) {
      setError(
        (err as ApiError).message ?? t.loginFailed
      );
    } finally {
      setSubmitting(false);
    }
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
          {t.loginTitle}
        </h1>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label
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
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "9px 12px",
                border: "1px solid rgba(140, 75, 235, 0.35)",
                borderRadius: 8,
                background: "rgba(255, 255, 255, 0.05)",
                color: "var(--text)",
                fontSize: 14,
                fontFamily: "inherit",
                outline: "none",
              }}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label
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
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "9px 12px",
                border: "1px solid rgba(140, 75, 235, 0.35)",
                borderRadius: 8,
                background: "rgba(255, 255, 255, 0.05)",
                color: "var(--text)",
                fontSize: 14,
                fontFamily: "inherit",
                outline: "none",
              }}
            />
          </div>

          {error && (
            <p style={{ color: "#ef4444", fontSize: 13, marginBottom: 16 }}>
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
