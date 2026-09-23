"use client";

import Link from "next/link";
import type { PassageCommentaryState } from "@/hooks/usePassageCommentary";
import { useT } from "@/lib/i18n";
import { commentarySectionHref } from "@/lib/commentary";
import { LoadMoreButton } from "@/components/ui";
import { ErrorState } from "@/components/ui/ErrorState";
import { CommentaryEntryCard } from "./CommentaryEntryCard";
import styles from "./Commentary.module.css";

type Props = {
  state: PassageCommentaryState;
};

/**
 * 節のパネルの「解釈」タブの中身。
 *
 * 1. この節を直接論じている解釈（時代順）
 * 2. 章全体・書全体についての解釈（別枠で1行ずつ）
 * 3. この節に触れているだけの箇所（畳んでおく。数が多く、関わりも薄いので）
 *
 * データは CommentPanel が usePassageCommentary で取って渡す（タブの件数にも使うため）。
 */
export function PassageCommentary({ state }: Props) {
  const t = useT();
  const { discuss, broad, mention } = state;

  if (discuss.failed) {
    return <ErrorState title={t.loadErrorTitle} message={t.loadErrorDesc} onRetry={discuss.retry} retryLabel={t.retry} />;
  }
  if (discuss.loading) {
    return <p className="m-0 text-sm text-muted">{t.loading}</p>;
  }

  return (
    <>
      {discuss.items.length === 0 ? (
        <p className="m-0 text-sm text-muted">{t.commentaryNoneHere}</p>
      ) : (
        <>
          {discuss.items.map((entry) => (
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

      {broad.items.length > 0 && (
        <section className={styles.broadBox} aria-label={t.commentaryBroadTitle}>
          <h3 className={styles.broadTitle}>{t.commentaryBroadTitle}</h3>
          {broad.items.map((entry) => (
            <Link key={entry.id} href={commentarySectionHref(entry.work.slug, entry.order)} className={styles.broadItem}>
              {entry.work.author_ja || entry.work.author}『{entry.work.title_ja || entry.work.title}』
              {entry.heading && ` ${entry.heading}`}
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
        <details className={styles.mentions}>
          <summary className={styles.mentionsSummary}>{t.commentaryMentions(mention.total)}</summary>
          <div className={styles.mentionsList}>
            {mention.items.map((entry) => (
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
