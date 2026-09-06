"use client";

import { useEffect, useId, useRef, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { searchBible, SEARCH_KINDS, type SearchKind, type SearchResult } from "@/lib/api";
import { BOOKS } from "@/lib/books";
import { useT } from "@/lib/i18n";
import { translationLabel } from "@/lib/translations";
import { useLang } from "@/contexts/LanguageContext";
import { EmptyState, SkeletonList } from "@/components/ui";
import { ErrorState } from "@/components/ui/ErrorState";
import { Pagination } from "@/components/ui/Pagination";
import { ClearableSearchInput } from "@/components/ui/ClearableSearchInput";

// 検索結果（節）は50件ずつページ送りする。backend の VERSE_PAGE_SIZE と揃える。
const VERSE_PAGE_SIZE = 50;


type KindLabelKey =
  | "all"
  | "searchKindVerse"
  | "searchKindBook"
  | "searchKindComment"
  | "searchKindArticle"
  | "searchKindPlan"
  | "searchKindQuestion"
  | "searchKindProject";

const SEARCH_KIND_OPTIONS: { value: SearchKind; labelKey: KindLabelKey }[] = [
  { value: "all", labelKey: "all" },
  { value: "verses", labelKey: "searchKindVerse" },
  { value: "books", labelKey: "searchKindBook" },
  { value: "comments", labelKey: "searchKindComment" },
  { value: "articles", labelKey: "searchKindArticle" },
  { value: "plans", labelKey: "searchKindPlan" },
  { value: "questions", labelKey: "searchKindQuestion" },
  { value: "projects", labelKey: "searchKindProject" },
];

// 種別の名前は apiClient の SEARCH_KINDS が正。ここで二重に書かない。
function isSearchKind(value: string | null): value is SearchKind {
  return SEARCH_KINDS.includes(value as SearchKind);
}

// 「すべて」で種別ごとに出す件数。続きはその種別のタブへ入って見る。
const PREVIEW_PER_KIND = 3;

function getSlugByName(name: string): string | null {
  return BOOKS.find((b) => b.name === name || b.englishName === name)?.slug ?? null;
}

function highlight(text: string, q: string): string {
  if (!q) return text;
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return text.replace(new RegExp(`(${escaped})`, "gi"), "**$1**");
}

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const t = useT();
  const { lang } = useLang();
  const inputId = useId();
  const bookFilterId = useId();
  const q = searchParams.get("q") ?? "";
  const kindParam = searchParams.get("kind");
  const kind: SearchKind = isSearchKind(kindParam) ? kindParam : "all";
  const bookSlug = searchParams.get("book") ?? "";
  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
  const [inputValue, setInputValue] = useState(q);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [retryToken, setRetryToken] = useState(0);
  // 自分が検索したときの語。URL がこれと違う値になったら「戻る・進む」なので入力欄を合わせる。
  // 以前は結果取得と同じ effect で入力欄を上書きしていたため、絞り込みやページ送りをすると
  // 打ちかけの文字が最後に検索した語へ戻ってしまっていた。
  const submittedQ = useRef(q);

  useEffect(() => {
    if (q === submittedQ.current) return;
    submittedQ.current = q;
    setInputValue(q);
  }, [q]);

  useEffect(() => {
    if (q.length < 1) {
      // 検索語が消えたら前の結果を残さない（URL 由来の値に合わせるための意図的な更新）。
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResult(null);
      setError(false);
      return;
    }
    let active = true;
    // クエリ・絞り込み・ページのいずれかが変わったら、そのページを取り直す（追記ではなく置換）。
    // UI 言語は依存に入れない。言語を切り替えても検索結果は変わらない。
    // 件数の最小判定（CJKは1文字可）は backend に任せる。
    setLoading(true);
    setError(false);
    searchBible(q, page, kind, bookSlug)
      .then((data) => {
        if (active) setResult(data);
      })
      .catch(() => {
        if (active) setError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [q, kind, bookSlug, page, retryToken]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const trimmed = ((formData.get("q") as string) ?? inputValue).trim();
    submittedQ.current = trimmed;
    setInputValue(trimmed);
    const params = new URLSearchParams(searchParams.toString());
    if (trimmed) params.set("q", trimmed);
    else params.delete("q");
    params.delete("page"); // 新しい検索は1ページ目から
    const nextUrl = params.toString() ? `/search?${params.toString()}` : "/search";
    router.push(nextUrl);
  };

  const updateFilters = (next: { kind?: SearchKind; book?: string }) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next.kind) {
      if (next.kind === "all") params.delete("kind");
      else params.set("kind", next.kind);
    }
    if (next.book !== undefined) {
      if (next.book) params.set("book", next.book);
      else params.delete("book");
    }
    params.delete("page"); // 絞り込みを変えたら1ページ目に戻す
    const nextUrl = params.toString() ? `/search?${params.toString()}` : "/search";
    router.push(nextUrl);
  };

  const goToPage = (next: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next <= 1) params.delete("page");
    else params.set("page", String(next));
    const nextUrl = params.toString() ? `/search?${params.toString()}` : "/search";
    router.push(nextUrl);
    if (typeof window !== "undefined") window.scrollTo({ top: 0 });
  };

  const totalHits =
    (result?.verse_total ?? 0) +
    (result?.books.length ?? 0) +
    (result?.comments.length ?? 0) +
    (result?.articles.length ?? 0) +
    (result?.plans.length ?? 0) +
    (result?.questions.length ?? 0) +
    (result?.projects.length ?? 0);

  /** 「すべて」のときは数件だけ。種別を選んでいるときは返ってきたぶん全部。 */
  const preview = <T,>(rows: T[]) => (kind === "all" ? rows.slice(0, PREVIEW_PER_KIND) : rows);
  /** その種別に続きがあるなら「もっと見る」を出す。 */
  const seeMore = (target: SearchKind, rows: unknown[], labelKey: KindLabelKey) =>
    kind === "all" && rows.length > PREVIEW_PER_KIND ? (
      <div className="flex justify-center pt-3">
        <button type="button" onClick={() => updateFilters({ kind: target })} className="btn btn-ghost">
          {t.searchSeeMore(t[labelKey])}
        </button>
      </div>
    ) : null;

  return (
    <div className="page page-narrow">
      <h1 className="text-xl font-bold mb-6">{t.searchTitle}</h1>

      <form onSubmit={handleSubmit} className="flex gap-2 mb-6">
        <label htmlFor={inputId} className="sr-only">{t.searchKeyword}</label>
        <ClearableSearchInput
          id={inputId}
          name="q"
          value={inputValue}
          onChange={setInputValue}
          placeholder={t.searchKeyword}
          ariaLabel={t.searchKeyword}
          inputClassName="form-control bg-bg-alt text-sm"
          wrapperClassName="flex-1"
        />
        <button type="submit" className="btn btn-primary">
          {t.searchTitle}
        </button>
      </form>

      <div className="flex items-center gap-2 flex-wrap mb-6">
        <div className="inline-flex gap-1 flex-wrap">
          {SEARCH_KIND_OPTIONS.map((option) => {
            const active = option.value === kind;
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={active}
                onClick={() => updateFilters({ kind: option.value })}
                className={`chip chip-sm chip-bold bg-bg-alt${active ? " chip-active" : ""}`}
              >
                {t[option.labelKey]}
              </button>
            );
          })}
        </div>
        <label htmlFor={bookFilterId} className="sr-only">{t.allBooks}</label>
        <select
          id={bookFilterId}
          value={bookSlug}
          onChange={(e) => updateFilters({ book: e.target.value })}
          className="select-sm max-w-full"
        >
          <option value="">{t.allBooks}</option>
          {BOOKS.map((book) => (
            <option key={book.slug} value={book.slug}>
              {lang === "en" ? book.englishName : book.name}
            </option>
          ))}
        </select>
      </div>

      {!q && (
        <EmptyState title={t.searchPromptTitle} description={t.searchPromptDesc} />
      )}

      {loading && (
        <div role="status" aria-label={t.searching}>
          <SkeletonList count={4} />
        </div>
      )}

      {error && !loading && (
        <ErrorState
          title={t.loadErrorTitle}
          message={t.loadErrorDesc}
          onRetry={() => setRetryToken((value) => value + 1)}
          retryLabel={t.retry}
        />
      )}

      {result && !loading && !error && (
        <>
          <p role="status" aria-live="polite" className="text-muted text-sm mb-4">
            {t.searchResults(q, totalHits)}
          </p>

          {page === 1 && result.books.length > 0 && (
            <section className="mb-6">
              <h2 className="mb-3 text-md font-bold text-body">
                {t.sectionBooks}
              </h2>
              <div className="flex flex-col gap-3">
                {preview(result.books).map((b) => {
                  const slug = getSlugByName(b.name);
                  return (
                    <Link
                      key={b.id}
                      href={slug ? `/${slug}?list=1` : "/read"}
                      className="result-card no-underline text-body text-sm font-bold"
                    >
                      <span className="badge mr-2 border border-border bg-bg uppercase tracking-wide text-muted">{t.searchKindBook}</span>
                      {b.name}
                    </Link>
                  );
                })}
              </div>
              {seeMore("books", result.books, "searchKindBook")}
            </section>
          )}

          {result.verses.length > 0 && (
            <section>
              <h2 className="mb-3 text-md font-bold text-body">
                {t.sectionVerses}
              </h2>
              <div className="flex flex-col gap-3">
                {preview(result.verses).map((v) => {
                  const slug = v.book_slug || getSlugByName(v.book_name);
                  const url = slug ? `/${slug}/${v.chapter_number}#verse-${v.number}` : null;
                  const parts = highlight(v.text, q).split("**");
                  return (
                    <div
                      key={v.id}
                      className="result-card"
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-muted">
                          <span className="badge mr-2 border border-border bg-bg uppercase tracking-wide text-muted">{t.searchKindVerse}</span>
                          {v.book_name} {t.verseFmt(v.chapter_number, v.number)}
                          {/* 検索は全訳を横断するので、どの訳の本文に当たったかを添える。 */}
                          <span className="text-faint"> · {translationLabel(v.translation, lang)}</span>
                        </span>
                        {url && (
                          <Link
                            href={url}
                            className="text-xs text-accent no-underline"
                          >
                            {t.readLink}
                          </Link>
                        )}
                      </div>
                      <p className="m-0 text-sm leading-base">
                        {parts.map((part, i) =>
                          i % 2 === 1
                            ? <mark key={i} className="search-mark">{part}</mark>
                            : <span key={i}>{part}</span>
                        )}
                      </p>
                    </div>
                  );
                })}
              </div>
              {seeMore("verses", result.verses, "searchKindVerse")}
              {/* ページ送りは節の一覧を開いているときだけ。まとめて見るときは
                  各種数件のプレビューなので、送る先が無い。 */}
              {kind === "verses" && (
                <Pagination
                  page={page}
                  totalPages={Math.ceil(result.verse_total / VERSE_PAGE_SIZE)}
                  onChange={goToPage}
                />
              )}
            </section>
          )}

          {page === 1 && result.comments.length > 0 && (
            <section className="mb-6">
              <h2 className="mb-3 text-md font-bold text-body">
                {t.sectionComments}
              </h2>
              <div className="flex flex-col gap-3">
                {preview(result.comments).map((c) => {
                  const parts = highlight(c.body, q).split("**");
                  return (
                    <div
                      key={c.id}
                      className="result-card"
                    >
                      <div className="flex gap-2 text-xs text-muted mb-2 items-center">
                        <span className="badge mr-2 border border-border bg-bg uppercase tracking-wide text-muted">{t.searchKindComment}</span>
                        <span className="font-bold">{c.username}</span>
                        {c.location && <span>· {c.location}</span>}
                      </div>
                      <p className="m-0 text-sm leading-base">
                        {parts.map((part, i) =>
                          i % 2 === 1
                            ? <mark key={i} className="search-mark">{part}</mark>
                            : part
                        )}
                      </p>
                    </div>
                  );
                })}
              </div>
              {seeMore("comments", result.comments, "searchKindComment")}
            </section>
          )}

          {/* ここから下は、節・書・コメントに続いて足した種別。
              形はどれも同じ（題＋説明＋書いた人）なので、1 つの部品で描く。 */}
          {page === 1 && result.articles.length > 0 && (
            <ResultSection
              title={t.sectionArticles}
              badge={t.searchKindArticle}
              rows={preview(result.articles).map((a) => ({
                id: a.id,
                href: `/articles/${a.id}`,
                title: a.title,
                body: a.summary,
                meta: a.owner_username,
              }))}
              q={q}
              footer={seeMore("articles", result.articles, "searchKindArticle")}
            />
          )}

          {page === 1 && result.plans.length > 0 && (
            <ResultSection
              title={t.sectionPlans}
              badge={t.searchKindPlan}
              rows={preview(result.plans).map((plan) => ({
                id: plan.id,
                href: `/plans/${plan.id}`,
                title: plan.title,
                body: plan.description,
                meta: plan.owner_username,
              }))}
              q={q}
              footer={seeMore("plans", result.plans, "searchKindPlan")}
            />
          )}

          {page === 1 && result.questions.length > 0 && (
            <ResultSection
              title={t.sectionQuestions}
              badge={t.searchKindQuestion}
              rows={preview(result.questions).map((question) => ({
                id: question.id,
                href: `/qa/${question.id}`,
                title: question.title,
                body: question.body,
                meta: question.username,
              }))}
              q={q}
              footer={seeMore("questions", result.questions, "searchKindQuestion")}
            />
          )}

          {page === 1 && result.projects.length > 0 && (
            <ResultSection
              title={t.sectionProjects}
              badge={t.searchKindProject}
              rows={preview(result.projects).map((project) => ({
                id: project.id,
                href: `/translations/${project.id}`,
                title: project.name,
                body: project.description,
                meta: project.owner_username,
              }))}
              q={q}
              footer={seeMore("projects", result.projects, "searchKindProject")}
            />
          )}

          {totalHits === 0 && (
            <EmptyState
              title={t.searchEmpty(q)}
              description={t.searchEmptyDesc}
              action={
                <div className="flex gap-3 flex-wrap justify-center">
                  <Link href="/qa" className="btn btn-ghost">{t.searchEmptyGoQa}</Link>
                  <Link href="/read" className="btn btn-primary">{t.searchEmptyGoRead}</Link>
                </div>
              }
            />
          )}
        </>
      )}
    </div>
  );
}

export default function SearchPage() {
  const t = useT();
  return (
    <Suspense fallback={<div role="status" aria-live="polite" className="p-8 text-muted">{t.loading}</div>}>
      <SearchContent />
    </Suspense>
  );
}

/**
 * 記事・プラン・Q&A・翻訳の結果 1 区画。
 *
 * どれも「題・短い説明・書いた人」という同じ形なので、区画ごとに書き分けない。
 * 節・書・コメントは形が違う（箇所や訳が要る）ので、そちらはそのままにしてある。
 */
function ResultSection({
  title,
  badge,
  rows,
  q,
  footer,
}: {
  title: string;
  badge: string;
  rows: { id: string; href: string; title: string; body: string; meta: string }[];
  q: string;
  footer: React.ReactNode;
}) {
  return (
    <section className="mb-6">
      <h2 className="mb-3 text-md font-bold text-body">{title}</h2>
      <div className="flex flex-col gap-3">
        {rows.map((row) => (
          <Link key={row.id} href={row.href} className="result-card no-underline text-body">
            <div className="flex gap-2 items-center text-xs text-muted mb-2">
              <span className="badge border border-border bg-bg uppercase tracking-wide text-muted">{badge}</span>
              <span className="font-bold">{row.meta}</span>
            </div>
            <p className="m-0 text-sm font-bold">
              <Marked text={row.title} q={q} />
            </p>
            {row.body && (
              <p className="mt-1 mb-0 text-sm leading-base text-muted">
                <Marked text={truncate(row.body)} q={q} />
              </p>
            )}
          </Link>
        ))}
      </div>
      {footer}
    </section>
  );
}

/** 探した語のところだけ色を付ける。 */
function Marked({ text, q }: { text: string; q: string }) {
  const parts = highlight(text, q).split("**");
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? <mark key={i} className="search-mark">{part}</mark> : <span key={i}>{part}</span>
      )}
    </>
  );
}

/** 本文は長いので、結果の一覧では頭だけ出す。 */
function truncate(text: string, max = 120): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}
