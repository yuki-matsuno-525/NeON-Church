"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchVerseOfDay, fetchQAComments, fetchTrendingComments, type VerseOfDay, type QAComment } from "@/lib/api";
import { BOOKS } from "@/lib/books";
import { useT, useRelativeTime } from "@/lib/i18n";
import { useLang } from "@/contexts/LanguageContext";
import { defaultTranslationForLang } from "@/lib/translations";

function slugFromBookName(name: string): string {
  return BOOKS.find((b) => b.name === name || b.englishName === name)?.slug ?? "";
}

export default function Home() {
  const t = useT();
  const { lang } = useLang();
  const sections = [
    { title: t.read, description: t.sectionReadDesc, href: "/read", icon: "/img/icon-read.png", featured: true },
    { title: t.qa, description: t.sectionQaDesc, href: "/qa", icon: "/img/icon-qa.png" },
    { title: t.translate, description: t.sectionTranslateDesc, href: "/translations", icon: "/img/icon-translation.png" },
  ];
  const [verseOfDay, setVerseOfDay] = useState<VerseOfDay | null>(null);
  const [verseLoading, setVerseLoading] = useState(true);
  const [verseError, setVerseError] = useState(false);
  const [recentQA, setRecentQA] = useState<QAComment[]>([]);
  const [trending, setTrending] = useState<QAComment[]>([]);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVerseOfDay(null);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVerseLoading(true);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVerseError(false);
    fetchVerseOfDay(defaultTranslationForLang(lang))
      .then((data) => { if (!cancelled) setVerseOfDay(data); })
      .catch((err) => { console.error("fetchVerseOfDay failed:", err); if (!cancelled) setVerseError(true); })
      .finally(() => { if (!cancelled) setVerseLoading(false); });
    return () => { cancelled = true; };
  }, [lang]);

  useEffect(() => {
    fetchQAComments()
      .then((qa) => setRecentQA(qa.slice(0, 4)))
      .catch(() => {});
    fetchTrendingComments().then(setTrending).catch(() => {});
  }, []);

  const slug = verseOfDay ? slugFromBookName(verseOfDay.book_name) : "";
  const verseHref = slug && verseOfDay
    ? `/${slug}/${verseOfDay.chapter_number}?translation=${encodeURIComponent(verseOfDay.translation)}#verse-${verseOfDay.number}`
    : "#";

  return (
    <>
      {/* 背景（固定・全画面） */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          backgroundImage: "url('/img/background.png')",
          backgroundSize: "cover",
          backgroundPosition: "center 28%",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 1,
          background: "rgba(6, 3, 20, 0.80)",
          pointerEvents: "none",
        }}
      />

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
              color: "rgba(193, 143, 255, 0.55)",
              margin: "0 0 16px",
            }}
          >
            NeON Church
          </p>
          <h1
            style={{
              fontFamily: '"Noto Serif JP", serif',
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
              color: "rgba(255, 255, 255, 0.45)",
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
                  color: "rgba(255, 255, 255, 0.30)",
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
                  color: "rgba(255, 255, 255, 0.30)",
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
                  fontFamily: '"Noto Serif JP", serif',
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
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 16,
          }}
        >
          {sections.map((s) => (
            <SectionCard
              key={s.href}
              title={s.title}
              description={s.description}
              href={s.href}
              icon={s.icon}
              featured={s.featured}
            />
          ))}
        </div>

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
                  fontFamily: '"Noto Serif JP", serif',
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
                  fontFamily: '"Noto Serif JP", serif',
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
                  color: "rgba(193, 143, 255, 0.50)",
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

        {/* NeON Church について */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            paddingTop: 8,
            borderTop: "1px solid rgba(255, 255, 255, 0.07)",
          }}
        >
          <Link
            href="/about"
            style={{
              fontSize: 13,
              color: "var(--text-muted)",
              textDecoration: "underline",
              textDecorationColor: "var(--border)",
            }}
          >
            {t.aboutLink}
          </Link>
        </div>
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
      `}</style>
    </>
  );
}

function ActivityCard({ qa }: { qa: QAComment }) {
  const t = useT();
  const relTime = useRelativeTime();
  return (
    <Link
      href="/qa"
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
          gap: 8,
          fontSize: 11,
          color: "rgba(255, 255, 255, 0.32)",
        }}
      >
        <span>{qa.user.username}</span>
        <span>·</span>
        <span>{qa.location_label}</span>
        <span>·</span>
        <span>{relTime(qa.created_at)}</span>
        {qa.reply_count > 0 && (
          <>
            <span>·</span>
            <span>{t.replyLabel} {qa.reply_count}</span>
          </>
        )}
      </div>
    </Link>
  );
}

function TrendingCard({ comment }: { comment: QAComment }) {
  const t = useT();
  const slug = BOOKS.find((b) => b.name === comment.book_name)?.slug ?? "";
  const href = slug && comment.chapter_number
    ? `/${slug}/${comment.chapter_number}${comment.verse_number ? `#verse-${comment.verse_number}` : ""}`
    : "#";

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
          gap: 8,
          fontSize: 11,
          color: "rgba(255, 255, 255, 0.32)",
        }}
      >
        <span>▲ {comment.vote_count}</span>
        <span>·</span>
        <span>{comment.user.username}</span>
        <span>·</span>
        <span>{comment.location_label}</span>
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
  description,
  href,
  icon,
  featured = false,
}: {
  title: string;
  description: string;
  href: string;
  icon: string;
  featured?: boolean;
}) {
  return (
    <Link
      href={href}
      style={{
        display: "flex",
        flexDirection: "column",
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
        cursor: "pointer",
        position: "relative",
        overflow: "hidden",
        boxShadow: [
          "0 0 6px  rgba(210, 110, 255, 0.90)",
          "0 0 18px rgba(185, 80,  255, 0.65)",
          "0 0 38px rgba(155, 55,  230, 0.40)",
        ].join(", "),
        transition: "box-shadow 0.2s, border-color 0.2s",
        minHeight: 140,
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
        el.style.borderColor = featured ? "rgba(210, 130, 255, 1.0)" : "rgba(190, 95, 255, 0.95)";
        el.style.boxShadow = [
          "0 0 6px  rgba(210, 110, 255, 0.90)",
          "0 0 18px rgba(185, 80,  255, 0.65)",
          "0 0 38px rgba(155, 55,  230, 0.40)",
        ].join(", ");
      }}
    >
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
        {/* eslint-disable-next-line @next/next/no-img-element */}
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
        <p
          style={{
            fontFamily: '"Noto Serif JP", serif',
            fontSize: 40,
            fontWeight: 700,
            color: "rgba(255, 255, 255, 0.94)",
            margin: 0,
            lineHeight: 1,
          }}
        >
          {title}
        </p>
      </div>
      <p
        style={{
          fontSize: 13,
          color: "rgba(255, 255, 255, 0.44)",
          lineHeight: 1.7,
          margin: 0,
          position: "relative",
        }}
      >
        {description}
      </p>
    </Link>
  );
}
