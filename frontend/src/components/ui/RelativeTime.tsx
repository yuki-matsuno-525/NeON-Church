"use client";

import { useRelativeTime } from "@/lib/i18n";

/**
 * 「3日前」のような、いまとの差で書いた日時。
 *
 * サーバー側で組み立てる画面から使うための小さな部品。差はブラウザの時計で
 * 数える必要があるので、ここだけはブラウザ側で描く（サーバーで数えると、
 * 画面を開いたままの人にとって時間が止まって見える）。
 */
export function RelativeTime({ dateStr, className }: { dateStr: string; className?: string }) {
  const formatRelativeTime = useRelativeTime();
  return (
    <time dateTime={dateStr} title={new Date(dateStr).toLocaleString()} className={className}>
      {formatRelativeTime(dateStr)}
    </time>
  );
}
