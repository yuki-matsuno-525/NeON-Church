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
      className={`answer-card${answer.is_best ? " answer-card-best" : ""}`}
    >
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        {answer.is_best && (
          <span className="text-xs font-bold text-accent">{t.bestAnswer}</span>
        )}
        <span className="font-bold text-sm">{answer.user.username}</span>
        <span className="text-xs text-faint">
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
            className="form-control text-sm leading-reading"
          />
          <div className="flex gap-2 justify-end mt-2">
            <Button variant="secondary" onClick={() => { setEditing(false); setDraft(answer.body); }}>
              {t.cancel}
            </Button>
            <Button variant="primary" onClick={handleSave} disabled={saving || !draft.trim()}>
              {saving ? t.posting : t.submit}
            </Button>
          </div>
        </>
      ) : (
        <p className="m-0 text-sm leading-reading whitespace-pre-wrap">
          {answer.is_deleted ? t.qaDeletedAnswer : answer.body}
        </p>
      )}

      {!editing && !answer.is_deleted && (
        <div className="flex gap-2 mt-3 flex-wrap items-center">
          {canPickBest && (
            <button
              type="button"
              onClick={() => onPickBest(answer.is_best ? null : answer.id)}
              className={`action-chip${answer.is_best ? " pill-toggle-on" : ""}`}
            >
              {answer.is_best ? t.unsetBestAnswer : t.setBestAnswer}
            </button>
          )}
          {isOwner ? (
            <>
              <button type="button" onClick={() => setEditing(true)} className="action-chip">
                {t.edit}
              </button>
              <button type="button" onClick={() => setConfirmDelete(true)} className="action-chip">
                {t.delete}
              </button>
            </>
          ) : (
            currentUserId && (
              <button
                type="button"
                onClick={handleReport}
                className="action-chip ml-auto"
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
