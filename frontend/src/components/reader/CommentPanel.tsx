"use client";

import { useState } from "react";
import {
  createBookmark,
  removeBookmark,
  createComment,
  buildCommentTree,
  fetchMyCompiledBooks,
  createCompiledVerse,
  type Verse,
  type Bookmark,
  type CompiledBook,
} from "@/lib/api";
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
}: Props) {
  const t = useT();
  const { user } = useAuth();
  const [ordering, setOrdering] = useState<"new" | "votes">("new");
  const [panelWidth, setPanelWidth] = useState(DEFAULT_WIDTH);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingBookmark, setLoadingBookmark] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [verseExpanded, setVerseExpanded] = useState(false);
  const [compilationOpen, setCompilationOpen] = useState(false);
  const [compilations, setCompilations] = useState<CompiledBook[]>([]);
  const [selectedCompilationId, setSelectedCompilationId] = useState("");
  const [compilationNote, setCompilationNote] = useState("");
  const [compilationBusy, setCompilationBusy] = useState(false);
  const [compilationMessage, setCompilationMessage] = useState<string | null>(null);

  // 段階6D: 単一 verse_id を backend が「その箇所」へ解決し、訳をまたいで同じ節のコメントを
  // 1スレッドに集約する。各コメントには「投稿時: 〜」の訳ラベルが付く（全訳トグルは廃止）。
  const { comments, setComments, loading, reload } = useComments({
    verse_id: verse.id,
    ordering,
    translation_project: translationProject,
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

  const handleOpenCompilation = async () => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }
    setCompilationMessage(null);
    setCompilationOpen((open) => !open);
    if (compilations.length === 0) {
      try {
        const list = await fetchMyCompiledBooks();
        setCompilations(list);
        setSelectedCompilationId((current) => current || list[0]?.id || "");
      } catch {
        setCompilationMessage("編纂書を取得できませんでした。");
      }
    }
  };

  const handleAddToCompilation = async () => {
    if (!selectedCompilationId || compilationBusy) return;
    setCompilationBusy(true);
    setCompilationMessage(null);
    try {
      await createCompiledVerse(selectedCompilationId, {
        source_verse: verse.id,
        curator_note: compilationNote,
      });
      setCompilationNote("");
      setCompilationMessage("未整理トレイへ追加しました。");
    } catch {
      setCompilationMessage("追加できませんでした。");
    } finally {
      setCompilationBusy(false);
    }
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
          <div style={{ marginBottom: 10 }}>
            <button
              data-testid="open-add-to-compilation"
              type="button"
              onClick={handleOpenCompilation}
              className="card-glow card-glow-interactive"
              style={{
                width: "100%",
                padding: "10px 14px",
                minHeight: 42,
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
              <Icon name="book-open" size={16} />
              編纂に追加
            </button>
            {compilationOpen && (
              <div
                style={{
                  marginTop: 8,
                  padding: 10,
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  background: "rgba(255,255,255,0.04)",
                }}
              >
                {compilations.length === 0 ? (
                  <p style={{ margin: 0, fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6 }}>
                    編纂書がまだありません。{" "}
                    <a href="/compilations/new" style={{ color: "var(--accent)", fontWeight: 700 }}>
                      新しく作成
                    </a>
                  </p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <label style={{ fontSize: 12, color: "var(--text-muted)", display: "flex", flexDirection: "column", gap: 4 }}>
                      追加先
                      <select
                        data-testid="compilation-select"
                        value={selectedCompilationId}
                        onChange={(e) => setSelectedCompilationId(e.target.value)}
                        style={{
                          width: "100%",
                          padding: "7px 8px",
                          borderRadius: 6,
                          border: "1px solid var(--border)",
                          background: "var(--bg)",
                          color: "var(--text)",
                          fontFamily: "inherit",
                          fontSize: 13,
                        }}
                      >
                        {compilations.map((book) => (
                          <option key={book.id} value={book.id}>
                            {book.title}
                          </option>
                        ))}
                      </select>
                    </label>
                    <textarea
                      data-testid="compilation-note-input"
                      value={compilationNote}
                      onChange={(e) => setCompilationNote(e.target.value)}
                      rows={3}
                      placeholder="この節への注釈（任意）"
                      style={{
                        width: "100%",
                        boxSizing: "border-box",
                        padding: "7px 8px",
                        borderRadius: 6,
                        border: "1px solid var(--border)",
                        background: "var(--bg)",
                        color: "var(--text)",
                        fontFamily: "inherit",
                        fontSize: 13,
                        resize: "vertical",
                      }}
                    />
                    <button
                      data-testid="add-to-compilation-button"
                      type="button"
                      onClick={handleAddToCompilation}
                      disabled={!selectedCompilationId || compilationBusy}
                      style={{
                        border: "none",
                        borderRadius: 6,
                        background: "var(--accent)",
                        color: "var(--accent-text)",
                        fontWeight: 700,
                        fontSize: 13,
                        padding: "8px 10px",
                        cursor: compilationBusy ? "default" : "pointer",
                        opacity: compilationBusy ? 0.7 : 1,
                        fontFamily: "inherit",
                      }}
                    >
                      {compilationBusy ? "追加中..." : "未整理トレイへ追加"}
                    </button>
                  </div>
                )}
                {compilationMessage && (
                  <p style={{ margin: "8px 0 0", fontSize: 12, color: "var(--text-muted)" }}>
                    {compilationMessage}
                  </p>
                )}
              </div>
            )}
          </div>
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
                showVersionBadge
              />
            ))
          )}
        </div>
      </div>
    </>
  );
}
