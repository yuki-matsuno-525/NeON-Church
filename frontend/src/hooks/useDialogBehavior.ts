"use client";

import { useEffect, useRef } from "react";

/** Tab で移動できる要素。フォーカスを内側に閉じ込めるために使う。 */
const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * ダイアログとして正しく振る舞うための共通処理。
 *
 * ダイアログは「開いたらその中だけを操作する」ものなので、次の4つが要る。
 * これが無いと、キーボードだけの人は背後の画面へ迷い込み、戻り方も分からなくなる。
 *
 * 1. 開いたら中の要素へフォーカスを移す
 * 2. Tab が外へ出ないよう内側で折り返す
 * 3. Escape で閉じられる
 * 4. 閉じたら開く前に触っていた場所へフォーカスを戻す
 *
 * 戻り値の ref をダイアログの外枠に付けて使う。
 */
export function useDialogBehavior<T extends HTMLElement>(open: boolean, onClose: () => void) {
  const ref = useRef<T>(null);
  // 開く前にフォーカスがあった場所。閉じたときにここへ戻す。
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;

    const node = ref.current;
    const focusables = () => Array.from(node?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);
    // 中に押せるものが無ければ枠自体へ移す（読み上げの開始位置を中に入れるため）。
    (focusables()[0] ?? node)?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const items = focusables();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      // 端に来たら反対側へ折り返し、背後の画面へ出さない。
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    // キー操作は最終的に window まで上がってくるので、ここで受けると取りこぼしがない。
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      previouslyFocused.current?.focus();
    };
  }, [open, onClose]);

  return ref;
}
