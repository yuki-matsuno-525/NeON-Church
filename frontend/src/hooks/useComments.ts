import { useCallback, useEffect, useState } from "react";
import { fetchComments, type Comment } from "@/lib/api";

type Params = {
  verse_id?: string;
  chapter_id?: string;
  book_id?: string;
  ordering?: "new" | "votes";
  tag_id?: string | null;
  translation_project?: string;
};

export function useComments(params: Params) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);

  const { verse_id, chapter_id, book_id, ordering, tag_id, translation_project } = params;

  const reload = useCallback(() => {
    setLoading(true);
    fetchComments({
      verse_id,
      chapter_id,
      book_id,
      ordering,
      tag_id: tag_id ?? undefined,
      translation_project,
    })
      .then(setComments)
      .catch(() => setComments([]))
      .finally(() => setLoading(false));
  }, [verse_id, chapter_id, book_id, ordering, tag_id, translation_project]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reload();
  }, [reload]);

  return { comments, setComments, loading, reload };
}
