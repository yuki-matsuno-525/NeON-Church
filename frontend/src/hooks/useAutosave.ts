"use client";

import { useEffect, useRef, useState } from "react";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

/**
 * 入力が止まってから delay ミリ秒後に save を呼ぶ。保存ボタンを押さなくても書いたものが残る。
 *
 * - 画面を開いただけでは保存しない（最初の値は保存済みとして扱う）
 * - 前に保存した値と同じなら保存しない
 * - 戻り値は今の保存状態。画面に「保存中...」「保存しました」を出すのに使う
 */
export function useAutosave<T>(value: T, save: (value: T) => Promise<unknown>, delay = 800): SaveStatus {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const saveRef = useRef(save);
  const savedValueRef = useRef(value);
  const isFirstRender = useRef(true);

  useEffect(() => {
    saveRef.current = save;
  });

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      savedValueRef.current = value;
      return;
    }
    if (JSON.stringify(value) === JSON.stringify(savedValueRef.current)) return;

    setStatus("saving");
    const timer = setTimeout(() => {
      const target = value;
      saveRef
        .current(target)
        .then(() => {
          savedValueRef.current = target;
          setStatus("saved");
        })
        .catch(() => setStatus("error"));
    }, delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return status;
}

export function saveStatusLabel(status: SaveStatus): string {
  if (status === "saving") return "保存中...";
  if (status === "saved") return "保存しました";
  if (status === "error") return "保存できませんでした";
  return "";
}
