"use client";

import { useRouter } from "next/navigation";
import { Button } from "./Button";
import { useT } from "@/lib/i18n";

/**
 * サーバーに画面を組み立て直してもらうボタン。
 *
 * サーバー側で組み立てる画面は、失敗しても自分では取り直せない
 * （取りに行っているのはブラウザではないため）。押されたら
 * 同じ URL をサーバーへ頼み直す。
 */
export function RetryButton({ label }: { label?: string }) {
  const router = useRouter();
  const t = useT();
  return (
    <Button variant="ghost" size="sm" onClick={() => router.refresh()}>
      {label ?? t.retry}
    </Button>
  );
}
