"use client";

import { handleHorizontalTabListKeyDown } from "@/lib/a11y";
import { toneClass, type Tone } from "./tone";

export type ColumnTab<K extends string> = {
  key: K;
  label: string;
  /** 選ばれているときの色。list.css の tone-* から選ぶ（色の値は書かない） */
  tone: Tone;
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
            className={`column-tab ${toneClass(tab.tone)}`}
          >
            {tab.label}
            {tab.count !== undefined && ` (${tab.count})`}
          </button>
        );
      })}
    </div>
  );
}
