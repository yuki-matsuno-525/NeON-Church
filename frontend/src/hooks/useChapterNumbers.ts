"use client";

import { useEffect, useState } from "react";
import { fetchBooks, fetchChapters } from "@/lib/api";
import { bookNameForTranslation } from "@/lib/books";

/**
 * その書・その訳にある章番号を引く。
 *
 * 章番号は 1,2,3… の連番とは限らない（写本のセクション番号を使う書がある）ので、
 * 総章数から作らずに API から取る。記事の引用パネルとプランの章選びで共用する。
 */
export function useChapterNumbers(slug: string | null, translation: string) {
  const [numbers, setNumbers] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!slug) return;
    let alive = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setError(null);
    setNumbers([]);
    setLoading(true);
    fetchBooks(translation)
      .then((books) => {
        const target = books.find((book) => book.name === bookNameForTranslation(slug, translation));
        if (!target) throw new Error("この訳にはこの書がありません。");
        return fetchChapters(target.id);
      })
      .then((chapters) => {
        if (alive) setNumbers(chapters.map((chapter) => chapter.number));
      })
      .catch((err) => {
        if (!alive) return;
        setNumbers([]);
        setError(err.message);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [slug, translation, reloadKey]);

  return { numbers, error, loading, retry: () => setReloadKey((key) => key + 1) };
}
