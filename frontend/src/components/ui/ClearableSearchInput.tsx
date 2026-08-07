"use client";

import { useState } from "react";
import { useT } from "@/lib/i18n";

type ClearableSearchInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  ariaLabel: string;
  /** フォーム送信で値を拾う画面用（例 /search の name="q"） */
  name?: string;
  /** 外の <label htmlFor> と結ぶとき用 */
  id?: string;
  /** 開いた直後に入力させたい画面（章ピッカーなど）用 */
  autoFocus?: boolean;
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
  name,
  id,
  autoFocus,
  inputClassName,
  wrapperClassName,
}: ClearableSearchInputProps) {
  const t = useT();
  // 日本語などの変換中は、確定するまで親に伝えず、画面には打った通りの文字を出しておく。
  // 変換の途中で親から値を渡し直されると、React が input の中身を書き換えてしまい、
  // IME に残っている未確定の文字と合わさって「キリスト」が「キリストキリスト」になる。
  const [composing, setComposing] = useState(false);
  const [draft, setDraft] = useState(value);
  const shown = composing ? draft : value;

  return (
    <div
      className={`relative flex items-center ${wrapperClassName ?? ""}`}
    >
      <input
        type="search"
        name={name}
        id={id}
        value={shown}
        onChange={(e) => {
          if (composing) setDraft(e.target.value);
          else onChange(e.target.value);
        }}
        onCompositionStart={(e) => {
          setDraft(e.currentTarget.value);
          setComposing(true);
        }}
        onCompositionEnd={(e) => {
          // 確定した文字だけを一度きり親へ渡す。未確定のかなで検索しにいかずに済む。
          setComposing(false);
          setDraft(e.currentTarget.value);
          onChange(e.currentTarget.value);
        }}
        placeholder={placeholder}
        aria-label={ariaLabel}
        autoComplete="off"
        autoFocus={autoFocus}
        // 消すボタンと文字が重ならないよう、入力があるときだけ右に余白を足す
        className={`${inputClassName ?? ""}${shown ? " has-clear-btn" : ""}`}
      />
      {shown && (
        <button
          type="button"
          onClick={() => {
            setComposing(false);
            setDraft("");
            onChange("");
          }}
          aria-label={t.clearInput}
          className="clear-input-btn"
        >
          &times;
        </button>
      )}
    </div>
  );
}
