"use client";

import { useState } from "react";
import Link from "next/link";
import {
  fetchPlan,
  subscribeToPlan,
  unsubscribeFromPlan,
  restartPlan,
  completePlanDay,
  uncompletePlanDay,
  type Plan,
} from "@/lib/api";
import { dayNumberToday } from "@/lib/plans";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LanguageContext";
import { useT } from "@/lib/i18n";
import { ReadingLinks } from "@/components/plans/ReadingChips";
import { ConfirmDialog, EmptyState } from "@/components/ui";
import { planUiText } from "@/components/plans/planUiText";

/**
 * プランを読み進めるところ。始める・やめる・読み終わった印を付ける。
 *
 * プランの中身はサーバー側で取ってあるので、それを最初の状態として受け取る。
 * ここで押した結果は、取り直して自分の状態を更新する。
 */
export function PlanReader({ initialPlan }: { initialPlan: Plan }) {
  const { user } = useAuth();
  const t = useT();
  const { lang } = useLang();
  const text = planUiText(lang);
  const [plan, setPlan] = useState(initialPlan);
  const [busy, setBusy] = useState(false);
  const [busyDayId, setBusyDayId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmRestart, setConfirmRestart] = useState(false);

  const id = plan.id;
  const subscription = plan.subscription ?? null;
  const isReading = subscription?.is_active === true;
  const today = subscription ? dayNumberToday(subscription.started_at) : null;
  const doneCount = plan.days?.filter((day) => day.completed).length ?? 0;

  /** 始める・やめる・やり直すは、どれも押したあとに取り直す。 */
  const run = async (action: () => Promise<unknown>) => {
    if (busy) return;
    setBusy(true);
    setActionError(null);
    try {
      await action();
      setPlan(await fetchPlan(id));
    } catch {
      setActionError(t.actionFailed);
    } finally {
      setBusy(false);
    }
  };

  /**
   * 読み終わった印は、押した瞬間に画面へ反映してから送る。
   * 待たされる感じを無くすため。失敗したら元に戻す。
   */
  const toggleDay = async (dayId: string, completed: boolean) => {
    if (busyDayId) return;
    const previous = plan;
    setBusyDayId(dayId);
    setActionError(null);
    setPlan((current) => ({
      ...current,
      days: current.days?.map((day) => (day.id === dayId ? { ...day, completed: !completed } : day)),
    }));
    try {
      if (completed) await uncompletePlanDay(id, dayId);
      else await completePlanDay(id, dayId);
    } catch {
      setPlan(previous);
      setActionError(t.actionFailed);
    } finally {
      setBusyDayId(null);
    }
  };

  return (
    <>
      <ConfirmDialog
        open={confirmRestart}
        title={t.planRestartConfirmTitle}
        description={t.planRestartConfirmDesc}
        confirmText={t.planRestartAction}
        destructive
        onConfirm={() => {
          setConfirmRestart(false);
          void run(() => restartPlan(id));
        }}
        onCancel={() => setConfirmRestart(false)}
      />

      <div className="flex items-center gap-3 flex-wrap mb-6">
        {!user ? (
          <Link href={`/login?from=${encodeURIComponent(`/plans/${id}`)}`} className="action-link">
            {t.planReadLoginRequired}
          </Link>
        ) : isReading ? (
          <>
            <span className="text-sm font-bold">
              {today && today <= plan.day_count ? t.planTodayIs(today) : t.planReading}
            </span>
            <span className="text-sm text-muted">{t.planProgress(doneCount, plan.day_count)}</span>
            <button type="button" onClick={() => setConfirmRestart(true)} disabled={busy} className="outline-button outline-button-muted">
              {t.planRestart}
            </button>
            <button type="button" onClick={() => void run(() => unsubscribeFromPlan(id))} disabled={busy} className="outline-button outline-button-muted">
              {t.planStop}
            </button>
          </>
        ) : (
          <button type="button" onClick={() => void run(() => subscribeToPlan(id))} disabled={busy} className="cta-button">
            {subscription ? t.planResume : t.planStart}
          </button>
        )}
      </div>

      {isReading && (
        <div
          role="progressbar"
          aria-label={t.planProgress(doneCount, plan.day_count)}
          aria-valuemin={0}
          aria-valuemax={plan.day_count}
          aria-valuenow={doneCount}
          className="progress-track mt-0 mb-4"
        >
          <div
            className="progress-fill"
            style={{ width: `${plan.day_count ? Math.round((doneCount / plan.day_count) * 100) : 0}%` }}
          />
        </div>
      )}
      {actionError && <p role="alert" className="text-danger text-sm mt-0 mx-0 mb-4">{actionError}</p>}

      <div className="flex flex-col gap-4">
        {(plan.days ?? []).map((day) => (
          <section key={day.id} className={`card-glow py-4 px-5${day.completed ? " opacity-70" : ""}`}>
            <div className="flex items-center gap-3 mb-3 flex-wrap">
              <span className="text-sm font-bold text-accent">{t.planDayLabel(day.number)}</span>
              {day.title && <span className="text-sm font-bold">{day.title}</span>}
              {isReading && (
                <button
                  type="button"
                  onClick={() => void toggleDay(day.id, day.completed)}
                  aria-label={day.completed ? text.unmarkDayCompleted(day.number) : text.markDayCompleted(day.number)}
                  aria-pressed={day.completed}
                  aria-busy={busyDayId === day.id}
                  disabled={busyDayId !== null}
                  className={`day-toggle${day.completed ? " day-toggle-done" : ""}`}
                >
                  {day.completed ? t.planDayDone : t.planDayMarkDone}
                </button>
              )}
            </div>
            <ReadingLinks readings={day.readings} />
            {day.devotional && <p className="mt-3 mx-0 mb-0 text-sm leading-reading whitespace-pre-wrap">{day.devotional}</p>}
          </section>
        ))}
        {(plan.days ?? []).length === 0 && <EmptyState title={text.noDays} />}
      </div>
    </>
  );
}
