"use client";

import type { ReactNode } from "react";
import { Icon, type IconName } from "./Icon";

type Tone = "danger" | "warning";

type Props = {
  /** "danger" は API エラー・権限拒否、"warning" はネット切断などリトライで直る系 */
  tone?: Tone;
  title: string;
  message?: string;
  /** クリックで再読み込み / リトライ。指定するとボタンを描画 */
  onRetry?: () => void;
  retryLabel?: string;
  /** クリックで戻る。指定するとボタンを描画 */
  onBack?: () => void;
  backLabel?: string;
  /** 任意のアクション要素を追加で差し込む */
  extraAction?: ReactNode;
};

export function ErrorState({
  tone = "danger",
  title,
  message,
  onRetry,
  retryLabel = "もう一度試す",
  onBack,
  backLabel = "戻る",
  extraAction,
}: Props) {
  const iconName: IconName = tone === "danger" ? "alert-circle" : "alert-triangle";
  const iconColor = tone === "danger" ? "var(--state-danger)" : "var(--state-warning)";

  return (
    <div
      role="alert"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "40px 24px",
        color: "var(--text-muted)",
        gap: 12,
      }}
    >
      <div aria-hidden="true" style={{ color: iconColor }}>
        <Icon name={iconName} size={36} />
      </div>
      <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--text)" }}>
        {title}
      </h2>
      {message && (
        <p style={{ margin: 0, fontSize: 13, maxWidth: 360, lineHeight: 1.6 }}>{message}</p>
      )}
      {(onRetry || onBack || extraAction) && (
        <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="btn btn-primary"
              style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <Icon name="refresh-cw" size={14} />
              {retryLabel}
            </button>
          )}
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="btn btn-ghost"
              style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <Icon name="arrow-left" size={14} />
              {backLabel}
            </button>
          )}
          {extraAction}
        </div>
      )}
    </div>
  );
}
