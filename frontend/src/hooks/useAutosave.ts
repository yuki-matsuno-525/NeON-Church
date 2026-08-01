"use client";

import { useEffect, useRef, useState } from "react";
import type { Translations } from "@/lib/i18n";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

/**
 * 入力が止まってから少し待って自動で保存する。
 *
 * 記事は長文なので、保存ボタンを押し忘れて消えるのがいちばん困る。
 * 値が変わるたびにタイマーを引き直し、`delay` ミリ秒動きが無ければ保存する。
 * 最初の描画では保存しない（開いただけで保存が走らないように）。
 */
export function useAutosave<T>({
  value,
  onSave,
  delay = 1200,
  enabled = true,
}: {
  value: T;
  onSave: (value: T) => Promise<void>;
  delay?: number;
  enabled?: boolean;
}): SaveStatus {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const isFirstRun = useRef(true);

  useEffect(() => {
    if (!enabled) return;
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }

    // 値が変わるたびにこの効果が動き直すので、タイマーの中の value は常に最新のもの。
    const timer = setTimeout(() => {
      setStatus("saving");
      onSave(value)
        .then(() => setStatus("saved"))
        .catch(() => setStatus("error"));
    }, delay);

    return () => clearTimeout(timer);
  }, [value, onSave, delay, enabled]);

  return status;
}

export function saveStatusLabel(status: SaveStatus, t: Translations): string {
  if (status === "saving") return t.saving;
  if (status === "saved") return t.autosaveSaved;
  if (status === "error") return t.autosaveError;
  return "";
}
