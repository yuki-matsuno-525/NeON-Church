"use client";

import type { ApiError } from "@/lib/api";
import type { settingsCopy } from "@/app/settings/settingsCopy";
import styles from "@/app/settings/SettingsPage.module.css";

/** 設定画面の文言。日本語版と英語版のどちらか。 */
export type SettingsText = (typeof settingsCopy)["ja"] | (typeof settingsCopy)["en"];

/**
 * サーバーが返した理由をそのまま出す。ただし 500 のときは中身が
 * 利用者に意味のない文字列なので、画面側の言い回しに差し替える。
 */
export function errorMessage(error: unknown, fallback: string) {
  const apiError = error as ApiError;
  return apiError?.message && apiError.status !== 500 ? apiError.message : fallback;
}

/** 保存できた・できなかったを、その区画の中で伝える一言。 */
export function InlineMessage({ message }: { message: { type: "success" | "error"; text: string } | null }) {
  if (!message) return null;
  return <p role={message.type === "error" ? "alert" : "status"} aria-live="polite" className={`${styles.message} ${message.type === "error" ? styles.error : styles.success}`}>{message.text}</p>;
}
