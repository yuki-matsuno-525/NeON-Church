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
    <div className="flex flex-col items-center gap-2 py-4">
      {error && (
        <p role="alert" className="m-0 text-xs text-danger">
          {t.loadMoreFailed}
        </p>
      )}
      <button
        type="button"
        onClick={onClick}
        disabled={loading}
        aria-busy={loading}
        // 以前はここだけ枠だけの見た目を直に書いていた。暗い地に沈んで
        // 押せると気づけなかったので、他の副操作と同じ塗りのボタンに揃える。
        className="btn btn-ghost"
      >
        {loading ? t.loading : error ? t.retry : t.loadMore}
      </button>
    </div>
  );
}
