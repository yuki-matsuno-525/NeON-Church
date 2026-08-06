"use client";

import { useState } from "react";
import type { ListPage, QAQuestion } from "@/lib/api";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useT } from "@/lib/i18n";
import { ColumnTabs } from "@/components/list";
import type { Tone } from "@/components/list/tone";
import type { IconName } from "@/components/ui/Icon";
import { QAQuestionColumn } from "./QAQuestionColumn";

// 翻訳プロジェクト一覧と同じ「解決済み / 未解決」の 2 列ボード。
type ColumnKey = "answered" | "unanswered";
const COLUMNS: { key: ColumnKey; icon: IconName; tone: Tone; answered: boolean }[] = [
  { key: "answered",   icon: "check-circle", tone: "ok",   answered: true },
  { key: "unanswered", icon: "help-circle",  tone: "wait", answered: false },
];

type Props = {
  /** 絞り込み。変わると列を作り直す */
  bookId?: string;
  tagId?: string;
  q?: string;
  /** サーバーが取り終えた 1 ページ目。取れなかった列は省略される */
  answered?: ListPage<QAQuestion>;
  unanswered?: ListPage<QAQuestion>;
};

/**
 * Q&A 一覧の 2 列と、スマホでの列切り替えタブ。
 *
 * 中身はサーバーが取ってから渡ってくる。ここに残っているのは
 * 「どちらの列を見せるか」と「もっと見る」だけ。
 *
 * 絞り込みが変わると URL が変わり、サーバーが新しい 1 ページ目を返す。
 * 列は key で作り直して、その 1 ページ目から始め直す
 * （作り直さないと、せっかく届いた中身を捨ててブラウザ側が取り直してしまう）。
 */
export function QABoard({ bookId, tagId, q, answered, unanswered }: Props) {
  const t = useT();
  const isMobile = useIsMobile();
  // スマホでは1カラムずつタブ切り替え。既定は「未解決」（回答が必要な列）。
  const [activeTab, setActiveTab] = useState<ColumnKey>("unanswered");

  const initialOf = (key: ColumnKey) => (key === "answered" ? answered : unanswered);
  const labelOf = (key: ColumnKey) => (key === "answered" ? t.filterAnswered : t.filterUnanswered);
  const descOf = (key: ColumnKey) => (key === "answered" ? t.qaColAnsweredDesc : t.qaColUnansweredDesc);
  const filterKey = `${bookId ?? ""}|${tagId ?? ""}|${q ?? ""}`;

  return (
    <>
      {/* スマホだけカラム切り替えタブを出す。PC はタブなしで2カラムを横並び。 */}
      {isMobile && (
        <ColumnTabs
          // 表示中の件数ではなく、サーバーが数えたその列の総数
          tabs={COLUMNS.map((col) => ({
            key: col.key,
            tone: col.tone,
            label: labelOf(col.key),
            count: initialOf(col.key)?.count,
          }))}
          active={activeTab}
          onChange={setActiveTab}
          label={t.qaTitle}
          idPrefix="qa"
        />
      )}
      <div className="list-board">
        {COLUMNS.map((col) => (
          <QAQuestionColumn
            key={`${col.key}|${filterKey}`}
            title={labelOf(col.key)}
            description={descOf(col.key)}
            icon={col.icon}
            tone={col.tone}
            answered={col.answered}
            bookId={bookId}
            tagId={tagId}
            q={q}
            initial={initialOf(col.key)}
            emptyText={t.qaEmptyColumn}
            hidden={isMobile && col.key !== activeTab}
            id={`qa-panel-${col.key}`}
            labelledBy={isMobile ? `qa-tab-${col.key}` : undefined}
          />
        ))}
      </div>
    </>
  );
}
