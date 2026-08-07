"use client";

import { useCallback, useEffect, useState } from "react";
import type { ListPage } from "@/lib/api";

/**
 * 「もっと見る」で少しずつ読み足す一覧の状態をまとめて持つ。
 *
 * 一覧は一度に全部返すと件数が増えるほど重くなるので、1ページずつ読み足す。
 *
 * fetchPage は useCallback で包んで渡すこと。中身（絞り込みのタブなど）が変わると
 * 1ページ目から読み直す。
 *
 * initial を渡すと、最初の取得をしない。サーバー側で 1 ページ目を取り終えている
 * 画面のためのもので、開いた直後から中身が入った状態になる。
 */
export function useLoadMore<T, C>(
  fetchPage: (page: number) => Promise<ListPage<T, C>>,
  initial?: ListPage<T, C>,
) {
  const [items, setItems] = useState<T[]>(initial?.results ?? []);
  const [counts, setCounts] = useState<C | undefined>(initial?.counts);
  const [total, setTotal] = useState(initial?.count ?? 0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(initial?.hasMore ?? false);
  // 1ページ目の読み込み（画面全体をスケルトンにする）。
  // サーバーが渡してくれているときは、待つものが無いので false から始める。
  const [loading, setLoading] = useState(initial === undefined);
  // 2ページ目以降の読み込み（ボタンだけを待ち状態にする）
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [loadMoreError, setLoadMoreError] = useState<Error | null>(null);
  // 取得に失敗したかどうか。「まだ1件も無い」と「取りに行けなかった」は見た目を分ける
  // 必要がある（以前はどちらも空表示になり、サーバーが落ちていても「ありません」と出ていた）。
  const [failed, setFailed] = useState(false);
  // reload() のたびに増やして、下の useEffect を1ページ目から走らせ直す。
  const [reloadToken, setReloadToken] = useState(0);
  // サーバーから受け取った 1 ページ目に対応する fetchPage。これと同じものを
  // 渡されている間は取りに行かない（絞り込みが変われば別の関数になるので読み直す）。
  const [servedBy] = useState(() => (initial !== undefined ? fetchPage : null));

  /** 1ページ目から読み直す。投稿・削除のあとなど、中身が変わったときに呼ぶ。 */
  const reload = useCallback(() => setReloadToken((n) => n + 1), []);

  useEffect(() => {
    if (fetchPage === servedBy && reloadToken === 0) return;
    // タブを切り替えた直後に前のタブの結果が遅れて届いても、上書きしないようにする。
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError(null);
    setLoadMoreError(null);
    fetchPage(1)
      .then((res) => {
        if (cancelled) return;
        setItems(res.results);
        setCounts(res.counts);
        setTotal(res.count);
        setHasMore(res.hasMore);
        setPage(1);
        setFailed(false);
      })
      .catch((cause) => {
        if (cancelled) return;
        setItems([]);
        setTotal(0);
        setHasMore(false);
        setError(cause instanceof Error ? cause : new Error("Failed to load list"));
        setFailed(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fetchPage, reloadToken, servedBy]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    setLoadMoreError(null);
    try {
      const next = page + 1;
      const res = await fetchPage(next);
      setItems((prev) => [...prev, ...res.results]);
      setHasMore(res.hasMore);
      setTotal(res.count);
      setPage(next);
    } catch (cause) {
      // 既に表示できている内容は残し、再試行できるよう hasMore も維持する。
      setLoadMoreError(cause instanceof Error ? cause : new Error("Failed to load more"));
    } finally {
      setLoadingMore(false);
    }
  }, [fetchPage, page, hasMore, loadingMore]);

  return {
    items,
    setItems,
    counts,
    setCounts,
    total,
    loading,
    loadingMore,
    hasMore,
    error,
    loadMoreError,
    loadMore,
    retry: reload,
    reload,
    failed,
  };
}
