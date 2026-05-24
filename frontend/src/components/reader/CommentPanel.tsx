"use client";

import { useState } from "react";
import { createBookmark, removeBookmark, createComment, buildCommentTree, type Verse, type Bookmark } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useComments } from "@/hooks/useComments";
import { CommentInput } from "@/components/comments/CommentInput";
import { CommentItem } from "@/components/comments/CommentItem";
import { LoginRequiredModal } from "@/components/ui/LoginRequiredModal";

type Props = {
  verse: Verse;
  onClose: () => void;
  chapterNumber: number;
  commentBookmarkMap?: Record<string, string>;
  verseBookmarks?: Bookmark[];
  onVerseBookmarksChange?: (bookmarks: Bookmark[]) => void;
};

const MIN_WIDTH = 280;
const MAX_WIDTH = 640;
const DEFAULT_WIDTH = 360;

export function CommentPanel({
  verse,
  onClose,
  chapterNumber,
  commentBookmarkMap = {},
  verseBookmarks = [],
  onVerseBookmarksChange,
}: Props) {
  const { user } = useAuth();
  const [ordering, setOrdering] = useState<"new" | "votes">("new");
  const [panelWidth, setPanelWidth] = useState(DEFAULT_WIDTH);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingBookmark, setLoadingBookmark] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  const { comments, setComments, loading, reload } = useComments({
    verse_id: verse.id,
    ordering,
  });

  const bookmarkMap = new Map(
    verseBookmarks
      .filter((bm): bm is typeof bm & { verse_detail: NonNullable<typeof bm.verse_detail> } => bm.verse_detail !== null)
      .map((bm) => [bm.verse_detail.id, bm])
  );
  const isBookmarked = bookmarkMap.has(verse.id);

  const handleBookmark = async () => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }
    if (loadingBookmark || !onVerseBookmarksChange) return;
    setLoadingBookmark(true);
    try {
      const existing = bookmarkMap.get(verse.id);
      if (existing) {
        await removeBookmark(existing.id);
        onVerseBookmarksChange(verseBookmarks.filter((bm) => bm.id !== existing.id));
      } else {
        const bm = await createBookmark(verse.id);
        onVerseBookmarksChange([...verseBookmarks, bm]);
      }
    } finally {
      setLoadingBookmark(false);
    }
  };

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

  return (
    <>
      {showLoginModal && <LoginRequiredModal onClose={() => setShowLoginModal(false)} />}
      <div
        className="comment-panel"
        style={{
          width: panelWidth,
          minWidth: MIN_WIDTH,
          background: "var(--bg-alt)",
          borderLeft: "1px solid var(--border)",
          height: "calc(100vh - var(--navbar-height))",
          position: "sticky",
          top: "var(--navbar-height)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* ドラッグリサイズハンドル */}
        <div
          className="resize-handle"
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
          <div style={{ flex: 1, minWidth: 0 }}>
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
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <button
              onClick={handleBookmark}
              disabled={loadingBookmark}
              aria-label={isBookmarked ? "お気に入りを解除" : "お気に入りに追加"}
              style={{
                border: "1px solid var(--border)",
                borderRadius: 6,
                padding: "4px 12px",
                background: isBookmarked ? "var(--accent-tint)" : "transparent",
                color: isBookmarked ? "var(--accent)" : "var(--text-muted)",
                cursor: "pointer",
                fontSize: 12,
                fontFamily: "inherit",
              }}
            >
              {isBookmarked ? "解除" : "お気に入り"}
            </button>
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
              }}
            >
              ×
            </button>
          </div>
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
    </>
  );
}
