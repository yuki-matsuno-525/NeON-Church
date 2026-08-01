"use client";

import { useEffect, useId, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useT } from "@/lib/i18n";

type Props = {
  onClose: () => void;
  // 文言を差し替えたい場合（例: セッション切れ）に渡す。未指定なら「ログインが必要です」。
  title?: string;
  description?: string;
  from?: string;
};

export function LoginRequiredModal({ onClose, title, description, from }: Props) {
  const pathname = usePathname();
  const t = useT();
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);
  const currentLocation = typeof window === "undefined"
    ? pathname
    : `${window.location.pathname}${window.location.search}${window.location.hash}`;
  const loginHref = `/login?from=${encodeURIComponent(from ?? currentLocation)}`;

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, []);

  return (
    <>
      <div
        aria-hidden="true"
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0, 0, 0, 0.5)",
          zIndex: 100,
        }}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
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
        <h2 id={titleId} style={{ fontSize: 16, fontWeight: 700, margin: "0 0 8px" }}>
          {title ?? t.loginRequired}
        </h2>
        <p id={descriptionId} style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 0 24px" }}>
          {description ?? t.loginRequiredDesc}
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <button
            ref={closeRef}
            onClick={onClose}
            style={{
              padding: "8px 20px",
              minHeight: 44,
              border: "1px solid var(--border)",
              borderRadius: 8,
              background: "transparent",
              color: "var(--text-muted)",
              cursor: "pointer",
              fontSize: 13,
              fontFamily: "inherit",
            }}
          >
            {t.close}
          </button>
          <Link
            href={loginHref}
            style={{
              padding: "8px 20px",
              minHeight: 44,
              display: "inline-flex",
              alignItems: "center",
              background: "linear-gradient(135deg, #7618c5, #d81e80)",
              color: "#fff",
              borderRadius: 8,
              textDecoration: "none",
              fontWeight: 700,
              fontSize: 13,
              boxShadow: "0 0 14px rgba(198, 44, 170, 0.45)",
            }}
          >
            {t.loginBtn}
          </Link>
        </div>
      </div>
    </>
  );
}
