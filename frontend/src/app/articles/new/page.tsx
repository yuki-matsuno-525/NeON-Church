"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createArticle } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { ConfirmDialog, SkeletonList } from "@/components/ui";
import { useT } from "@/lib/i18n";

const MAX_TITLE_LENGTH = 120;

/**
 * 新しい記事を始める。
 *
 * ここでは題だけを聞き、下書きとして作ってから編集画面へ送る。
 * 最初にあれこれ入力させると、書き始めるまでが遠くなるため。
 */
export default function NewArticlePage() {
  const t = useT();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
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
      const article = await createArticle({ title: trimmed, visibility: "private" });
      router.push(`/articles/${article.id}/edit`);
    } catch {
      setError(t.articleCreateFailed);
      setBusy(false);
    }
  };

  if (authLoading) {
    return <div style={containerStyle}><SkeletonList count={3} /></div>;
  }

  if (!user) {
    return (
      <div style={containerStyle}>
        <p className="text-muted">{t.articleLoginRequired}</p>
        <Link href="/login?from=%2Farticles%2Fnew" className="text-accent">
          {t.loginBtn}
        </Link>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <ConfirmDialog
        open={confirmCancel}
        title={t.articleDiscardTitle}
        description={t.articleDiscardDesc}
        confirmText={t.articleDiscardAction}
        destructive
        onConfirm={() => router.push("/articles")}
        onCancel={() => setConfirmCancel(false)}
      />
      <h1 className="mt-0 mb-2 text-lg font-bold">{t.articleNewTitle}</h1>
      <p className="mt-0 mb-6 text-sm text-muted">
        {t.articleNewDesc}
      </p>

      <form onSubmit={(event) => { event.preventDefault(); void handleCreate(); }} noValidate>
        <label htmlFor="new-article-title" className="mb-2 block text-sm text-muted">
          {t.articleTitleLabel} <span aria-hidden="true">*</span>
        </label>
        <input
          id="new-article-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          onCompositionStart={() => { composing.current = true; }}
          onCompositionEnd={() => { window.setTimeout(() => { composing.current = false; }, 0); }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && (composing.current || event.nativeEvent.isComposing)) event.preventDefault();
          }}
          placeholder={t.articleTitlePlaceholder}
          autoFocus
          required
          maxLength={MAX_TITLE_LENGTH}
          aria-invalid={!!error}
          aria-describedby="new-article-title-help new-article-error"
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: "10px 12px",
            minHeight: 44,
            borderRadius: 8,
            border: `1px solid ${error ? "var(--state-danger)" : "var(--border)"}`,
            background: "var(--bg)",
            color: "var(--text)",
            fontFamily: "inherit",
            fontSize: 16,
          }}
        />
        <div id="new-article-title-help" style={{ display: "flex", justifyContent: "space-between", gap: 12, marginTop: 6, fontSize: 12, color: "var(--text-muted)" }}>
          <span>{t.articleDraftNext}</span>
          <span>{title.length}/{MAX_TITLE_LENGTH}</span>
        </div>

        {error && <p id="new-article-error" role="alert" className="mt-2 text-sm text-danger">{error}</p>}

        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
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
          {busy ? t.articleCreating : t.articleStartWriting}
        </button>
        <button
          type="button"
          onClick={() => isDirty ? setConfirmCancel(true) : router.push("/articles")}
          style={{ alignSelf: "center", minHeight: 44, padding: "8px 12px", border: 0, background: "transparent", fontSize: 13, color: "var(--text-muted)", cursor: "pointer", fontFamily: "inherit" }}
        >
          {t.articleCancel}
        </button>
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
