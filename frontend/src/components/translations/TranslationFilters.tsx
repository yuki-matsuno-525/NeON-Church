"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { TranslationLanguage } from "@/lib/api";
import { useT } from "@/lib/i18n";
import { ListFilters } from "@/components/list";

type Props = {
  /** 選べる言語。サーバーが取ってから渡ってくる。取れなければ空 */
  languages: TranslationLanguage[];
  /** いま選ばれている言語（URL がそのまま渡ってくる） */
  targetLanguage: string;
  /** 絞り込み後の件数。取れなかったときは null */
  total: number | null;
};

/**
 * 翻訳プロジェクト一覧の絞り込み。
 *
 * 検索欄はいつも出し、言語は漏斗のボタンの中に置く（記事・プランと同じ形）。
 * 選んだ内容は URL に書く。URL が変われば、サーバーがその条件で組み立て直す。
 */
export function TranslationFilters({ languages, targetLanguage, total }: Props) {
  const t = useT();
  const router = useRouter();
  const searchParams = useSearchParams();

  const selectLanguage = (next: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next) params.set("target_language", next);
    else params.delete("target_language");
    // 絞ると件数が減るので、開いていたページ番号は捨てて 1 ページ目に戻す。
    // タブごとに別のパラメータ（?published=2 など）で持っている。
    for (const key of ["published", "active", "draft"]) params.delete(key);
    const query = params.toString();
    router.replace(query ? `/translations?${query}` : "/translations", { scroll: false });
  };

  return (
    <ListFilters
      basePath="/translations"
      searchLabel={t.projectSearchLabel}
      searchPlaceholder={t.projectSearchPlaceholder}
      toggleLabel={t.filterToggle}
      active={targetLanguage !== ""}
      totalText={total == null ? undefined : t.projectCount(total)}
    >
      <label className="inline-flex items-center gap-2 text-sm text-muted">
        <span className="sr-only">{t.translationLanguage}</span>
        <select
          aria-label={t.translationLanguage}
          value={targetLanguage}
          onChange={(event) => selectLanguage(event.target.value)}
          className="select-md bg-bg"
        >
          <option value="">{t.allLanguages}</option>
          {languages.map((language) => (
            <option key={language.id} value={language.tag}>{language.label}</option>
          ))}
        </select>
      </label>
    </ListFilters>
  );
}
