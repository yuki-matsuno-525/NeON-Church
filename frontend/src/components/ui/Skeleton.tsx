// この部品は受け取ったものを描くだけで、押した・入力したといった出来事を
// 扱わない。そのためサーバー側で組み立てる画面からもそのまま使える
// （"use client" を付けると、使う側がサーバーでもブラウザ側に回ってしまう）。
import type { CSSProperties } from "react";

type Props = {
  width?: number | string;
  height?: number | string;
  radius?: number | string;
  style?: CSSProperties;
  /** 連続表示時の上下マージン */
  inline?: boolean;
};

export function Skeleton({ width, height = 14, radius = 4, style, inline }: Props) {
  return (
    <span
      aria-hidden="true"
      data-testid="skeleton"
      style={{
        display: inline ? "inline-block" : "block",
        width: width ?? "100%",
        height,
        borderRadius: radius,
        background:
          "linear-gradient(90deg, rgba(160,140,220,0.10) 0%, rgba(160,140,220,0.22) 50%, rgba(160,140,220,0.10) 100%)",
        backgroundSize: "200% 100%",
        animation: "skeleton-shimmer 1.4s ease-in-out infinite",
        ...style,
      }}
    />
  );
}
