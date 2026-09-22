"use client";

import { useState } from "react";
import { useT, bookLabel } from "@/lib/i18n";
import { useLang } from "@/contexts/LanguageContext";
import { groupCatalogByGenre, type BookCatalogEntry } from "@/lib/bookCatalog";

type Props = {
  catalog: BookCatalogEntry[];
  /** 書の一覧が取れなかったときは選べなくする */
  disabled?: boolean;
  /** いま選ばれている書の slug。空なら「すべての書」 */
  slug: string;
  /** 書を選んだ（空文字は「すべての書」に戻した） */
  onSelect: (slug: string) => void;
};

/**
 * 一覧の絞り込みで使う「カテゴリ → 書」の 2 つのプルダウン。Q&A とプランが使う。
 *
 * カテゴリを先に選ぶと、次の書のプルダウンがそのカテゴリの書に絞られる。
 * カテゴリは書を探しやすくするためだけのものなので、URL には書かずここで持つ。
 */
export function BookFilterSelects({ catalog, disabled = false, slug, onSelect }: Props) {
  const t = useT();
  const { lang } = useLang();
  const [genre, setGenre] = useState("");

  const groups = groupCatalogByGenre(catalog);
  const bookEntries = genre ? groups.find((g) => g.genre === genre)?.entries ?? [] : catalog;

  return (
    <>
      <label className="inline-flex items-center gap-2 text-sm text-muted">
        <select
          aria-label={t.genreFilterLabel}
          disabled={disabled}
          value={genre}
          onChange={(e) => { setGenre(e.target.value); onSelect(""); }}
          className="select-md bg-bg"
        >
          <option value="">{t.all}</option>
          {groups.map(({ genre: g }) => (
            <option key={g} value={g}>{t.genreNames[g] ?? g}</option>
          ))}
        </select>
      </label>
      <label className="inline-flex items-center gap-2 text-sm text-muted">
        <select
          aria-label={t.allBooks}
          disabled={disabled}
          value={slug}
          onChange={(e) => onSelect(e.target.value)}
          className="select-md bg-bg"
        >
          <option value="">{t.allBooks}</option>
          {bookEntries.map((entry) => (
            <option key={entry.slug} value={entry.slug}>{bookLabel(entry.slug, lang)?.short ?? entry.slug}</option>
          ))}
        </select>
      </label>
    </>
  );
}
