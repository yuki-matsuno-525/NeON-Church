"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchVerseOfDay, fetchQuestionPage, fetchTrendingComments, type VerseOfDay, type QAQuestion, type TrendingComment } from "@/lib/api";
import { BOOKS } from "@/lib/books";
import { formatBookLocation, useT, useRelativeTime } from "@/lib/i18n";
import { useLang } from "@/contexts/LanguageContext";
import { defaultTranslationForLang } from "@/lib/translations";
import { Icon, type IconName } from "@/components/ui/Icon";
import { SkeletonList } from "@/components/ui";
import { ErrorState } from "@/components/ui/ErrorState";
import styles from "./Home.module.css";

type HomeSection = {
  title: string;
  href: string;
  icon?: string;
  iconName?: IconName;
  featured?: boolean;
};

function slugFromBookName(name: string): string {
  return BOOKS.find((b) => b.name === name || b.englishName === name)?.slug ?? "";
}

export default function Home() {
  const t = useT();
  const { lang } = useLang();
  const sections: HomeSection[] = [
    { title: t.read, href: "/read", icon: "/img/icon-read.webp", featured: true },
    { title: t.qa, href: "/qa", icon: "/img/icon-qa.webp" },
    { title: t.translate, href: "/translations", icon: "/img/icon-translation.webp" },
    { title: t.articles, href: "/articles", iconName: "book-open" },
    { title: t.plans, href: "/plans", iconName: "check-circle" },
  ];
  const [verseOfDay, setVerseOfDay] = useState<VerseOfDay | null>(null);
  const [verseLoading, setVerseLoading] = useState(true);
  const [verseError, setVerseError] = useState(false);
  const [recentQA, setRecentQA] = useState<QAQuestion[]>([]);
  const [trending, setTrending] = useState<TrendingComment[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);
  const [activityError, setActivityError] = useState(false);
  const [activityRetryToken, setActivityRetryToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVerseOfDay(null);
    setVerseLoading(true);
    setVerseError(false);
    fetchVerseOfDay(defaultTranslationForLang(lang))
      .then((data) => { if (!cancelled) setVerseOfDay(data); })
      .catch((err) => { console.error("fetchVerseOfDay failed:", err); if (!cancelled) setVerseError(true); })
      .finally(() => { if (!cancelled) setVerseLoading(false); });
    return () => { cancelled = true; };
  }, [lang]);

  useEffect(() => {
    let active = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActivityLoading(true);
    setActivityError(false);
    // 表紙に出すのは冒頭の数件だけなので1ページ目で足りる。
    Promise.allSettled([fetchQuestionPage(), fetchTrendingComments()]).then(([recentResult, trendingResult]) => {
      if (!active) return;
      if (recentResult.status === "fulfilled") setRecentQA(recentResult.value.results.slice(0, 4));
      else setActivityError(true);
      if (trendingResult.status === "fulfilled") setTrending(trendingResult.value);
      else setActivityError(true);
      setActivityLoading(false);
    });
    return () => {
      active = false;
    };
  }, [activityRetryToken]);

  const slug = verseOfDay ? slugFromBookName(verseOfDay.book_name) : "";
  const verseHref = slug && verseOfDay
    ? `/${slug}/${verseOfDay.chapter_number}?translation=${encodeURIComponent(verseOfDay.translation)}#verse-${verseOfDay.number}`
    : "#";

  return (
    <>
      {/* ページコンテンツ */}
      <div className={styles.content}>
        {/* ヒーローセクション */}
        <div className="pt-6 pb-2">
          <p className={styles.heroEyebrow}>NeON Church</p>
          <h1 className={styles.heroTitle}>{t.homeTagline}</h1>
          <p className={styles.heroDesc}>{t.homeDesc}</p>
        </div>

        {/* 今日の聖句。読み込み中・失敗・本体で同じネオンカードを使う。 */}
        {(verseLoading || verseOfDay || verseError) && (
          verseLoading || verseError ? (
            <div className={`card-glow card-glow-strong ${styles.neonCardPad}`}>
              <p className={styles.verseLabel}>{t.todayVerse}</p>
              <p className="m-0 text-sm text-muted">
                {verseLoading ? t.loading : t.verseUnavailable}
              </p>
            </div>
          ) : (
            <Link href={verseHref} className={`card-glow card-glow-strong card-glow-interactive ${styles.neonCardPad}`}>
              <p className={styles.verseLabel}>{t.todayVerse}</p>
              <blockquote className={styles.verseText}>{verseOfDay!.text}</blockquote>
              <p className={styles.verseSource}>
                {t.chapterVerseFmt(verseOfDay!.book_name, verseOfDay!.chapter_number, verseOfDay!.number)}
              </p>
            </Link>
          )
        )}

        {/* セクションカード */}
        <div className={styles.cards}>
          {sections.map((s) => (
            <SectionCard
              key={s.href}
              title={s.title}
              href={s.href}
              icon={s.icon}
              iconName={s.iconName}
              featured={s.featured}
            />
          ))}
        </div>

        {activityLoading && (
          <section aria-label={t.loading}>
            <SkeletonList count={3} />
          </section>
        )}
        {activityError && !activityLoading && (
          <ErrorState
            title={t.loadErrorTitle}
            message={t.loadErrorDesc}
            onRetry={() => setActivityRetryToken((value) => value + 1)}
            retryLabel={t.retry}
          />
        )}

        {/* トレンド */}
        {trending.length > 0 && (
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className={styles.listHeading}>{t.trending}</h2>
            </div>
            <div className={styles.listGrid}>
              {trending.map((c) => (
                <TrendingCard key={c.id} comment={c} />
              ))}
            </div>
          </div>
        )}

        {/* 最近のQ&A */}
        {recentQA.length > 0 && (
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className={styles.listHeading}>{t.recentQA}</h2>
              <Link href="/qa" className="text-sm text-muted no-underline">
                {t.seeAll}
              </Link>
            </div>
            <div className={styles.listGrid}>
              {recentQA.map((qa) => (
                <ActivityCard key={qa.id} qa={qa} />
              ))}
            </div>
          </div>
        )}

      </div>
    </>
  );
}

function ActivityCard({ qa }: { qa: QAQuestion }) {
  const t = useT();
  const { lang } = useLang();
  const relTime = useRelativeTime();
  const slug = qa.book_slug;
  return (
    <Link href={`/qa/${qa.id}`} className={styles.listCard}>
      <p className={styles.listCardBody}>{qa.body}</p>
      <div className={styles.listCardMeta}>
        <span>{qa.user.username}</span>
        <span>·</span>
        <span className="whitespace-nowrap">
          {slug ? formatBookLocation(slug, qa.chapter_number, qa.verse_number, lang) : qa.location_label}
        </span>
        <span>·</span>
        <span>{relTime(qa.created_at)}</span>
        {qa.answer_count > 0 && (
          <>
            <span>·</span>
            <span>{t.qaAnswerCount(qa.answer_count)}</span>
          </>
        )}
      </div>
    </Link>
  );
}

function TrendingCard({ comment }: { comment: TrendingComment }) {
  const t = useT();
  const { lang } = useLang();
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

function SectionCard({
  title,
  href,
  icon,
  iconName,
  featured = false,
  onClick,
  disabled = false,
}: {
  title: string;
  href: string;
  icon?: string;
  iconName?: IconName;
  featured?: boolean;
  onClick?: () => void;
  disabled?: boolean;
}) {
  // 触れたときに明るくするのは CSS の :hover / :focus-visible に任せる。
  // 以前は JavaScript で style を直接書き換えていたため、キーボードで
  // 選んだときには光らなかった。
  const cardClass = [
    "card-glow card-glow-strong card-glow-interactive",
    styles.sectionCard,
    featured ? "card-glow-featured" : null,
    disabled ? "opacity-70" : null,
  ]
    .filter(Boolean)
    .join(" ");

  const content = (
    <div className={styles.sectionRow}>
      {icon ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={icon} alt="" className={styles.sectionIcon} />
      ) : (
        <span className={styles.sectionIconBox}>
          <Icon name={iconName ?? "book-open"} size={32} />
        </span>
      )}
      <p className={styles.sectionTitle}>{title}</p>
    </div>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={`${cardClass} w-full text-left`}
      >
        {content}
      </button>
    );
  }

  return (
    <Link href={href} className={cardClass}>
      {content}
    </Link>
  );
}
