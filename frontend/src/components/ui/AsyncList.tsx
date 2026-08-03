"use client";

import type { ReactNode } from "react";
import { SkeletonList } from "./SkeletonList";
import { Button } from "./Button";
import { useT } from "@/lib/i18n";

type Props = {
  /** データを取りに行っている最中か */
  loading: boolean;
  /** 失敗したときに出す文言。null / undefined / "" なら失敗していない */
  error?: string | null;
  /** 取れたけれど 0 件だったか */
  isEmpty: boolean;
  /** 0 件のときの一行メッセージ */
  emptyText?: string;
  /** 0 件のときに EmptyState などを出したいとき。指定すると emptyText より優先される */
  empty?: ReactNode;
  /** 失敗したときの再試行。省略するとボタンを出さない */
  onRetry?: () => void;
  /** 省略時は表示言語に合わせた「もう一度試す」 */
  retryLabel?: string;
  /** 読み込み中に並べるカードの枚数 */
  skeletonCount?: number;
  /** データがあるときに出す中身 */
  children: ReactNode;
};

/**
 * 一覧の「読み込み中 / 失敗 / 0 件 / 中身」の出し分けをまとめて引き受ける。
 *
 * この 4 分岐は 30 以上の画面がそれぞれ手書きしていた。同じことを書いているのに
 * 余白や文字色が少しずつ違い、片方だけ直すと画面ごとにずれていく状態だったため、
 * 分岐の順番と見た目をこの 1 か所に集めている。
 *
 * 判断の順番は 読み込み中 → 失敗 → 0 件 → 中身。
 * 「読み足し中で既に中身がある」ときは loading を渡さず、中身を出したまま
 * <LoadMoreButton> 側に読み込み中を任せる。
 */
export function AsyncList({
  loading,
  error,
  isEmpty,
  emptyText,
  empty,
  onRetry,
  retryLabel,
  skeletonCount = 2,
  children,
}: Props) {
  // フックは早期 return より前で呼ぶ（毎回同じ順序で呼ぶ必要があるため）。
  const t = useT();

  if (loading) return <SkeletonList count={skeletonCount} />;

  if (error) {
    return (
      <div role="alert" className="py-3 px-1">
        <p className="mt-0 mx-0 mb-3 text-sm text-muted">{error}</p>
        {onRetry && (
          <Button variant="ghost" size="sm" onClick={onRetry}>
            {retryLabel ?? t.retry}
          </Button>
        )}
      </div>
    );
  }

  if (isEmpty) {
    return <>{empty ?? <p className="px-1 py-2 text-sm text-faint">{emptyText}</p>}</>;
  }

  return <>{children}</>;
}
