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
import { visibilityOptions } from "@/lib/plans";
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
  const supplementalText = planUiText(lang);
  const editUnavailableDescription = supplementalText.editUnavailableDescription;
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
      .catch(() => setLoadError(editUnavailableDescription))
      .finally(() => setLoading(false));
  }, [load, editUnavailableDescription]);

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
      setActionError(t.actionFailed);
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
      setActionError(t.planDayDeleteFailed);
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
      setActionError(t.actionFailed);
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
      setActionError(t.actionFailed);
      setBusyAction(null);
    }
  };

  if (loading || authLoading) {
    return <div className="page page-detail"><SkeletonList count={4} /></div>;
  }

  if (!user) {
    return (
      <div className="page page-detail">
        <ErrorState
          title={t.planCannotEdit}
          message={t.planLoginRequired}
          extraAction={<Link href={`/login?from=${encodeURIComponent(`/plans/${id}/edit`)}`} className="action-link">{t.loginBtn}</Link>}
        />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="page page-detail">
        <ErrorState
          title={t.planCannotEdit}
          message={loadError ?? editUnavailableDescription}
          onRetry={() => {
            setLoading(true);
            load().catch(() => setLoadError(editUnavailableDescription)).finally(() => setLoading(false));
          }}
          retryLabel={t.retry}
          extraAction={<Link href="/plans" className="action-link">{t.planBackToList}</Link>}
        />
      </div>
    );
  }

  if (user.username !== plan.owner_username) {
    return (
      <div className="page page-detail">
        <ErrorState title={t.planCannotEdit} message={t.planNotOwner} extraAction={<Link href="/plans" className="action-link">{t.planBackToList}</Link>} />
      </div>
    );
  }

  const days = plan.days ?? [];
  const canReorder = plan.can_reorder_days !== false;
  const canPublish = days.length > 0;

  return (
    <div className="page page-detail">
      <ConfirmDialog
        open={confirmDelete}
        title={t.planDeleteConfirmTitle}
        description={t.planDeleteConfirmDesc}
        confirmText={t.articleDeleteAction}
        destructive
        onConfirm={handleDeletePlan}
        onCancel={() => setConfirmDelete(false)}
      />
      <ConfirmDialog
        open={deletingDayId !== null}
        title={t.planDayDeleteConfirmTitle}
        description={t.planDayDeleteConfirmDesc}
        confirmText={t.planDayDeleteAction}
        destructive
        onConfirm={() => deletingDayId && handleDeleteDay(deletingDayId)}
        onCancel={() => setDeletingDayId(null)}
      />

      <div className="flex gap-3 items-center flex-wrap mb-3">
        <label className="field-grow">
          <span className="sr-only">{t.planTitleLabel}</span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={t.planTitleLabel}
            maxLength={200}
            aria-invalid={!title.trim()}
            aria-describedby={!title.trim() ? "plan-title-error" : undefined}
            className={`form-control text-lg font-bold ${title.trim() ? "border-border" : "border-danger"}`}
          />
        </label>
        <label>
          <span className="sr-only">{supplementalText.visibilityLabelText}</span>
          <select value={visibility} onChange={(event) => setVisibility(event.target.value as PlanVisibility)} className="form-control w-auto">
            {visibilityOptions(t).map((option) => (
              <option key={option.value} value={option.value} disabled={option.value !== "private" && !canPublish}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <span role="status" aria-live="polite" className={`save-status${autosave.status === "error" ? " save-status-error" : ""}`}>
          {saveStatusLabel(autosave.status, t)}
        </span>
        {autosave.status === "error" && <button type="button" onClick={() => void autosave.retry()} className="link-button">{t.retry}</button>}
        <Link href={`/plans/${id}`} className="action-link text-sm text-muted no-underline">{t.planView}</Link>
        <button type="button" onClick={() => setConfirmDelete(true)} className="outline-button outline-button-muted">{t.delete}</button>
      </div>

      {!title.trim() && <p id="plan-title-error" role="alert" className="error-text">{supplementalText.titleRequired}</p>}
      {actionError && <p role="alert" className="error-text">{actionError}</p>}

      <label>
        <span className="sr-only">{t.description}</span>
        <input
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder={t.planDescPlaceholder}
          maxLength={300}
          className="form-control mb-3"
        />
      </label>

      {!canPublish && <p className="text-xs text-faint mt-0 mx-0 mb-3">{t.planDayRequired}</p>}

      <label htmlFor="plan-reader-note" className="block text-xs text-muted mb-1">
        {t.planNoteFieldLabel}
      </label>
      <textarea
        id="plan-reader-note"
        value={note}
        onChange={(event) => setNote(event.target.value)}
        rows={2}
        placeholder={t.planNotePlaceholder}
        className="form-control mb-2 resize-y"
      />

      {!canReorder && <p className="text-xs text-muted mt-0 mx-0 mb-4 leading-reading">{t.planFrozenNotice}</p>}

      <div className="flex flex-col gap-4 mt-4">
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

      {days.length === 0 && <EmptyState title={supplementalText.noDays} description={t.planDayRequired} />}

      <button type="button" onClick={handleAddDay} disabled={!!busyAction} className="dashed-button w-full mt-4">
        {busyAction === "add-day" ? supplementalText.addingDay : t.planAddDay}
      </button>
      {days.length > 0 && !canReorder && <p className="text-xs text-faint mt-2">{t.planAddDayAlways}</p>}
    </div>
  );
}
