"use client";

import { useT } from "@/lib/i18n";

/**
 * 一覧の続きを読み足すボタン。
 *
 * 一覧は一度に全部は返さず少しずつ読み足す。続きが無いときは何も描かないので、
 * 呼び出し側で hasMore を見て出し分ける必要はない。
 */
export function LoadMoreButton({
  hasMore,
  loading,
  error = false,
  onClick,
}: {
  hasMore: boolean;
  loading: boolean;
  error?: boolean;
  onClick: () => void;
}) {
  // useT は早期 return より前で呼ぶ（フックは毎回同じ順序で呼ぶ必要がある）。
  const t = useT();
  if (!hasMore) return null;
  return (
    <div
      style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: "var(--space-4) 0" }}
    >
      {error && (
        <p role="alert" style={{ margin: 0, color: "var(--state-danger)", fontSize: "var(--font-size-xs)" }}>
          {t.loadMoreFailed}
        </p>
      )}
      <button
        type="button"
        onClick={onClick}
        disabled={loading}
        aria-busy={loading}
        style={{
          fontSize: "var(--font-size-sm)",
          fontFamily: "inherit",
          padding: "8px 20px",
          minHeight: 44,
          borderRadius: "var(--radius-md)",
          border: "1px solid var(--border)",
          background: "transparent",
          color: loading ? "var(--text-faint)" : "var(--text-muted)",
          cursor: loading ? "default" : "pointer",
        }}
      >
        {loading ? t.loading : error ? t.retry : t.loadMore}
      </button>
    </div>
  );
}
