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
import { VISIBILITY_OPTIONS } from "@/lib/articles";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useAutosave, saveStatusLabel } from "@/hooks/useAutosave";
import { ArticleBody } from "@/components/articles/ArticleBody";
import { CitationPanel } from "@/components/articles/CitationPanel";
import { ConfirmDialog, SkeletonList } from "@/components/ui";

const MAX_TAGS = 3;

export default function ArticleEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const [article, setArticle] = useState<Article | null>(null);
  const [tags, setTags] = useState<ArticleTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
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

  useEffect(() => {
    fetchArticleTags().then(setTags).catch(() => {});
  }, []);

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
      .catch(() => setError("この記事は編集できません。"))
      .finally(() => setLoading(false));
  }, [id]);

  const draft = useMemo(
    () => ({ title, summary, body, visibility, tag_ids: tagIds }),
    [title, summary, body, visibility, tagIds],
  );

  const handleSave = useCallback(
    async (value: typeof draft) => {
      const saved = await updateArticle(id, value);
      // 保存のたびに引用を作り直しているので、プレビューもここで最新にする。
      setCitations(saved.citations ?? []);
    },
    [id],
  );

  const status = useAutosave({ value: draft, onSave: handleSave, enabled: !loading && !error });

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
      if (current.includes(tagId)) return current.filter((value) => value !== tagId);
      if (current.length >= MAX_TAGS) return current;
      return [...current, tagId];
    });
  };

  const handleDelete = async () => {
    setConfirmDelete(false);
    try {
      await deleteArticle(id);
      router.push("/articles");
    } catch {
      setError("削除できませんでした。");
    }
  };

  if (loading) {
    return (
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 16px" }}>
        <SkeletonList count={4} />
      </div>
    );
  }

  if (error || !article) {
    return (
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "32px 16px" }}>
        <p style={{ color: "var(--text-muted)" }}>{error ?? "この記事は編集できません。"}</p>
        <Link href="/articles" style={{ color: "var(--accent)" }}>
          記事の一覧へ
        </Link>
      </div>
    );
  }

  if (user && user.username !== article.owner_username) {
    return (
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "32px 16px" }}>
        <p style={{ color: "var(--text-muted)" }}>この記事はあなたのものではありません。</p>
      </div>
    );
  }

  const canPublish = summary.trim().length > 0;
  const bodyPane = (
    <textarea
      ref={bodyRef}
      value={body}
      onChange={(event) => setBody(event.target.value)}
      placeholder={"本文を書きます。\n\n右の引用パネルから節を選ぶと、ここに引用が入ります。"}
      style={{
        width: "100%",
        flex: 1,
        minHeight: isMobile ? 320 : 0,
        boxSizing: "border-box",
        padding: 14,
        borderRadius: 10,
        border: "1px solid var(--border)",
        background: "var(--bg)",
        color: "var(--text)",
        fontFamily: "inherit",
        fontSize: 15,
        lineHeight: 1.8,
        resize: "none",
      }}
    />
  );
  const previewPane = (
    <div
      style={{
        flex: 1,
        minHeight: isMobile ? 320 : 0,
        overflowY: "auto",
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
        title="この記事を削除しますか？"
        description="記事とコメントが消えます。元には戻せません。"
        confirmText="削除する"
        destructive
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />

      {/* 題と公開範囲 */}
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}>
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="題"
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
        <select
          value={visibility}
          onChange={(event) => setVisibility(event.target.value as ArticleVisibility)}
          style={selectStyle}
        >
          {VISIBILITY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value} disabled={option.value !== "private" && !canPublish}>
              {option.label}
            </option>
          ))}
        </select>
        <span style={{ fontSize: 12, color: status === "error" ? "var(--state-error)" : "var(--text-faint)", minWidth: 80 }}>
          {saveStatusLabel(status)}
        </span>
        <Link href={`/articles/${id}`} style={{ fontSize: 13, color: "var(--text-muted)", textDecoration: "none" }}>
          記事を見る
        </Link>
        <button type="button" onClick={() => setConfirmDelete(true)} style={deleteButtonStyle}>
          削除
        </button>
      </div>

      {/* 要約 */}
      <input
        value={summary}
        onChange={(event) => setSummary(event.target.value)}
        placeholder="要約（一覧に出る短い説明。公開するには必要です）"
        maxLength={300}
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
      {!canPublish && (
        <p style={{ fontSize: 12, color: "var(--text-faint)", margin: "0 0 10px" }}>
          要約を書くと、公開できるようになります。
        </p>
      )}

      {/* タグ */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
        {tags.map((tag) => {
          const active = tagIds.includes(tag.id);
          return (
            <button
              key={tag.id}
              type="button"
              onClick={() => toggleTag(tag.id)}
              style={{
                border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
                background: active ? "var(--accent-tint)" : "transparent",
                color: active ? "var(--accent)" : "var(--text-muted)",
                borderRadius: 999,
                padding: "4px 12px",
                minHeight: 30,
                fontSize: 12,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              {tag.name}
            </button>
          );
        })}
        <span style={{ fontSize: 11, color: "var(--text-faint)", alignSelf: "center" }}>
          主題は{MAX_TAGS}つまで
        </span>
      </div>

      {isMobile ? (
        <div>
          <div style={{ display: "flex", borderBottom: "1px solid var(--border)", marginBottom: 12 }}>
            <MobileTab active={mobileTab === "body"} onClick={() => setMobileTab("body")}>
              本文
            </MobileTab>
            <MobileTab active={mobileTab === "preview"} onClick={() => setMobileTab("preview")}>
              見え方
            </MobileTab>
            <MobileTab active={mobileTab === "citations"} onClick={() => setMobileTab("citations")}>
              引用
            </MobileTab>
          </div>
          {mobileTab === "body" && bodyPane}
          {mobileTab === "preview" && previewPane}
          {mobileTab === "citations" && citationPane}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 360px", gap: 16, height: "calc(100vh - 280px)", minHeight: 480 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, minHeight: 0 }}>
            {bodyPane}
            <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
              <div style={{ fontSize: 11, color: "var(--text-faint)", marginBottom: 4 }}>見え方</div>
              {previewPane}
            </div>
          </div>
          {citationPane}
        </div>
      )}
    </div>
  );
}

function MobileTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
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
  minHeight: 40,
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
  minHeight: 40,
  cursor: "pointer",
  fontFamily: "inherit",
};
