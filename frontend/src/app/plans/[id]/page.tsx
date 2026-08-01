"use client";

import { use, useEffect, useState } from "react";
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
import { dayNumberToday, visibilityLabel } from "@/lib/plans";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LanguageContext";
import { useT } from "@/lib/i18n";
import { ReadingLinks } from "@/components/plans/ReadingChips";
import { ConfirmDialog, EmptyState, ErrorState, SkeletonList } from "@/components/ui";
import { planUiText } from "@/components/plans/planUiText";

export default function PlanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user, loading: authLoading } = useAuth();
  const t = useT();
  const { lang } = useLang();
  const supplementalText = planUiText(lang);
  const unreadableDescription = supplementalText.unreadableDescription;
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [busyDayId, setBusyDayId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmRestart, setConfirmRestart] = useState(false);

  const reload = async () => {
    const nextPlan = await fetchPlan(id);
    setPlan(nextPlan);
    setError(null);
  };

  const retryLoad = () => {
    setLoading(true);
    setError(null);
    fetchPlan(id)
      .then(setPlan)
      .catch(() => setError(unreadableDescription))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchPlan(id)
      .then(setPlan)
      .catch(() => setError(unreadableDescription))
      .finally(() => setLoading(false));
  }, [id, unreadableDescription]);

  const subscription = plan?.subscription ?? null;
  const isReading = subscription?.is_active === true;

  const handleStart = async () => {
    if (busy) return;
    setBusy(true);
    setActionError(null);
    try {
      await subscribeToPlan(id);
      await reload();
    } catch {
      setActionError(t.actionFailed);
    } finally {
      setBusy(false);
    }
  };

  const handleStop = async () => {
    if (busy) return;
    setBusy(true);
    setActionError(null);
    try {
      await unsubscribeFromPlan(id);
      await reload();
    } catch {
      setActionError(t.actionFailed);
    } finally {
      setBusy(false);
    }
  };

  const handleRestart = async () => {
    setConfirmRestart(false);
    if (busy) return;
    setBusy(true);
    setActionError(null);
    try {
      await restartPlan(id);
      await reload();
    } catch {
      setActionError(t.actionFailed);
    } finally {
      setBusy(false);
    }
  };

  const toggleDay = async (dayId: string, completed: boolean) => {
    if (busyDayId) return;
    const previousPlan = plan;
    setBusyDayId(dayId);
    setActionError(null);
    setPlan((current) =>
      current
        ? {
            ...current,
            days: current.days?.map((day) =>
              day.id === dayId ? { ...day, completed: !completed } : day,
            ),
          }
        : current,
    );
    try {
      if (completed) await uncompletePlanDay(id, dayId);
      else await completePlanDay(id, dayId);
    } catch {
      setPlan(previousPlan);
      setActionError(t.actionFailed);
    } finally {
      setBusyDayId(null);
    }
  };

  if (loading || authLoading) {
    return <div style={containerStyle}><SkeletonList count={3} /></div>;
  }

  if (error || !plan) {
    return (
      <div style={containerStyle}>
        <ErrorState
          title={t.planCannotRead}
          message={error ?? unreadableDescription}
          onRetry={retryLoad}
          retryLabel={t.retry}
          extraAction={<Link href="/plans" style={actionLinkStyle}>{t.planBackToList}</Link>}
        />
      </div>
    );
  }

  const isOwner = user?.username === plan.owner_username;
  const today = subscription ? dayNumberToday(subscription.started_at) : null;
  const doneCount = plan.days?.filter((day) => day.completed).length ?? 0;

  return (
    <div style={containerStyle}>
      <ConfirmDialog
        open={confirmRestart}
        title={t.planRestartConfirmTitle}
        description={t.planRestartConfirmDesc}
        confirmText={t.planRestartAction}
        destructive
        onConfirm={handleRestart}
        onCancel={() => setConfirmRestart(false)}
      />

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        {plan.visibility !== "public" && (
          <span className="badge" style={{ background: "rgba(255,255,255,0.08)", color: "var(--text-muted)" }}>
            {visibilityLabel(plan.visibility, t)}
          </span>
        )}
        {isOwner && (
          <Link href={`/plans/${plan.id}/edit`} style={editLinkStyle}>
            {t.articleEdit}
          </Link>
        )}
      </div>

      <h1 style={{ fontFamily: '"Noto Serif JP", serif', fontSize: 26, fontWeight: 700, margin: "0 0 8px", lineHeight: 1.5 }}>
        {plan.title}
      </h1>
      <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16 }}>
        <Link href={`/profile/${plan.owner_username}`} style={{ color: "var(--text-muted)", textDecoration: "none" }}>
          {plan.owner_username}
        </Link>
        <span style={{ marginLeft: 8 }}>{t.planDayCount(plan.day_count)}</span>
      </div>

      {plan.description && <p style={{ fontSize: 15, lineHeight: 1.8, margin: "0 0 16px" }}>{plan.description}</p>}

      {plan.note && (
        <div style={{ border: "1px solid var(--border)", borderRadius: 10, padding: "12px 14px", marginBottom: 20, background: "rgba(255,255,255,0.03)" }}>
          <div style={{ fontSize: 12, color: "var(--text-faint)", marginBottom: 4 }}>{t.planNoteLabel}</div>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{plan.note}</p>
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 24 }}>
        {!user ? (
          <Link href={`/login?from=${encodeURIComponent(`/plans/${id}`)}`} style={actionLinkStyle}>
            {t.planReadLoginRequired}
          </Link>
        ) : isReading ? (
          <>
            <span style={{ fontSize: 14, fontWeight: 700 }}>
              {today && today <= plan.day_count ? t.planTodayIs(today) : t.planReading}
            </span>
            <span style={{ fontSize: 13, color: "var(--text-muted)" }}>{t.planProgress(doneCount, plan.day_count)}</span>
            <button type="button" onClick={() => setConfirmRestart(true)} disabled={busy} style={plainButtonStyle}>{t.planRestart}</button>
            <button type="button" onClick={handleStop} disabled={busy} style={plainButtonStyle}>{t.planStop}</button>
          </>
        ) : (
          <button type="button" onClick={handleStart} disabled={busy} style={startButtonStyle}>
            {subscription ? t.planResume : t.planStart}
          </button>
        )}
      </div>

      {isReading && (
        <div role="progressbar" aria-label={t.planProgress(doneCount, plan.day_count)} aria-valuemin={0} aria-valuemax={plan.day_count} aria-valuenow={doneCount} style={progressTrackStyle}>
          <div style={{ width: `${plan.day_count ? Math.round((doneCount / plan.day_count) * 100) : 0}%`, height: "100%", borderRadius: 999, background: "var(--accent)" }} />
        </div>
      )}
      {actionError && <p role="alert" style={{ color: "var(--state-danger)", fontSize: 13, margin: "0 0 16px" }}>{actionError}</p>}

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {(plan.days ?? []).map((day) => (
          <section key={day.id} className="card-glow" style={{ padding: "16px 18px", opacity: day.completed ? 0.7 : 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--accent)" }}>{t.planDayLabel(day.number)}</span>
              {day.title && <span style={{ fontSize: 15, fontWeight: 700 }}>{day.title}</span>}
              {isReading && (
                <button
                  type="button"
                  onClick={() => toggleDay(day.id, day.completed)}
                  aria-label={day.completed ? supplementalText.unmarkDayCompleted(day.number) : supplementalText.markDayCompleted(day.number)}
                  aria-pressed={day.completed}
                  aria-busy={busyDayId === day.id}
                  disabled={busyDayId !== null}
                  style={{
                    marginLeft: "auto",
                    border: `1px solid ${day.completed ? "var(--accent)" : "var(--border)"}`,
                    background: day.completed ? "var(--accent-tint)" : "transparent",
                    color: day.completed ? "var(--accent)" : "var(--text-muted)",
                    borderRadius: 8,
                    fontSize: 12,
                    padding: "6px 12px",
                    minHeight: 44,
                    cursor: busyDayId ? "default" : "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  {day.completed ? t.planDayDone : t.planDayMarkDone}
                </button>
              )}
            </div>
            <ReadingLinks readings={day.readings} />
            {day.devotional && <p style={{ margin: "12px 0 0", fontSize: 15, lineHeight: 1.9, whiteSpace: "pre-wrap" }}>{day.devotional}</p>}
          </section>
        ))}
        {(plan.days ?? []).length === 0 && <EmptyState title={supplementalText.noDays} />}
      </div>
    </div>
  );
}

const containerStyle: React.CSSProperties = { maxWidth: 720, margin: "0 auto", padding: "32px 16px 64px" };

const startButtonStyle: React.CSSProperties = {
  border: "none",
  borderRadius: 8,
  background: "var(--accent)",
  color: "var(--accent-text)",
  fontWeight: 700,
  fontSize: 14,
  padding: "10px 22px",
  minHeight: 44,
  cursor: "pointer",
  fontFamily: "inherit",
};

const plainButtonStyle: React.CSSProperties = {
  border: "1px solid var(--border)",
  borderRadius: 8,
  background: "transparent",
  color: "var(--text-muted)",
  fontSize: 13,
  padding: "8px 14px",
  minHeight: 44,
  cursor: "pointer",
  fontFamily: "inherit",
};

const actionLinkStyle: React.CSSProperties = { color: "var(--accent)", minHeight: 44, display: "inline-flex", alignItems: "center" };
const editLinkStyle: React.CSSProperties = { ...actionLinkStyle, marginLeft: "auto", fontSize: 13, textDecoration: "none" };
const progressTrackStyle: React.CSSProperties = { height: 6, width: "100%", borderRadius: 999, overflow: "hidden", background: "var(--border)", margin: "-12px 0 20px" };
