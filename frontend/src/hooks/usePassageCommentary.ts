"use client";

import { useMemo } from "react";
import { fetchPassageCommentary, type CommentaryEntry, type CommentaryKind, type ListPage } from "@/lib/api";
import { useLoadMore } from "@/hooks/useLoadMore";

// 見せ分けごとの1ページの件数。「触れているだけ」は畳んで出すので少なめ。
const PAGE_SIZE: Record<CommentaryKind, number> = { discuss: 20, broad: 20, mention: 10 };

const EMPTY: ListPage<CommentaryEntry> = { results: [], count: 0, hasMore: false, counts: undefined };

/**
 * 節のパネルの「解釈」タブが使う3つの一覧をまとめて持つ。
 *
 *   discuss … この節を直接論じている解釈（上にそのまま並べる）
 *   broad ……… 章全体・書全体についての解釈（別枠で小さく）
 *   mention … 別の話の途中でこの節に触れている箇所（畳んでおく）
 *
 * タブの件数を出すために、3つとも1ページ目は開いた時点で取る。
 * bookSlug が無い（書が決まらない）ときは何も取らない。
 */
export function usePassageCommentary(bookSlug: string | undefined, chapter: number, verse: number) {
  // useLoadMore は関数が変わると1ページ目から読み直す。節が変わったときだけ作り直す。
  const fetchers = useMemo(() => {
    const fetcher = (kind: CommentaryKind) => (page: number) =>
      bookSlug
        ? fetchPassageCommentary({ book: bookSlug, chapter, verse, kind, page, pageSize: PAGE_SIZE[kind] })
        : Promise.resolve(EMPTY);
    return { discuss: fetcher("discuss"), broad: fetcher("broad"), mention: fetcher("mention") };
  }, [bookSlug, chapter, verse]);

  const discuss = useLoadMore(fetchers.discuss);
  const broad = useLoadMore(fetchers.broad);
  const mention = useLoadMore(fetchers.mention);

  return {
    discuss,
    broad,
    mention,
    /** タブに出す件数（3つの合計） */
    total: discuss.total + broad.total + mention.total,
  };
}

export type PassageCommentaryState = ReturnType<typeof usePassageCommentary>;
