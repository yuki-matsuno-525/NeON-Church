"use client";

import { useState } from "react";
import { deleteAnswer, reportAnswer, updateAnswer, type QAAnswer } from "@/lib/api";
import { Icon } from "@/components/ui/Icon";
import { Button, ConfirmDialog, useToast } from "@/components/ui";
import { useRelativeTime, useT } from "@/lib/i18n";

type Props = {
  answer: QAAnswer;
  /** ログイン中のユーザー。未ログインなら null。 */
  currentUserId: string | null;
  /** 質問した人だけがベストアンサーを選べる。 */
  canPickBest: boolean;
  onPickBest: (answerId: string | null) => void;
  onChanged: () => void;
};

export function AnswerItem({ answer, currentUserId, canPickBest, onPickBest, onChanged }: Props) {
  const t = useT();
  const toast = useToast();
  const formatRelativeTime = useRelativeTime();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(answer.body);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const isOwner = currentUserId !== null && currentUserId === answer.user.id;

  const handleSave = async () => {
    if (!draft.trim()) return;
    setSaving(true);
    try {
      await updateAnswer(answer.id, draft.trim());
      setEditing(false);
      onChanged();
    } catch {
      toast.show(t.postFailed, { type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setConfirmDelete(false);
    try {
      await deleteAnswer(answer.id);
      onChanged();
    } catch {
      toast.show(t.errorActionFailed, { type: "error" });
    }
  };

  const handleReport = async () => {
    try {
      await reportAnswer(answer.id, "other");
      toast.show(t.reported);
    } catch {
      // 二重通報（409）も含め、押した人には同じ見え方でよい。
      toast.show(t.reportedDup);
    }
  };

  return (
    <div
      style={{
        padding: "12px 14px",
        borderRadius: 10,
        border: `1px solid ${answer.is_best ? "var(--accent)" : "var(--border)"}`,
        background: answer.is_best ? "var(--accent-tint)" : "var(--bg-alt)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
        {answer.is_best && (
          <span style={{ fontSize: 11, fontWeight: 700, color: "var(--accent)" }}>{t.bestAnswer}</span>
        )}
        <span style={{ fontWeight: 700, fontSize: 13 }}>{answer.user.username}</span>
        <span style={{ fontSize: 11, color: "var(--text-faint)" }}>
          {formatRelativeTime(answer.created_at)}
        </span>
      </div>

      {editing ? (
        <>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={4}
            aria-label={t.qaAnswerPlaceholder}
            style={textareaStyle}
          />
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
            <Button variant="secondary" onClick={() => { setEditing(false); setDraft(answer.body); }}>
              {t.cancel}
            </Button>
            <Button variant="primary" onClick={handleSave} disabled={saving || !draft.trim()}>
              {saving ? t.posting : t.submit}
            </Button>
          </div>
        </>
      ) : (
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
          {answer.is_deleted ? t.qaDeletedAnswer : answer.body}
        </p>
      )}

      {!editing && !answer.is_deleted && (
        <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap", alignItems: "center" }}>
          {canPickBest && (
            <button
              type="button"
              onClick={() => onPickBest(answer.is_best ? null : answer.id)}
              style={{
                ...actionButtonStyle,
                border: `1px solid ${answer.is_best ? "var(--accent)" : "var(--border)"}`,
                background: answer.is_best ? "var(--accent)" : "transparent",
                color: answer.is_best ? "var(--accent-text)" : "var(--text-muted)",
              }}
            >
              {answer.is_best ? t.unsetBestAnswer : t.setBestAnswer}
            </button>
          )}
          {isOwner ? (
            <>
              <button type="button" onClick={() => setEditing(true)} style={actionButtonStyle}>
                {t.edit}
              </button>
              <button type="button" onClick={() => setConfirmDelete(true)} style={actionButtonStyle}>
                {t.delete}
              </button>
            </>
          ) : (
            currentUserId && (
              <button
                type="button"
                onClick={handleReport}
                style={{ ...actionButtonStyle, marginLeft: "auto" }}
              >
                <Icon name="alert-triangle" size={11} />
                {t.report}
              </button>
            )
          )}
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete}
        title={t.qaConfirmDeleteAnswerTitle}
        description={t.qaConfirmDeleteAnswerDesc}
        destructive
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}

const textareaStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
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
