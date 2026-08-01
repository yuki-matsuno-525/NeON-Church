"use client";

import { use, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  fetchPlan,
  updatePlan,
  deletePlan,
  addPlanDay,
  deletePlanDay,
  reorderPlanDays,
  type Plan,
  type PlanVisibility,
} from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LanguageContext";
import { useT } from "@/lib/i18n";
import { useAutosave, saveStatusLabel } from "@/hooks/useAutosave";
import { PlanDayEditor } from "@/components/plans/PlanDayEditor";
import { ConfirmDialog, EmptyState, ErrorState, SkeletonList } from "@/components/ui";
import { planUiText } from "@/components/plans/planUiText";

export default function PlanEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const t = useT();
  const { lang } = useLang();
  const ui = planUiText(lang);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deletingDayId, setDeletingDayId] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [note, setNote] = useState("");
  const [visibility, setVisibility] = useState<PlanVisibility>("private");

  const load = useCallback(
    () =>
      fetchPlan(id).then((data) => {
        setLoadError(null);
        setPlan(data);
        setTitle(data.title);
        setDescription(data.description);
        setNote(data.note ?? "");
        setVisibility(data.visibility);
      }),
    [id, setDescription, setLoadError, setNote, setPlan, setTitle, setVisibility],
  );

  useEffect(() => {
    load()
      .catch(() => setLoadError(ui.editUnavailableDescription))
      .finally(() => setLoading(false));
  }, [load, ui.editUnavailableDescription]);

  const draft = useMemo(
    () => ({ title, description, note, visibility }),
    [title, description, note, visibility],
  );
  const handleSave = useCallback(async (value: typeof draft) => {
    await updatePlan(id, value);
  }, [id]);
  const autosave = useAutosave({
    value: draft,
    onSave: handleSave,
    enabled: !loading && !loadError && !!title.trim(),
  });

  const handleAddDay = async () => {
    if (busyAction) return;
    setBusyAction("add-day");
    setActionError(null);
    try {
      if (!(await autosave.saveNow())) throw new Error("autosave failed");
      await addPlanDay(id);
      await load();
    } catch {
      setActionError(ui.dayActionError);
    } finally {
      setBusyAction(null);
    }
  };

  const handleDeleteDay = async (dayId: string) => {
    setDeletingDayId(null);
    setBusyAction(`delete-${dayId}`);
    setActionError(null);
    try {
      if (!(await autosave.saveNow())) throw new Error("autosave failed");
      await deletePlanDay(id, dayId);
      await load();
    } catch {
      setActionError(ui.dayActionError);
    } finally {
      setBusyAction(null);
    }
  };

  const handleMoveDay = async (dayId: string, direction: -1 | 1) => {
    if (!plan?.days || busyAction) return;
    const ids = plan.days.map((day) => day.id);
    const index = ids.indexOf(dayId);
    const target = index + direction;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    setBusyAction(`move-${dayId}`);
    setActionError(null);
    try {
      if (!(await autosave.saveNow())) throw new Error("autosave failed");
      await reorderPlanDays(id, ids);
      await load();
    } catch {
      setActionError(ui.dayActionError);
    } finally {
      setBusyAction(null);
    }
  };

  const handleDeletePlan = async () => {
    setConfirmDelete(false);
    if (busyAction) return;
    setBusyAction("delete-plan");
    setActionError(null);
    try {
      await deletePlan(id);
      router.push("/plans");
    } catch {
      setActionError(ui.actionError);
      setBusyAction(null);
    }
  };

  if (loading || authLoading) {
    return (
      <div style={containerStyle}>
        <SkeletonList count={4} />
      </div>
    );
  }

  if (!user) {
    return (
      <div style={containerStyle}>
        <ErrorState
          title={ui.editUnavailableTitle}
          message={ui.createLoginRequired}
          extraAction={<Link href={`/login?from=${encodeURIComponent(`/plans/${id}/edit`)}`} style={actionLinkStyle}>{ui.login}</Link>}
        />
      </div>
    );
  }

  if (!plan) {
    return (
      <div style={containerStyle}>
        <ErrorState
          title={ui.editUnavailableTitle}
          message={loadError ?? ui.editUnavailableDescription}
          onRetry={() => { setLoading(true); load().catch(() => setLoadError(ui.editUnavailableDescription)).finally(() => setLoading(false)); }}
          retryLabel={ui.retry}
          extraAction={<Link href="/plans" style={actionLinkStyle}>{ui.backToPlans}</Link>}
        />
      </div>
    );
  }

  if (user.username !== plan.owner_username) {
    return <div style={containerStyle}><ErrorState title={ui.editUnavailableTitle} message={ui.notOwner} extraAction={<Link href="/plans" style={actionLinkStyle}>{ui.backToPlans}</Link>} /></div>;
  }

  const days = plan.days ?? [];
  const canReorder = plan.can_reorder_days !== false;
  const canPublish = days.length > 0;

  return (
    <div style={containerStyle}>
      <ConfirmDialog
        open={confirmDelete}
        title={ui.deletePlanTitle}
        description={ui.deletePlanDescription}
        confirmText={ui.deletePlanConfirm}
        destructive
        onConfirm={handleDeletePlan}
        onCancel={() => setConfirmDelete(false)}
      />
      <ConfirmDialog
        open={deletingDayId !== null}
        title={ui.deleteDayTitle}
        description={ui.deleteDayDescription}
        confirmText={ui.deleteDayConfirm}
        destructive
        onConfirm={() => deletingDayId && handleDeleteDay(deletingDayId)}
        onCancel={() => setDeletingDayId(null)}
      />

      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}>
        <label style={{ flex: "1 1 280px" }}>
          <span className="sr-only">{ui.planTitleLabel}</span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={ui.planTitleLabel}
            maxLength={200}
            aria-invalid={!title.trim()}
            aria-describedby={!title.trim() ? "plan-title-error" : undefined}
            style={{ ...inputStyle, borderColor: !title.trim() ? "var(--state-danger)" : "var(--border)", fontSize: 18, fontWeight: 700 }}
          />
        </label>
        <label>
          <span className="sr-only">{ui.visibilityLabelText}</span>
          <select
            value={visibility}
            onChange={(event) => setVisibility(event.target.value as PlanVisibility)}
            style={{ ...inputStyle, width: "auto" }}
          >
          {ui.visibilityOptions.map((option) => (
            <option key={option.value} value={option.value} disabled={option.value !== "private" && !canPublish}>
              {option.label}
            </option>
          ))}
          </select>
        </label>
        <span role="status" aria-live="polite" style={{ fontSize: 12, color: autosave.status === "error" ? "var(--state-danger)" : "var(--text-faint)", minWidth: 80 }}>
          {saveStatusLabel(autosave.status, t)}
        </span>
        {autosave.status === "error" && <button type="button" onClick={() => void autosave.retry()} style={inlineRetryStyle}>{ui.retrySave}</button>}
        <Link href={`/plans/${id}`} style={{ fontSize: 13, color: "var(--text-muted)", textDecoration: "none", minHeight: 44, display: "inline-flex", alignItems: "center" }}>
          {ui.viewPlan}
        </Link>
        <button type="button" onClick={() => setConfirmDelete(true)} style={plainButtonStyle}>
          {ui.deletePlan}
        </button>
      </div>

      {!title.trim() && <p id="plan-title-error" role="alert" style={errorTextStyle}>{ui.titleRequired}</p>}
      {actionError && <p role="alert" style={errorTextStyle}>{actionError}</p>}

      <label>
        <span className="sr-only">{ui.descriptionLabel}</span>
        <input
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder={ui.descriptionPlaceholder}
          maxLength={300}
          style={{ ...inputStyle, marginBottom: 10 }}
        />
      </label>

      {!canPublish && (
        <p style={{ fontSize: 12, color: "var(--text-faint)", margin: "0 0 10px" }}>
          {ui.publishNeedsDay}
        </p>
      )}

      <label htmlFor="plan-reader-note" style={{ display: "block", fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>
        {ui.noteLabel}
      </label>
      <textarea
        id="plan-reader-note"
        value={note}
        onChange={(event) => setNote(event.target.value)}
        rows={2}
        placeholder={ui.notePlaceholder}
        style={{ ...inputStyle, marginBottom: 8, resize: "vertical" }}
      />

      {!canReorder && (
        <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "0 0 16px", lineHeight: 1.7 }}>
          {ui.reorderLocked}
        </p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 16 }}>
        {days.map((day, index) => (
          <PlanDayEditor
            key={day.id}
            planId={id}
            day={day}
            canDelete={canReorder}
            canMoveUp={canReorder && index > 0}
            canMoveDown={canReorder && index < days.length - 1}
            onDelete={() => setDeletingDayId(day.id)}
            onMove={(direction) => handleMoveDay(day.id, direction)}
          />
        ))}
      </div>

      {days.length === 0 && <EmptyState title={ui.noDays} description={ui.publishNeedsDay} />}

      <button type="button" onClick={handleAddDay} disabled={!!busyAction} style={{ ...addDayStyle, opacity: busyAction ? 0.6 : 1 }}>
        {busyAction === "add-day" ? ui.addingDay : ui.addDay}
      </button>
      {days.length > 0 && !canReorder && (
        <p style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 8 }}>
          {ui.appendOnly}
        </p>
      )}
    </div>
  );
}

const containerStyle: React.CSSProperties = {
  maxWidth: 760,
  margin: "0 auto",
  padding: "24px 16px 64px",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "9px 12px",
  minHeight: 44,
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "var(--bg)",
  color: "var(--text)",
  fontFamily: "inherit",
  fontSize: 14,
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

const actionLinkStyle: React.CSSProperties = {
  color: "var(--accent)",
  minHeight: 44,
  display: "inline-flex",
  alignItems: "center",
};

const inlineRetryStyle: React.CSSProperties = {
  border: 0,
  background: "transparent",
  color: "var(--accent)",
  textDecoration: "underline",
  minHeight: 44,
  cursor: "pointer",
};

const errorTextStyle: React.CSSProperties = {
  color: "var(--state-danger)",
  fontSize: 13,
  margin: "4px 0 10px",
};

const addDayStyle: React.CSSProperties = {
  width: "100%",
  marginTop: 16,
  border: "1px dashed var(--border)",
  borderRadius: 10,
  background: "transparent",
  color: "var(--text-muted)",
  fontSize: 14,
  padding: "14px 16px",
  minHeight: 48,
  cursor: "pointer",
  fontFamily: "inherit",
};
