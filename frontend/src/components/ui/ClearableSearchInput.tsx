"use client";

import { useT } from "@/lib/i18n";

type ClearableSearchInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  ariaLabel: string;
  /** 入力欄に付けるクラス。見た目は基本 .form-control に任せる。 */
  inputClassName?: string;
  /** 幅など、その画面だけの調整が要るときに使う */
  wrapperClassName?: string;
};

export function ClearableSearchInput({
  value,
  onChange,
  placeholder,
  ariaLabel,
  inputClassName,
  wrapperClassName,
}: ClearableSearchInputProps) {
  const t = useT();

  return (
    <div
      className={`relative flex items-center ${wrapperClassName ?? ""}`}
    >
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        autoComplete="off"
        // 消すボタンと文字が重ならないよう、入力があるときだけ右に余白を足す
        className={`${inputClassName ?? ""}${value ? " has-clear-btn" : ""}`}
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
