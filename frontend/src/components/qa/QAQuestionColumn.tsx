"use client";

import { useCallback } from "react";
import { fetchQuestionPage, type ListPage, type QAQuestion } from "@/lib/api";
import { useLoadMore } from "@/hooks/useLoadMore";
import { AsyncPagedList } from "@/components/ui";
import { ListColumn } from "@/components/list";
import type { Tone } from "@/components/list/tone";
import type { IconName } from "@/components/ui/Icon";
import { QACard } from "./QACard";

type Props = {
  title: string;
  description: string;
  icon: IconName;
  /** 列の色。list.css の tone-* から選ぶ */
  tone: Tone;
  /** 解決済みの列なら true。未解決なら false */
  answered: boolean;
  /** 絞り込み。文字で受け取るのは、変わったときだけ取り直すため */
  bookId?: string;
  tagId?: string;
  q?: string;
  /**
   * サーバーが取り終えた 1 ページ目。
   * 取れなかったときは省略する。その場合だけブラウザ側が取りに行く。
   */
  initial?: ListPage<QAQuestion>;
  /** 0 件のときの一行メッセージ */
  emptyText: string;
  /** スマホのタブ切り替えで、選ばれていない列を隠すとき true */
  hidden?: boolean;
  id?: string;
  labelledBy?: string;
};

/**
 * Q&A 一覧の 1 列分。
 *
 * 1 ページ目はサーバーが取って initial で渡してくる。ここが受け持つのは
 * 「もっと見る」で続きを読み足すところだけ。
 *
 * 列ごとに独立して読み足す。全件取ってから画面側で 2 列に振り分けていた頃は、
 * 件数バッジが「読み込めた分」の数になり、片方の列だけ増えると破綻していた。
 */
export function QAQuestionColumn({
  title,
  description,
  icon,
  tone,
  answered,
  bookId,
  tagId,
  q,
  initial,
  emptyText,
  hidden,
  id,
  labelledBy,
}: Props) {
  const fetchPage = useCallback(
    (page: number) => fetchQuestionPage({ book_id: bookId, tag_id: tagId, q, answered, page }),
    [bookId, tagId, q, answered],
  );
  const list = useLoadMore(fetchPage, initial);

  return (
    <ListColumn
      icon={icon}
      tone={tone}
      title={title}
      description={description}
      busy={list.loading}
      hidden={hidden}
      id={id}
      labelledBy={labelledBy}
    >
      <AsyncPagedList list={list} emptyText={emptyText}>
        <div className="flex flex-col gap-3">
          {list.items.map((question) => (
            <QACard key={question.id} question={question} />
          ))}
        </div>
      </AsyncPagedList>
    </ListColumn>
  );
}
