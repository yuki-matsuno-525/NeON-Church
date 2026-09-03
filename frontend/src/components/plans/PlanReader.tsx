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
import { Icon } from "@/components/ui/Icon";
import { planUiText } from "@/components/plans/planUiText";
import styles from "./PlanReader.module.css";

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

      {/* 日は「左の目盛り＋右のカード」の 2 列で並べる。目盛りは画面が広いときだけ出る。
          40 日のプランでも、いま何日目のあたりを見ているかが目で追えるようにするため。 */}
      <ol className={styles.timeline}>
        {(plan.days ?? []).map((day) => (
          <li key={day.id} className={styles.dayRow}>
            {/* 見た目だけの目盛り。「第N日」はカードの見出しにも出るので、
                画面読み上げで二重に読まれないよう隠す。 */}
            <div className={styles.rail} aria-hidden="true">
              <span className={`${styles.marker}${day.completed ? ` ${styles.markerDone}` : ""}`}>
                {t.planDayLabel(day.number)}
              </span>
            </div>

            <section className={`card-glow p-4${day.completed ? " opacity-70" : ""}`}>
              <div className="flex items-center gap-3 mb-3 flex-wrap">
                <span className="text-lg font-bold">{t.planDayLabel(day.number)}</span>
                {day.title && <span className="text-sm text-muted">{day.title}</span>}
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
              {day.devotional && (
                <div className={styles.devotional}>
                  <Icon name="sparkles" size={16} color="var(--accent)" className={styles.devotionalIcon} />
                  <p className="m-0 text-sm leading-reading whitespace-pre-wrap">{day.devotional}</p>
                </div>
              )}
            </section>
          </li>
        ))}
      </ol>
      {(plan.days ?? []).length === 0 && <EmptyState title={text.noDays} />}
    </>
  );
}
