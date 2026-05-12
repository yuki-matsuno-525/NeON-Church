"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchVerseOfDay, type VerseOfDay } from "@/lib/api";
import { BOOKS } from "@/lib/books";

function slugFromBookName(name: string): string {
  return BOOKS.find((b) => b.name === name)?.slug ?? "";
}

const SECTIONS = [
  {
    title: "読む",
    description: "聖書の各章を読み、コメントを投稿・共有できます。",
    href: "/read",
  },
  {
    title: "Q&A",
    description: "聖書に関する疑問を投稿し、回答をもらえる場所。",
    href: "/qa",
  },
  {
    title: "翻訳",
    description: "聖書の共同翻訳プロジェクトを作成・参加できます。",
    href: "/translations",
  },
];

export default function Home() {
  const [verseOfDay, setVerseOfDay] = useState<VerseOfDay | null>(null);

  useEffect(() => {
    fetchVerseOfDay().then(setVerseOfDay).catch(() => {});
  }, []);

  const slug = verseOfDay ? slugFromBookName(verseOfDay.book_name) : "";
  const verseHref = slug ? `/${slug}/${verseOfDay?.chapter_number}` : "#";

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
        {/* 今日の聖句 */}
        {verseOfDay && (
          <div
            style={{
              background: "rgba(18, 10, 50, 0.62)",
              backdropFilter: "blur(28px)",
              WebkitBackdropFilter: "blur(28px)",
              border: "1px solid rgba(168, 88, 255, 0.30)",
              borderRadius: 18,
              padding: "24px 28px",
              boxShadow: "0 14px 55px rgba(0,0,0,0.60), inset 0 1px 0 rgba(255,255,255,0.06)",
            }}
          >
            <p
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.07em",
                color: "rgba(193, 143, 255, 0.88)",
                margin: "0 0 10px",
              }}
            >
              今日の聖句
            </p>
            <blockquote
              style={{
                fontFamily: '"Noto Serif JP", serif',
                fontSize: 15,
                lineHeight: 2.0,
                color: "rgba(255, 255, 255, 0.85)",
                margin: "0 0 14px",
                padding: 0,
              }}
            >
              {verseOfDay.text}
            </blockquote>
            <Link
              href={verseHref}
              style={{
                fontSize: 13,
                color: "rgba(193, 143, 255, 0.88)",
                textDecoration: "none",
              }}
            >
              {verseOfDay.book_name} {verseOfDay.chapter_number}章{verseOfDay.number}節 →
            </Link>
          </div>
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
          {SECTIONS.map((s) => (
            <SectionCard
              key={s.href}
              title={s.title}
              description={s.description}
              href={s.href}
            />
          ))}
        </div>

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
              color: "var(--text-faint)",
              textDecoration: "underline",
              textDecorationColor: "var(--border)",
            }}
          >
            NeON Church について
          </Link>
        </div>
      </div>

      <style>{`
        @media (max-width: 640px) {
          .home-cards {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </>
  );
}

function SectionCard({
  title,
  description,
  href,
}: {
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 10,
        background: "rgba(14, 7, 40, 0.65)",
        backdropFilter: "blur(18px)",
        WebkitBackdropFilter: "blur(18px)",
        border: "1px solid rgba(115, 58, 210, 0.28)",
        borderRadius: 16,
        padding: "24px 22px",
        textDecoration: "none",
        color: "inherit",
        cursor: "pointer",
        transition: "border-color 0.2s, box-shadow 0.2s",
        minHeight: 140,
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.borderColor = "rgba(188, 108, 255, 0.60)";
        el.style.boxShadow = "0 8px 28px rgba(0,0,0,0.42)";
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.borderColor = "rgba(115, 58, 210, 0.28)";
        el.style.boxShadow = "none";
      }}
    >
      <p
        style={{
          fontFamily: '"Noto Serif JP", serif',
          fontSize: 18,
          fontWeight: 700,
          color: "rgba(255, 255, 255, 0.94)",
          margin: 0,
        }}
      >
        {title}
      </p>
      <p
        style={{
          fontSize: 13,
          color: "rgba(255, 255, 255, 0.44)",
          lineHeight: 1.7,
          margin: 0,
        }}
      >
        {description}
      </p>
    </Link>
  );
}
