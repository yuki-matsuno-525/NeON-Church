"use client";

import { useState, type ReactNode } from "react";
import { useIsMobile } from "@/hooks/useIsMobile";
import { ColumnTabs, ListColumn } from "@/components/list";
import type { Tone } from "@/components/list/tone";
import type { IconName } from "@/components/ui/Icon";

export type BoardColumn = {
  key: string;
  icon: IconName;
  tone: Tone;
  title: string;
  description: string;
  /** 見出しの横に出す総数（サーバーが数えたもの） */
  count: number;
  /** 列の中身。サーバー側で組み立てたものがそのまま渡ってくる */
  body: ReactNode;
};

type Props = {
  columns: BoardColumn[];
  /** タブ全体が何のタブなのか（読み上げ用） */
  label: string;
  /** id を組み立てる前置き */
  idPrefix: string;
};

/**
 * 状態ごとに列を並べるボードと、スマホでの列切り替えタブ。
 *
 * 中身（カード）はサーバーが組み立てたものを受け取るだけ。ここが持っている
 * 状態は「スマホでどの列を見せているか」だけで、データには触らない。
 */
export function TranslationBoard({ columns, label, idPrefix }: Props) {
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState(columns[0]?.key ?? "");

  return (
    <>
      {/* スマホだけカラム切り替えタブを出す。PC はタブなしで横並び。 */}
      {isMobile && (
        <ColumnTabs
          tabs={columns.map((col) => ({ key: col.key, tone: col.tone, label: col.title }))}
          active={activeTab}
          onChange={setActiveTab}
          label={label}
          idPrefix={idPrefix}
        />
      )}
      <div className="list-board">
        {columns.map((col) => (
          <ListColumn
            key={col.key}
            icon={col.icon}
            tone={col.tone}
            title={col.title}
            count={col.count}
            description={col.description}
            hidden={isMobile && col.key !== activeTab}
            id={`${idPrefix}-panel-${col.key}`}
            labelledBy={isMobile ? `${idPrefix}-tab-${col.key}` : undefined}
          >
            {col.body}
          </ListColumn>
        ))}
      </div>
    </>
  );
}
