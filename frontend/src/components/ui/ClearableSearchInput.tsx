"use client";

import type { CSSProperties } from "react";
import { useT } from "@/lib/i18n";

type ClearableSearchInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  ariaLabel: string;
  /** 入力欄に付けるクラス。見た目は基本 .form-control に任せる。 */
  inputClassName?: string;
  /** 幅など、その画面だけの調整が要るときに使う */
  inputStyle?: CSSProperties;
  wrapperClassName?: string;
  wrapperStyle?: CSSProperties;
};

export function ClearableSearchInput({
  value,
  onChange,
  placeholder,
  ariaLabel,
  inputClassName,
  inputStyle,
  wrapperClassName,
  wrapperStyle,
}: ClearableSearchInputProps) {
  const t = useT();

  return (
    <div
      className={`relative flex items-center ${wrapperClassName ?? ""}`}
      style={wrapperStyle}
    >
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        autoComplete="off"
        className={inputClassName}
        // 消すボタンと文字が重ならないよう、入力があるときだけ右に余白を足す
        style={{ ...inputStyle, paddingRight: value ? 48 : inputStyle?.paddingRight }}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label={t.clearInput}
          className="clear-input-btn"
        >
          &times;
        </button>
      )}
    </div>
  );
}
