"use client";

import type { TranslationMembership } from "@/lib/api";
import { useT, useRelativeTime } from "@/lib/i18n";
import { useLang } from "@/contexts/LanguageContext";
import { SkeletonList } from "@/components/ui";
import { translationUiText } from "@/app/translations/translationUiText";
import { memberStatusBadgeClass, memberStatusLabel } from "./unitStatus";

type Props = {
  members: TranslationMembership[];
  loading: boolean;
  /** 承認済みの参加者だけがメンバー一覧を見られる */
  isApprovedMember: boolean;
  isOwner: boolean;
  /** 実行中の操作の名前。`member-<メンバーid>` のときそのメンバーのボタンを止める */
  actionBusy: string | null;
  onApprove: (membershipId: string) => void;
  onReject: (membershipId: string) => void;
  onRemove: (membershipId: string) => void;
};

/** 参加者と参加申請の一覧タブ。承認・拒否・除外の操作は親に伝えるだけ。 */
export function MembersTab({
  members,
  loading,
  isApprovedMember,
  isOwner,
  actionBusy,
  onApprove,
  onReject,
  onRemove,
}: Props) {
  const t = useT();
  const { lang } = useLang();
  const ui = translationUiText(lang);
  const formatRelativeTime = useRelativeTime();

  return (
    <div id="translation-panel-members" role="tabpanel" aria-labelledby="translation-tab-members">
      {!isApprovedMember ? (
        <p className="text-sm text-muted">{t.membersOnly}</p>
      ) : loading ? (
        <SkeletonList count={2} />
      ) : (
        <div className="flex flex-col gap-2">
          {members.map((m) => (
            <div key={m.id} className="flex items-center gap-3 py-3 px-4 border border-border rounded-md bg-bg-alt flex-wrap">
              <span className="font-bold text-sm flex-1">{m.username}</span>
              <span className="text-xs text-muted">
                {m.role === "owner" ? t.roleOwner : t.roleMember}
              </span>
              <span className={memberStatusBadgeClass(m.status)}>
                {memberStatusLabel(m.status, t)}
              </span>
              {m.status === "pending" && (
                <span className="text-xs text-faint">
                  {ui.requestDate}: {formatRelativeTime(m.created_at)}
                </span>
              )}
              {isOwner && m.role !== "owner" && (
                <div className="flex gap-2">
                  {m.status === "pending" && (
                    <>
                      <button disabled={actionBusy === `member-${m.id}`} onClick={() => onApprove(m.id)} className="chip-btn chip-btn-sm">{t.approve}</button>
                      <button disabled={actionBusy === `member-${m.id}`} onClick={() => onReject(m.id)} className="chip-btn chip-btn-sm chip-btn-danger">{t.reject}</button>
                    </>
                  )}
                  {m.status === "approved" && (
                    <button disabled={actionBusy === `member-${m.id}`} onClick={() => onRemove(m.id)} className="chip-btn chip-btn-sm chip-btn-danger">{t.kick}</button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
