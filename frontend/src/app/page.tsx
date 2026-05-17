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
    icon: "/img/icon-read.png",
  },
  {
    title: "Q&A",
    description: "聖書に関する疑問を投稿し、回答をもらえる場所。",
    href: "/qa",
    icon: "/img/icon-qa.png",
  },
  {
    title: "翻訳",
    description: "聖書の共同翻訳プロジェクトを作成・参加できます。",
    href: "/translations",
    icon: "/img/icon-translation.png",
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
          justifyContent: "center",
          gap: 24,
        }}
      >
        {/* 今日の聖句 */}
        {verseOfDay && (
          <div
            style={{
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
                "0 0 65px rgba(130, 45,  205, 0.18)",
                "inset 0 0 10px rgba(200, 100, 255, 0.15)",
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
              今日の聖句
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
              {verseOfDay.text}
            </blockquote>
            <Link
              href={verseHref}
              style={{
                position: "relative",
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
              icon={s.icon}
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
        @media (min-width: 769px) {
          .home-content {
            transform: translateX(calc(-1 * var(--sidebar-width) / 2));
          }
        }
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
  icon,
}: {
  title: string;
  description: string;
  href: string;
  icon: string;
}) {
  return (
    <Link
      href={href}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 10,
        background: "linear-gradient(160deg, rgba(110, 40, 200, 0.38) 0%, rgba(70, 15, 150, 0.50) 100%)",
        border: "3px solid rgba(190, 95, 255, 0.95)",
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
          "0 0 65px rgba(130, 45,  205, 0.18)",
          "inset 0 0 10px rgba(200, 100, 255, 0.15)",
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
          "0 0 80px rgba(150, 55,  220, 0.25)",
          "inset 0 0 14px rgba(215, 115, 255, 0.22)",
        ].join(", ");
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.borderColor = "rgba(190, 95, 255, 0.95)";
        el.style.boxShadow = [
          "0 0 6px  rgba(210, 110, 255, 0.90)",
          "0 0 18px rgba(185, 80,  255, 0.65)",
          "0 0 38px rgba(155, 55,  230, 0.40)",
          "0 0 65px rgba(130, 45,  205, 0.18)",
          "inset 0 0 10px rgba(200, 100, 255, 0.15)",
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
