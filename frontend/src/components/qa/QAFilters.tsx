"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Tag } from "@/lib/api";
import { useT, bookLabel } from "@/lib/i18n";
import { useLang } from "@/contexts/LanguageContext";
import { getBookBySlug } from "@/lib/books";
import { translationLabel } from "@/lib/translations";
import { groupCatalogByGenre, type BookCatalogEntry } from "@/lib/bookCatalog";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { ClearableSearchInput } from "@/components/ui/ClearableSearchInput";
import { RetryButton } from "@/components/ui/RetryButton";

type Props = {
  catalog: BookCatalogEntry[];
  /** 書の一覧をサーバーが取れなかった。カタログは空になる */
  catalogFailed: boolean;
  tags: Tag[];
  /** タグの一覧をサーバーが取れなかった */
  tagsFailed: boolean;
  /** いま選ばれている絞り込み（URL がそのまま渡ってくる） */
  slug: string;
  version: string;
  tagId: string;
  q: string;
  /** 絞り込み後の総数。取れなかったときは null */
  total: number | null;
};

/**
 * Q&A 一覧の絞り込み。
 *
 * 選んだ内容は URL に書く。URL が変われば、サーバーがその条件で
 * 一覧を組み立て直して返してくれる。ここが持っている状態は
 * 「打っている途中の検索文字」と「カテゴリ」の 2 つだけ。
 */
export function QAFilters({ catalog, catalogFailed, tags, tagsFailed, slug, version, tagId, q, total }: Props) {
  const t = useT();
  const { lang } = useLang();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [genreFilter, setGenreFilter] = useState("");

  /** クエリパラメータを部分更新して URL に反映する。null/空文字は削除。 */
  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value == null || value === "") params.delete(key);
        else params.set(key, value);
      }
      const query = params.toString();
      // router.replace で履歴を汚さない (連続フィルタ変更で戻るが効きすぎないため)
      router.replace(query ? `/qa?${query}` : "/qa", { scroll: false });
    },
    [searchParams, router],
  );

  // 検索欄は打っている間だけ手元で持ち、手が止まってから URL に移す。
  // 1 文字ごとに URL を変えると、そのたびにサーバーが一覧を組み立て直してしまう。
  const [text, setText] = useState(q);
  const [lastQ, setLastQ] = useState(q);
  if (q !== lastQ) {
    // 戻る・他の絞り込みなどで URL 側が変わったときは、入力欄を合わせる。
    setLastQ(q);
    setText(q);
  }
  const debounced = useDebouncedValue(text);
  useEffect(() => {
    if (debounced !== q) updateParams({ q: debounced || null });
  }, [debounced, q, updateParams]);

  // 書を切り替えたら訳はリセットする。
  const selectSlug = (next: string) => updateParams({ book: next || null, version: null });

  const groups = groupCatalogByGenre(catalog);
  const bookEntries = genreFilter ? groups.find((g) => g.genre === genreFilter)?.entries ?? [] : catalog;

  return (
    <>
      {catalogFailed && (
        <div role="alert" className="mb-4">
          <p className="text-sm text-danger">
            {lang === "ja" ? "書の一覧を読み込めませんでした。" : "Could not load the book list."}
          </p>
          <RetryButton />
        </div>
      )}

      <fieldset className="plain-card mb-6">
        {/* フィルタの見出しは各ボタンのラベルと重複するため画面には出さない（スクリーンリーダー用に残す）。 */}
        <legend className="sr-only">
          {t.filterAll} / {t.filterUnanswered} / {t.filterAnswered}
        </legend>
        <div className="flex items-center justify-between gap-3 mb-3">
          <span className="text-muted text-xs font-bold">{t.qaFilters}</span>
          {/* 表示中の件数ではなく、絞り込み後の総数（2列の合計） */}
          {total !== null && <span className="text-xs text-faint">{t.qaQuestionCount(total)}</span>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ClearableSearchInput
            value={text}
            onChange={setText}
            placeholder={t.qaSearchPlaceholder}
            ariaLabel={t.qaSearchLabel}
            inputClassName="form-control"
            wrapperClassName="field-grow"
          />
          {/* カテゴリを先に選ぶと、次の書プルダウンがそのカテゴリの書に絞られる。 */}
          <label className="inline-flex items-center gap-2 text-sm text-muted">
            <select
              aria-label={t.genreFilterLabel}
              disabled={catalogFailed}
              value={genreFilter}
              onChange={(e) => { setGenreFilter(e.target.value); selectSlug(""); }}
              className="select-md bg-bg"
            >
              <option value="">{t.all}</option>
              {groups.map(({ genre }) => (
                <option key={genre} value={genre}>{t.genreNames[genre] ?? genre}</option>
              ))}
            </select>
          </label>
          <label className="inline-flex items-center gap-2 text-sm text-muted">
            <select
              aria-label={t.allBooks}
              disabled={catalogFailed}
              value={slug}
              onChange={(e) => selectSlug(e.target.value)}
              className="select-md bg-bg"
            >
              <option value="">{t.allBooks}</option>
              {bookEntries.map((entry) => (
                <option key={entry.slug} value={entry.slug}>{bookLabel(entry.slug, lang)?.short ?? entry.slug}</option>
              ))}
            </select>
          </label>
          {/* 訳（任意）。書を選んだときだけ出す。未指定ならその書の全訳が対象。 */}
          {slug && (
            <label className="inline-flex items-center gap-2 text-sm text-muted">
              <select
                aria-label={t.allVersions}
                value={version}
                onChange={(e) => updateParams({ version: e.target.value || null })}
                className="select-md bg-bg"
              >
                <option value="">{t.allVersions}</option>
                {(getBookBySlug(slug)?.translations ?? []).map((tr) => (
                  <option key={tr.id} value={tr.id}>{translationLabel(tr.id, lang)}</option>
                ))}
              </select>
            </label>
          )}
          <label className="inline-flex items-center gap-2 text-sm text-muted">
            <select
              aria-label={t.allTags}
              value={tagId}
              onChange={(e) => updateParams({ tag: e.target.value || null })}
              className="select-md bg-bg"
            >
              <option value="">{t.allTags}</option>
              {tags.map((tag) => (
                <option key={tag.id} value={tag.id}>{t.tagNames[tag.name] ?? tag.name}</option>
              ))}
            </select>
          </label>
        </div>
        {tagsFailed && (
          <div role="alert" className="flex items-center gap-2 mt-2 text-danger text-xs">
            <span>{t.tagsLoadFailed}</span>
            <RetryButton />
          </div>
        )}
      </fieldset>
    </>
  );
}
