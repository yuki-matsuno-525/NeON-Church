"use client";

import { useEffect, useState } from "react";

/**
 * 値の変化を少し待ってから返す。検索欄の「打つたびに問い合わせる」を防ぐために使う。
 *
 * 検索文字列をそのまま API の条件に渡すと、1文字打つたびにリクエストが飛ぶ。
 * Q&A は2列・翻訳企画は3列あるので、1文字で2〜3本ぶん無駄になっていた。
 * 手が止まってから投げるようにすると、体感は変わらないまま通信が激減する。
 *
 * 打ち終わる前に画面を離れても、後片付け（clearTimeout）で余分な更新は起きない。
 */
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
