"use client";

import { useCallback, type ReactNode } from "react";
import { fetchQuestionPage, type ListPage, type QAQuestion } from "@/lib/api";
import { useLoadMore } from "@/hooks/useLoadMore";
import { AsyncPagedList } from "@/components/ui";
import { QACard } from "./QACard";

type Props = {
  /** 解決済みのタブなら true。未解決なら false */
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
  /** 0 件のときに出すもの（このタブには無い、という案内） */
  empty: ReactNode;
};

/**
 * Q&A 一覧の 1 タブ分。
 *
 * 1 ページ目はサーバーが取って initial で渡してくる。ここが受け持つのは
 * 「もっと見る」で続きを読み足すところだけ。
 *
 * 解決済みと未解決は別々に取る。全件取ってから画面側で振り分けていた頃は、
 * 件数が「読み込めた分」の数になり、片方だけ増えると破綻していた。
 *
 * カードに解決済み／未解決の札は出さない。タブでもう分かれているため。
 */
export function QAQuestionFeed({ answered, bookId, tagId, q, initial, empty }: Props) {
  const fetchPage = useCallback(
    (page: number) => fetchQuestionPage({ book_id: bookId, tag_id: tagId, q, answered, page }),
    [bookId, tagId, q, answered],
  );
  const list = useLoadMore(fetchPage, initial);

  return (
    <AsyncPagedList list={list} empty={empty}>
      <div className="flex flex-col gap-3">
        {list.items.map((question) => (
          <QACard key={question.id} question={question} showStatus={false} />
        ))}
      </div>
    </AsyncPagedList>
  );
}
