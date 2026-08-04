"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  createAnswer,
  deleteQuestion,
  fetchAnswerPage,
  fetchQuestion,
  reportQuestion,
  setQuestionBestAnswer,
  updateQuestion,
  type QAQuestion,
} from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useLoadMore } from "@/hooks/useLoadMore";
import { AnswerItem } from "@/components/qa/AnswerItem";
import { LoginRequiredModal } from "@/components/ui/LoginRequiredModal";
import { Icon } from "@/components/ui/Icon";
import {
  Button,
  ConfirmDialog,
  ErrorState,
  LoadMoreButton,
  SkeletonList,
  useToast,
} from "@/components/ui";
import { formatBookLocation, useRelativeTime, useT } from "@/lib/i18n";
import { useLang } from "@/contexts/LanguageContext";

/**
 * Q&A の質問1件のページ。
 *
 * 一覧はここへの入り口に徹し、読むのも書くのもこのページで完結させる。
 * 読書ページの Q&A タブからも、通知からもここへ来る。
 */
export default function QuestionDetailPage() {
  const params = useParams<{ id: string }>();
  const questionId = params.id;
  const router = useRouter();
  const t = useT();
  const { lang } = useLang();
  const { user } = useAuth();
  const toast = useToast();
  const formatRelativeTime = useRelativeTime();

  const [question, setQuestion] = useState<QAQuestion | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // 質問の編集
  const [editing, setEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftBody, setDraftBody] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  // 回答の投稿
  const [answerBody, setAnswerBody] = useState("");
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);

  const loadQuestion = useCallback(() => {
    setLoading(true);
    fetchQuestion(questionId)
      .then((q) => {
        setQuestion(q);
        setNotFound(false);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [questionId]);

  useEffect(() => {
    // 開いた質問を最初に読む。読み込み中の表示に切り替えるので setState を伴う。
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadQuestion();
  }, [loadQuestion]);

  const fetchAnswers = useCallback(
    (page: number) => fetchAnswerPage(questionId, page),
    [questionId]
  );
  const answers = useLoadMore(fetchAnswers);
  const reloadAnswers = answers.reload;

  /** ベストアンサーの変更は質問側の状態も変わるので、両方取り直す。 */
  const reloadAll = useCallback(() => {
    loadQuestion();
    reloadAnswers();
  }, [loadQuestion, reloadAnswers]);

  const isOwner = user != null && question != null && user.id === question.user.id;

  const handlePostAnswer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!answerBody.trim()) return;
    setPosting(true);
    setPostError(null);
    try {
      await createAnswer(questionId, answerBody.trim());
      setAnswerBody("");
      reloadAll();
    } catch (err) {
      setPostError(err instanceof Error ? err.message : t.postFailed);
    } finally {
      setPosting(false);
    }
  };

  const handlePickBest = async (answerId: string | null) => {
    try {
      await setQuestionBestAnswer(questionId, answerId);
      reloadAll();
    } catch {
      toast.show(t.errorActionFailed, { type: "error" });
    }
  };

  const handleSaveEdit = async () => {
    if (!draftTitle.trim() || !draftBody.trim()) return;
    setSavingEdit(true);
    try {
      const updated = await updateQuestion(questionId, {
        title: draftTitle.trim(),
        body: draftBody.trim(),
      });
      setQuestion(updated);
      setEditing(false);
    } catch {
      toast.show(t.postFailed, { type: "error" });
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async () => {
    setConfirmDelete(false);
    try {
      await deleteQuestion(questionId);
      router.push("/qa");
    } catch {
      toast.show(t.errorActionFailed, { type: "error" });
    }
  };

  const handleReport = async () => {
    try {
      await reportQuestion(questionId, "other");
      toast.show(t.reported);
    } catch {
      toast.show(t.reportedDup);
    }
  };

  if (loading) {
    return (
      <div style={pageStyle}>
        <SkeletonList count={3} />
      </div>
    );
  }

  if (notFound || !question) {
    return (
      <div style={pageStyle}>
        <ErrorState title={t.qaQuestionNotFound} onRetry={loadQuestion} onBack={() => router.push("/qa")} backLabel={t.qaBackToList} />
      </div>
    );
  }

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

  return (
    <div style={pageStyle}>
      {showLoginModal && <LoginRequiredModal onClose={() => setShowLoginModal(false)} />}

      <Link href="/qa" style={backLinkStyle}>
        <Icon name="arrow-left" size={14} />
        {t.qaBackToList}
      </Link>

      <article className="card-glow p-4 mt-3" >
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span
            className={`badge ${answered ? "badge-answered" : "badge-unanswered"}`}
          >
            <Icon name={answered ? "check-circle" : "help-circle"} size={11} />
            {answered ? t.filterAnswered : t.filterUnanswered}
          </span>
          {passageUrl && (
            <Link href={passageUrl} style={passageLinkStyle}>
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
                disabled={savingEdit || !draftTitle.trim() || !draftBody.trim()}
              >
                {savingEdit ? t.posting : t.submit}
              </Button>
            </div>
          </div>
        ) : (
          <>
            <h1 style={titleStyle}>{question.title}</h1>
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
            <button
              type="button"
              onClick={handleReport}
              className="action-chip ml-auto"
            >
              <Icon name="alert-triangle" size={11} />
              {t.report}
            </button>
          )}
        </div>
      </article>

      <h2 style={sectionHeadingStyle}>
        {t.qaAnswersHeading}
        <span className="text-faint font-normal text-sm ml-2">
          {answers.total}
        </span>
      </h2>

      {answers.loading ? (
        <SkeletonList count={2} />
      ) : answers.failed ? (
        <ErrorState title={t.errorTitle} message={t.errorNetwork} onRetry={answers.reload} />
      ) : answers.items.length === 0 ? (
        <p className="text-faint text-sm py-2 px-1">{t.qaNoAnswers}</p>
      ) : (
        <>
          <div className="flex flex-col gap-3">
            {answers.items.map((a) => (
              <AnswerItem
                key={a.id}
                answer={a}
                currentUserId={user?.id ?? null}
                canPickBest={isOwner}
                onPickBest={handlePickBest}
                onChanged={reloadAll}
              />
            ))}
          </div>
          <LoadMoreButton
            hasMore={answers.hasMore}
            loading={answers.loadingMore}
            onClick={answers.loadMore}
          />
        </>
      )}

      {user ? (
        <form onSubmit={handlePostAnswer} className="mt-6">
          <textarea
            value={answerBody}
            onChange={(e) => setAnswerBody(e.target.value)}
            placeholder={t.qaAnswerPlaceholder}
            aria-label={t.qaAnswerPlaceholder}
            rows={4}
            className="form-control resize-y"
          />
          {postError && <p style={{ color: "var(--state-error)", fontSize: 12, margin: "4px 0" }}>{postError}</p>}
          <div className="flex justify-end mt-2">
            <Button variant="primary" type="submit" disabled={posting || !answerBody.trim()}>
              {posting ? t.posting : t.qaSubmitAnswer}
            </Button>
          </div>
        </form>
      ) : (
        <div className="mt-6">
          <Button variant="primary" onClick={() => setShowLoginModal(true)}>
            {t.qaLoginToAnswer}
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete}
        title={t.qaConfirmDeleteQuestionTitle}
        description={t.qaConfirmDeleteQuestionDesc}
        destructive
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  maxWidth: 760,
  margin: "0 auto",
  padding: "32px 16px",
};

const backLinkStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  fontSize: 13,
  color: "var(--text-muted)",
  textDecoration: "none",
};

const passageLinkStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 2,
  fontSize: 13,
  color: "var(--accent)",
  textDecoration: "none",
};

const titleStyle: React.CSSProperties = {
  fontFamily: "var(--font-serif)",
  fontSize: 22,
  fontWeight: 700,
  lineHeight: 1.4,
  margin: "12px 0 10px",
};

const sectionHeadingStyle: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 700,
  margin: "28px 0 12px",
  display: "flex",
  alignItems: "center",
};


