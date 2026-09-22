"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { ArticleTag } from "@/lib/api";
import type { BookCatalogEntry } from "@/lib/bookCatalog";
import { articleTagLabel } from "@/lib/articles";
import { useT } from "@/lib/i18n";
import { BookFilterSelects, ListFilters } from "@/components/list";

type Props = {
  catalog: BookCatalogEntry[];
  /** 書の一覧をサーバーが取れなかった。書のプルダウンは選べなくする */
  catalogFailed: boolean;
  tags: ArticleTag[];
  /** いま選ばれている絞り込み（URL がそのまま渡ってくる） */
  book: string;
  tag: string;
  totalText?: string;
};

/**
 * 記事一覧の絞り込み。
 *
 * 検索欄はいつも出し、書（引用している書）と主題は漏斗のボタンの中に置く
 * （プラン・翻訳・Q&A と同じ形）。選んだ内容は URL に書き、?tab= や ?q= は残す。
 */
export function ArticleFilters({ catalog, catalogFailed, tags, book, tag, totalText }: Props) {
  const t = useT();
  const router = useRouter();
  const searchParams = useSearchParams();

  /** 一部だけ差し替えて URL に書く。空文字は削除。 */
  const update = (key: "book" | "tag", value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    const query = params.toString();
    router.replace(query ? `/articles?${query}` : "/articles", { scroll: false });
  };

  return (
    <ListFilters
      basePath="/articles"
      searchLabel={t.articleSearchLabel}
      toggleLabel={t.filterToggle}
      active={book !== "" || tag !== ""}
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
          aria-label={t.articleTopicsLabel}
          value={tag}
          onChange={(e) => update("tag", e.target.value)}
          className="select-md bg-bg"
        >
          <option value="">{t.articleAllTopicsOption}</option>
          {tags.map((articleTag) => (
            <option key={articleTag.id} value={articleTag.slug}>
              {articleTagLabel(articleTag.slug, articleTag.name, t)}
              {articleTag.article_count !== undefined ? ` (${articleTag.article_count})` : ""}
            </option>
          ))}
        </select>
      </label>
    </ListFilters>
  );
}
