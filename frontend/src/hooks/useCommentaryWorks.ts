"use client";

import { useEffect, useState } from "react";
import { fetchCommentaryWork, fetchCommentaryWorks, type CommentaryWork, type CommentaryWorkDetail } from "@/lib/api";

/**
 * 解釈書を選ぶ画面（プランに章を足す・記事に引用する）で使う、解釈書の一覧と1冊の章の一覧。
 * slug を渡すとその本の章も取る。取れなかったら failed が true になり、retry で取り直せる。
 */
export function useCommentaryWorks(slug: string | null) {
  const [works, setWorks] = useState<CommentaryWork[]>([]);
  const [work, setWork] = useState<CommentaryWorkDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [token, setToken] = useState(0);

  useEffect(() => {
    let alive = true;
    fetchCommentaryWorks()
      .then((list) => {
        if (!alive) return;
        setWorks(list);
        setFailed(false);
      })
      .catch(() => {
        if (alive) setFailed(true);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [token]);

  useEffect(() => {
    if (!slug) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setWork(null);
      return;
    }
    let alive = true;
    setLoading(true);
    fetchCommentaryWork(slug)
      .then((detail) => {
        if (!alive) return;
        setWork(detail);
        setFailed(false);
      })
      .catch(() => {
        if (alive) setFailed(true);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [slug, token]);

  return { works, work, loading, failed, retry: () => setToken((value) => value + 1) };
}

/** 解釈書を名前・著者・題で絞る（日本語でも英語でも）。 */
export function matchCommentaryWork(work: CommentaryWork, keyword: string): boolean {
  const normalized = keyword.trim().toLocaleLowerCase();
  if (!normalized) return true;
  return [work.title, work.title_ja, work.author, work.author_ja, work.slug].some((value) =>
    value.toLocaleLowerCase().includes(normalized),
  );
}
