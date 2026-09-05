"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createArticle } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { ConfirmDialog, SkeletonList } from "@/components/ui";
import { Breadcrumb } from "@/components/list";
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
    return <div className="page page-form"><SkeletonList count={3} /></div>;
  }

  if (!user) {
    return (
      <div className="page page-form">
        <p className="text-muted">{t.articleLoginRequired}</p>
        <Link href="/login?from=%2Farticles%2Fnew" className="text-accent">
          {t.loginBtn}
        </Link>
      </div>
    );
  }

  return (
    <div className="page page-form">
      <ConfirmDialog
        open={confirmCancel}
        title={t.articleDiscardTitle}
        description={t.articleDiscardDesc}
        confirmText={t.articleDiscardAction}
        destructive
        onConfirm={() => router.push("/articles")}
        onCancel={() => setConfirmCancel(false)}
      />
      <div className="mb-3">
        <Breadcrumb items={[{ label: t.articlesTitle, href: "/articles" }, { label: t.articleNewTitle }]} />
      </div>
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
          className={`form-control${error ? " form-control-invalid" : ""}`}
        />
        <div id="new-article-title-help" className="flex justify-between gap-3 mt-2 text-xs text-muted">
          <span>{t.articleDraftNext}</span>
          <span>{title.length}/{MAX_TITLE_LENGTH}</span>
        </div>

        {error && <p id="new-article-error" role="alert" className="mt-2 text-sm text-danger">{error}</p>}

        <div className="flex gap-3 mt-4">
        <button
          type="submit"
          disabled={!title.trim() || busy}
          className="btn btn-secondary"
        >
          {busy ? t.articleCreating : t.articleStartWriting}
        </button>
        <button
          type="button"
          onClick={() => isDirty ? setConfirmCancel(true) : router.push("/articles")}
          className="back-button self-center"
        >
          {t.articleCancel}
        </button>
        </div>
      </form>
    </div>
  );
}

