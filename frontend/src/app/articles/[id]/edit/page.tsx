"use client";

import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  fetchArticle,
  fetchArticleTags,
  updateArticle,
  deleteArticle,
  type Article,
  type ArticleCitation,
  type ArticleTag,
  type ArticleVisibility,
} from "@/lib/api";
import { articleTagLabel, visibilityOptions } from "@/lib/articles";
import { useT } from "@/lib/i18n";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useAutosave, saveStatusLabel } from "@/hooks/useAutosave";
import { ArticleBody } from "@/components/articles/ArticleBody";
import { CitationPanel } from "@/components/articles/CitationPanel";
import { ConfirmDialog, SkeletonList } from "@/components/ui";

const MAX_TAGS = 3;
const MAX_TITLE_LENGTH = 120;
const MAX_SUMMARY_LENGTH = 300;

export default function ArticleEditPage({ params }: { params: Promise<{ id: string }> }) {
  const t = useT();
  const { id } = use(params);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const isMobile = useIsMobile();
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const [article, setArticle] = useState<Article | null>(null);
  const [tags, setTags] = useState<ArticleTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [pendingVisibility, setPendingVisibility] = useState<ArticleVisibility | null>(null);
  const [tagNotice, setTagNotice] = useState<string | null>(null);
  const [tagLoadError, setTagLoadError] = useState(false);
  // スマホは1カラムなので、本文・プレビュー・引用をタブで切り替える。
  const [mobileTab, setMobileTab] = useState<"body" | "preview" | "citations">("body");

  // 編集中の値。保存はまとめて1つの塊で送る。
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [body, setBody] = useState("");
  const [visibility, setVisibility] = useState<ArticleVisibility>("private");
  const [tagIds, setTagIds] = useState<string[]>([]);
  // プレビュー用。保存の返事に入っている引用で更新する。
  const [citations, setCitations] = useState<ArticleCitation[]>([]);

  const loadTags = useCallback(async () => {
    setTagLoadError(false);
    try {
      setTags(await fetchArticleTags());
    } catch {
      setTagLoadError(true);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadTags();
  }, [loadTags]);

  useEffect(() => {
    fetchArticle(id)
      .then((data) => {
        setArticle(data);
        setTitle(data.title);
        setSummary(data.summary);
        setBody(data.body ?? "");
        setVisibility(data.visibility);
        setTagIds(data.tags.map((tag) => tag.id));
        setCitations(data.citations ?? []);
      })
      .catch(() => setError(t.articleCannotEdit))
      .finally(() => setLoading(false));
  }, [id, t]);

  const draft = useMemo(
    () => ({ title, summary, body, visibility, tag_ids: tagIds }),
    [title, summary, body, visibility, tagIds],
  );

  const handleSave = useCallback(
    async (value: typeof draft) => {
      if (!value.title.trim()) throw new Error("記事の題を入力してください。");
      const saved = await updateArticle(id, value);
      // 保存のたびに引用を作り直しているので、プレビューもここで最新にする。
      setCitations(saved.citations ?? []);
    },
    [id],
  );

  const autosave = useAutosave({
    value: draft,
    onSave: handleSave,
    enabled: !loading && !authLoading && !!user && !error && user.username === article?.owner_username,
  });

  /** 引用パネルから呼ばれる。本文のカーソル位置に印を差し込む。 */
  const insertMark = (mark: string) => {
    const element = bodyRef.current;
    // 引用ブロックは独立した行にしたいので、前後に改行を足す。
    const isBlock = mark.startsWith("{{");
    if (!element) {
      setBody((current) => current + (isBlock ? `\n\n${mark}\n\n` : mark));
      return;
    }
    const start = element.selectionStart;
    const end = element.selectionEnd;
    const before = body.slice(0, start);
    const after = body.slice(end);
    const inserted = isBlock
      ? `${before.endsWith("\n\n") || before === "" ? "" : "\n\n"}${mark}\n\n`
      : mark;
    const next = before + inserted + after;
    setBody(next);
    const caret = before.length + inserted.length;
    requestAnimationFrame(() => {
      element.focus();
      element.setSelectionRange(caret, caret);
    });
    if (isMobile) setMobileTab("body");
  };

  const toggleTag = (tagId: string) => {
    setTagIds((current) => {
      if (current.includes(tagId)) {
        setTagNotice(null);
        return current.filter((value) => value !== tagId);
      }
      if (current.length >= MAX_TAGS) {
        setTagNotice(t.articleTopicsLimitNotice(MAX_TAGS));
        return current;
      }
      setTagNotice(null);
      return [...current, tagId];
    });
  };

  const handleDelete = async () => {
    if (deleteBusy) return;
    setDeleteBusy(true);
    setActionError(null);
    try {
      await deleteArticle(id);
      router.push("/articles");
    } catch {
      setActionError(t.articleDeleteFailed);
      setDeleteBusy(false);
      setConfirmDelete(false);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="page page-full">
        <SkeletonList count={4} />
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="page page-narrow">
        <p className="text-muted">{error ?? t.articleCannotEdit}</p>
        <Link href="/articles" className="text-accent">
          {t.articleBackToList}
        </Link>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="page page-narrow">
        <p className="text-muted">{t.articleEditLoginRequired}</p>
        <Link href={`/login?from=${encodeURIComponent(`/articles/${id}/edit`)}`} className="text-accent">
          {t.login}
        </Link>
      </div>
    );
  }

  if (user.username !== article.owner_username) {
    return (
      <div className="page page-narrow">
        <p className="text-muted">{t.articleNotOwner}</p>
      </div>
    );
  }

  const canPublish = summary.trim().length > 0;
  const bodyPane = (
    <div style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
      <label htmlFor="article-body" style={fieldLabelStyle}>{t.articleTabBody}</label>
      <textarea
        id="article-body"
        ref={bodyRef}
        value={body}
        onChange={(event) => setBody(event.target.value)}
        placeholder={t.articleBodyPlaceholder}
        aria-describedby="article-markdown-help"
        style={{
          width: "100%",
          minHeight: isMobile ? 360 : 480,
          boxSizing: "border-box",
          padding: 14,
          borderRadius: 10,
          border: "1px solid var(--border)",
          background: "var(--bg)",
          color: "var(--text)",
          fontFamily: "inherit",
          fontSize: 16,
          lineHeight: 1.8,
          resize: "vertical",
        }}
      />
      <details id="article-markdown-help" style={{ marginTop: 8, color: "var(--text-muted)", fontSize: 12 }}>
        <summary style={{ cursor: "pointer", minHeight: 44, display: "flex", alignItems: "center" }}>{t.articleFormatHelp}</summary>
        <p style={{ margin: "4px 0 0", lineHeight: 1.7 }}>
          {t.articleFormatDescription}
        </p>
      </details>
    </div>
  );
  const previewPane = (
    <div
      style={{
        flex: 1,
        minHeight: isMobile ? 360 : 480,
        border: "1px solid var(--border)",
        borderRadius: 10,
        padding: 14,
        background: "rgba(255,255,255,0.02)",
      }}
    >
      <ArticleBody body={body} citations={citations} />
    </div>
  );
  const citationPane = (
    <div
      style={{
        border: "1px solid var(--border)",
        borderRadius: 10,
        height: isMobile ? 480 : "100%",
        minHeight: 0,
        overflow: "hidden",
      }}
    >
      <CitationPanel onInsert={insertMark} />
    </div>
  );

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto", padding: "24px 16px 48px" }}>
      <ConfirmDialog
        open={confirmDelete}
        title={t.articleDeleteConfirmTitle}
        description={t.articleDeleteConfirmDesc}
        confirmText={t.articleDeleteAction}
        destructive
        onConfirm={handleDelete}
        onCancel={() => !deleteBusy && setConfirmDelete(false)}
      />
      <ConfirmDialog
        open={pendingVisibility !== null}
        title={t.articleVisibilityConfirmTitle}
        description={pendingVisibility === "public"
          ? t.articleVisibilityPublicConfirmDesc
          : t.articleVisibilityUnlistedConfirmDesc}
        confirmText={t.articleVisibilityConfirmAction}
        onConfirm={() => {
          if (pendingVisibility) setVisibility(pendingVisibility);
          setPendingVisibility(null);
        }}
        onCancel={() => setPendingVisibility(null)}
      />

      {/* 題と公開範囲 */}
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}>
        <label htmlFor="article-title" style={visuallyHiddenStyle}>{t.articleTitleLabel}</label>
        <input
          id="article-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder={t.articleTitleLabel}
          maxLength={MAX_TITLE_LENGTH}
          required
          aria-invalid={!title.trim()}
          aria-describedby={!title.trim() ? "article-title-error" : undefined}
          style={{
            flex: "1 1 280px",
            padding: "10px 12px",
            borderRadius: 8,
            border: "1px solid var(--border)",
            background: "var(--bg)",
            color: "var(--text)",
            fontFamily: "inherit",
            fontSize: 18,
            fontWeight: 700,
          }}
        />
        <label htmlFor="article-visibility" style={visuallyHiddenStyle}>{t.articleVisibilityLabel}</label>
        <select
          id="article-visibility"
          value={visibility}
          onChange={(event) => {
            const next = event.target.value as ArticleVisibility;
            if (next === "private") setVisibility(next);
            else setPendingVisibility(next);
          }}
          style={selectStyle}
        >
          {visibilityOptions(t).map((option) => (
            <option key={option.value} value={option.value} disabled={option.value !== "private" && !canPublish}>
              {option.label}
            </option>
          ))}
        </select>
        <span
          role="status"
          aria-live="polite"
          style={{ fontSize: 12, color: autosave.status === "error" ? "var(--state-danger)" : "var(--text-muted)", minWidth: 120 }}
        >
          {saveStatusLabel(autosave.status, t)}
        </span>
        {autosave.status === "error" && (
          <button type="button" onClick={() => void autosave.retry()} style={secondaryButtonStyle}>{t.retry}</button>
        )}
        <Link href={`/articles/${id}`} style={{ fontSize: 13, color: "var(--text-muted)", textDecoration: "none" }}>
          {t.articleView}
        </Link>
        <button type="button" onClick={() => setConfirmDelete(true)} disabled={deleteBusy} style={deleteButtonStyle}>
          {deleteBusy ? t.articleDeleting : t.delete}
        </button>
      </div>
      {actionError && <p role="alert" style={{ margin: "-4px 0 12px", color: "var(--state-danger)", fontSize: 13 }}>{actionError}</p>}

      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, margin: "-4px 0 10px", fontSize: 12, color: "var(--text-muted)" }}>
        <span id={!title.trim() ? "article-title-error" : undefined} style={{ color: !title.trim() ? "var(--state-danger)" : undefined }}>
          {!title.trim() ? t.articleTitleRequired : t.articleAutosaveHelp}
        </span>
        <span>{title.length}/{MAX_TITLE_LENGTH}</span>
      </div>

      {/* 要約 */}
      <label htmlFor="article-summary" style={fieldLabelStyle}>{t.articleSummaryLabel}</label>
      <input
        id="article-summary"
        value={summary}
        onChange={(event) => setSummary(event.target.value)}
        placeholder={t.articleSummaryPlaceholder}
        maxLength={MAX_SUMMARY_LENGTH}
        style={{
          width: "100%",
          boxSizing: "border-box",
          padding: "8px 12px",
          borderRadius: 8,
          border: "1px solid var(--border)",
          background: "var(--bg)",
          color: "var(--text)",
          fontFamily: "inherit",
          fontSize: 14,
          marginBottom: 10,
        }}
      />
      <div style={{ textAlign: "right", margin: "-6px 0 8px", fontSize: 12, color: "var(--text-muted)" }}>
        {summary.length}/{MAX_SUMMARY_LENGTH}
      </div>
      {!canPublish && (
        <p style={{ fontSize: 12, color: "var(--text-faint)", margin: "0 0 10px" }}>
          {t.articleSummaryRequired}
        </p>
      )}

      {/* タグ */}
      <fieldset style={{ border: 0, padding: 0, margin: "0 0 16px" }}>
        <legend style={fieldLabelStyle}>{t.articleTopicsLimit(MAX_TAGS)}</legend>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {tags.map((tag) => {
          const active = tagIds.includes(tag.id);
          return (
            <button
              key={tag.id}
              type="button"
              onClick={() => toggleTag(tag.id)}
              aria-pressed={active}
              style={{
                border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
                background: active ? "var(--accent-tint)" : "transparent",
                color: active ? "var(--accent)" : "var(--text-muted)",
                borderRadius: 999,
                padding: "4px 12px",
                minHeight: 44,
                fontSize: 12,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              {articleTagLabel(tag.slug, tag.name, t)}
            </button>
          );
        })}
        </div>
        {tagLoadError && (
          <p role="alert" style={{ margin: "8px 0 0", color: "var(--state-danger)", fontSize: 12 }}>
            {t.articleTopicsLoadFailed} <button type="button" onClick={() => void loadTags()} style={inlineRetryStyle}>{t.retry}</button>
          </p>
        )}
        {tagNotice && <p role="status" style={{ margin: "8px 0 0", color: "var(--state-danger)", fontSize: 12 }}>{tagNotice}</p>}
      </fieldset>

      {isMobile ? (
        <div>
          <div role="tablist" aria-label={t.articleEditTabsLabel} onKeyDown={handleTabArrowKey} style={{ display: "flex", borderBottom: "1px solid var(--border)", marginBottom: 12 }}>
            <MobileTab id="body" active={mobileTab === "body"} onClick={() => setMobileTab("body")}>
              {t.articleTabBody}
            </MobileTab>
            <MobileTab id="preview" active={mobileTab === "preview"} onClick={() => setMobileTab("preview")}>
              {t.articleTabPreview}
            </MobileTab>
            <MobileTab id="citations" active={mobileTab === "citations"} onClick={() => setMobileTab("citations")}>
              {t.articleTabCitations}
            </MobileTab>
          </div>
          <div role="tabpanel" id={`article-${mobileTab}-panel`} aria-labelledby={`article-${mobileTab}-tab`}>
            {mobileTab === "body" && bodyPane}
            {mobileTab === "preview" && previewPane}
            {mobileTab === "citations" && citationPane}
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(320px, 380px)", gap: 20, alignItems: "start" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 20, minHeight: 0 }}>
            {bodyPane}
            <div style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
              <div style={fieldLabelStyle}>{t.articleTabPreview}</div>
              {previewPane}
            </div>
          </div>
          <div style={{ position: "sticky", top: "calc(var(--navbar-height) + 16px)", height: "min(720px, calc(100vh - var(--navbar-height) - 32px))" }}>
            {citationPane}
          </div>
        </div>
      )}
    </div>
  );
}

function MobileTab({
  id,
  active,
  onClick,
  children,
}: {
  id: "body" | "preview" | "citations";
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      id={`article-${id}-tab`}
      type="button"
      role="tab"
      aria-selected={active}
      aria-controls={`article-${id}-panel`}
      tabIndex={active ? 0 : -1}
      onClick={onClick}
      style={{
        flex: 1,
        padding: "10px 8px",
        minHeight: 44,
        border: "none",
        background: "none",
        borderBottom: active ? "2px solid var(--accent)" : "2px solid transparent",
        color: active ? "var(--accent)" : "var(--text-muted)",
        fontWeight: active ? 700 : 400,
        fontSize: 13,
        cursor: "pointer",
        fontFamily: "inherit",
      }}
    >
      {children}
    </button>
  );
}

const selectStyle: React.CSSProperties = {
  padding: "8px 10px",
  minHeight: 44,
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "var(--bg)",
  color: "var(--text)",
  fontFamily: "inherit",
  fontSize: 13,
};

const deleteButtonStyle: React.CSSProperties = {
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

const secondaryButtonStyle: React.CSSProperties = {
  border: "1px solid var(--border)",
  borderRadius: 8,
  background: "transparent",
  color: "var(--text)",
  minHeight: 44,
  padding: "8px 14px",
  cursor: "pointer",
  fontFamily: "inherit",
};

const inlineRetryStyle: React.CSSProperties = {
  border: 0,
  background: "transparent",
  color: "var(--accent)",
  minHeight: 44,
  padding: "8px 6px",
  cursor: "pointer",
  fontFamily: "inherit",
  textDecoration: "underline",
};

const fieldLabelStyle: React.CSSProperties = {
  display: "block",
  color: "var(--text-muted)",
  fontSize: 13,
  fontWeight: 700,
  marginBottom: 6,
};

const visuallyHiddenStyle: React.CSSProperties = {
  position: "absolute",
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap",
  border: 0,
};

function handleTabArrowKey(event: React.KeyboardEvent<HTMLElement>) {
  if (event.key !== "ArrowLeft" && event.key !== "ArrowRight" && event.key !== "Home" && event.key !== "End") return;
  const tabs = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
  if (tabs.length === 0) return;
  const current = tabs.indexOf(document.activeElement as HTMLButtonElement);
  let next = current;
  if (event.key === "Home") next = 0;
  else if (event.key === "End") next = tabs.length - 1;
  else if (event.key === "ArrowRight") next = (Math.max(current, 0) + 1) % tabs.length;
  else next = (current <= 0 ? tabs.length : current) - 1;
  event.preventDefault();
  tabs[next]?.focus();
  tabs[next]?.click();
}
