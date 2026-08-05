"use client";

import type { TranslationUnit } from "@/lib/api";
import { useT } from "@/lib/i18n";
import { AsyncList, EmptyState } from "@/components/ui";
import { unitStatusBadgeClass, unitStatusLabel } from "./unitStatus";

type Props = {
  units: TranslationUnit[];
  loading: boolean;
  /** 承認・差し戻しはプロジェクトの作成者だけができる */
  isOwner: boolean;
  /** 実行中の操作の名前。`status-<ユニットid>` のときそのユニットのボタンを止める */
  actionBusy: string | null;
  onOpenTarget: (unit: TranslationUnit) => void;
  onSendBack: (unitId: string) => void;
  onApprove: (unitId: string) => void;
};

/**
 * レビュー待ちのユニットを並べるタブ。
 *
 * 原文と訳文を見比べて、承認するか修正に戻すかを決める場所。
 * 状態は持たず、押されたことを親に伝えるだけにしてある。
 */
export function ReviewTab({ units, loading, isOwner, actionBusy, onOpenTarget, onSendBack, onApprove }: Props) {
  const t = useT();

  return (
    <div id="translation-panel-review" role="tabpanel" aria-labelledby="translation-tab-review">
      <AsyncList
        loading={loading}
        isEmpty={units.length === 0}
        empty={<EmptyState title={t.noReviewUnits} description={t.emptyReviewUnitsDesc} />}
      >
        <div className="flex flex-col gap-2">
          {units.map((unit) => (
            <div key={unit.id} className="card-glow overflow-hidden">
              <div className="py-3 px-4">
                <div className="flex items-center gap-3 flex-wrap mb-2">
                  <div className="text-xs text-muted flex-1 min-w-0">
                    {unit.chapter_number}:{unit.verse_number}
                    {unit.assigned_to_username && (
                      <span className="ml-2">{t.assignee} {unit.assigned_to_username}</span>
                    )}
                  </div>
                  <span className={unitStatusBadgeClass(unit.status)}>
                    {unitStatusLabel(unit.status, t)}
                  </span>
                </div>

                {/* ユニットタブと同じ枠付きカードで元テキストと訳文を並べる。 */}
                <div className="compare-grid">
                  <div className="sub-card">
                    <div className="col-label">{t.sourceText}</div>
                    <p className="mt-2 mx-0 mb-0 text-base italic leading-reading font-serif text-body">
                      {unit.verse_text}
                    </p>
                  </div>
                  <div className="sub-card">
                    <div className="col-label">{t.translationText}</div>
                    {unit.body ? (
                      <p className="mt-2 mx-0 mb-0 text-sm leading-base">{unit.body}</p>
                    ) : (
                      <p className="mt-2 mx-0 mb-0 text-sm text-faint">{t.notTranslatedYet}</p>
                    )}
                  </div>
                </div>

                <div className="flex justify-end items-center gap-2 flex-wrap mt-3">
                  <button type="button" onClick={() => onOpenTarget(unit)} className="chip-btn">
                    {t.openReviewTarget}
                  </button>
                  {isOwner && (
                    <>
                      <button
                        disabled={actionBusy === `status-${unit.id}`}
                        onClick={() => onSendBack(unit.id)}
                        className="chip-btn chip-btn-warning"
                      >
                        {t.sendBack}
                      </button>
                      <button
                        disabled={actionBusy === `status-${unit.id}`}
                        onClick={() => onApprove(unit.id)}
                        className="chip-btn"
                      >
                        {t.approve}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </AsyncList>
    </div>
  );
}
