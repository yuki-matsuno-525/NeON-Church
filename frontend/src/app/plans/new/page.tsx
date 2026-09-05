"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createPlan } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LanguageContext";
import { useT } from "@/lib/i18n";
import { ConfirmDialog, SkeletonList } from "@/components/ui";
import { planUiText } from "@/components/plans/planUiText";
import { Breadcrumb } from "@/components/list";

/** 新しいプランを始める。題だけ聞いて下書きを作り、編集画面へ送る。 */
export default function NewPlanPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const t = useT();
  const { lang } = useLang();
  const supplementalText = planUiText(lang);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const composing = useRef(false);
  const isDirty = title.trim().length > 0;

  useEffect(() => {
    const warnBeforeExit = (event: BeforeUnloadEvent) => {
      if (!isDirty || busy) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warnBeforeExit);
    return () => window.removeEventListener("beforeunload", warnBeforeExit);
  }, [isDirty, busy]);

  const handleCreate = async () => {
    const trimmed = title.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    setError(null);
    try {
      const plan = await createPlan({ title: trimmed, visibility: "private" });
      router.push(`/plans/${plan.id}/edit`);
    } catch {
      setError(t.planCreateFailed);
      setBusy(false);
    }
  };

  if (authLoading) {
    return <div className="page page-form"><SkeletonList count={2} /></div>;
  }

  if (!user) {
    return (
      <div className="page page-form">
        <p role="status" className="text-muted">{t.planLoginRequired}</p>
        <Link href="/login?from=%2Fplans%2Fnew" className="action-link">
          {t.loginBtn}
        </Link>
      </div>
    );
  }

  return (
    <div className="page page-form">
      <ConfirmDialog
        open={confirmCancel}
        title={supplementalText.discardNewTitle}
        description={supplementalText.discardNewDescription}
        confirmText={supplementalText.discardNewConfirm}
        destructive
        onConfirm={() => router.push("/plans")}
        onCancel={() => setConfirmCancel(false)}
      />
      <div className="mb-3">
        <Breadcrumb items={[{ label: t.plansTitle, href: "/plans" }, { label: t.planNewTitle }]} />
      </div>
      <h1 className="mt-0 mb-2 text-lg font-bold">{t.planNewTitle}</h1>
      <p className="mt-0 mb-6 text-sm text-muted">
        {t.planNewDesc}
      </p>

      <form onSubmit={(event) => { event.preventDefault(); void handleCreate(); }}>
        <label htmlFor="new-plan-title" className="mb-2 block text-sm text-muted">
          {t.planTitleLabel}
        </label>
        <input
          id="new-plan-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          onCompositionStart={() => { composing.current = true; }}
          onCompositionEnd={() => { window.setTimeout(() => { composing.current = false; }, 0); }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && (composing.current || event.nativeEvent.isComposing)) {
              event.preventDefault();
            }
          }}
          placeholder={t.planTitlePlaceholder}
          autoFocus
          required
          maxLength={200}
          aria-invalid={!!error}
          aria-describedby={error ? "new-plan-error" : undefined}
          className="form-control"
        />

        {error && <p id="new-plan-error" role="alert" className="mt-2 text-sm text-danger">{error}</p>}

        <div className="flex gap-3 mt-4 flex-wrap">
          <button
            type="submit"
            disabled={!title.trim() || busy}
            className="btn btn-secondary"
          >
            {busy ? t.articleCreating : t.planStartCreating}
          </button>
          {isDirty ? (
            <button type="button" onClick={() => setConfirmCancel(true)} className="action-link self-center cursor-pointer border-0 bg-transparent px-1 text-sm text-muted no-underline">
              {t.articleCancel}
            </button>
          ) : (
            <Link href="/plans" className="action-link self-center text-sm text-muted no-underline">
              {t.articleCancel}
            </Link>
          )}
        </div>
      </form>
    </div>
  );
}
