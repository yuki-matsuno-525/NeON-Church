"use client";

import { useState } from "react";
import Link from "next/link";
import {
  fetchPlan,
  subscribeToPlan,
  unsubscribeFromPlan,
  restartPlan,
  completePlanReading,
  uncompletePlanReading,
  type Plan,
  type PlanReading,
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
  const [busyReadingId, setBusyReadingId] = useState<string | null>(null);
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
   * 章の印は、押した瞬間に画面へ反映してから送る。
   * 待たされる感じを無くすため。失敗したら元に戻す。
   *
   * その日が読み終わりになったかどうかはサーバー側が決める（章に全部印が付いたとき）。
   * ここでも同じ計算をして先に画面へ出す。押すたびに取り直すと待たされるため。
   */
  const toggleReading = async (reading: PlanReading) => {
    if (busyReadingId) return;
    const previous = plan;
    const nextCompleted = !reading.completed;
    setBusyReadingId(reading.id);
    setActionError(null);
    setPlan((current) => ({
      ...current,
      days: current.days?.map((day) => {
        if (!day.readings.some((item) => item.id === reading.id)) return day;
        const readings = day.readings.map((item) =>
          item.id === reading.id ? { ...item, completed: nextCompleted } : item,
        );
        return {
          ...day,
          readings,
          completed: readings.length > 0 && readings.every((item) => item.completed),
        };
      }),
    }));
    try {
      if (nextCompleted) await completePlanReading(id, reading.id);
      else await uncompletePlanReading(id, reading.id);
    } catch {
      setPlan(previous);
      setActionError(t.actionFailed);
    } finally {
      setBusyReadingId(null);
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

            <section className={`card-glow card-glow-strong p-6${day.completed ? " opacity-70" : ""}`}>
              <div className="flex items-center gap-3 mb-4 flex-wrap">
                <span className="text-xl font-bold">{t.planDayLabel(day.number)}</span>
                {day.title && (
                  <>
                    <span className={styles.headDivider} aria-hidden="true" />
                    <span className="text-lg text-accent">{day.title}</span>
                  </>
                )}
                {/* 進み具合は数字だけにする。押すものではないので、
                    ボタンの形にすると「押さないと記録されない」と読めてしまう。 */}
                {isReading && day.readings.length > 0 && (
                  <span className={`${styles.headCount} text-sm text-soft`}>
                    {text.dayReadingCount(
                      day.readings.filter((reading) => reading.completed).length,
                      day.readings.length,
                    )}
                  </span>
                )}
              </div>
              {/* 章の行とその日の文章の行は、同じ箱に続けて並べて形を揃える。 */}
              <div className={styles.rows}>
                <ReadingLinks
                  readings={day.readings}
                  onToggle={isReading ? toggleReading : undefined}
                  busyId={busyReadingId}
                />
                {day.devotional && (
                  <div className={styles.row}>
                    <span className={`${styles.rowBadge} ${styles.rowBadgeDotted}`} aria-hidden="true">
                      <Icon name="sparkles" size={20} color="var(--accent)" />
                    </span>
                    <p className="m-0 text-md leading-reading whitespace-pre-wrap">{day.devotional}</p>
                  </div>
                )}
              </div>
            </section>
          </li>
        ))}
      </ol>
      {(plan.days ?? []).length === 0 && <EmptyState title={text.noDays} />}
    </>
  );
}
