"use client";

import Link from "next/link";
import type { PassageCommentaryState } from "@/hooks/usePassageCommentary";
import type { CommentaryEntry } from "@/lib/api";
import { useT } from "@/lib/i18n";
import { useLang } from "@/contexts/LanguageContext";
import { chapterName, commentarySectionHref, workByline } from "@/lib/commentary";
import { LoadMoreButton } from "@/components/ui";
import { ErrorState } from "@/components/ui/ErrorState";
import { CommentaryEntryCard } from "./CommentaryEntryCard";
import styles from "./Commentary.module.css";

type Props = {
  state: PassageCommentaryState;
  /** パネルの絞り込み（立場・検索語）。読み込み済みの解釈にだけ効く。query は小文字にそろえたもの。 */
  filter?: { tradition: string; query: string };
};

/** 絞り込みに合うか。検索は著者・題・章の題・見出し・抜粋のどれかに含まれていればよい。 */
function matches(entry: CommentaryEntry, filter?: { tradition: string; query: string }): boolean {
  if (!filter) return true;
  if (filter.tradition && entry.work.tradition !== filter.tradition) return false;
  if (!filter.query) return true;
  const { work } = entry;
  return [work.author, work.author_ja, work.title, work.title_ja, entry.chapter_title, entry.chapter_title_en ?? "",
    entry.heading, entry.excerpt].some((value) => value.toLowerCase().includes(filter.query));
}

/**
 * 節のパネルの「解釈」タブの中身。
 *
 * 1. この節を直接論じている解釈（時代順）
 * 2. 章全体・書全体についての解釈（別枠で1行ずつ）
 * 3. この節に触れているだけの箇所（畳んでおく。数が多く、関わりも薄いので）
 *
 * データは CommentPanel が usePassageCommentary で取って渡す（タブの件数にも使うため）。
 */
export function PassageCommentary({ state, filter }: Props) {
  const t = useT();
  const { lang } = useLang();
  const { discuss, broad, mention } = state;
  const discussItems = discuss.items.filter((entry) => matches(entry, filter));
  const broadItems = broad.items.filter((entry) => matches(entry, filter));
  const mentionItems = mention.items.filter((entry) => matches(entry, filter));
  const filtering = !!filter && (filter.tradition !== "" || filter.query !== "");

  if (discuss.failed) {
    return <ErrorState title={t.loadErrorTitle} message={t.loadErrorDesc} onRetry={discuss.retry} retryLabel={t.retry} />;
  }
  if (discuss.loading) {
    return <p className="m-0 text-sm text-muted">{t.loading}</p>;
  }

  return (
    <>
      {discussItems.length === 0 ? (
        <p className="m-0 text-sm text-muted">
          {filtering && discuss.items.length > 0 ? t.filterCommentaryNoMatch : t.commentaryNoneHere}
        </p>
      ) : (
        <>
          {discussItems.map((entry) => (
            <CommentaryEntryCard key={entry.id} entry={entry} />
          ))}
          <LoadMoreButton
            hasMore={discuss.hasMore}
            loading={discuss.loadingMore}
            error={!!discuss.loadMoreError}
            onClick={discuss.loadMore}
          />
        </>
      )}

      {broadItems.length > 0 && (
        <section className={styles.broadBox} aria-label={t.commentaryBroadTitle}>
          <h3 className={styles.broadTitle}>{t.commentaryBroadTitle}</h3>
          {broadItems.map((entry) => (
            <Link key={entry.id} href={commentarySectionHref(entry.work.slug, entry.chapter_number, entry.number)} className={styles.broadItem}>
              {workByline(entry.work, lang)}
              {entry.chapter_title && ` ${chapterName({ title: entry.chapter_title, title_en: entry.chapter_title_en }, lang)}`}
            </Link>
          ))}
          <LoadMoreButton
            hasMore={broad.hasMore}
            loading={broad.loadingMore}
            error={!!broad.loadMoreError}
            onClick={broad.loadMore}
          />
        </section>
      )}

      {mention.total > 0 && (
        // 絞り込み中は開いておく（畳んだままだと、合うものがあっても見えない）。
        <details className={styles.mentions} open={filtering || undefined}>
          <summary className={styles.mentionsSummary}>{t.commentaryMentions(mention.total)}</summary>
          <div className={styles.mentionsList}>
            {mentionItems.map((entry) => (
              <CommentaryEntryCard key={entry.id} entry={entry} />
            ))}
            <LoadMoreButton
              hasMore={mention.hasMore}
              loading={mention.loadingMore}
              error={!!mention.loadMoreError}
              onClick={mention.loadMore}
            />
          </div>
        </details>
      )}
    </>
  );
}
