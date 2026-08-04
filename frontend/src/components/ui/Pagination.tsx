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
      className="mt-4 flex flex-wrap items-center justify-center gap-1"
    >
      <button
        type="button"
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        aria-label={t.paginationPrev}
        className={arrowClass(page <= 1)}
      >
        ‹
      </button>

      {pages.map((p, i) =>
        p === ELLIPSIS ? (
          <span key={`gap-${i}`} className="px-1 text-faint">
            …
          </span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => onChange(p)}
            aria-current={p === page ? "page" : undefined}
            className={numberClass(p === page)}
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
        className={arrowClass(page >= totalPages)}
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

/* ページ送りのボタンは数字だけなので、指で押せるよう 44px 四方を確保する。 */
const baseButton = "tap-target-square cursor-pointer rounded-md border px-2 text-sm";

function numberClass(active: boolean): string {
  return [
    baseButton,
    active
      ? "border-accent bg-accent-tint text-accent font-bold"
      : "border-border bg-bg-alt text-muted font-normal",
  ].join(" ");
}

function arrowClass(disabled: boolean): string {
  return [
    baseButton,
    "border-border bg-bg-alt text-muted text-md",
    disabled ? "cursor-default opacity-40" : "cursor-pointer",
  ].join(" ");
}
