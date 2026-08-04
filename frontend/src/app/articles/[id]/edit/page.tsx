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
    <div className="flex flex-col min-h-0">
      <label htmlFor="article-body" className="form-label">{t.articleTabBody}</label>
      <textarea
        id="article-body"
        ref={bodyRef}
        value={body}
        onChange={(event) => setBody(event.target.value)}
        placeholder={t.articleBodyPlaceholder}
        aria-describedby="article-markdown-help"
        className="editor-pane w-full"
      />
      <details id="article-markdown-help" className="mt-2 text-muted text-xs">
        <summary className="cursor-pointer tap-target flex items-center">{t.articleFormatHelp}</summary>
        <p className="mt-1 mx-0 mb-0 leading-reading">
          {t.articleFormatDescription}
        </p>
      </details>
    </div>
  );
  const previewPane = (
    <div
      className="editor-preview"
    >
      <ArticleBody body={body} citations={citations} />
    </div>
  );
  const citationPane = (
    <div
      className="border border-border rounded-lg overflow-hidden min-h-0"
      style={{ height: isMobile ? 480 : "100%" }}
    >
      <CitationPanel onInsert={insertMark} />
    </div>
  );

  return (
    <div className="page page-editor">
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
      <div className="flex gap-3 items-center flex-wrap mb-3">
        <label htmlFor="article-title" className="sr-only">{t.articleTitleLabel}</label>
        <input
          id="article-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder={t.articleTitleLabel}
          maxLength={MAX_TITLE_LENGTH}
          required
          aria-invalid={!title.trim()}
          aria-describedby={!title.trim() ? "article-title-error" : undefined}
          className="form-control text-lg font-bold"
          style={{ flex: "1 1 280px" }}
        />
        <label htmlFor="article-visibility" className="sr-only">{t.articleVisibilityLabel}</label>
        <select
          id="article-visibility"
          value={visibility}
          onChange={(event) => {
            const next = event.target.value as ArticleVisibility;
            if (next === "private") setVisibility(next);
            else setPendingVisibility(next);
          }}
          className="select-md"
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
          className={`text-xs min-w-30 ${autosave.status === "error" ? "text-danger" : "text-muted"}`}
        >
          {saveStatusLabel(autosave.status, t)}
        </span>
        {autosave.status === "error" && (
          <button type="button" onClick={() => void autosave.retry()} className="outline-button">{t.retry}</button>
        )}
        <Link href={`/articles/${id}`} className="text-sm text-muted no-underline">
          {t.articleView}
        </Link>
        <button type="button" onClick={() => setConfirmDelete(true)} disabled={deleteBusy} className="outline-button outline-button-muted">
          {deleteBusy ? t.articleDeleting : t.delete}
        </button>
      </div>
      {actionError && <p role="alert" className="-mt-1 mx-0 mb-3 text-danger text-sm">{actionError}</p>}

      <div className="flex justify-between gap-3 -mt-1 mx-0 mb-3 text-xs text-muted">
        <span id={!title.trim() ? "article-title-error" : undefined} className={!title.trim() ? "text-danger" : undefined}>
          {!title.trim() ? t.articleTitleRequired : t.articleAutosaveHelp}
        </span>
        <span>{title.length}/{MAX_TITLE_LENGTH}</span>
      </div>

      {/* 要約 */}
      <label htmlFor="article-summary" className="form-label">{t.articleSummaryLabel}</label>
      <input
        id="article-summary"
        value={summary}
        onChange={(event) => setSummary(event.target.value)}
        placeholder={t.articleSummaryPlaceholder}
        maxLength={MAX_SUMMARY_LENGTH}
        className="form-control text-sm mb-3"
      />
      <div className="text-right -mt-1 mx-0 mb-2 text-xs text-muted">
        {summary.length}/{MAX_SUMMARY_LENGTH}
      </div>
      {!canPublish && (
        <p className="text-xs text-faint mt-0 mx-0 mb-3">
          {t.articleSummaryRequired}
        </p>
      )}

      {/* タグ */}
      <fieldset className="border-0 p-0 mt-0 mx-0 mb-4">
        <legend className="form-label">{t.articleTopicsLimit(MAX_TAGS)}</legend>
        <div className="flex flex-wrap gap-2">
        {tags.map((tag) => {
          const active = tagIds.includes(tag.id);
          return (
            <button
              key={tag.id}
              type="button"
              onClick={() => toggleTag(tag.id)}
              aria-pressed={active}
              className={`chip chip-sm${active ? " chip-active" : ""}`}
            >
              {articleTagLabel(tag.slug, tag.name, t)}
            </button>
          );
        })}
        </div>
        {tagLoadError && (
          <p role="alert" className="mt-2 mx-0 mb-0 text-danger text-xs">
            {t.articleTopicsLoadFailed} <button type="button" onClick={() => void loadTags()} className="link-button">{t.retry}</button>
          </p>
        )}
        {tagNotice && <p role="status" className="mt-2 mx-0 mb-0 text-danger text-xs">{tagNotice}</p>}
      </fieldset>

      {isMobile ? (
        <div>
          <div role="tablist" aria-label={t.articleEditTabsLabel} onKeyDown={handleTabArrowKey} className="flex border-b border-border mb-3">
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
        <div className="editor-layout">
          <div className="flex flex-col gap-4 min-h-0">
            {bodyPane}
            <div className="flex flex-col min-h-0">
              <div className="form-label">{t.articleTabPreview}</div>
              {previewPane}
            </div>
          </div>
          <div className="editor-aside">
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
      className={`tab-underline flex-1${active ? " tab-underline-active" : ""}`}
    >
      {children}
    </button>
  );
}


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
