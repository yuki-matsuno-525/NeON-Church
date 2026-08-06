"use client";

import { useDeferredValue, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { TranslationProject } from "@/lib/api";
import { languageLabel } from "@/lib/languages";
import { BOOKS, GENRE_ORDER, chapterNumbersOf } from "@/lib/books";
import { bookLabel, useT } from "@/lib/i18n";
import { useLang } from "@/contexts/LanguageContext";
import { ClearableSearchInput } from "@/components/ui/ClearableSearchInput";

// 翻訳本棚カテゴリ用の擬似ジャンルキー。実ジャンル名と衝突しない値にする。
const TRANSLATION_TAB = "__translation_library__";

type Props = {
  /** 本棚に追加した公開翻訳。サーバーが取ってから渡ってくる */
  library: TranslationProject[];
  /** 本棚を取れなかった */
  libraryFailed: boolean;
  /** URL に入っている検索語 */
  q: string;
};

/**
 * 書を探すところ。カテゴリを選ぶか、名前で検索する。
 *
 * 書の一覧はアプリに同梱されている（通信しない）ので、絞り込みはこの場で行う。
 * 検索語だけは URL にも残して、同じ画面を人に渡せるようにしている。
 */
export function BookBrowser({ library, libraryFailed, q }: Props) {
  const t = useT();
  const { lang } = useLang();
  const router = useRouter();
  const searchParams = useSearchParams();

  // 書が多いのでカテゴリ（ジャンル）を選んでから、その書だけ表示するドリルダウン。
  const [activeGenre, setActiveGenre] = useState("");
  const [text, setText] = useState(q);
  const [lastQ, setLastQ] = useState(q);
  if (q !== lastQ) {
    setLastQ(q);
    setText(q);
  }
  const deferredText = useDeferredValue(text);

  useEffect(() => {
    if (text === q) return;
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (text.trim()) params.set("q", text);
      else params.delete("q");
      const query = params.toString();
      router.replace(query ? `/read?${query}` : "/read", { scroll: false });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [text, q, router, searchParams]);

  const groups = GENRE_ORDER
    .map((genre) => ({ genre, books: BOOKS.filter((b) => b.genre === genre) }))
    .filter(({ books }) => books.length > 0);
  // 翻訳本棚は本棚に何かある（ログイン＋追加済み）ときだけカテゴリとして出す。
  const hasLibrary = library.length > 0;
  const isLibraryTab = activeGenre === TRANSLATION_TAB && hasLibrary;
  const active = isLibraryTab ? null : (groups.find((g) => g.genre === activeGenre) ?? groups[0]);

  const query = normalizeSearch(deferredText);
  const matchingBooks = query
    ? BOOKS.filter((book) => {
        const label = bookLabel(book.slug, lang);
        return matchesSearch(query, [
          book.name,
          book.englishName,
          book.short,
          book.slug,
          t.genreNames[book.genre] ?? book.genre,
          label?.name,
          label?.short,
          ...book.translations.flatMap((tr) => [tr.id, tr.name]),
        ]);
      })
    : [];
  const matchingProjects = query
    ? library.filter((project) =>
        matchesSearch(query, [
          project.name,
          project.description,
          project.source_book_name,
          languageLabel(project.target_language),
          project.owner_username,
        ]),
      )
    : [];

  return (
    <>
      <label className="block mb-6">
        <span className="sr-only">{t.bookSearchLabel}</span>
        <ClearableSearchInput
          value={text}
          onChange={setText}
          placeholder={t.bookSearchPlaceholder}
          ariaLabel={t.bookSearchLabel}
          inputClassName="form-control"
          wrapperClassName="w-full"
        />
      </label>

      {libraryFailed && (
        <div role="alert" className="mb-4 flex flex-wrap items-center gap-3">
          <span className="text-sm text-danger">{t.loadErrorDesc}</span>
        </div>
      )}

      {query ? (
        <div className="mb-8">
          {matchingBooks.length + matchingProjects.length === 0 ? (
            <p className="text-sm text-muted">{t.listSearchEmpty}</p>
          ) : (
            <div className="book-grid">
              {matchingBooks.map((book) => (
                <BookTile key={book.slug} slug={book.slug} name={bookLabel(book.slug, lang)?.name ?? book.name} t={t} />
              ))}
              {matchingProjects.map((project) => (
                <ProjectTile key={project.id} project={project} />
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          {/* カテゴリ選択（チップ）。ジャンルに加えて翻訳本棚も1カテゴリとして並べる。 */}
          <div className="flex flex-wrap gap-2 mb-6">
            {groups.map(({ genre, books }) => {
              const isActive = !isLibraryTab && active?.genre === genre;
              return (
                <button
                  key={genre}
                  onClick={() => setActiveGenre(genre)}
                  aria-pressed={isActive}
                  className={chipClass(isActive)}
                >
                  {t.genreNames[genre] ?? genre} <span className="opacity-70">({books.length})</span>
                </button>
              );
            })}
            {hasLibrary && (
              <button
                onClick={() => setActiveGenre(TRANSLATION_TAB)}
                aria-pressed={isLibraryTab}
                className={chipClass(isLibraryTab)}
              >
                {t.myTranslationsHeading} <span className="opacity-70">({library.length})</span>
              </button>
            )}
          </div>

          {/* 選択カテゴリの書 */}
          {active && (
            <div className="mb-8">
              <div className="book-grid">
                {active.books.map((book) => (
                  <BookTile key={book.slug} slug={book.slug} name={bookLabel(book.slug, lang)?.name ?? book.name} t={t} />
                ))}
              </div>
            </div>
          )}

          {/* 翻訳本棚カテゴリ：本棚に追加した公開翻訳を書と同じグリッドで並べる。 */}
          {isLibraryTab && (
            <div className="mb-8">
              <div className="book-grid">
                {library.map((project) => (
                  <ProjectTile key={project.id} project={project} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}

const tileClass = "card-glow card-glow-interactive flex flex-col py-4 px-4 no-underline text-body";

/** 絞り込みの丸いラベル。選ばれているものは塗りつぶす。 */
function chipClass(isActive: boolean): string {
  return `chip${isActive ? " chip-on" : ""}`;
}

function BookTile({ slug, name, t }: { slug: string; name: string; t: ReturnType<typeof useT> }) {
  return (
    <Link href={`/${slug}?list=1`} className={tileClass}>
      <span className="book-tile-title">{name}</span>
      <span className="text-xs text-faint mt-2">{t.totalChapters(chapterNumbersOf(slug).length)}</span>
    </Link>
  );
}

function ProjectTile({ project }: { project: TranslationProject }) {
  return (
    <Link href={`/translations/${project.id}/read`} className={tileClass}>
      <span className="font-bold text-md">{project.name}</span>
      <span className="text-xs text-muted mt-2">
        {project.source_book_name} → {languageLabel(project.target_language)}
      </span>
    </Link>
  );
}

function normalizeSearch(value: string): string {
  return value.trim().toLocaleLowerCase();
}

function matchesSearch(query: string, values: Array<string | null | undefined>): boolean {
  return values.some((value) => value?.toLocaleLowerCase().includes(query));
}
