"use client";

import { useState, useRef } from "react";

/**
 * @ で参加者を呼び出せる入力欄。作業メモを書くところで使う。
 *
 * カーソルの直前にある @xxx だけを見て候補を出し、選んだら
 * その部分だけを置き換える（後ろの文章はそのまま残す）。
 */
export function MentionInput({
  value,
  onChange,
  onSubmit,
  members,
  placeholder,
  sendLabel,
  requiredMessage,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  members: string[];
  placeholder: string;
  sendLabel: string;
  requiredMessage: string;
}) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // カーソルより前の部分の末尾にある @xxx を探して候補を更新する
  const refreshSuggestions = (text: string, caret: number) => {
    const match = text.slice(0, caret).match(/@([\w]*)$/);
    if (match) {
      const q = match[1].toLowerCase();
      setSuggestions(members.filter((m) => m.toLowerCase().startsWith(q) && m !== "").slice(0, 5));
    } else {
      setSuggestions([]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
    refreshSuggestions(e.target.value, e.target.selectionStart);
  };

  const handleSelect = (username: string) => {
    const el = textareaRef.current;
    const caret = el ? el.selectionStart : value.length;
    // カーソル位置の @xxx だけを置換し、後ろの文章はそのまま残す
    const before = value.slice(0, caret).replace(/@[\w]*$/, `@${username} `);
    const after = value.slice(caret);
    onChange(before + after);
    setSuggestions([]);
    // 置換後、カーソルを挿入した直後に戻す
    requestAnimationFrame(() => {
      if (el) {
        el.focus();
        el.selectionStart = el.selectionEnd = before.length;
      }
    });
  };

  const handleSubmit = () => {
    // 空のまま押せたときは理由を出す。押せなくして黙って止めると理由が伝わらない。
    if (!value.trim()) {
      setError(requiredMessage);
      return;
    }
    setError(null);
    setSuggestions([]);
    onSubmit();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter は改行。Ctrl/Cmd+Enter で送信。
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="relative mt-2">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onClick={(e) => refreshSuggestions(e.currentTarget.value, e.currentTarget.selectionStart)}
        placeholder={placeholder}
        aria-label={placeholder}
        aria-autocomplete="list"
        rows={2}
        className="form-control resize-y text-sm leading-base"
      />
      {suggestions.length > 0 && (
        <ul role="listbox" className="mention-list">
          {suggestions.map((s) => (
            <li key={s} role="option" aria-selected="false">
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => handleSelect(s)}
                className="mention-option"
              >
                @{s}
              </button>
            </li>
          ))}
        </ul>
      )}
      {error && (
        <p role="alert" aria-live="polite" className="text-danger text-xs mt-1 mx-0 mb-0">
          {error}
        </p>
      )}
      <div className="flex justify-end mt-2">
        <button
          type="button"
          onClick={handleSubmit}
          className="tap-target py-2 px-4 border-0 rounded-md bg-accent text-bg font-bold text-sm cursor-pointer"
        >
          {sendLabel}
        </button>
      </div>
    </div>
  );
}
