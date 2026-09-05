"use client";

import { useEffect, useState } from "react";
import { fetchBookRead, type BookChapter } from "@/lib/api";

/**
 * その書・その訳にある章を引く。番号と、章の書き出し（第1節の頭）が付いてくる。
 *
 * 章番号は 1,2,3… の連番とは限らない（写本のセクション番号を使う書がある）ので、
 * 総章数から作らずに API から取る。
 *
 * 書き出しも同じ 1 回で返ってくる。章ごとに本文を取りに行くと、150 章の書で
 * 150 往復になってしまうため、サーバー側でまとめてもらっている。
 *
 * 以前は全書一覧を落として書名の文字列一致で1冊を探していたため、頼んだ訳の本文が
 * まだ入っていないと何も見つからず行き止まりになっていた。今は書ごとの入口を叩く。
 * その訳が無ければサーバーが別の訳にたおすので、章の一覧は必ず出る。
 */
export function useBookChapters(slug: string | null, translation: string) {
  const [chapters, setChapters] = useState<BookChapter[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!slug) return;
    let alive = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setError(null);
    setChapters([]);
    setLoading(true);
    fetchBookRead(slug, translation)
      .then((data) => {
        if (alive) setChapters(data.chapters);
      })
      .catch((err) => {
        if (!alive) return;
        setChapters([]);
        setError(err.message);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [slug, translation, reloadKey]);

  return { chapters, error, loading, retry: () => setReloadKey((key) => key + 1) };
}
