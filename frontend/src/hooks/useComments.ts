"use client";

import { useCallback } from "react";
import { fetchCommentPage, type Comment } from "@/lib/api";
import { useLoadMore } from "./useLoadMore";

type Params = {
  verse_id?: string;
  chapter_id?: string;
  book_id?: string;
  ordering?: "new" | "votes";
  tag_id?: string | null;
  translation_project?: string;
};

/**
 * 箇所に付いた**親コメント**を「もっと見る」で読み足す。
 *
 * 返信はここには含まれない（コメントを開いたときに CommentItem が親ごとに取る）。
 * 以前は親と返信を混ぜた1本の列を全部取って画面側で組み直していたが、ページで
 * 区切ると親と返信が別ページに分かれ、親が見つからない返信が何も言わずに
 * 画面から消えていた。
 */
export function useComments(params: Params) {
  const { verse_id, chapter_id, book_id, ordering, tag_id, translation_project } = params;

  const fetchPage = useCallback(
    (page: number) =>
      fetchCommentPage({
        verse_id,
        chapter_id,
        book_id,
        ordering,
        tag_id: tag_id ?? undefined,
        translation_project,
        page,
      }),
    [verse_id, chapter_id, book_id, ordering, tag_id, translation_project]
  );

  const { items, setItems, total, loading, loadingMore, hasMore, loadMore, reload } =
    useLoadMore<Comment, undefined>(fetchPage);

  return {
    comments: items,
    setComments: setItems,
    total,
    loading,
    loadingMore,
    hasMore,
    loadMore,
    reload,
  };
}
