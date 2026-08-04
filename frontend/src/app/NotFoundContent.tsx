"use client";

import Link from "next/link";
import { useLang } from "@/contexts/LanguageContext";

export function NotFoundContent() {
  const { lang } = useLang();
  const copy = lang === "ja"
    ? {
        title: "ページが見つかりません",
        description: "お探しのページは移動または削除された可能性があります。",
        home: "トップへ戻る",
        read: "書一覧を見る",
      }
    : {
        title: "Page not found",
        description: "The page you’re looking for may have been moved or deleted.",
        home: "Back to home",
        read: "Browse texts",
      };

  return (
    <div
      className="flex flex-col items-center justify-center min-h-page py-8 px-6 text-center gap-4"
    >
      <p aria-hidden="true" className="notfound-code">
        404
      </p>
      <h1 className="text-lg font-bold text-body m-0">
        {copy.title}
      </h1>
      <p className="m-0 max-w-90 text-sm text-muted">
        {copy.description}
      </p>
      <div className="flex gap-3 flex-wrap justify-center mt-2">
        <Link href="/" className="btn btn-primary">{copy.home}</Link>
        <Link href="/read" className="btn btn-ghost">{copy.read}</Link>
      </div>
    </div>
  );
}
