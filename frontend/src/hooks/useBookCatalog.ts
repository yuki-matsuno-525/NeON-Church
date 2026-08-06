"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchBooks } from "@/lib/api";
import { buildCatalog, type BookCatalogEntry } from "@/lib/bookCatalog";

/**
 * DB の全 Book を取得し、空データと通信失敗を区別して返すフック。
 *
 * 組み替えの部分は lib/bookCatalog.ts にある。あちらはサーバー側からも
 * 呼べるようにしてあるので、サーバーで組み立てる画面はこのフックを使わない。
 */
export function useBookCatalogState(): {
  catalog: BookCatalogEntry[];
  loading: boolean;
  error: boolean;
  retry: () => void;
} {
  const [catalog, setCatalog] = useState<BookCatalogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [requestKey, setRequestKey] = useState(0);
  const retry = useCallback(() => {
    setLoading(true);
    setError(false);
    setRequestKey((value) => value + 1);
  }, []);

  useEffect(() => {
    let active = true;
    fetchBooks()
      .then((all) => {
        if (active) setCatalog(buildCatalog(all));
      })
      .catch(() => {
        if (active) setError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [requestKey]);
  return { catalog, loading, error, retry };
}

/** @deprecated New UI should use useBookCatalogState so failures remain recoverable. */
export function useBookCatalog(): BookCatalogEntry[] {
  return useBookCatalogState().catalog;
}
