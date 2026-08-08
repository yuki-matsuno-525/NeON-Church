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
  /** 列の中身。サーバー側で組み立てたものがそのまま渡ってくる */
  body: ReactNode;
};

/**
 * 列が n 本入りきる画面幅。これを下回ったらタブに切り替える。
 *
 *   列 1 本 = 300px（list.css の .list-board の minmax）
 *   列の間 = 16px（gap）
 *   さらにサイドバー 200px と .page の左右余白 32px が要る
 *
 * 以前は列の数に関わらず 640px（スマホ）で切り替えていたので、
 * たとえば 3 列の画面では 641〜1163px のあいだ 2 列しか入らず、
 * 3 本目だけが 2 段目に落ちて崩れていた。
 */
function widthForColumns(count: number): number {
  return 300 * count + 16 * (count - 1) + 200 + 32;
}

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
  const isMobile = useIsMobile(widthForColumns(columns.length) - 1);
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
