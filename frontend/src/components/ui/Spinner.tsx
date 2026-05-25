"use client";

import { useT } from "@/lib/i18n";

type Props = {
  size?: number;
  /** SR 用ラベル。未指定なら t.loading を使う */
  label?: string;
};

export function Spinner({ size = 18, label }: Props) {
  const t = useT();
  return (
    <span
      role="status"
      aria-live="polite"
      style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        aria-hidden="true"
        style={{ animation: "spinner-rotate 0.8s linear infinite", flexShrink: 0 }}
      >
        <circle
          cx="12"
          cy="12"
          r="9"
          fill="none"
          stroke="currentColor"
          strokeOpacity="0.25"
          strokeWidth="3"
        />
        <path
          d="M12 3 a9 9 0 0 1 9 9"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
      <span className="sr-only">{label ?? t.loading}</span>
    </span>
  );
}
