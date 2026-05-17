"use client";

import { usePathname } from "next/navigation";

type Props = {
  onClose: () => void;
};

export function LoginRequiredModal({ onClose }: Props) {
  const pathname = usePathname();
  const loginHref = `/login?from=${encodeURIComponent(pathname)}`;

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0, 0, 0, 0.5)",
          zIndex: 100,
        }}
      />
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          background: "rgba(16, 9, 50, 0.95)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          border: "1px solid rgba(145, 80, 240, 0.35)",
          borderRadius: 16,
          padding: "32px 28px",
          width: "min(360px, calc(100vw - 32px))",
          zIndex: 101,
          textAlign: "center",
        }}
      >
        <p style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>
          ログインが必要です
        </p>
        <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 24 }}>
          この機能を使うにはログインしてください。
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <button
            onClick={onClose}
            style={{
              padding: "8px 20px",
              border: "1px solid var(--border)",
              borderRadius: 8,
              background: "transparent",
              color: "var(--text-muted)",
              cursor: "pointer",
              fontSize: 13,
              fontFamily: "inherit",
            }}
          >
            閉じる
          </button>
          <a
            href={loginHref}
            style={{
              padding: "8px 20px",
              background: "linear-gradient(135deg, #7618c5, #d81e80)",
              color: "#fff",
              borderRadius: 8,
              textDecoration: "none",
              fontWeight: 700,
              fontSize: 13,
              boxShadow: "0 0 14px rgba(198, 44, 170, 0.45)",
            }}
          >
            ログインする
          </a>
        </div>
      </div>
    </>
  );
}
