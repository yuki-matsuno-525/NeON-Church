"use client";

import type { TranslationComment } from "@/lib/api";
import { useT, useRelativeTime } from "@/lib/i18n";
import { useLang } from "@/contexts/LanguageContext";
import { translationUiText } from "@/app/translations/translationUiText";
import { MentionInput } from "./MentionInput";

type Props = {
  unitId: string;
  /** 開いているか。閉じているときはボタンだけを出す */
  open: boolean;
  onToggle: () => void;
  comments: TranslationComment[] | undefined;
  loading: boolean;
  error: string | undefined;
  /** 書き込めるのは承認済みの参加者だけ */
  canPost: boolean;
  /** @ で呼び出せる相手（承認済みの参加者） */
  mentionable: string[];
  draft: string;
  onDraftChange: (value: string) => void;
  onPost: () => void;
};

/** 本文に @名前 が入っていたら、その部分だけ目立たせる。 */
function renderBody(body: string) {
  return body.split(/(@[\w]+)/g).map((part, index) =>
    part.startsWith("@") ? <strong key={index} className="text-accent">{part}</strong> : part
  );
}

/**
 * ユニット 1 つぶんの作業メモ。訳し方の相談をこの中でやり取りする。
 *
 * ユニットの数だけ並ぶので、開いたものだけ中身を取りに行く。
 * 取りに行く処理は親（画面）が持ち、ここは受け取ったものを出すだけ。
 */
export function UnitDiscussion({
  unitId,
  open,
  onToggle,
  comments,
  loading,
  error,
  canPost,
  mentionable,
  draft,
  onDraftChange,
  onPost,
}: Props) {
  const t = useT();
  const { lang } = useLang();
  const ui = translationUiText(lang);
  const formatRelativeTime = useRelativeTime();
  const list = comments ?? [];

  return (
    <div className="border-t border-border py-2 px-4">
      <button
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={`unit-discussion-${unitId}`}
        className="text-button"
      >
        {open ? t.closeDiscussion : t.openDiscussion}
        {list.length ? ` (${list.length})` : ""}
      </button>

      {open && (
        <div id={`unit-discussion-${unitId}`} className="mt-2">
          {loading && <p className="text-muted text-xs">{t.loading}</p>}
          {error && <p role="alert" className="text-xs text-danger">{error}</p>}
          {!loading && !error && list.length === 0 && (
            <p className="text-xs text-faint">{ui.noDiscussion}</p>
          )}
          {list.map((comment) => (
            <div key={comment.id} className="discussion-row">
              <span className="font-bold">{comment.username}</span>
              <span className="text-faint text-xs ml-2">{formatRelativeTime(comment.created_at)}</span>
              <p className={comment.is_deleted ? "mt-1 mb-0 text-faint" : "mt-1 mb-0"}>
                {comment.is_deleted ? comment.display_body : renderBody(comment.display_body)}
              </p>
            </div>
          ))}
          {canPost && (
            <MentionInput
              value={draft}
              onChange={onDraftChange}
              onSubmit={onPost}
              members={mentionable}
              placeholder={ui.mentionPlaceholder}
              sendLabel={t.sendComment}
              requiredMessage={t.missingFields([t.fieldBody])}
            />
          )}
        </div>
      )}
    </div>
  );
}
