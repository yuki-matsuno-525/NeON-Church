import { useCallback, useEffect, useState } from "react";
import { fetchComments, type Comment } from "@/lib/api";

type Params = {
  verse_id?: string;
  chapter_id?: string;
  book_id?: string;
  // 全バージョン表示用：同じ箇所の各訳の節・章・書idをまとめて渡す。
  verse_ids?: string[];
  chapter_ids?: string[];
  book_ids?: string[];
  all_versions?: boolean;
  ordering?: "new" | "votes";
  tag_id?: string | null;
  translation_project?: string;
};

export function useComments(params: Params) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);

  const { verse_id, chapter_id, book_id, verse_ids, chapter_ids, book_ids, all_versions, ordering, tag_id, translation_project } = params;

  // 配列は毎レンダーで参照が変わるため、文字列キーにして useCallback の依存を安定させる。
  const verseIdsKey = verse_ids?.join(",") ?? "";
  const chapterIdsKey = chapter_ids?.join(",") ?? "";
  const bookIdsKey = book_ids?.join(",") ?? "";

  const reload = useCallback(() => {
    setLoading(true);
    fetchComments({
      verse_id,
      chapter_id,
      book_id,
      verse_ids: verseIdsKey ? verseIdsKey.split(",") : undefined,
      chapter_ids: chapterIdsKey ? chapterIdsKey.split(",") : undefined,
      book_ids: bookIdsKey ? bookIdsKey.split(",") : undefined,
      all_versions,
      ordering,
      tag_id: tag_id ?? undefined,
      translation_project,
    })
      .then(setComments)
      .catch(() => setComments([]))
      .finally(() => setLoading(false));
  }, [verse_id, chapter_id, book_id, verseIdsKey, chapterIdsKey, bookIdsKey, all_versions, ordering, tag_id, translation_project]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reload();
  }, [reload]);

  return { comments, setComments, loading, reload };
}
