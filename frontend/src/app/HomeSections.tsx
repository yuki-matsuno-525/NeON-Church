import Link from "next/link";
import {
  questionListPath,
  type QAQuestion,
  type TrendingComment,
  type VerseOfDay,
} from "@/lib/api";
import { serverFetchPage, serverFetchPublic } from "@/lib/apiServer";
import { BOOKS } from "@/lib/books";
import { formatBookLocation, relativeTime } from "@/lib/i18nFormat";
import type { Translations } from "@/lib/i18nDictionary";
import { defaultTranslationForLang } from "@/lib/translations";
import { ErrorState } from "@/components/ui/ErrorState";
import { RetryButton, Skeleton } from "@/components/ui";
import styles from "./Home.module.css";

/*
 * 表紙のうち、サーバーからデータを取ってくる欄。
 * page.tsx が Suspense で包み、届いたところから流し込む。
 */

// 表紙に出すのは冒頭の数件だけ。
const RECENT_QA_LIMIT = 4;
// 取り置きの長さ（秒）。今日の聖句は1日1つ、盛り上がりはサーバー側でも5分使い回している。
const VERSE_REVALIDATE_SECONDS = 3600;
const TRENDING_REVALIDATE_SECONDS = 60;

function slugFromBookName(name: string): string {
  return BOOKS.find((b) => b.name === name || b.englishName === name)?.slug ?? "";
}

/** 今日の聖句。取れなかったときも同じネオンカードでその旨を出す。 */
export async function VerseCard({ t, lang }: { t: Translations; lang: string }) {
  // 誰が見ても同じなので、取り置きを使う（日付が変わっても最大1時間で入れ替わる）。
  const verse = await serverFetchPublic<VerseOfDay>(
    versePath(defaultTranslationForLang(lang)),
    VERSE_REVALIDATE_SECONDS,
  ).catch(() => null);

  if (!verse) {
    return (
      <div className={`card-glow card-glow-strong ${styles.neonCardPad}`}>
        <p className={styles.verseLabel}>{t.todayVerse}</p>
        <p className="m-0 text-sm text-muted">{t.verseUnavailable}</p>
      </div>
    );
  }

  const verseSlug = slugFromBookName(verse.book_name);
  const verseHref = verseSlug
    ? `/${verseSlug}/${verse.chapter_number}?translation=${encodeURIComponent(verse.translation)}#verse-${verse.number}`
    : "#";

  return (
    <Link href={verseHref} className={`card-glow card-glow-strong card-glow-interactive ${styles.neonCardPad}`}>
      <p className={styles.verseLabel}>{t.todayVerse}</p>
      <blockquote className={styles.verseText}>{verse.text}</blockquote>
      <p className={styles.verseSource}>
        {t.chapterVerseFmt(verse.book_name, verse.chapter_number, verse.number)}
      </p>
    </Link>
  );
}

/** 聖句を待つあいだの枠。届いたときに下のパネルがずれないよう、同じカードで高さを取っておく。 */
export function VerseCardFallback({ t }: { t: Translations }) {
  return (
    <div className={`card-glow card-glow-strong ${styles.neonCardPad}`} aria-busy="true">
      <p className={styles.verseLabel}>{t.todayVerse}</p>
      <div className="flex flex-col gap-3">
        <Skeleton height={16} />
        <Skeleton width="70%" height={16} />
        <Skeleton width="30%" height={12} />
      </div>
    </div>
  );
}

/** 盛り上がっている意見と最近の質問。どちらか1つが取れなくても、残りは出す。 */
export async function HomeActivity({ t, lang }: { t: Translations; lang: string }) {
  const [recent, trending] = await Promise.all([
    serverFetchPage<QAQuestion>(questionListPath({ page_size: RECENT_QA_LIMIT }))
      .then((page) => page.results.slice(0, RECENT_QA_LIMIT))
      .catch(() => null),
    serverFetchPublic<TrendingComment[]>("/comments/trending/", TRENDING_REVALIDATE_SECONDS).catch(() => null),
  ]);
  const activityFailed = recent === null || trending === null;

  return (
    <>
      {activityFailed && (
        <ErrorState
          title={t.loadErrorTitle}
          message={t.loadErrorDesc}
          extraAction={<RetryButton label={t.retry} />}
        />
      )}

      {/* トレンド */}
      {trending && trending.length > 0 && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className={styles.listHeading}>{t.trending}</h2>
          </div>
          <div className={styles.listGrid}>
            {trending.map((comment) => (
              <TrendingCard key={comment.id} comment={comment} t={t} lang={lang} />
            ))}
          </div>
        </div>
      )}

      {/* 最近のQ&A */}
      {recent && recent.length > 0 && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className={styles.listHeading}>{t.recentQA}</h2>
            <Link href="/qa" className="text-sm text-muted no-underline">
              {t.seeAll}
            </Link>
          </div>
          <div className={styles.listGrid}>
            {recent.map((question) => (
              <ActivityCard key={question.id} question={question} t={t} lang={lang} />
            ))}
          </div>
        </div>
      )}
    </>
  );
}

/** 今日の聖句の問い合わせ先。表示言語の既定訳で引く。 */
function versePath(translation?: string): string {
  return `/verse-of-the-day/${translation ? `?translation=${encodeURIComponent(translation)}` : ""}`;
}

function ActivityCard({ question, t, lang }: { question: QAQuestion; t: Translations; lang: string }) {
  return (
    <Link href={`/qa/${question.id}`} className={styles.listCard}>
      <p className={styles.listCardBody}>{question.body}</p>
      <div className={styles.listCardMeta}>
        <span>{question.user.username}</span>
        <span>·</span>
        <span className="whitespace-nowrap">
          {question.book_slug
            ? formatBookLocation(question.book_slug, question.chapter_number, question.verse_number, lang)
            : question.location_label}
        </span>
        <span>·</span>
        <span>{relativeTime(question.created_at, t)}</span>
        {question.answer_count > 0 && (
          <>
            <span>·</span>
            <span>{t.qaAnswerCount(question.answer_count)}</span>
          </>
        )}
      </div>
    </Link>
  );
}

function TrendingCard({ comment, t, lang }: { comment: TrendingComment; t: Translations; lang: string }) {
  const slug = slugFromBookName(comment.book_name);
  const href = slug && comment.chapter_number
    ? `/${slug}/${comment.chapter_number}${comment.verse_number ? `#verse-${comment.verse_number}` : ""}`
    : "/qa";

  return (
    <Link href={href} className={styles.listCard}>
      <p className={styles.listCardBody}>{comment.body}</p>
      <div className={styles.listCardMeta}>
        <span>▲ {comment.vote_count}</span>
        <span>·</span>
        <span>{comment.user.username}</span>
        <span>·</span>
        <span className="whitespace-nowrap">
          {slug ? formatBookLocation(slug, comment.chapter_number, comment.verse_number, lang) : comment.location_label}
        </span>
        {comment.reply_count > 0 && (
          <>
            <span>·</span>
            <span>{t.replyLabel} {comment.reply_count}</span>
          </>
        )}
      </div>
    </Link>
  );
}

