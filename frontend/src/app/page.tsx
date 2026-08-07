import Link from "next/link";
import {
  questionListPath,
  type QAQuestion,
  type TrendingComment,
  type VerseOfDay,
} from "@/lib/api";
import { serverFetch, serverFetchPage } from "@/lib/apiServer";
import { BOOKS } from "@/lib/books";
import { getT, getRequestLanguage } from "@/lib/i18nServer";
import { formatBookLocation, relativeTime } from "@/lib/i18nFormat";
import type { Translations } from "@/lib/i18nDictionary";
import { defaultTranslationForLang } from "@/lib/translations";
import { ErrorState } from "@/components/ui/ErrorState";
import { RetryButton } from "@/components/ui";
import styles from "./Home.module.css";

type HomeSection = { title: string; href: string; icon: string; featured?: boolean };

// 表紙に出すのは冒頭の数件だけ。
const RECENT_QA_LIMIT = 4;

function slugFromBookName(name: string): string {
  return BOOKS.find((b) => b.name === name || b.englishName === name)?.slug ?? "";
}

/**
 * 表紙。
 *
 * 今日の聖句・盛り上がっている意見・最近の質問を、サーバー側で取ってから返す。
 * 以前は画面が出てから3本の通信を始めていたので、最初は枠だけが出ていた。
 * この画面には押して動くところが無いので、まるごとサーバー側で組み立てる。
 */
export default async function Home() {
  const t = await getT();
  const lang = await getRequestLanguage();

  const sections: HomeSection[] = [
    { title: t.read, href: "/read", icon: "/img/icon-read.webp", featured: true },
    { title: t.qa, href: "/qa", icon: "/img/icon-qa.webp" },
    { title: t.translate, href: "/translations", icon: "/img/icon-translation.webp" },
    { title: t.articles, href: "/articles", icon: "/img/icon-articles.webp" },
    { title: t.plans, href: "/plans", icon: "/img/icon-plans.webp" },
  ];

  // どれか1つが取れなくても、残りは出す。
  const [verse, recent, trending] = await Promise.all([
    serverFetch<VerseOfDay>(versePath(defaultTranslationForLang(lang))).catch(() => null),
    serverFetchPage<QAQuestion>(questionListPath())
      .then((page) => page.results.slice(0, RECENT_QA_LIMIT))
      .catch(() => null),
    serverFetch<TrendingComment[]>("/comments/trending/").catch(() => null),
  ]);
  const activityFailed = recent === null || trending === null;

  const verseSlug = verse ? slugFromBookName(verse.book_name) : "";
  const verseHref = verseSlug && verse
    ? `/${verseSlug}/${verse.chapter_number}?translation=${encodeURIComponent(verse.translation)}#verse-${verse.number}`
    : "#";

  return (
    <div className={styles.content}>
      {/* ヒーローセクション */}
      <div className="pt-6 pb-2">
        <p className={styles.heroEyebrow}>NeON Church</p>
        <h1 className={styles.heroTitle}>{t.homeTagline}</h1>
        <p className={styles.heroDesc}>{t.homeDesc}</p>
      </div>

      {/* 今日の聖句。取れなかったときも同じネオンカードでその旨を出す。 */}
      {verse ? (
        <Link href={verseHref} className={`card-glow card-glow-strong card-glow-interactive ${styles.neonCardPad}`}>
          <p className={styles.verseLabel}>{t.todayVerse}</p>
          <blockquote className={styles.verseText}>{verse.text}</blockquote>
          <p className={styles.verseSource}>
            {t.chapterVerseFmt(verse.book_name, verse.chapter_number, verse.number)}
          </p>
        </Link>
      ) : (
        <div className={`card-glow card-glow-strong ${styles.neonCardPad}`}>
          <p className={styles.verseLabel}>{t.todayVerse}</p>
          <p className="m-0 text-sm text-muted">{t.verseUnavailable}</p>
        </div>
      )}

      {/* セクションカード */}
      <div className={styles.cards}>
        {sections.map((section) => (
          <SectionCard key={section.href} {...section} />
        ))}
      </div>

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
    </div>
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

function SectionCard({ title, href, icon, featured = false }: HomeSection) {
  // 触れたときに明るくするのは CSS の :hover / :focus-visible に任せる。
  // 以前は JavaScript で style を直接書き換えていたため、キーボードで
  // 選んだときには光らなかった。
  const cardClass = [
    "card-glow card-glow-strong card-glow-interactive",
    styles.sectionCard,
    featured ? "card-glow-featured" : null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <Link href={href} className={cardClass}>
      <div className={styles.sectionRow}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={icon} alt="" className={styles.sectionIcon} />
        <p className={styles.sectionTitle}>{title}</p>
      </div>
    </Link>
  );
}
