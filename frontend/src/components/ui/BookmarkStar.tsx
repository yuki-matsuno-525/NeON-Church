"use client";

import { Icon } from "@/components/ui/Icon";
import { useT } from "@/lib/i18n";

/**
 * お気に入り（栞）の付け外しボタン。節・章・書・翻訳プロジェクトで共通に使う。
 * - active: すでに栞が付いているか
 * - busy : 通信中（連打防止で無効化）
 * - onToggle: クリック時に呼ぶ（付いていれば外す／無ければ付ける、は呼び出し側が判断）
 * 見た目は読書パネルの節☆と揃えている。
 */
export function BookmarkStar({
  active,
  busy = false,
  onToggle,
  size = 16,
  label,
}: {
  active: boolean;
  busy?: boolean;
  onToggle: () => void;
  size?: number;
  label?: string;
}) {
  const t = useT();
  const title = label ?? (active ? t.bookmarkRemove : t.bookmarkAdd);
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={busy}
      aria-pressed={active}
      aria-label={title}
      title={title}
      style={{
        border: "none",
        width: 36,
        height: 36,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        background: "transparent",
        color: active ? "var(--accent)" : "var(--text-muted)",
        cursor: busy ? "default" : "pointer",
        fontFamily: "inherit",
        padding: 0,
        flexShrink: 0,
        filter: active ? "drop-shadow(0 0 4px var(--accent))" : undefined,
      }}
    >
      <Icon name="bookmark" size={size} fill={active ? "currentColor" : "none"} />
    </button>
  );
}
