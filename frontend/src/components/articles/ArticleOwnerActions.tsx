"use client";

import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useT } from "@/lib/i18n";

/**
 * 記事の書き手だけに出す「編集」への導線。
 *
 * 記事そのものはサーバー側で組み立てるが、誰が見ているかはブラウザ側にしか
 * 分からない（ログイン状態を持っているのが AuthContext のため）。
 * そこでこの一片だけをブラウザ側に残している。
 */
export function ArticleOwnerActions({ articleId, ownerUsername }: { articleId: string; ownerUsername: string }) {
  const { user } = useAuth();
  const t = useT();

  if (user?.username !== ownerUsername) return null;

  return (
    <Link href={`/articles/${articleId}/edit`} className="ml-auto text-sm text-accent no-underline">
      {t.articleEdit}
    </Link>
  );
}
