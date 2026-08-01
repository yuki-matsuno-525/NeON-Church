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
 */
export function useLoadMore<T, C>(fetchPage: (page: number) => Promise<ListPage<T, C>>) {
  const [items, setItems] = useState<T[]>([]);
  const [counts, setCounts] = useState<C | undefined>(undefined);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  // 1ページ目の読み込み（画面全体をスケルトンにする）
  const [loading, setLoading] = useState(true);
  // 2ページ目以降の読み込み（ボタンだけを待ち状態にする）
  const [loadingMore, setLoadingMore] = useState(false);
  // 取得に失敗したかどうか。「まだ1件も無い」と「取りに行けなかった」は見た目を分ける
  // 必要がある（以前はどちらも空表示になり、サーバーが落ちていても「ありません」と出ていた）。
  const [failed, setFailed] = useState(false);
  // reload() のたびに増やして、下の useEffect を1ページ目から走らせ直す。
  const [reloadToken, setReloadToken] = useState(0);

  /** 1ページ目から読み直す。投稿・削除のあとなど、中身が変わったときに呼ぶ。 */
  const reload = useCallback(() => setReloadToken((n) => n + 1), []);

  useEffect(() => {
    // タブを切り替えた直後に前のタブの結果が遅れて届いても、上書きしないようにする。
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
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
      .catch(() => {
        if (cancelled) return;
        setItems([]);
        setTotal(0);
        setHasMore(false);
        setFailed(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fetchPage, reloadToken]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const next = page + 1;
      const res = await fetchPage(next);
      setItems((prev) => [...prev, ...res.results]);
      setHasMore(res.hasMore);
      setTotal(res.count);
      setPage(next);
    } catch {
      // 読み足しに失敗したらボタンを引っ込める。既に出ている分はそのまま残す。
      setHasMore(false);
    } finally {
      setLoadingMore(false);
    }
  }, [fetchPage, page, hasMore, loadingMore]);

  return { items, setItems, counts, total, loading, loadingMore, hasMore, loadMore, reload, failed };
}
