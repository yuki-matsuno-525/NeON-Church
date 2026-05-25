"use client";

import { useEffect, useId, useRef } from "react";
import { useT } from "@/lib/i18n";
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
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      onClick={onCancel}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.65)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        zIndex: 1100,
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 400,
          background: "rgba(16, 9, 50, 0.96)",
          border: "1px solid rgba(145, 80, 240, 0.35)",
          borderRadius: 12,
          padding: "24px 24px 20px",
          boxShadow: "0 20px 60px rgba(0, 0, 0, 0.55)",
        }}
      >
        <h2
          id={titleId}
          style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--text)" }}
        >
          {title}
        </h2>
        {description && (
          <p
            id={descId}
            style={{
              margin: "10px 0 0",
              fontSize: 14,
              lineHeight: 1.6,
              color: "var(--text-muted)",
            }}
          >
            {description}
          </p>
        )}
        <div
          style={{
            display: "flex",
            gap: 10,
            justifyContent: "flex-end",
            marginTop: 20,
          }}
        >
          <Button ref={cancelRef} variant="ghost" onClick={onCancel}>
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
