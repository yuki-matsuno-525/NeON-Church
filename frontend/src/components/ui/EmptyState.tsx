"use client";

import type { ReactNode } from "react";

type Props = {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
};

/** 中身が無いことを伝える共通の枠。ErrorState と同じ見た目の骨格を使う。 */
export function EmptyState({ icon, title, description, action }: Props) {
  return (
    <div
      role="status"
      className="flex flex-col items-center justify-center gap-3 px-6 py-8 text-center text-muted"
    >
      {icon && (
        <div aria-hidden="true" className="text-accent opacity-70">
          {icon}
        </div>
      )}
      <h2 className="m-0 text-md font-bold text-body">{title}</h2>
      {description && (
        <p className="m-0 max-w-sm text-sm leading-base">{description}</p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
