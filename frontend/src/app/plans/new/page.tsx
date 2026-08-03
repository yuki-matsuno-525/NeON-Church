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
    return <div style={containerStyle}><SkeletonList count={2} /></div>;
  }

  if (!user) {
    return (
      <div style={containerStyle}>
        <p role="status" className="text-muted">{t.planLoginRequired}</p>
        <Link href="/login?from=%2Fplans%2Fnew" style={loginLinkStyle}>
          {t.loginBtn}
        </Link>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <ConfirmDialog
        open={confirmCancel}
        title={supplementalText.discardNewTitle}
        description={supplementalText.discardNewDescription}
        confirmText={supplementalText.discardNewConfirm}
        destructive
        onConfirm={() => router.push("/plans")}
        onCancel={() => setConfirmCancel(false)}
      />
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
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: "10px 12px",
            minHeight: 44,
            borderRadius: 8,
            border: "1px solid var(--border)",
            background: "var(--bg)",
            color: "var(--text)",
            fontFamily: "inherit",
            fontSize: 15,
          }}
        />

        {error && <p id="new-plan-error" role="alert" className="mt-2 text-sm text-danger">{error}</p>}

        <div className="flex gap-3 mt-4 flex-wrap">
          <button
            type="submit"
            disabled={!title.trim() || busy}
            style={{
              border: "none",
              borderRadius: 8,
              background: "var(--accent)",
              color: "var(--accent-text)",
              fontWeight: 700,
              fontSize: 14,
              padding: "10px 22px",
              minHeight: 44,
              cursor: !title.trim() || busy ? "default" : "pointer",
              opacity: !title.trim() || busy ? 0.6 : 1,
              fontFamily: "inherit",
            }}
          >
            {busy ? t.articleCreating : t.planStartCreating}
          </button>
          {isDirty ? (
            <button type="button" onClick={() => setConfirmCancel(true)} style={cancelButtonStyle}>
              {t.articleCancel}
            </button>
          ) : (
            <Link href="/plans" style={cancelLinkStyle}>
              {t.articleCancel}
            </Link>
          )}
        </div>
      </form>
    </div>
  );
}

const containerStyle: React.CSSProperties = {
  maxWidth: 560,
  margin: "0 auto",
  padding: "48px 16px",
};

const loginLinkStyle: React.CSSProperties = {
  color: "var(--accent)",
  minHeight: 44,
  display: "inline-flex",
  alignItems: "center",
};

const cancelLinkStyle: React.CSSProperties = {
  alignSelf: "center",
  fontSize: 13,
  color: "var(--text-muted)",
  textDecoration: "none",
  minHeight: 44,
  display: "inline-flex",
  alignItems: "center",
};

const cancelButtonStyle: React.CSSProperties = {
  ...cancelLinkStyle,
  border: 0,
  background: "transparent",
  cursor: "pointer",
  fontFamily: "inherit",
  padding: "0 4px",
};
