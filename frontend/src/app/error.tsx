"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/ui/ErrorState";
import { useT } from "@/lib/i18n";

/**
 * 画面の描画中に想定外のエラーが起きたときの受け皿。
 *
 * これが無いと、どこか1か所が壊れただけで Next.js の既定のエラー画面ごと落ちて、
 * 戻ることも読み直すこともできなくなる。ここで受け止めて「もう一度試す」を出す。
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // 本番では Sentry が拾う。開発中は原因が分かるようコンソールにも出す。
    console.error(error);
  }, [error]);

  const t = useT();

  return (
    <main className="py-12 px-4">
      <ErrorState title={t.errorTitle} message={t.errorNetwork} onRetry={reset} />
    </main>
  );
}
