"use client";

import { useRouter } from "next/navigation";
import type { Tag } from "@/lib/api";
import type { BookCatalogEntry } from "@/lib/bookCatalog";
import { LoginRequiredModal } from "@/components/ui/LoginRequiredModal";
import { QAPostForm } from "./QAPostForm";

type Props = {
  signedIn: boolean;
  catalog: BookCatalogEntry[];
  tags: Tag[];
  /** 閉じたときに戻る URL（絞り込みを保ったまま「質問する」を取り消す） */
  backHref: string;
};

/**
 * 「質問する」を押したときに出る投稿フォーム。
 *
 * 開いているかどうかは URL の `ask` で表す。画面の中に覚えさせると、
 * 一覧をサーバー側で組み立て直すたびに開いたり閉じたりしてしまう。
 * ログインしていなければ、フォームの代わりにログインの案内を出す。
 */
export function QAAskPanel({ signedIn, catalog, tags, backHref }: Props) {
  const router = useRouter();
  const close = () => router.replace(backHref, { scroll: false });

  if (!signedIn) return <LoginRequiredModal onClose={close} />;

  return (
    <QAPostForm
      catalog={catalog}
      tags={tags}
      onCancel={close}
      onSubmitted={() => {
        close();
        // 投稿した質問は未解決の列に増える。サーバーに一覧を取り直してもらう。
        router.refresh();
      }}
    />
  );
}
