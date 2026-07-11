"use client";

import { useState } from "react";
import { createBookmark, removeBookmark, createComment, buildCommentTree, type Verse, type Bookmark } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useComments } from "@/hooks/useComments";
import { CommentInput } from "@/components/comments/CommentInput";
import { CommentItem } from "@/components/comments/CommentItem";
import { LoginRequiredModal } from "@/components/ui/LoginRequiredModal";
import { Icon } from "@/components/ui/Icon";
import { useT } from "@/lib/i18n";

type Props = {
  verse: Verse;
  onClose: () => void;
  chapterNumber: number;
  commentBookmarkMap?: Record<string, string>;
  verseBookmarks?: Bookmark[];
  onVerseBookmarksChange?: (bookmarks: Bookmark[]) => void;
  // 栞判定に使う訳非依存の書 slug（箇所一致に必要）。
  bookSlug?: string;
  // 翻訳プロジェクトの読書ページから開いた場合、その翻訳専用のコメントとして扱う。
  translationProject?: string;
  // 全バージョン表示用：この節の全バージョンの節id。2件以上でトグルを表示。
  allVersionVerseIds?: string[];
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
  bookSlug,
  translationProject,
  allVersionVerseIds,
}: Props) {
  const t = useT();
  const { user } = useAuth();
  const [ordering, setOrdering] = useState<"new" | "votes">("new");
  const [showAll, setShowAll] = useState(false);
  const [panelWidth, setPanelWidth] = useState(DEFAULT_WIDTH);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingBookmark, setLoadingBookmark] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [verseExpanded, setVerseExpanded] = useState(false);

  // 全バージョンが2件以上あるときだけ「すべて表示」が意味を持つ。
  const canShowAll = (allVersionVerseIds?.length ?? 0) > 1;
  const useAll = showAll && canShowAll;

  const { comments, setComments, loading, reload } = useComments({
    verse_id: useAll ? undefined : verse.id,
    verse_ids: useAll ? allVersionVerseIds : undefined,
    all_versions: useAll,
    ordering,
    translation_project: useAll ? undefined : translationProject,
  });

  // 栞は訳非依存の箇所（book slug / 章 / 節）で判定する。これにより、口語訳で付けた栞が
  // KJV など別の訳を表示していても「ブックマーク済み」として扱われる（訳跨ぎハイライト）。
  const bookmarkByLocation = new Map(
    verseBookmarks
      .filter((bm): bm is typeof bm & { reference: NonNullable<typeof bm.reference> } => bm.reference !== null)
      .map((bm) => [`${bm.reference.book}/${bm.reference.chapter}/${bm.reference.verse}`, bm])
  );
  const locationKey = bookSlug ? `${bookSlug}/${chapterNumber}/${verse.number}` : null;
  const existingBookmark = locationKey ? bookmarkByLocation.get(locationKey) : undefined;
  const isBookmarked = existingBookmark !== undefined;

  const handleBookmark = async () => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }
    if (loadingBookmark || !onVerseBookmarksChange) return;
    setLoadingBookmark(true);
    try {
      if (existingBookmark) {
        await removeBookmark(existingBookmark.id);
        onVerseBookmarksChange(verseBookmarks.filter((bm) => bm.id !== existingBookmark.id));
      } else {
        const bm = await createBookmark(verse.id);
        onVerseBookmarksChange([...verseBookmarks, bm]);
      }
    } finally {
      setLoadingBookmark(false);
    }
  };

  const handleSubmit = async (body: string, isQa?: boolean, tagIds?: string[], title?: string) => {
    const comment = await createComment({ verse: verse.id, title, body, is_qa: isQa, tag_ids: tagIds, translation_project: translationProject });
    setComments((prev) => [comment, ...prev]);
    setComposeOpen(false);
  };

  const handleOpenCompose = () => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }
    setComposeOpen(true);
  };

  const handleReply = async (body: string, parentId: string) => {
    const comment = await createComment({ verse: verse.id, body, parent: parentId, translation_project: translationProject });
    setComments((prev) => [...prev, comment]);
  };

  // 別の節を選び直したら本文の展開状態をリセットする（パネルは再利用される）。
  // 描画中に prop の変化を検知してリセットする（effect 内 setState を避ける）。
  const [prevVerseId, setPrevVerseId] = useState(verse.id);
  if (verse.id !== prevVerseId) {
    setPrevVerseId(verse.id);
    setVerseExpanded(false);
    setShowAll(false);
  }

  const q = searchQuery.trim().toLowerCase();
  const filteredComments = q
    ? comments.filter((c) => c.body.toLowerCase().includes(q))
    : comments;
  const tree = buildCommentTree(filteredComments);

  // 本文が長いときは省略しつつ、折り畳みで全文展開できるようにする。
  const VERSE_PREVIEW_LEN = 90;
  const verseIsLong = verse.text.length > VERSE_PREVIEW_LEN;
  const verseShown =
    verseExpanded || !verseIsLong ? verse.text : `${verse.text.slice(0, VERSE_PREVIEW_LEN)}…`;

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

  const handleResizeTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (!touch) return;
    const startX = touch.clientX;
    const startWidth = panelWidth;
    const onMove = (ev: TouchEvent) => {
      const t = ev.touches[0];
      if (!t) return;
      const delta = startX - t.clientX;
      setPanelWidth(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth + delta)));
    };
    const onEnd = () => {
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
      window.removeEventListener("touchcancel", onEnd);
    };
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onEnd);
    window.addEventListener("touchcancel", onEnd);
  };

  return (
    <>
      {showLoginModal && <LoginRequiredModal onClose={() => setShowLoginModal(false)} />}
      <div
        className="comment-panel"
        style={{
          width: panelWidth,
          minWidth: MIN_WIDTH,
          background: "var(--glass-bg)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderLeft: "1px solid var(--glass-border)",
          height: "calc(100vh - var(--navbar-height))",
          position: "sticky",
          top: "var(--navbar-height)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* ドラッグリサイズハンドル (マウス + タッチ対応) */}
        <div
          className="resize-handle"
          role="separator"
          aria-orientation="vertical"
          onMouseDown={handleResizeStart}
          onTouchStart={handleResizeTouchStart}
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: 6,
            cursor: "ew-resize",
            touchAction: "none",
            zIndex: 10,
          }}
        />

        {/* Header */}
        <div
          style={{
            padding: "12px 16px",
            borderBottom: "1px solid var(--glass-border)",
          }}
        >
          {/* ラベルと操作ボタンを同じ行（同じ高さ）に置く。
              本文はその下に全幅で広げ、展開時のスクロールバーをパネル右端に出す。 */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
            }}
          >
            <span
              className="badge"
              style={{
                background: "var(--accent-tint)",
                color: "var(--accent)",
                fontSize: 12,
              }}
            >
              {t.chapterVerseHeader(chapterNumber, verse.number)}
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
              {user && onVerseBookmarksChange && (
                <button
                  onClick={handleBookmark}
                  disabled={loadingBookmark}
                  data-testid="verse-bookmark"
                  aria-pressed={isBookmarked}
                  aria-label={isBookmarked ? t.bookmarkRemove : t.bookmarkAdd}
                  title={isBookmarked ? t.bookmarkRemove : t.bookmarkAdd}
                  style={{
                    border: "none",
                    width: 36,
                    height: 36,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "transparent",
                    color: isBookmarked ? "var(--accent)" : "var(--text-muted)",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    padding: 0,
                    filter: isBookmarked ? "drop-shadow(0 0 4px var(--accent))" : undefined,
                  }}
                >
                  <Icon name="bookmark" size={16} fill={isBookmarked ? "currentColor" : "none"} />
                </button>
              )}
              <button
                onClick={onClose}
                aria-label={t.closeCommentPanel}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-faint)",
                  fontSize: 22,
                  lineHeight: 1,
                  width: 36,
                  height: 36,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 0,
                  borderRadius: 6,
                }}
              >
                ×
              </button>
            </div>
          </div>

          <p
            style={{
              margin: "8px 0 0",
              fontSize: 13,
              color: "var(--text-muted)",
              lineHeight: 1.6,
              maxHeight: verseExpanded ? "40vh" : undefined,
              overflowY: verseExpanded ? "auto" : undefined,
              whiteSpace: "pre-wrap",
            }}
          >
            「{verseShown}」
          </p>
          {verseIsLong && (
            <button
              type="button"
              onClick={() => setVerseExpanded((v) => !v)}
              aria-expanded={verseExpanded}
              style={{
                marginTop: 4,
                padding: 0,
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: "var(--accent)",
                fontSize: 12,
                fontWeight: 700,
                fontFamily: "inherit",
              }}
            >
              {verseExpanded ? t.readLessVerse : t.readMoreVerse}
            </button>
          )}
        </div>

        {/* Comment input (デフォルト折りたたみで読書圧を減らす) */}
        <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--glass-border)" }}>
          {composeOpen ? (
            <CommentInput
              onSubmit={handleSubmit}
              onCancel={() => setComposeOpen(false)}
              placeholder={t.verseCommentInput}
              submitLabel={t.submitComment}
              showQaOption
              showTagOption
              autoFocus
            />
          ) : (
            <button
              type="button"
              onClick={handleOpenCompose}
              className="card-glow card-glow-interactive"
              style={{
                width: "100%",
                padding: "11px 14px",
                minHeight: 44,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                color: "var(--text)",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 700,
                fontFamily: "inherit",
              }}
            >
              <Icon name="message-square" size={16} />
              {t.writeCommentCta}
            </button>
          )}
        </div>

        {/* Ordering toggle */}
        <div style={{ padding: "8px 16px", borderBottom: "1px solid var(--glass-border)", display: "flex", gap: 8 }}>
          {canShowAll && (
            <button
              onClick={() => setShowAll((v) => !v)}
              aria-pressed={showAll}
              style={{
                fontSize: 12,
                padding: "3px 10px",
                borderRadius: 12,
                border: "1px solid var(--border)",
                cursor: "pointer",
                background: showAll ? "var(--accent)" : "transparent",
                color: showAll ? "var(--accent-text)" : "var(--text-faint)",
                fontFamily: "inherit",
                whiteSpace: "nowrap",
              }}
            >
              {t.allVersionsToggle}
            </button>
          )}
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
              {ord === "new" ? t.orderNew : t.orderVotes}
            </button>
          ))}
        </div>

        {/* Search */}
        <div style={{ padding: "8px 16px", borderBottom: "1px solid var(--glass-border)" }}>
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.searchComments}
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
              {t.loading}
            </p>
          ) : tree.length === 0 ? (
            <p style={{ color: "var(--text-faint)", fontSize: 13, padding: "16px 0" }}>
              {t.noCommentsYet}
            </p>
          ) : (
            tree.map((node) => (
              <CommentItem
                key={node.id}
                comment={node}
                onReply={handleReply}
                onRefresh={reload}
                initialBookmarkId={commentBookmarkMap[node.id]}
                showVersionBadge={useAll}
              />
            ))
          )}
        </div>
      </div>
    </>
  );
}
