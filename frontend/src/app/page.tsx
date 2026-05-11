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
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "48px 24px" }}>
      {/* Hero */}
      <div style={{ textAlign: "center", marginBottom: 56 }}>
        <h1
          style={{
            fontSize: 48,
            fontWeight: 800,
            letterSpacing: "-0.03em",
            margin: "0 0 16px",
            color: "var(--text)",
          }}
        >
          NeON Church
        </h1>
        <p style={{ fontSize: 18, color: "var(--text-muted)", margin: 0 }}>
          聖書を読み、語り合う場所
        </p>
      </div>

      {/* 今日の聖句 */}
      {verseOfDay && (
        <div
          style={{
            background: "var(--bg-alt)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            padding: "24px 28px",
            marginBottom: 40,
          }}
        >
          <p
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.08em",
              color: "var(--accent)",
              margin: "0 0 12px",
              textTransform: "uppercase",
            }}
          >
            今日の聖句
          </p>
          <blockquote
            style={{
              margin: "0 0 12px",
              fontSize: 18,
              lineHeight: 1.7,
              color: "var(--text)",
              fontStyle: "italic",
              borderLeft: "3px solid var(--accent)",
              paddingLeft: 16,
            }}
          >
            {verseOfDay.text}
          </blockquote>
          <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)", textAlign: "right" }}>
            {(() => {
              const slug = slugFromBookName(verseOfDay.book_name);
              const href = slug ? `/${slug}/${verseOfDay.chapter_number}` : "#";
              return (
                <Link href={href} style={{ color: "var(--text-muted)", textDecoration: "none" }}>
                  {verseOfDay.book_name} {verseOfDay.chapter_number}章{verseOfDay.number}節
                </Link>
              );
            })()}
          </p>
        </div>
      )}

      {/* 3セクション */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 16,
          marginBottom: 40,
        }}
      >
        <SectionCard
          icon="📖"
          title="読む"
          description="聖書を読み、節・章へのコメントを投稿・共有できます。"
          href="/read"
          ready
        />
        <SectionCard
          icon="💬"
          title="Q&A"
          description="聖書に関する疑問を投稿し、回答をもらえる場所。"
          href="#"
          ready={false}
        />
        <SectionCard
          icon="🌐"
          title="翻訳"
          description="複数翻訳を対訳で読み比べることができます。"
          href="#"
          ready={false}
        />
      </div>

      {/* サービス説明リンク */}
      <div style={{ textAlign: "center" }}>
        <Link
          href="/about"
          style={{
            fontSize: 14,
            color: "var(--text-muted)",
            textDecoration: "underline",
            textDecorationColor: "var(--border)",
          }}
        >
          NeON Church について
        </Link>
      </div>
    </div>
  );
}

type SectionCardProps = {
  icon: string;
  title: string;
  description: string;
  href: string;
  ready: boolean;
};

function SectionCard({ icon, title, description, href, ready }: SectionCardProps) {
  return (
    <div
      style={{
        background: "var(--bg-alt)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: "24px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        opacity: ready ? 1 : 0.6,
        position: "relative",
      }}
    >
      {!ready && (
        <span
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            fontSize: 10,
            fontWeight: 700,
            background: "var(--border)",
            color: "var(--text-muted)",
            padding: "2px 8px",
            borderRadius: 999,
            letterSpacing: "0.05em",
          }}
        >
          準備中
        </span>
      )}
      <span style={{ fontSize: 32 }}>{icon}</span>
      <p style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{title}</p>
      <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6 }}>
        {description}
      </p>
      {ready && (
        <Link
          href={href}
          style={{
            marginTop: 8,
            display: "inline-block",
            background: "var(--accent)",
            color: "var(--accent-text)",
            borderRadius: 6,
            padding: "7px 18px",
            fontSize: 13,
            fontWeight: 700,
            textDecoration: "none",
            alignSelf: "flex-start",
          }}
        >
          開く
        </Link>
      )}
    </div>
  );
}
