"use client";

import { useEffect, useState } from "react";

/**
 * 手順の多い編集画面の上に置く、たためる「使い方」。
 *
 * はじめて開いたときだけ開いた状態で出し、一度たたんだら次からはたたんだまま出す。
 * 覚えるのはこの端末だけ（localStorage）。覚えられない環境でも、たたんだまま出るだけで困らない。
 */
export function HowToGuide({ id, title, steps, note }: {
  /** 開け閉めを覚えるための名前。画面ごとに別にする。 */
  id: string;
  title: string;
  steps: string[];
  note?: string;
}) {
  const storageKey = `neon_guide_closed_${id}`;
  const [open, setOpen] = useState(false);

  // サーバーでは localStorage が読めないので、たたんだ状態で描いてから開く。
  useEffect(() => {
    try {
      if (localStorage.getItem(storageKey) !== "1") setOpen(true);
    } catch {
      // 読めなければたたんだまま。
    }
  }, [storageKey]);

  const handleToggle = (event: React.SyntheticEvent<HTMLDetailsElement>) => {
    const nextOpen = event.currentTarget.open;
    setOpen(nextOpen);
    try {
      if (nextOpen) localStorage.removeItem(storageKey);
      else localStorage.setItem(storageKey, "1");
    } catch {
      // 覚えられなくても、開け閉めそのものはできる。
    }
  };

  return (
    <details open={open} onToggle={handleToggle} className="border border-border rounded-lg px-3 py-2 mb-3 text-sm">
      <summary className="cursor-pointer tap-target flex items-center text-muted">{title}</summary>
      <ol className="mt-1 mb-0 pl-5 leading-reading list-decimal">
        {steps.map((step) => <li key={step}>{step}</li>)}
      </ol>
      {note && <p className="mt-2 mb-1 mx-0 text-xs text-muted leading-reading">{note}</p>}
    </details>
  );
}
