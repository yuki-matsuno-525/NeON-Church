"use client";

import Link from "next/link";
import type { QAQuestion } from "@/lib/api";
import { Icon } from "@/components/ui/Icon";
import { formatBookLocation, useRelativeTime, useT } from "@/lib/i18n";
import { useLang } from "@/contexts/LanguageContext";

// 本文をカードに出す長さ。これを超えたら省略して「詳細で読む」へ誘導する。
const BODY_PREVIEW_LENGTH = 90;

type Props = {
  question: QAQuestion;
  /** 箇所を出すか。読書ページのパネルでは、その節を見ているので出さない。 */
  showLocation?: boolean;
};

/**
 * 質問の要約カード。カード全体が詳細ページへのリンク。
 *
 * 読むのも書くのも詳細ページ（/qa/[id]）で行う。ここで展開や返信までできると
 * カードの高さが揃わず、一覧としてスクロールして探せなくなる。
 */
export function QACard({ question, showLocation = true }: Props) {
  const t = useT();
  const { lang } = useLang();
  const formatRelativeTime = useRelativeTime();

  const answered = question.best_answer !== null;
  const location = question.book_slug
    ? formatBookLocation(question.book_slug, question.chapter_number, question.verse_number, lang)
    : question.location_label;
  const body =
    question.body.length > BODY_PREVIEW_LENGTH
      ? `${question.body.slice(0, BODY_PREVIEW_LENGTH)}…`
      : question.body;

  return (
    <Link
      href={`/qa/${question.id}`}
      className="card-glow card-glow-interactive"
      style={{ display: "block", padding: 16, textDecoration: "none", color: "inherit" }}
    >
      <div style={headerStyle}>
        <span
          className="badge"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 3,
            flexShrink: 0,
            background: answered ? "rgba(34,197,94,0.15)" : "rgba(245,158,11,0.15)",
            color: answered ? "var(--state-success)" : "var(--state-warning)",
          }}
        >
          <Icon name={answered ? "check-circle" : "help-circle"} size={11} />
          {answered ? t.filterAnswered : t.filterUnanswered}
        </span>
        {showLocation && location && (
          <span style={locationStyle}>{location}</span>
        )}
      </div>

      <h3 style={titleStyle}>{question.title}</h3>
      <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: "var(--text-muted)" }}>{body}</p>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginTop: 12 }}>
        <span style={metaPillStyle}>{question.user.username}</span>
        <span style={metaPillStyle}>{formatRelativeTime(question.created_at)}</span>
        {question.tags.map((tag) => (
          <span key={tag.id} style={metaPillStyle}>
            {t.tagNames[tag.name] ?? tag.name}
          </span>
        ))}
        <span style={countPillStyle}>
          <Icon name="message-square" size={12} />
          {t.qaAnswerCount(question.answer_count)}
        </span>
      </div>
    </Link>
  );
}

const headerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 6,
  marginBottom: 12,
  flexWrap: "wrap",
};

const locationStyle: React.CSSProperties = {
  fontSize: 12,
  color: "var(--accent)",
  whiteSpace: "nowrap",
};

const titleStyle: React.CSSProperties = {
  fontFamily: "var(--font-serif)",
  fontSize: "var(--font-size-md)",
  fontWeight: 700,
  lineHeight: 1.45,
  margin: "0 0 var(--space-2)",
};

const metaPillStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  minHeight: 24,
  padding: "2px 8px",
  borderRadius: 6,
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.10)",
  color: "var(--text-muted)",
  fontSize: "var(--font-size-xs)",
};

const countPillStyle: React.CSSProperties = {
  marginLeft: "auto",
  minHeight: 24,
  padding: "2px 8px",
  borderRadius: 999,
  border: "1px solid var(--border)",
  background: "var(--bg)",
  fontSize: 12,
  color: "var(--text-muted)",
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
};
