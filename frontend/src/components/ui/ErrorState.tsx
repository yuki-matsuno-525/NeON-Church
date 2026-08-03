"use client";

import type { ReactNode } from "react";
import { Icon, type IconName } from "./Icon";
import { useT } from "@/lib/i18n";

type Tone = "danger" | "warning";

type Props = {
  /** "danger" は API エラー・権限拒否、"warning" はネット切断などリトライで直る系 */
  tone?: Tone;
  title: string;
  message?: string;
  /** クリックで再読み込み / リトライ。指定するとボタンを描画 */
  onRetry?: () => void;
  /** 省略時は表示言語に合わせた「もう一度試す」 */
  retryLabel?: string;
  /** クリックで戻る。指定するとボタンを描画 */
  onBack?: () => void;
  /** 省略時は表示言語に合わせた「戻る」 */
  backLabel?: string;
  /** 任意のアクション要素を追加で差し込む */
  extraAction?: ReactNode;
};

export function ErrorState({
  tone = "danger",
  title,
  message,
  onRetry,
  retryLabel,
  onBack,
  backLabel,
  extraAction,
}: Props) {
  // ボタンの文言は表示言語に合わせる（以前は日本語で固定されていた）。
  const t = useT();
  const retryText = retryLabel ?? t.retry;
  const backText = backLabel ?? t.back;
  const iconName: IconName = tone === "danger" ? "alert-circle" : "alert-triangle";
  const iconClass = tone === "danger" ? "text-danger" : "text-warning";

  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center gap-3 px-6 py-8 text-center text-muted"
    >
      <div aria-hidden="true" className={iconClass}>
        <Icon name={iconName} size={36} />
      </div>
      <h2 className="m-0 text-md font-bold text-body">{title}</h2>
      {message && <p className="m-0 max-w-sm text-sm leading-base">{message}</p>}
      {(onRetry || onBack || extraAction) && (
        /* 並び方と間隔だけを指定する。ボタン自身の見た目は .btn が持つ。 */
        <div className="mt-2 flex flex-wrap justify-center gap-2">
          {onRetry && (
            <button type="button" onClick={onRetry} className="btn btn-primary">
              <Icon name="refresh-cw" size={14} />
              {retryText}
            </button>
          )}
          {onBack && (
            <button type="button" onClick={onBack} className="btn btn-ghost">
              <Icon name="arrow-left" size={14} />
              {backText}
            </button>
          )}
          {extraAction}
        </div>
      )}
    </div>
  );
}
