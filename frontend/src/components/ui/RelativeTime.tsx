"use client";

import { useRelativeTimeDisplay } from "@/lib/i18n";

/**
 * 「3日前」のような、いまとの差で書いた日時。
 *
 * サーバー側で組み立てる画面から使うための小さな部品。初回だけはサーバーと
 * ブラウザで同じ表示にし、hydration 後はブラウザの時計に定期的に追従する。
 */
export function RelativeTime({ dateStr, className }: { dateStr: string; className?: string }) {
  const { label, title } = useRelativeTimeDisplay(dateStr);
  return (
    <time dateTime={dateStr} title={title} className={className}>
      {label}
    </time>
  );
}
