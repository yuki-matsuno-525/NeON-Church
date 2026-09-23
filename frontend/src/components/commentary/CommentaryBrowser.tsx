"use client";

import { useDeferredValue, useState } from "react";
import Link from "next/link";
import type { CommentaryTradition, CommentaryWork } from "@/lib/api";
import { useT } from "@/lib/i18n";
import { useQuerySearch } from "@/hooks/useQuerySearch";
import { ClearableSearchInput } from "@/components/ui/ClearableSearchInput";
import { chipClass, tileClass } from "@/components/read/BookBrowser";
import { matchesSearch, normalizeSearch } from "@/lib/textSearch";

// 立場の並び。時代の古いほうから。
const TRADITION_ORDER: CommentaryTradition[] = ["jewish", "patristic", "medieval", "reformation", "mukyokai"];

/**
 * 解釈書を探すところ（「読む」の解釈書タブ）。「読む」の書を探すところ（BookBrowser）と同じ作り:
 * 上に検索、立場（ユダヤ教・教父…）のチップで絞り、本をタイルで並べる。
 *
 * 一覧はサーバーが渡す（80冊ほどなので全部）。絞り込みはこの場で行い、
 * 検索語だけは URL にも残して、同じ画面を人に渡せるようにする。
 */
export function CommentaryBrowser({ works }: { works: CommentaryWork[] }) {
  const t = useT();
  const [activeTradition, setActiveTradition] = useState<CommentaryTradition | "">("");
  const { value: text, setValue: setText } = useQuerySearch("/read");
  const deferredText = useDeferredValue(text);

  const groups = TRADITION_ORDER.map((tradition) => ({
    tradition,
    works: works.filter((work) => work.tradition === tradition),
  })).filter(({ works: list }) => list.length > 0);
  const active = groups.find((g) => g.tradition === activeTradition) ?? groups[0];

  const query = normalizeSearch(deferredText);
  const matching = query
    ? works.filter((work) =>
        matchesSearch(query, [
          work.title,
          work.title_ja,
          work.author,
          work.author_ja,
          work.slug,
          work.translator,
          t.commentaryTraditions[work.tradition],
        ]),
      )
    : [];

  return (
    <>
      <label className="block mb-6">
        <span className="sr-only">{t.commentarySearchLabel}</span>
        <ClearableSearchInput
          value={text}
          onChange={setText}
          placeholder={t.commentarySearchPlaceholder}
          ariaLabel={t.commentarySearchLabel}
          inputClassName="form-control"
          wrapperClassName="w-full"
        />
      </label>

      {query ? (
        <div className="mb-8">
          {matching.length === 0 ? (
            <p className="text-sm text-muted">{t.commentarySearchEmpty}</p>
          ) : (
            <div className="book-grid">
              {matching.map((work) => <WorkTile key={work.slug} work={work} />)}
            </div>
          )}
        </div>
      ) : (
        <>
          {/* 立場で絞る（「読む」のジャンルのチップと同じ） */}
          <div className="flex flex-wrap gap-2 mb-6">
            {groups.map(({ tradition, works: list }) => (
              <button
                key={tradition}
                type="button"
                onClick={() => setActiveTradition(tradition)}
                aria-pressed={active?.tradition === tradition}
                className={chipClass(active?.tradition === tradition)}
              >
                {t.commentaryTraditions[tradition]} <span className="opacity-70">({list.length})</span>
              </button>
            ))}
          </div>
          {active && (
            <div className="mb-8">
              <div className="book-grid">
                {active.works.map((work) => <WorkTile key={work.slug} work={work} />)}
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}

/** 解釈書1冊のタイル。書のタイルと同じ形に、著者と時代を添える。 */
function WorkTile({ work }: { work: CommentaryWork }) {
  const t = useT();
  return (
    <Link href={`/commentary/${work.slug}`} className={tileClass}>
      <span className="book-tile-title">{work.title_ja || work.title}</span>
      <span className="text-xs text-muted mt-2">
        {work.author_ja || work.author}
        {work.year != null && ` · ${t.commentaryYear(work.year)}`}
      </span>
      <span className="text-xs text-faint mt-1">
        {work.chapter_count != null && t.totalChapters(work.chapter_count)}
        {work.language !== "ja" && ` · ${t.commentaryLanguages[work.language] ?? work.language}`}
      </span>
    </Link>
  );
}
