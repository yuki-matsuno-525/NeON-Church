"use client";

import { useId } from "react";
import styles from "./Toggle.module.css";

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
 *
 * 並べ方と文字は Tailwind、スイッチの絵は Toggle.module.css が受け持つ。
 */
export function Toggle({ checked, onChange, label, description, disabled }: Props) {
  const labelId = useId();
  const descId = useId();
  return (
    <div className="flex items-start gap-3">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={labelId}
        aria-describedby={description ? descId : undefined}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={styles.button}
      >
        <span
          aria-hidden="true"
          className={[styles.rail, checked ? styles.railOn : null].filter(Boolean).join(" ")}
        >
          <span className={[styles.knob, checked ? styles.knobOn : null].filter(Boolean).join(" ")} />
        </span>
      </button>
      <div className="min-w-0 flex-1">
        <div id={labelId} className="text-sm font-bold text-body">
          {label}
        </div>
        {description && (
          <p id={descId} className="mt-1 mb-0 text-xs text-muted leading-base">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}
