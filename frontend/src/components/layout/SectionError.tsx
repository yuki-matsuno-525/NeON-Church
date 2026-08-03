"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/ui/ErrorState";
import { useT } from "@/lib/i18n";

/**
 * 画面の描画中に想定外のエラーが起きたときの受け皿。
 *
 * 各区画（/read や /articles など）の error.tsx から使う。区画ごとに置くのは、
 * 1 か所が壊れたときに、上のナビゲーションや他の区画まで巻き込んで真っ白に
 * ならないようにするため。壊れた区画だけがこの表示に差し替わる。
 *
 * onRetry には Next.js の `unstable_retry` を渡す。`reset` はエラーの記録を
 * 消すだけで取り直さないので、通信が原因のときは押しても同じ結果になる。
 */
export function SectionError({ error, onRetry }: { error: Error & { digest?: string }; onRetry: () => void }) {
  const t = useT();

  useEffect(() => {
    // 本番では Sentry が拾う。開発中は原因が分かるようコンソールにも出す。
    console.error(error);
  }, [error]);

  return (
    <main className="py-12 px-4">
      <ErrorState title={t.errorTitle} message={t.errorNetwork} onRetry={onRetry} />
    </main>
  );
}
