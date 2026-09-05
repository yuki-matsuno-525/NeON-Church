"use client";

import { useEffect, useState } from "react";
import { fetchBookRead } from "@/lib/api";

/**
 * その書・その訳にある章番号を引く。
 *
 * 章番号は 1,2,3… の連番とは限らない（写本のセクション番号を使う書がある）ので、
 * 総章数から作らずに API から取る。記事の引用パネルとプランの章選びで共用する。
 *
 * 以前は全書一覧を落として書名の文字列一致で1冊を探していたため、頼んだ訳の本文が
 * まだ入っていないと何も見つからず行き止まりになっていた。今は書ごとの入口を叩く。
 * その訳が無ければサーバーが別の訳にたおすので、章の一覧は必ず出る。
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
    fetchBookRead(slug, translation)
      .then(({ chapters }) => {
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
