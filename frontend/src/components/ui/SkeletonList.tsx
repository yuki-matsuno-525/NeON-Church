// この部品は受け取ったものを描くだけで、押した・入力したといった出来事を
// 扱わない。そのためサーバー側で組み立てる画面からもそのまま使える
// （"use client" を付けると、使う側がサーバーでもブラウザ側に回ってしまう）。
import { Skeleton } from "./Skeleton";

type Props = {
  /** カード何枚並べるか */
  count?: number;
  /** 各カードの上下余白 */
  gap?: number;
};

/**
 * リスト用の loading プレースホルダ。
 * タイトル行 + 本文 2 行 + メタ行 を持つカードを count 個並べる。
 */
export function SkeletonList({ count = 3, gap = 12 }: Props) {
  return (
    <div
      data-testid="skeleton-list"
      aria-live="polite"
      aria-busy="true"
      style={{ display: "flex", flexDirection: "column", gap }}
    >
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className="py-4 px-4 border border-border rounded-md bg-bg-alt flex flex-col gap-3"
        >
          <Skeleton width="40%" height={14} />
          <Skeleton width="100%" height={12} />
          <Skeleton width="80%" height={12} />
          <Skeleton width="30%" height={10} />
        </div>
      ))}
    </div>
  );
}
