"use client";

import Link from "next/link";
import { useLang } from "@/contexts/LanguageContext";

export function NotFoundContent() {
  const { lang } = useLang();
  const copy = lang === "ja"
    ? {
        title: "ページが見つかりません",
        description: "お探しのページは移動または削除された可能性があります。",
        home: "トップへ戻る",
        read: "書一覧を見る",
      }
    : {
        title: "Page not found",
        description: "The page you’re looking for may have been moved or deleted.",
        home: "Back to home",
        read: "Browse texts",
      };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "calc(100vh - var(--navbar-height))",
        padding: "40px 24px",
        textAlign: "center",
        gap: 16,
      }}
    >
      <p aria-hidden="true" style={{ fontSize: 64, fontWeight: 700, color: "var(--text-faint)", opacity: 0.55, margin: 0, lineHeight: 1, fontFamily: '"Noto Serif JP", serif' }}>
        404
      </p>
      <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--text)", margin: 0 }}>
        {copy.title}
      </h1>
      <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0, maxWidth: 360 }}>
        {copy.description}
      </p>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center", marginTop: 8 }}>
        <Link href="/" className="btn btn-primary">{copy.home}</Link>
        <Link href="/read" className="btn btn-ghost">{copy.read}</Link>
      </div>
    </div>
  );
}
