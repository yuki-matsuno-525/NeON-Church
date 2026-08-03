"use client";

import type { ReactNode } from "react";

type Props = {
  title: string;
  description?: string;
  /** 右側に置く導線（「＋ 新規作成」など）。無ければ見出しだけになる */
  action?: ReactNode;
};

/**
 * 一覧画面の一番上。左に見出しと説明、右に新規作成などの導線を置く。
 *
 * qa / articles / plans / translations の 4 画面が同じ形をそれぞれ書いていた。
 */
export function ListPageHeader({ title, description, action }: Props) {
  return (
    <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
      <div>
        <h1 className="m-0 text-lg font-bold">{title}</h1>
        {description && <p className="mt-1 mb-0 text-sm text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}
