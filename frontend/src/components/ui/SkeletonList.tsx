"use client";

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
          style={{
            padding: "16px 18px",
            border: "1px solid var(--border)",
            borderRadius: 10,
            background: "var(--bg-alt)",
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
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
