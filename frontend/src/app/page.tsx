"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchVerseOfDay, type VerseOfDay } from "@/lib/api";
import { BOOKS } from "@/lib/books";

function slugFromBookName(name: string): string {
  return BOOKS.find((b) => b.name === name)?.slug ?? "";
}

export default function Home() {
  const [verseOfDay, setVerseOfDay] = useState<VerseOfDay | null>(null);

  useEffect(() => {
    fetchVerseOfDay()
      .then(setVerseOfDay)
      .catch(() => {});
  }, []);

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
        className="home-grid"
        style={{
          position: "relative",
          zIndex: 2,
          minHeight: "calc(100vh - var(--navbar-height))",
          display: "grid",
          gridTemplateColumns: "200px 1fr 200px 56px",
          gridTemplateRows: "auto auto",
          columnGap: 20,
          rowGap: 40,
          padding: "52px 32px 48px",
          maxWidth: 1300,
          margin: "0 auto",
        }}
      >
        {/* ヒーロー左 */}
        <div
          className="home-hero"
          style={{
            gridColumn: 1,
            gridRow: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: 16,
          }}
        >
          <h1
            style={{
              fontFamily: '"Noto Serif JP", serif',
              fontSize: 38,
              fontWeight: 700,
              lineHeight: 1.35,
              color: "rgba(255, 255, 255, 0.97)",
              margin: 0,
            }}
          >
            聖書を読み、<br />語り合う場所
          </h1>
        </div>

        {/* 中央カード: 読む */}
        <div
          className="home-read"
          style={{
            gridColumn: 2,
            gridRow: 1,
            background: "rgba(18, 10, 50, 0.62)",
            backdropFilter: "blur(28px)",
            WebkitBackdropFilter: "blur(28px)",
            border: "1px solid rgba(168, 88, 255, 0.30)",
            borderRadius: 18,
            padding: "26px 28px",
            boxShadow: "0 14px 55px rgba(0,0,0,0.60), inset 0 1px 0 rgba(255,255,255,0.06)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 20,
            }}
          >
            <h2
              style={{
                fontFamily: '"Noto Serif JP", serif',
                fontSize: 20,
                fontWeight: 700,
                color: "rgba(255, 255, 255, 0.96)",
                margin: 0,
              }}
            >
              読む
            </h2>
          </div>

          {verseOfDay ? (
            <>
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.07em",
                  textTransform: "uppercase",
                  color: "rgba(193, 143, 255, 0.88)",
                  margin: "0 0 8px",
                }}
              >
                今日の聖句
              </p>
              {(() => {
                const slug = slugFromBookName(verseOfDay.book_name);
                const href = slug ? `/${slug}/${verseOfDay.chapter_number}` : "#";
                return (
                  <Link
                    href={href}
                    style={{
                      display: "block",
                      fontSize: 13,
                      fontWeight: 500,
                      color: "rgba(193, 143, 255, 0.88)",
                      textDecoration: "none",
                      marginBottom: 14,
                    }}
                  >
                    {verseOfDay.book_name} {verseOfDay.chapter_number}章{verseOfDay.number}節
                  </Link>
                );
              })()}
              <blockquote
                style={{
                  fontFamily: '"Noto Serif JP", serif',
                  fontSize: 15,
                  lineHeight: 2.05,
                  color: "rgba(255, 255, 255, 0.80)",
                  margin: "0 0 20px",
                  padding: 0,
                  borderLeft: "none",
                }}
              >
                {verseOfDay.text}
              </blockquote>
            </>
          ) : (
            <p
              style={{
                fontSize: 13,
                color: "var(--text-faint)",
                marginBottom: 20,
              }}
            >
              聖書の各章を読み、コメントを投稿・共有できます。
            </p>
          )}

          <div
            style={{
              paddingTop: 14,
              borderTop: "1px solid rgba(255, 255, 255, 0.07)",
            }}
          >
            <Link
              href="/read"
              style={{
                display: "inline-block",
                fontSize: 13,
                fontWeight: 700,
                color: "#fff",
                textDecoration: "none",
                padding: "8px 20px",
                background: "linear-gradient(135deg, #7618c5, #d81e80)",
                borderRadius: 8,
                boxShadow: "0 0 14px rgba(198, 44, 170, 0.40)",
              }}
            >
              聖書を読む
            </Link>
          </div>
        </div>

        {/* 右カード群 */}
        <div
          className="home-right"
          style={{
            gridColumn: 3,
            gridRow: 1,
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          <SmallCard
            title="Q&A"
            description="聖書に関する疑問を投稿し、回答をもらえる場所。"
            href="/qa"
          />
          <SmallCard
            title="翻訳"
            description="聖書の共同翻訳プロジェクトを作成・参加できます。"
            href="/translations"
          />
        </div>

        {/* 縦書きネオンサイン（装飾） */}
        <div
          className="home-neon"
          style={{
            gridColumn: 4,
            gridRow: "1 / 3",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
          }}
        >
          <div
            style={{
              border: "2px solid rgba(255, 58, 140, 0.46)",
              borderRadius: 9,
              padding: "20px 10px",
              boxShadow: "0 0 20px rgba(255, 40, 132, 0.55), inset 0 0 12px rgba(255,255,255,0.02)",
              animation: "none",
            }}
          >
            <span
              style={{
                writingMode: "vertical-rl",
                textOrientation: "mixed",
                fontFamily: '"Noto Serif JP", serif',
                fontSize: 17,
                fontWeight: 700,
                color: "#ff2888",
                textShadow: "0 0 6px rgba(255,40,132,0.75), 0 0 20px rgba(255,40,132,0.55)",
                letterSpacing: 5,
                lineHeight: 1,
                display: "block",
              }}
            >
              光は闇に輝いている
            </span>
          </div>
          <span
            style={{
              fontSize: 11,
              color: "#ff2888",
              opacity: 0.72,
              textShadow: "0 0 6px rgba(255,40,132,0.55)",
              letterSpacing: 2,
            }}
          >
            ヨハネ 1:5
          </span>
        </div>

        {/* NeON Church について リンク */}
        <div
          className="home-about"
          style={{
            gridColumn: "1 / 4",
            gridRow: 2,
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
        @media (max-width: 960px) {
          .home-grid {
            grid-template-columns: 1fr 1fr !important;
            grid-template-rows: auto auto auto !important;
          }
          .home-hero  { grid-column: 1 / 3 !important; grid-row: 1 !important; }
          .home-read  { grid-column: 1 / 3 !important; grid-row: 2 !important; }
          .home-right { grid-column: 1 / 3 !important; grid-row: 3 !important; flex-direction: row !important; }
          .home-neon  { display: none !important; }
          .home-about { grid-column: 1 / 3 !important; }
        }
        @media (max-width: 600px) {
          .home-grid  { grid-template-columns: 1fr !important; padding: 32px 16px 40px !important; }
          .home-hero  { grid-column: 1 !important; }
          .home-read  { grid-column: 1 !important; }
          .home-right { grid-column: 1 !important; flex-direction: column !important; }
          .home-about { grid-column: 1 !important; }
        }
      `}</style>
    </>
  );
}

function SmallCard({
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
        flex: 1,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        background: "rgba(14, 7, 40, 0.65)",
        backdropFilter: "blur(18px)",
        WebkitBackdropFilter: "blur(18px)",
        border: "1px solid rgba(115, 58, 210, 0.28)",
        borderRadius: 16,
        padding: "18px 20px",
        textDecoration: "none",
        color: "inherit",
        cursor: "pointer",
        transition: "border-color 0.2s, box-shadow 0.2s",
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
          fontSize: 17,
          fontWeight: 700,
          color: "rgba(255, 255, 255, 0.94)",
          margin: 0,
        }}
      >
        {title}
      </p>
      <p
        style={{
          fontSize: 12,
          color: "rgba(255, 255, 255, 0.44)",
          lineHeight: 1.68,
          margin: 0,
          flex: 1,
        }}
      >
        {description}
      </p>
    </Link>
  );
}
