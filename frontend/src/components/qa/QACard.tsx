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
      // 一覧内の特定の質問へアンカーで戻ってこられるようにする。
      id={`question-${question.id}`}
      href={`/qa/${question.id}`}
      className="card-glow card-glow-interactive block p-4 no-underline text-inherit"
      
    >
      <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
        <span
          className={`badge badge-icon badge-tone ${answered ? "tone-ok" : "tone-wait"}`}
        >
          <Icon name={answered ? "check-circle" : "help-circle"} size={11} />
          {answered ? t.filterAnswered : t.filterUnanswered}
        </span>
        {showLocation && location && (
          <span className="text-xs text-accent whitespace-nowrap">{location}</span>
        )}
      </div>

      <h3 className="card-title">{question.title}</h3>
      <p className="m-0 text-sm leading-base text-muted whitespace-pre-wrap">
        {body}
      </p>

      {/* カード全体がリンクなので、ここでは投稿者名もリンクにしない（リンクの入れ子は押せない）。
          投稿者のページへは詳細ページから辿る。 */}
      <div className="flex gap-2 flex-wrap items-center mt-3">
        <span className="meta-pill">{question.user.username}</span>
        <span className="meta-pill">{formatRelativeTime(question.created_at)}</span>
        {question.tags.map((tag) => (
          <span key={tag.id} className="meta-pill">
            {t.tagNames[tag.name] ?? tag.name}
          </span>
        ))}
        <span className="meta-pill ml-auto gap-1">
          <Icon name="message-square" size={12} />
          {t.qaAnswerCount(question.answer_count)}
        </span>
      </div>
    </Link>
  );
}


