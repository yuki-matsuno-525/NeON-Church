"use client";

import { useT } from "@/lib/i18n";

/**
 * 番号付きページネーション。翻訳一覧の各カラムや検索結果で共通に使う。
 * - page: 現在のページ（1始まり）
 * - totalPages: 総ページ数
 * - onChange: ページ番号を渡して切り替える
 * ページが1つ以下なら何も表示しない。ページ数が多いときは前後だけ数字を出し、間は「…」で省略する。
 */
export function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}) {
  const t = useT();
  if (totalPages <= 1) return null;

  const pages = pageWindow(page, totalPages);

  return (
    <nav
      aria-label={t.paginationLabel}
      style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 4, flexWrap: "wrap", marginTop: 16 }}
    >
      <button
        type="button"
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        aria-label={t.paginationPrev}
        style={arrowStyle(page <= 1)}
      >
        ‹
      </button>

      {pages.map((p, i) =>
        p === ELLIPSIS ? (
          <span key={`gap-${i}`} style={{ padding: "0 4px", color: "var(--text-faint)" }}>
            …
          </span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => onChange(p)}
            aria-current={p === page ? "page" : undefined}
            style={numberStyle(p === page)}
          >
            {p}
          </button>
        )
      )}

      <button
        type="button"
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
        aria-label={t.paginationNext}
        style={arrowStyle(page >= totalPages)}
      >
        ›
      </button>
    </nav>
  );
}

const ELLIPSIS = "…";

// 現在ページの前後1つ＋先頭・末尾を出し、離れているところは「…」でまとめる。
function pageWindow(page: number, totalPages: number): (number | typeof ELLIPSIS)[] {
  const out: (number | typeof ELLIPSIS)[] = [];
  const push = (p: number) => {
    if (p >= 1 && p <= totalPages && !out.includes(p)) out.push(p);
  };
  push(1);
  if (page - 1 > 2) out.push(ELLIPSIS);
  push(page - 1);
  push(page);
  push(page + 1);
  if (page + 1 < totalPages - 1) out.push(ELLIPSIS);
  push(totalPages);
  return out;
}

const baseButton: React.CSSProperties = {
  minWidth: 32,
  height: 32,
  padding: "0 8px",
  border: "1px solid var(--border)",
  borderRadius: 8,
  background: "var(--bg-alt)",
  color: "var(--text-muted)",
  fontFamily: "inherit",
  fontSize: 13,
  cursor: "pointer",
};

function numberStyle(active: boolean): React.CSSProperties {
  return {
    ...baseButton,
    fontWeight: active ? 700 : 500,
    borderColor: active ? "var(--accent)" : "var(--border)",
    background: active ? "var(--accent-tint)" : "var(--bg-alt)",
    color: active ? "var(--accent)" : "var(--text-muted)",
  };
}

function arrowStyle(disabled: boolean): React.CSSProperties {
  return {
    ...baseButton,
    cursor: disabled ? "default" : "pointer",
    opacity: disabled ? 0.4 : 1,
    fontSize: 16,
  };
}
