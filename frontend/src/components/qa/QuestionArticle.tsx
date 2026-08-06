"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { deleteQuestion, reportQuestion, updateQuestion, type QAQuestion } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Icon } from "@/components/ui/Icon";
import { Button, ConfirmDialog, useToast } from "@/components/ui";
import { formatBookLocation, useRelativeTime, useT } from "@/lib/i18n";
import { useLang } from "@/contexts/LanguageContext";

/**
 * 質問そのものの表示と、質問した人だけができること（書き直す・消す）。
 *
 * 中身はサーバーが取ってから渡ってくるので、ここでは取りに行かない。
 * 書き直したあとは router.refresh() でサーバーに組み立て直してもらう
 * （手元にも新しい中身を持つと、どちらが正しいのか分からなくなる）。
 */
export function QuestionArticle({ question }: { question: QAQuestion }) {
  const router = useRouter();
  const t = useT();
  const { lang } = useLang();
  const { user } = useAuth();
  const toast = useToast();
  const formatRelativeTime = useRelativeTime();

  const [editing, setEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(question.title);
  const [draftBody, setDraftBody] = useState(question.body);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const isOwner = user != null && user.id === question.user.id;
  const answered = question.best_answer !== null;
  const location = question.book_slug
    ? formatBookLocation(question.book_slug, question.chapter_number, question.verse_number, lang)
    : question.location_label;
  // 箇所の読書ページへのリンク（節まであればその節へアンカーで飛ぶ）。
  const passageUrl = question.book_slug
    ? question.chapter_number
      ? `/${question.book_slug}/${question.chapter_number}${question.verse_number ? `#verse-${question.verse_number}` : ""}`
      : `/${question.book_slug}`
    : null;

  const handleSaveEdit = async () => {
    if (!draftTitle.trim() || !draftBody.trim()) return;
    setSaving(true);
    try {
      await updateQuestion(question.id, { title: draftTitle.trim(), body: draftBody.trim() });
      setEditing(false);
      router.refresh();
    } catch {
      toast.show(t.postFailed, { type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setConfirmDelete(false);
    try {
      await deleteQuestion(question.id);
      router.push("/qa");
    } catch {
      toast.show(t.errorActionFailed, { type: "error" });
    }
  };

  const handleReport = async () => {
    try {
      await reportQuestion(question.id, "other");
      toast.show(t.reported);
    } catch {
      toast.show(t.reportedDup);
    }
  };

  return (
    <article className="card-glow p-4 mt-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className={`badge badge-icon badge-tone ${answered ? "tone-ok" : "tone-wait"}`}>
          <Icon name={answered ? "check-circle" : "help-circle"} size={11} />
          {answered ? t.filterAnswered : t.filterUnanswered}
        </span>
        {passageUrl && (
          <Link href={passageUrl} className="action-link gap-1 text-sm no-underline">
            {location}
            <Icon name="chevron-right" size={12} />
          </Link>
        )}
      </div>

      {editing ? (
        <div className="mt-3">
          <input
            value={draftTitle}
            onChange={(e) => setDraftTitle(e.target.value)}
            aria-label={t.qaTitleInputPlaceholder}
            placeholder={t.qaTitleInputPlaceholder}
            className="form-control mb-2 font-bold"
          />
          <textarea
            value={draftBody}
            onChange={(e) => setDraftBody(e.target.value)}
            rows={6}
            aria-label={t.commentPlaceholder}
            className="form-control resize-y"
          />
          <div className="flex gap-2 justify-end mt-2">
            <Button variant="secondary" onClick={() => setEditing(false)}>{t.cancel}</Button>
            <Button
              variant="primary"
              onClick={handleSaveEdit}
              disabled={saving || !draftTitle.trim() || !draftBody.trim()}
            >
              {saving ? t.posting : t.submit}
            </Button>
          </div>
        </div>
      ) : (
        <>
          <h1 className="page-title mt-3">{question.title}</h1>
          <p className="m-0 text-sm leading-reading whitespace-pre-wrap">
            {question.is_deleted ? t.qaDeletedQuestion : question.body}
          </p>
        </>
      )}

      <div className="flex gap-2 flex-wrap items-center mt-4">
        <span className="meta-pill">{question.user.username}</span>
        <span className="meta-pill">{formatRelativeTime(question.created_at)}</span>
        {question.tags.map((tag) => (
          <span key={tag.id} className="meta-pill">
            {t.tagNames[tag.name] ?? tag.name}
          </span>
        ))}
        {!editing && isOwner && (
          <span className="ml-auto inline-flex gap-2">
            <button
              type="button"
              onClick={() => {
                setDraftTitle(question.title);
                setDraftBody(question.body);
                setEditing(true);
              }}
              className="action-chip"
            >
              {t.edit}
            </button>
            <button type="button" onClick={() => setConfirmDelete(true)} className="action-chip">
              {t.delete}
            </button>
          </span>
        )}
        {!editing && !isOwner && user && (
          <button type="button" onClick={handleReport} className="action-chip ml-auto">
            <Icon name="alert-triangle" size={11} />
            {t.report}
          </button>
        )}
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title={t.qaConfirmDeleteQuestionTitle}
        description={t.qaConfirmDeleteQuestionDesc}
        destructive
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </article>
  );
}
