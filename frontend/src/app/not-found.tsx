import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "404 — Page Not Found",
};

export default function NotFound() {
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
      <p
        style={{
          fontSize: 64,
          fontWeight: 700,
          color: "rgba(193, 143, 255, 0.25)",
          margin: 0,
          lineHeight: 1,
          fontFamily: '"Noto Serif JP", serif',
        }}
      >
        404
      </p>
      <h1
        style={{
          fontSize: 20,
          fontWeight: 700,
          color: "var(--text)",
          margin: 0,
        }}
      >
        ページが見つかりません
      </h1>
      <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0, maxWidth: 360 }}>
        お探しのページは移動または削除された可能性があります。
      </p>
      <Link
        href="/"
        className="btn btn-primary"
        style={{ marginTop: 8 }}
      >
        トップへ戻る
      </Link>
    </div>
  );
}
