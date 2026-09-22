"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { PlanDaysRange, PlanSort } from "@/lib/api";
import type { BookCatalogEntry } from "@/lib/bookCatalog";
import { useT } from "@/lib/i18n";
import { BookFilterSelects, ListFilters } from "@/components/list";

type Props = {
  catalog: BookCatalogEntry[];
  /** 書の一覧をサーバーが取れなかった。書のプルダウンは選べなくする */
  catalogFailed: boolean;
  /** いま選ばれている絞り込み（URL がそのまま渡ってくる） */
  book: string;
  days: PlanDaysRange | "";
  sort: PlanSort;
  /** 絞り込み後の件数。取れなかったときは undefined */
  totalText?: string;
};

/**
 * プラン一覧の絞り込み。
 *
 * 検索欄はいつも出し、書・日数・並び順は漏斗のボタンの中に置く（記事・翻訳と同じ形）。
 * 選んだ内容は URL に書く。URL が変われば、サーバーがその条件で組み立て直す。
 * ?tab= や ?q= はそのまま残す。
 */
export function PlanFilters({ catalog, catalogFailed, book, days, sort, totalText }: Props) {
  const t = useT();
  const router = useRouter();
  const searchParams = useSearchParams();

  /** 一部だけ差し替えて URL に書く。空文字は削除。 */
  const update = (key: "book" | "days" | "sort", value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    const query = params.toString();
    // router.replace で履歴を汚さない（続けて選び直しても戻るが効きすぎないように）。
    router.replace(query ? `/plans?${query}` : "/plans", { scroll: false });
  };

  return (
    <ListFilters
      basePath="/plans"
      searchLabel={t.planSearchLabel}
      toggleLabel={t.filterToggle}
      active={book !== "" || days !== "" || sort !== "new"}
      totalText={totalText}
    >
      <BookFilterSelects
        catalog={catalog}
        disabled={catalogFailed}
        slug={book}
        onSelect={(slug) => update("book", slug)}
      />
      <label className="inline-flex items-center gap-2 text-sm text-muted">
        <select
          aria-label={t.planDaysFilterLabel}
          value={days}
          onChange={(e) => update("days", e.target.value)}
          className="select-md bg-bg"
        >
          <option value="">{t.planDaysAll}</option>
          <option value="short">{t.planDaysShort}</option>
          <option value="mid">{t.planDaysMid}</option>
          <option value="long">{t.planDaysLong}</option>
        </select>
      </label>
      <label className="inline-flex items-center gap-2 text-sm text-muted">
        <select
          aria-label={t.planSortLabel}
          value={sort}
          // 新しい順は既定なので URL から消す。
          onChange={(e) => update("sort", e.target.value === "popular" ? "popular" : "")}
          className="select-md bg-bg"
        >
          <option value="new">{t.planSortNew}</option>
          <option value="popular">{t.planSortPopular}</option>
        </select>
      </label>
    </ListFilters>
  );
}
