"use client";

import type { CSSProperties } from "react";
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
      <div
        className="home-content"
        style={{
          position: "relative",
          zIndex: 2,
          minHeight: "calc(100vh - var(--navbar-height))",
          maxWidth: 960,
          margin: "0 auto",
          padding: "52px 32px 48px",
          display: "flex",
          flexDirection: "column",
          gap: 24,
        }}
      >
        {/* ヒーローセクション */}
        <div style={{ padding: "var(--space-5) 0 var(--space-2)" }}>
          <p
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.07em",
              color: "rgba(213, 181, 255, 0.88)",
              margin: "0 0 16px",
            }}
          >
            NeON Church
          </p>
          <h1
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: "clamp(30px, 5vw, 52px)",
              fontWeight: 700,
              color: "rgba(255, 255, 255, 0.95)",
              margin: "0 0 16px",
              lineHeight: 1.3,
              letterSpacing: "-0.01em",
              whiteSpace: "pre-line",
            }}
          >
            {t.homeTagline}
          </h1>
          <p
            style={{
              fontSize: 14,
              color: "var(--text-muted)",
              lineHeight: 1.9,
              margin: 0,
              maxWidth: 480,
            }}
          >
            {t.homeDesc}
          </p>
        </div>

        {/* 今日の聖句 */}
        {(verseLoading || verseOfDay || verseError) && (
          verseLoading ? (
            <div
              style={{
                display: "block",
                position: "relative",
                overflow: "hidden",
                background: "linear-gradient(160deg, rgba(110, 40, 200, 0.38) 0%, rgba(70, 15, 150, 0.50) 100%)",
                border: "3px solid rgba(190, 95, 255, 0.95)",
                borderRadius: 20,
                padding: "24px 28px",
                boxShadow: [
                  "0 0 6px  rgba(210, 110, 255, 0.90)",
                  "0 0 18px rgba(185, 80,  255, 0.65)",
                  "0 0 38px rgba(155, 55,  230, 0.40)",
                ].join(", "),
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: 0, left: 0, right: 0,
                  height: "50%",
                  background: "linear-gradient(180deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0) 100%)",
                  borderRadius: "18px 18px 0 0",
                  pointerEvents: "none",
                }}
              />
              <p
                style={{
                  position: "relative",
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.07em",
                  color: "rgba(193, 143, 255, 0.88)",
                  margin: "0 0 10px",
                }}
              >
                {t.todayVerse}
              </p>
              <p
                style={{
                  position: "relative",
                  fontSize: 14,
                  color: "var(--text-muted)",
                  margin: 0,
                }}
              >
                {t.loading}
              </p>
            </div>
          ) : verseError ? (
            <div
              style={{
                display: "block",
                position: "relative",
                overflow: "hidden",
                background: "linear-gradient(160deg, rgba(110, 40, 200, 0.38) 0%, rgba(70, 15, 150, 0.50) 100%)",
                border: "3px solid rgba(190, 95, 255, 0.95)",
                borderRadius: 20,
                padding: "24px 28px",
                boxShadow: [
                  "0 0 6px  rgba(210, 110, 255, 0.90)",
                  "0 0 18px rgba(185, 80,  255, 0.65)",
                  "0 0 38px rgba(155, 55,  230, 0.40)",
                ].join(", "),
              }}
            >
              <p
                style={{
                  position: "relative",
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.07em",
                  color: "rgba(193, 143, 255, 0.88)",
                  margin: "0 0 10px",
                }}
              >
                {t.todayVerse}
              </p>
              <p
                style={{
                  position: "relative",
                  fontSize: 14,
                  color: "var(--text-muted)",
                  margin: 0,
                }}
              >
                {t.verseUnavailable}
              </p>
            </div>
          ) : (
            <Link
              href={verseHref}
              style={{
                display: "block",
                position: "relative",
                overflow: "hidden",
                background: "linear-gradient(160deg, rgba(110, 40, 200, 0.38) 0%, rgba(70, 15, 150, 0.50) 100%)",
                border: "3px solid rgba(190, 95, 255, 0.95)",
                borderRadius: 20,
                padding: "24px 28px",
                textDecoration: "none",
                color: "inherit",
                cursor: "pointer",
                boxShadow: [
                  "0 0 6px  rgba(210, 110, 255, 0.90)",
                  "0 0 18px rgba(185, 80,  255, 0.65)",
                  "0 0 38px rgba(155, 55,  230, 0.40)",
                ].join(", "),
                transition: "box-shadow var(--duration-base) var(--ease-out), border-color var(--duration-base) var(--ease-out)",
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLElement;
                el.style.borderColor = "rgba(225, 135, 255, 1.0)";
                el.style.boxShadow = [
                  "0 0 8px  rgba(230, 130, 255, 1.00)",
                  "0 0 22px rgba(205, 100, 255, 0.82)",
                  "0 0 46px rgba(170, 68,  240, 0.55)",
                ].join(", ");
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLElement;
                el.style.borderColor = "rgba(190, 95, 255, 0.95)";
                el.style.boxShadow = [
                  "0 0 6px  rgba(210, 110, 255, 0.90)",
                  "0 0 18px rgba(185, 80,  255, 0.65)",
                  "0 0 38px rgba(155, 55,  230, 0.40)",
                  "inset 0 0 10px rgba(200, 100, 255, 0.15)",
                ].join(", ");
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: 0, left: 0, right: 0,
                  height: "50%",
                  background: "linear-gradient(180deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0) 100%)",
                  borderRadius: "18px 18px 0 0",
                  pointerEvents: "none",
                }}
              />
              <p
                style={{
                  position: "relative",
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.07em",
                  color: "rgba(193, 143, 255, 0.88)",
                  margin: "0 0 10px",
                }}
              >
                {t.todayVerse}
              </p>
              <blockquote
                style={{
                  position: "relative",
                  fontFamily: "var(--font-serif)",
                  fontSize: 15,
                  lineHeight: 2.0,
                  color: "rgba(255, 255, 255, 0.85)",
                  margin: "0 0 14px",
                  padding: 0,
                }}
              >
                {verseOfDay!.text}
              </blockquote>
              <p
                style={{
                  position: "relative",
                  fontSize: 13,
                  color: "rgba(193, 143, 255, 0.88)",
                  margin: 0,
                }}
              >
                {t.chapterVerseFmt(verseOfDay!.book_name, verseOfDay!.chapter_number, verseOfDay!.number)}
              </p>
            </Link>
          )
        )}

        {/* セクションカード（3等分・等サイズ） */}
        <div
          className="home-cards"
          style={{
            display: "grid",
            // 5枚を1行に詰めると狭くなるので、幅に合わせて折り返す。
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 16,
          }}
        >
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
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "var(--space-3)",
              }}
            >
              <h2
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: "var(--font-size-xl)",
                  color: "rgba(193, 143, 255, 0.88)",
                  margin: 0,
                }}
              >
                {t.trending}
              </h2>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "var(--space-2)" }}>
              {trending.map((c) => (
                <TrendingCard key={c.id} comment={c} />
              ))}
            </div>
          </div>
        )}

        {/* 最近のQ&A */}
        {recentQA.length > 0 && (
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "var(--space-3)",
              }}
            >
              <h2
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: "var(--font-size-xl)",
                  color: "rgba(193, 143, 255, 0.88)",
                  margin: 0,
                }}
              >
                {t.recentQA}
              </h2>
              <Link
                href="/qa"
                style={{
                  fontSize: "var(--font-size-sm)",
                  color: "rgba(213, 181, 255, 0.88)",
                  textDecoration: "none",
                }}
              >
                {t.seeAll}
              </Link>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "var(--space-2)" }}>
              {recentQA.map((qa) => (
                <ActivityCard key={qa.id} qa={qa} />
              ))}
            </div>
          </div>
        )}

      </div>

      <style>{`
        @media (min-width: 769px) {
          .home-content {
            transform: translateX(calc(-1 * var(--sidebar-width) / 2));
          }
        }
        @media (max-width: 768px) {
          .home-cards {
            grid-template-columns: 1fr !important;
          }
        }
        @media (min-width: 769px) and (max-width: 980px) {
          .home-cards {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
      `}</style>
    </>
  );
}

function ActivityCard({ qa }: { qa: QAQuestion }) {
  const t = useT();
  const { lang } = useLang();
  const relTime = useRelativeTime();
  const slug = qa.book_slug;
  return (
    <Link
      href={`/qa/${qa.id}`}
      style={{
        display: "block",
        background: "rgba(255, 255, 255, 0.03)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        borderRadius: 12,
        padding: "14px 16px",
        textDecoration: "none",
        color: "inherit",
        transition: "border-color 0.15s, background 0.15s",
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.borderColor = "rgba(190, 95, 255, 0.30)";
        el.style.background = "rgba(110, 40, 200, 0.08)";
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.borderColor = "rgba(255, 255, 255, 0.08)";
        el.style.background = "rgba(255, 255, 255, 0.03)";
      }}
    >
      <p
        style={{
          fontSize: 13,
          color: "rgba(255, 255, 255, 0.78)",
          margin: "0 0 8px",
          lineHeight: 1.65,
          overflow: "hidden",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
        }}
      >
        {qa.body}
      </p>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 8,
          fontSize: 11,
          color: "var(--text-faint)",
        }}
      >
        <span>{qa.user.username}</span>
        <span>·</span>
        <span style={{ whiteSpace: "nowrap" }}>
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
    <Link
      href={href}
      style={{
        display: "block",
        background: "rgba(255, 255, 255, 0.03)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        borderRadius: 12,
        padding: "14px 16px",
        textDecoration: "none",
        color: "inherit",
        transition: "border-color 0.15s, background 0.15s",
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.borderColor = "rgba(190, 95, 255, 0.30)";
        el.style.background = "rgba(110, 40, 200, 0.08)";
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.borderColor = "rgba(255, 255, 255, 0.08)";
        el.style.background = "rgba(255, 255, 255, 0.03)";
      }}
    >
      <p
        style={{
          fontSize: 13,
          color: "rgba(255, 255, 255, 0.78)",
          margin: "0 0 8px",
          lineHeight: 1.65,
          overflow: "hidden",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
        }}
      >
        {comment.body}
      </p>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 8,
          fontSize: 11,
          color: "var(--text-faint)",
        }}
      >
        <span>▲ {comment.vote_count}</span>
        <span>·</span>
        <span>{comment.user.username}</span>
        <span>·</span>
        <span style={{ whiteSpace: "nowrap" }}>
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
  const cardStyle: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    gap: 10,
    background: featured
      ? "linear-gradient(160deg, rgba(125, 45, 215, 0.44) 0%, rgba(80, 20, 168, 0.56) 100%)"
      : "linear-gradient(160deg, rgba(110, 40, 200, 0.38) 0%, rgba(70, 15, 150, 0.50) 100%)",
    border: featured
      ? "3px solid rgba(210, 130, 255, 1.0)"
      : "3px solid rgba(190, 95, 255, 0.95)",
    borderRadius: 20,
    padding: "24px 22px",
    textDecoration: "none",
    color: "inherit",
    cursor: disabled ? "default" : "pointer",
    position: "relative",
    overflow: "hidden",
    boxShadow: [
      "0 0 6px  rgba(210, 110, 255, 0.90)",
      "0 0 18px rgba(185, 80,  255, 0.65)",
      "0 0 38px rgba(155, 55,  230, 0.40)",
    ].join(", "),
    transition: "box-shadow 0.2s, border-color 0.2s",
    minHeight: 140,
    opacity: disabled ? 0.72 : 1,
  };
  const content = (
    <>
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "50%",
          background: "linear-gradient(180deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0) 100%)",
          borderRadius: "18px 18px 0 0",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          position: "relative",
        }}
      >
        {icon ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={icon}
            alt=""
            style={{
              width: 52,
              height: 52,
              objectFit: "contain",
              flexShrink: 0,
            }}
          />
        ) : (
          <span
            style={{
              width: 52,
              height: 52,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 14,
              background: "rgba(255,255,255,0.10)",
              border: "1px solid rgba(255,255,255,0.20)",
              color: "rgba(255,255,255,0.90)",
              flexShrink: 0,
            }}
          >
            <Icon name={iconName ?? "book-open"} size={32} />
          </span>
        )}
        <p
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: 30,
            fontWeight: 700,
            color: "rgba(255, 255, 255, 0.94)",
            margin: 0,
            lineHeight: 1,
          }}
        >
          {title}
        </p>
      </div>
    </>
  );
  const hoverOn = (el: HTMLElement) => {
    if (disabled) return;
    el.style.borderColor = "rgba(225, 135, 255, 1.0)";
    el.style.boxShadow = [
      "0 0 8px  rgba(230, 130, 255, 1.00)",
      "0 0 22px rgba(205, 100, 255, 0.82)",
      "0 0 46px rgba(170, 68,  240, 0.55)",
    ].join(", ");
  };
  const hoverOff = (el: HTMLElement) => {
    el.style.borderColor = featured ? "rgba(210, 130, 255, 1.0)" : "rgba(190, 95, 255, 0.95)";
    el.style.boxShadow = [
      "0 0 6px  rgba(210, 110, 255, 0.90)",
      "0 0 18px rgba(185, 80,  255, 0.65)",
      "0 0 38px rgba(155, 55,  230, 0.40)",
    ].join(", ");
  };

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        style={{ ...cardStyle, width: "100%", textAlign: "left", fontFamily: "inherit" }}
        onMouseEnter={(e) => hoverOn(e.currentTarget as HTMLElement)}
        onMouseLeave={(e) => hoverOff(e.currentTarget as HTMLElement)}
      >
        {content}
      </button>
    );
  }

  return (
    <Link
      href={href}
      style={cardStyle}
      onMouseEnter={(e) => {
        hoverOn(e.currentTarget as HTMLElement);
      }}
      onMouseLeave={(e) => {
        hoverOff(e.currentTarget as HTMLElement);
      }}
      onFocus={(e) => hoverOn(e.currentTarget as HTMLElement)}
      onBlur={(e) => hoverOff(e.currentTarget as HTMLElement)}
    >
      {content}
    </Link>
  );
}
