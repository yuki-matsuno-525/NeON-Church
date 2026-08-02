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

      <article className="card-glow" style={{ padding: 20, marginTop: 12 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
          <span
            className="badge"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 3,
              background: answered ? "rgba(34,197,94,0.15)" : "rgba(245,158,11,0.15)",
              color: answered ? "var(--state-success)" : "var(--state-warning)",
            }}
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
          <div style={{ marginTop: 12 }}>
            <input
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              aria-label={t.qaTitleInputPlaceholder}
              placeholder={t.qaTitleInputPlaceholder}
              style={{ ...inputStyle, fontWeight: 700, marginBottom: 8 }}
            />
            <textarea
              value={draftBody}
              onChange={(e) => setDraftBody(e.target.value)}
              rows={6}
              aria-label={t.commentPlaceholder}
              style={inputStyle}
            />
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
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
            <p style={{ margin: 0, fontSize: 15, lineHeight: 1.8, whiteSpace: "pre-wrap" }}>
              {question.is_deleted ? t.qaDeletedQuestion : question.body}
            </p>
          </>
        )}

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginTop: 16 }}>
          <span style={metaPillStyle}>{question.user.username}</span>
          <span style={metaPillStyle}>{formatRelativeTime(question.created_at)}</span>
          {question.tags.map((tag) => (
            <span key={tag.id} style={metaPillStyle}>
              {t.tagNames[tag.name] ?? tag.name}
            </span>
          ))}
          {!editing && isOwner && (
            <span style={{ marginLeft: "auto", display: "inline-flex", gap: 6 }}>
              <button
                type="button"
                onClick={() => {
                  setDraftTitle(question.title);
                  setDraftBody(question.body);
                  setEditing(true);
                }}
                style={actionButtonStyle}
              >
                {t.edit}
              </button>
              <button type="button" onClick={() => setConfirmDelete(true)} style={actionButtonStyle}>
                {t.delete}
              </button>
            </span>
          )}
          {!editing && !isOwner && user && (
            <button
              type="button"
              onClick={handleReport}
              style={{ ...actionButtonStyle, marginLeft: "auto" }}
            >
              <Icon name="alert-triangle" size={11} />
              {t.report}
            </button>
          )}
        </div>
      </article>

      <h2 style={sectionHeadingStyle}>
        {t.qaAnswersHeading}
        <span style={{ color: "var(--text-faint)", fontWeight: 400, fontSize: 14, marginLeft: 8 }}>
          {answers.total}
        </span>
      </h2>

      {answers.loading ? (
        <SkeletonList count={2} />
      ) : answers.failed ? (
        <ErrorState title={t.errorTitle} message={t.errorNetwork} onRetry={answers.reload} />
      ) : answers.items.length === 0 ? (
        <p style={{ color: "var(--text-faint)", fontSize: 14, padding: "8px 2px" }}>{t.qaNoAnswers}</p>
      ) : (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
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
        <form onSubmit={handlePostAnswer} style={{ marginTop: 24 }}>
          <textarea
            value={answerBody}
            onChange={(e) => setAnswerBody(e.target.value)}
            placeholder={t.qaAnswerPlaceholder}
            aria-label={t.qaAnswerPlaceholder}
            rows={4}
            style={inputStyle}
          />
          {postError && <p style={{ color: "var(--state-error)", fontSize: 12, margin: "4px 0" }}>{postError}</p>}
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
            <Button variant="primary" type="submit" disabled={posting || !answerBody.trim()}>
              {posting ? t.posting : t.qaSubmitAnswer}
            </Button>
          </div>
        </form>
      ) : (
        <div style={{ marginTop: 24 }}>
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

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  border: "1px solid var(--border)",
  borderRadius: 8,
  background: "var(--bg)",
  color: "var(--text)",
  fontSize: 14,
  lineHeight: 1.7,
  resize: "vertical",
  fontFamily: "inherit",
  outline: "none",
  boxSizing: "border-box",
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

const actionButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  minHeight: 28,
  padding: "3px 10px",
  borderRadius: 999,
  border: "1px solid var(--border)",
  background: "transparent",
  color: "var(--text-muted)",
  fontSize: 12,
  cursor: "pointer",
  fontFamily: "inherit",
};
