"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Pagination } from "./Pagination";

type Props = {
  /** いま何ページ目か（1 始まり） */
  page: number;
  totalPages: number;
  /** ページ番号を書き込む URL のパラメータ名。1 ページ目のときは付けない */
  param: string;
};

/**
 * ページ番号を URL に書くページ送り。
 *
 * サーバー側で組み立てる一覧のためのもの。押すと URL が変わり、
 * サーバーがそのページを取り直して返す。URL に残るので、
 * 「3 ページ目」をそのまま人に渡せる。
 */
export function QueryPagination({ page, totalPages, param }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <Pagination
      page={page}
      totalPages={totalPages}
      onChange={(next) => {
        const params = new URLSearchParams(searchParams.toString());
        if (next <= 1) params.delete(param);
        else params.set(param, String(next));
        const query = params.toString();
        // 履歴を汚さないよう replace。ページ送りは「戻る」で辿りたいものではない。
        router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
      }}
    />
  );
}
