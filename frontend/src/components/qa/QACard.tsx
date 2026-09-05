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
  /**
   * 解決済み / 未解決の札を出すか。
   * 一覧はタブで分かれているので出さない。読書ページのパネルでは
   * 両方が混ざって並ぶので、そこでは出す。
   */
  showStatus?: boolean;
};

/**
 * 質問の要約カード。カード全体が詳細ページへのリンク。
 *
 * 読むのも書くのも詳細ページ（/qa/[id]）で行う。ここで展開や返信までできると
 * カードの高さが揃わず、一覧としてスクロールして探せなくなる。
 */
export function QACard({ question, showLocation = true, showStatus = true }: Props) {
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
    <article
      // 一覧内の特定の質問へアンカーで戻ってこられるようにする。
      id={`question-${question.id}`}
      className="card-glow card-glow-interactive card-link block p-4"
    >
      {(showStatus || (showLocation && location)) && (
        <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
          {showStatus && (
            <span
              className={`badge badge-icon badge-tone ${answered ? "tone-ok" : "tone-wait"}`}
            >
              <Icon name={answered ? "check-circle" : "help-circle"} size={11} />
              {answered ? t.filterAnswered : t.filterUnanswered}
            </span>
          )}
          {showLocation && location && (
            <span className="ml-auto text-xs text-accent whitespace-nowrap">{location}</span>
          )}
        </div>
      )}

      <h3 className="card-title">
        {/* card-link-main が影でカード全体を覆うので、カードのどこを押しても質問へ飛ぶ。
            以前はカードを丸ごと <Link> で包んでいて、中の投稿者をリンクにできなかった。 */}
        <Link href={`/qa/${question.id}`} className="card-link-main text-inherit no-underline">
          {question.title}
        </Link>
      </h3>
      <p className="m-0 text-sm leading-base text-muted whitespace-pre-wrap">
        {body}
      </p>

      {/* 灰色の箱を横に並べるのをやめ、記事・プラン・翻訳と同じ明細に揃える。
          箱では投稿者・日付・主題・件数が全部同じ見た目だった。 */}
      <dl className="meta-rows mt-3">
        <dt>{t.cardAsker}</dt>
        <dd>
          <Link href={`/profile/${question.user.username}`}>{question.user.username}</Link>
        </dd>
        <dt>{t.cardPostedAt}</dt>
        <dd>{formatRelativeTime(question.created_at)}</dd>
        {question.tags.length > 0 && (
          <>
            <dt>{t.cardTopics}</dt>
            <dd>
              {question.tags.map((tag) => (
                <Link key={tag.id} href={`/qa?tag=${tag.id}`}>
                  {t.tagNames[tag.name] ?? tag.name}
                </Link>
              ))}
            </dd>
          </>
        )}
        <dt>{t.cardAnswers}</dt>
        <dd>{t.cardAnswerValue(question.answer_count)}</dd>
      </dl>
    </article>
  );
}


