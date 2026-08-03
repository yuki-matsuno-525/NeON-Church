"use client";

import { useId } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useT } from "@/lib/i18n";
import { useDialogBehavior } from "@/hooks/useDialogBehavior";

type Props = {
  onClose: () => void;
  // 文言を差し替えたい場合（例: セッション切れ）に渡す。未指定なら「ログインが必要です」。
  title?: string;
  description?: string;
  from?: string;
};

export function LoginRequiredModal({ onClose, title, description, from }: Props) {
  const pathname = usePathname();
  const t = useT();
  const titleId = useId();
  const descriptionId = useId();
  const currentLocation = typeof window === "undefined"
    ? pathname
    : `${window.location.pathname}${window.location.search}${window.location.hash}`;
  const loginHref = `/login?from=${encodeURIComponent(from ?? currentLocation)}`;
  // ダイアログとして正しく振る舞わせる（Escape で閉じる・Tab が外へ出ない・閉じたら元へ戻る）。
  const dialogRef = useDialogBehavior<HTMLDivElement>(true, onClose);

  return (
    <div onClick={onClose} className="dialog-overlay">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onClick={(e) => e.stopPropagation()}
        className="dialog-panel max-w-sm p-6 text-center"
      >
        <h2 id={titleId} className="mt-0 mb-2 text-md font-bold">
          {title ?? t.loginRequired}
        </h2>
        <p id={descriptionId} className="mt-0 mb-6 text-sm text-muted">
          {description ?? t.loginRequiredDesc}
        </p>
        {/* ボタンの見た目は .btn / .btn-* が唯一の出どころ。
            以前はここでグラデーションを書き直していたため、ボタンの色を
            変えても、この画面だけ古い色のまま残っていた。 */}
        <div className="flex justify-center gap-3">
          <button type="button" onClick={onClose} className="btn btn-ghost">
            {t.close}
          </button>
          <Link href={loginHref} className="btn btn-primary">
            {t.loginBtn}
          </Link>
        </div>
      </div>
    </div>
  );
}
