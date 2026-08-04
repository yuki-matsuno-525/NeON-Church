"use client";

import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useT } from "@/lib/i18n";

/**
 * プランを作った人にだけ出す「編集」への導線。
 *
 * プラン本体はサーバー側で組み立てるが、誰が見ているかはブラウザ側にしか
 * 分からない（ログイン状態を持っているのが AuthContext のため）。
 */
export function PlanOwnerActions({ planId, ownerUsername }: { planId: string; ownerUsername: string }) {
  const { user } = useAuth();
  const t = useT();

  if (user?.username !== ownerUsername) return null;

  return (
    <Link href={`/plans/${planId}/edit`} className="action-link ml-auto text-sm no-underline">
      {t.articleEdit}
    </Link>
  );
}
