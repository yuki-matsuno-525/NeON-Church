"use client";

import { useId } from "react";
import { useT } from "@/lib/i18n";
import { useDialogBehavior } from "@/hooks/useDialogBehavior";
import { Button } from "./Button";

type Props = {
  open: boolean;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmText,
  cancelText,
  destructive,
  onConfirm,
  onCancel,
}: Props) {
  const t = useT();
  const titleId = useId();
  const descId = useId();
  // Escape で閉じる・Tab が外へ出ない・閉じたら元の場所へフォーカスを戻す。
  const dialogRef = useDialogBehavior<HTMLDivElement>(open, onCancel);

  if (!open) return null;

  return (
    <div onClick={onCancel} className="dialog-overlay">
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        onClick={(e) => e.stopPropagation()}
        className="panel-floating dialog-panel max-w-sm px-6 pt-6 pb-4"
      >
        <h2 id={titleId} className="m-0 text-md font-bold text-body">
          {title}
        </h2>
        {description && (
          <p id={descId} className="mt-3 mb-0 text-sm text-muted leading-base">
            {description}
          </p>
        )}
        <div className="mt-4 flex justify-end gap-3">
          <Button variant="ghost" onClick={onCancel}>
            {cancelText ?? t.cancel}
          </Button>
          <Button
            variant={destructive ? "destructive" : "primary"}
            onClick={onConfirm}
          >
            {confirmText ?? t.save}
          </Button>
        </div>
      </div>
    </div>
  );
}
