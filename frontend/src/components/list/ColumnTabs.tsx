"use client";

import { handleHorizontalTabListKeyDown } from "@/lib/a11y";

export type ColumnTab<K extends string> = {
  key: K;
  label: string;
  /** 選ばれているときの文字と枠の色 */
  color: string;
  /** 選ばれているときの背景色 */
  tint: string;
  /** ラベルの後ろに出す件数。省略すると数を出さない */
  count?: number;
};

type Props<K extends string> = {
  tabs: ColumnTab<K>[];
  active: K;
  onChange: (key: K) => void;
  /** タブ全体が何のタブなのか（読み上げ用） */
  label: string;
  /** id を組み立てる前置き。ListColumn には `${idPrefix}-panel-${key}` を渡す */
  idPrefix: string;
};

/**
 * スマホで 1 カラムずつ切り替えるためのタブ。PC ではカラムを横並びにするので出さない。
 *
 * qa / translations が同じ見た目のタブを別々に書いていた。左右キーでの移動は
 * lib/a11y.ts の共通処理に任せる。
 */
export function ColumnTabs<K extends string>({ tabs, active, onChange, label, idPrefix }: Props<K>) {
  return (
    <div
      role="tablist"
      aria-label={label}
      onKeyDown={handleHorizontalTabListKeyDown}
      className="flex gap-2 mb-4"
    >
      {tabs.map((tab) => {
        const isActive = tab.key === active;
        return (
          <button
            key={tab.key}
            type="button"
            id={`${idPrefix}-tab-${tab.key}`}
            role="tab"
            aria-selected={isActive}
            aria-controls={`${idPrefix}-panel-${tab.key}`}
            // 選ばれていないタブは Tab キーで飛ばし、左右キーで移動させる
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(tab.key)}
            style={{
              flex: 1,
              minHeight: 44,
              padding: "8px 6px",
              border: `1px solid ${isActive ? tab.color : "var(--border)"}`,
              borderRadius: 8,
              background: isActive ? tab.tint : "var(--bg-alt)",
              color: isActive ? tab.color : "var(--text-muted)",
              fontWeight: isActive ? 700 : 600,
              fontSize: 13,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            {tab.label}
            {tab.count !== undefined && ` (${tab.count})`}
          </button>
        );
      })}
    </div>
  );
}
