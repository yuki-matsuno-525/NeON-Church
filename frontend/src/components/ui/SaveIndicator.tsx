"use client";

import { useT } from "@/lib/i18n";

/**
 * 自動保存の状態を、題の横に小さく出し続ける。
 *
 * 保存ボタンが無い画面では「ちゃんと保存されたか」がわからず不安になるので、
 * 保存中は「保存中…」、終わったら「保存済み ✓」を残しておく。
 * 失敗したときは、直し方と一緒に別の場所（エラーの行）に出すので、ここには何も出さない。
 */
export function SaveIndicator({ status }: { status: "saving" | "saved" | "error" }) {
  const t = useT();
  if (status === "error") return null;
  return (
    <span role="status" className={`text-xs whitespace-nowrap ${status === "saved" ? "text-success" : "text-faint"}`}>
      {status === "saving" ? t.saving : t.savedIndicator}
    </span>
  );
}
