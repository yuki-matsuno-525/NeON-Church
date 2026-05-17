"use client";

import { useState, useEffect } from "react";
import { createComment, buildCommentTree, type Verse } from "@/lib/api";
import { useComments } from "@/hooks/useComments";
import { CommentInput } from "@/components/comments/CommentInput";
import { CommentItem } from "@/components/comments/CommentItem";

type Props = {
  verse: Verse;
  onClose: () => void;
  chapterNumber: number;
  commentBookmarkMap?: Record<string, string>;
};

const MIN_WIDTH = 280;
const MAX_WIDTH = 640;
const DEFAULT_WIDTH = 360;

export function CommentPanel({ verse, onClose, chapterNumber, commentBookmarkMap = {} }: Props) {
  const [ordering, setOrdering] = useState<"new" | "votes">("new");
  const [isMobile, setIsMobile] = useState(false);
  const [panelWidth, setPanelWidth] = useState(DEFAULT_WIDTH);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  const { comments, setComments, loading, reload } = useComments({
    verse_id: verse.id,
    ordering,
  });

  const handleSubmit = async (body: string, isQa?: boolean, tagIds?: string[]) => {
    const comment = await createComment({ verse: verse.id, body, is_qa: isQa, tag_ids: tagIds });
    setComments((prev) => [comment, ...prev]);
  };

  const handleReply = async (body: string, parentId: string) => {
    const comment = await createComment({ verse: verse.id, body, parent: parentId });
    setComments((prev) => [...prev, comment]);
  };

  const q = searchQuery.trim().toLowerCase();
  const filteredComments = q
    ? comments.filter((c) => c.body.toLowerCase().includes(q))
    : comments;
  const tree = buildCommentTree(filteredComments);

  const handleResizeStart = (e: React.MouseEvent) => {
    if (isMobile) return;
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = panelWidth;
    const onMove = (ev: MouseEvent) => {
      const delta = startX - ev.clientX;
      setPanelWidth(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth + delta)));
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const mobileStyle: React.CSSProperties = isMobile ? {
    position: "fixed",
    inset: 0,
    top: "var(--navbar-height)",
    width: "100%",
    minWidth: "unset",
    height: "calc(100vh - var(--navbar-height))",
    zIndex: 100,
  } : {};

  return (
    <div
      className="comment-panel"
      style={{
        width: isMobile ? "100%" : panelWidth,
        minWidth: isMobile ? "unset" : MIN_WIDTH,
        background: "var(--bg-alt)",
        borderLeft: "1px solid var(--border)",
        height: "calc(100vh - var(--navbar-height))",
        position: "sticky",
        top: "var(--navbar-height)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        ...mobileStyle,
      }}
    >
      {/* ドラッグリサイズハンドル（デスクトップのみ） */}
      {!isMobile && (
        <div
          onMouseDown={handleResizeStart}
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: 6,
            cursor: "ew-resize",
            zIndex: 10,
          }}
        />
      )}
      {/* Header */}
      <div
        style={{
          padding: "12px 16px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <div>
          <p style={{ margin: 0, fontWeight: 700, fontSize: 13 }}>
            第{chapterNumber}章 {verse.number}節
          </p>
          <p
            style={{
              margin: "4px 0 0",
              fontSize: 13,
              color: "var(--text-muted)",
              lineHeight: 1.5,
            }}
          >
            「{verse.text.slice(0, 60)}{verse.text.length > 60 ? "…" : ""}」
          </p>
        </div>
        <button
          onClick={onClose}
          aria-label="閉じる"
          style={{
            background: "transparent",
            border: "none",
            cursor: "pointer",
            color: "var(--text-faint)",
            fontSize: 18,
            lineHeight: 1,
            padding: 0,
            flexShrink: 0,
          }}
        >
          ×
        </button>
      </div>

      {/* Comment input */}
      <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)" }}>
        <CommentInput onSubmit={handleSubmit} placeholder="この節へのコメント..." submitLabel="投稿" showQaOption showTagOption />
      </div>

      {/* Ordering toggle */}
      <div style={{ padding: "8px 16px", borderBottom: "1px solid var(--border)", display: "flex", gap: 8 }}>
        {(["new", "votes"] as const).map((ord) => (
          <button
            key={ord}
            onClick={() => setOrdering(ord)}
            style={{
              fontSize: 12,
              padding: "3px 10px",
              borderRadius: 12,
              border: "1px solid var(--border)",
              cursor: "pointer",
              background: ordering === ord ? "var(--accent)" : "transparent",
              color: ordering === ord ? "var(--accent-text)" : "var(--text-faint)",
              fontFamily: "inherit",
            }}
          >
            {ord === "new" ? "新しい順" : "人気順"}
          </button>
        ))}
      </div>

      {/* Search */}
      <div style={{ padding: "8px 16px", borderBottom: "1px solid var(--border)" }}>
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="コメントを検索..."
          style={{
            width: "100%",
            padding: "5px 10px",
            fontSize: 12,
            border: "1px solid var(--border)",
            borderRadius: 6,
            background: "var(--bg)",
            color: "var(--text)",
            fontFamily: "inherit",
            outline: "none",
            boxSizing: "border-box",
          }}
        />
      </div>

      {/* Comment list */}
      <div style={{ flex: 1, overflowY: "auto", padding: "0 16px" }}>
        {loading ? (
          <p style={{ color: "var(--text-faint)", fontSize: 13, padding: "16px 0" }}>
            読み込み中...
          </p>
        ) : tree.length === 0 ? (
          <p style={{ color: "var(--text-faint)", fontSize: 13, padding: "16px 0" }}>
            コメントはまだありません
          </p>
        ) : (
          tree.map((node) => (
            <CommentItem
              key={node.id}
              comment={node}
              onReply={handleReply}
              onRefresh={reload}
              initialBookmarkId={commentBookmarkMap[node.id]}
            />
          ))
        )}
      </div>
    </div>
  );
}
