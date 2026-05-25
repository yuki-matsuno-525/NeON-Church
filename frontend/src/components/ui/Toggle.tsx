"use client";

import { useId } from "react";

type Props = {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
};

/**
 * スイッチ型 (ON/OFF) のトグル。aria-pressed 付きボタンとして実装。
 * ラベルと説明文を含む 1 ブロックで使うことを想定。
 */
export function Toggle({ checked, onChange, label, description, disabled }: Props) {
  const descId = useId();
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-describedby={description ? descId : undefined}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        style={{
          flexShrink: 0,
          width: 40,
          height: 22,
          borderRadius: 999,
          border: "1px solid var(--border)",
          background: checked ? "var(--accent)" : "rgba(255,255,255,0.08)",
          position: "relative",
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.6 : 1,
          transition: "background 0.15s",
          padding: 0,
        }}
      >
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            top: 2,
            left: checked ? 20 : 2,
            width: 16,
            height: 16,
            borderRadius: "50%",
            background: "#fff",
            transition: "left 0.15s",
          }}
        />
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, color: "var(--text)", fontWeight: 600 }}>{label}</div>
        {description && (
          <p id={descId} style={{ margin: "4px 0 0", fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6 }}>
            {description}
          </p>
        )}
      </div>
    </div>
  );
}
