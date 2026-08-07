"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  createBookmark,
  removeBookmark,
  createComment,
  fetchArticlesCitingVerse,
  fetchQuestionPage,
  fetchTags,
  type Verse,
  type Bookmark,
  type Article,
  type QAQuestion,
  type Tag,
} from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useComments } from "@/hooks/useComments";
import { CommentInput } from "@/components/comments/CommentInput";
import { CommentItem } from "@/components/comments/CommentItem";
import { QACard } from "@/components/qa/QACard";
import { QAPostForm } from "@/components/qa/QAPostForm";
import { useBookCatalog } from "@/lib/bookCatalog";
import { LoginRequiredModal } from "@/components/ui/LoginRequiredModal";
import { Icon } from "@/components/ui/Icon";
import { useT } from "@/lib/i18n";
import { handleHorizontalTabListKeyDown } from "@/lib/a11y";
import { LoadMoreButton, useToast } from "@/components/ui";
import { ErrorState } from "@/components/ui/ErrorState";
import { useIsMobile } from "@/hooks/useIsMobile";
import styles from "./CommentPanel.module.css";

type Props = {
  verse: Verse;
  onClose: () => void;
  chapterNumber: number;
  commentBookmarkMap?: Record<string, string>;
  verseBookmarks?: Bookmark[];
  onVerseBookmarksChange?: (bookmarks: Bookmark[]) => void;
  // お気に入り判定に使う訳非依存の書 slug（箇所一致に必要）。
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
  const toast = useToast();
  const { user } = useAuth();
  const isMobile = useIsMobile(768);
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);
  const headingId = useId();
  const commentsTabId = useId();
  const qaTabId = useId();
  const articlesTabId = useId();
  const commentsPanelId = useId();
  const qaPanelId = useId();
  const articlesPanelId = useId();
  const [ordering, setOrdering] = useState<"new" | "votes">("new");
  const [panelWidth, setPanelWidth] = useState(DEFAULT_WIDTH);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingBookmark, setLoadingBookmark] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const showLoginModalRef = useRef(showLoginModal);
  useEffect(() => {
    showLoginModalRef.current = showLoginModal;
  }, [showLoginModal]);
  const [composeOpen, setComposeOpen] = useState(false);
  const [verseExpanded, setVerseExpanded] = useState(false);
  // この節を引用している記事。1件も無いときはタブ自体を出さない
  // （どの節にも「引用した記事 (0)」が並ぶと、押しても空という体験になるため）。
  const [citingArticles, setCitingArticles] = useState<Article[]>([]);
  // この節への質問。コメントとは別のデータなので、別のタブで分けて見せる。
  const [questions, setQuestions] = useState<QAQuestion[]>([]);
  const [askOpen, setAskOpen] = useState(false);
  const [tags, setTags] = useState<Tag[]>([]);
  const catalog = useBookCatalog();
  const [tab, setTab] = useState<"comments" | "qa" | "articles">("comments");
  const [panelError, setPanelError] = useState<string | null>(null);
  const [articlesError, setArticlesError] = useState(false);

  /** この節の質問を取り直す。質問を投稿した直後にも呼ぶ。 */
  const loadQuestions = useCallback(() => {
    if (!bookSlug) {
      setQuestions([]);
      return;
    }
    fetchQuestionPage({ book_slug: bookSlug, chapter_number: chapterNumber, verse_number: verse.number })
      .then((page) => setQuestions(page.results))
      .catch(() => setQuestions([]));
  }, [bookSlug, chapterNumber, verse.number]);

  useEffect(() => {
    if (!bookSlug) return;
    let alive = true;
    // 別の節を選び直したときに前の節の記事が残らないよう、いったん空にする。
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCitingArticles([]);
    setArticlesError(false);
    setTab("comments");
    fetchArticlesCitingVerse({ book: bookSlug, chapter: chapterNumber, verse: verse.number })
      .then((response) => {
        if (alive) setCitingArticles(response.results);
      })
      .catch(() => {
        if (alive) setArticlesError(true);
      });
    loadQuestions();
    return () => {
      alive = false;
    };
    // loadQuestions は同じ箇所のあいだ変わらない（上の useCallback）。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookSlug, chapterNumber, verse.number]);

  useEffect(() => {
    fetchTags().then(setTags).catch(() => {});
  }, []);

  // 段階6D: 単一 verse_id を backend が「その箇所」へ解決し、訳をまたいで同じ節のコメントを
  // 1スレッドに集約する。各コメントには「投稿時: 〜」の訳ラベルが付く（全訳トグルは廃止）。
  const { comments, setComments, loading, loadingMore, hasMore, error, loadMoreError, loadMore, retry, reload } = useComments({
    verse_id: verse.id,
    ordering,
    translation_project: translationProject,
  });

  // お気に入りは訳非依存の箇所（book slug / 章 / 節）で判定する。これにより、口語訳で付けたお気に入りが
  // KJV など別の訳を表示していても「お気に入り済み」として扱われる（訳跨ぎハイライト）。
  // 節を選び直すたびに作り直すと重いので、お気に入りの一覧が変わったときだけ組み直す。
  const bookmarkByLocation = useMemo(
    () =>
      new Map(
        verseBookmarks
          .filter((bm): bm is typeof bm & { reference: NonNullable<typeof bm.reference> } => bm.reference !== null)
          .map((bm) => [`${bm.reference.book}/${bm.reference.chapter}/${bm.reference.verse}`, bm])
      ),
    [verseBookmarks]
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
    setPanelError(null);
    try {
      if (existingBookmark) {
        await removeBookmark(existingBookmark.id);
        onVerseBookmarksChange(verseBookmarks.filter((bm) => bm.id !== existingBookmark.id));
      } else {
        const bm = await createBookmark(verse.id);
        onVerseBookmarksChange([...verseBookmarks, bm]);
      }
    } catch {
      setPanelError(t.bookmarkFailed);
      toast.show(t.errorActionFailed, { type: "error" });
    } finally {
      setLoadingBookmark(false);
    }
  };

  const handleSubmit = async (body: string, tagIds?: string[]) => {
    const comment = await createComment({ verse: verse.id, body, tag_ids: tagIds, translation_project: translationProject });
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
    // 返信は親コメントの中に出るので、親一覧（comments）には足さない。
    // 投稿後の表示は CommentItem 側がその親の返信を取り直して行う。
    await createComment({ verse: verse.id, body, parent: parentId, translation_project: translationProject });
  };

  // 別の節を選び直したら本文の展開状態をリセットする（パネルは再利用される）。
  // 描画中に prop の変化を検知してリセットする（effect 内 setState を避ける）。
  const [prevVerseId, setPrevVerseId] = useState(verse.id);
  if (verse.id !== prevVerseId) {
    setPrevVerseId(verse.id);
    setVerseExpanded(false);
  }

  // 絞り込みは読み込み済みのコメントにだけ効く（サーバー検索ではない）。
  // 入力欄の説明文でもそう伝えている。
  const q = searchQuery.trim().toLowerCase();
  const visibleComments = q
    ? comments.filter((c) => c.body.toLowerCase().includes(q))
    : comments;

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

  const handleResizeKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      setPanelWidth(event.key === "Home" ? MIN_WIDTH : MAX_WIDTH);
      return;
    }
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      const delta = event.key === "ArrowLeft" ? 20 : -20;
      setPanelWidth((width) => Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, width + delta)));
    }
  };

  useEffect(() => {
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !showLoginModalRef.current) onCloseRef.current();
    };
    window.addEventListener("keydown", onKeyDown);
    closeRef.current?.focus();
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      previouslyFocused?.focus();
    };
  }, []);

  return (
    <>
      {showLoginModal && <LoginRequiredModal onClose={() => setShowLoginModal(false)} />}
      <div
        className={`comment-panel ${styles.panel}`}
        role={isMobile ? "dialog" : "complementary"}
        aria-modal={isMobile ? true : undefined}
        aria-labelledby={headingId}
        // 幅は利用者がドラッグで変えられる値なので、ここだけ style で渡す。
        // 画面が狭いときは下から出るシートになり幅を変えられないので、渡さない。
        // （渡すと CSS 側の「横いっぱい」に勝ってしまい、打ち消しに !important が要る）
        style={isMobile ? undefined : { width: panelWidth, minWidth: MIN_WIDTH }}
      >
        {/* ドラッグリサイズハンドル (マウス + タッチ対応) */}
        <div
          className={`resize-handle ${styles.resizeHandle}`}
          role="separator"
          aria-orientation="vertical"
          aria-label={t.resizeCommentPanel}
          aria-valuemin={MIN_WIDTH}
          aria-valuemax={MAX_WIDTH}
          aria-valuenow={panelWidth}
          tabIndex={0}
          onKeyDown={handleResizeKeyDown}
          onMouseDown={handleResizeStart}
          onTouchStart={handleResizeTouchStart}
        />

        {/* Header */}
        <div className={styles.section}>
          {/* ラベルと操作ボタンを同じ行（同じ高さ）に置く。
              本文はその下に全幅で広げ、展開時のスクロールバーをパネル右端に出す。 */}
          <div className="flex items-center justify-between gap-2">
            <h2 id={headingId} className="badge m-0 bg-accent-tint text-accent">
              {t.chapterVerseHeader(chapterNumber, verse.number)}
            </h2>
            <div className="flex shrink-0 items-center gap-1">
              {user && onVerseBookmarksChange && (
                <button
                  type="button"
                  onClick={handleBookmark}
                  disabled={loadingBookmark}
                  data-testid="verse-bookmark"
                  aria-pressed={isBookmarked}
                  aria-label={isBookmarked ? t.bookmarkRemove : t.bookmarkAdd}
                  title={isBookmarked ? t.bookmarkRemove : t.bookmarkAdd}
                  className={`${styles.iconButton} ${isBookmarked ? styles.iconButtonOn : ""}`}
                >
                  <Icon name="bookmark" size={16} fill={isBookmarked ? "currentColor" : "none"} />
                </button>
              )}
              <button
                ref={closeRef}
                type="button"
                onClick={onClose}
                aria-label={t.closeCommentPanel}
                className={`${styles.iconButton} ${styles.closeButton}`}
              >
                ×
              </button>
            </div>
          </div>

          <p className={`${styles.verseText} ${verseExpanded ? styles.verseTextExpanded : ""}`}>
            「{verseShown}」
          </p>
          {verseIsLong && (
            <button
              type="button"
              onClick={() => setVerseExpanded((v) => !v)}
              aria-expanded={verseExpanded}
              className="btn-text btn-text-on mt-1 p-0 text-xs font-bold"
            >
              {verseExpanded ? t.readLessVerse : t.readMoreVerse}
            </button>
          )}
          {panelError && (
            <p role="alert" className="mt-2 mb-0 text-xs text-danger">
              {panelError}
            </p>
          )}
        </div>

        {/* コメント / Q&A / 引用した記事。Q&A は別のデータなので常にタブを出す。
            記事は1件も無いときに空タブを押させても仕方がないので、あるときだけ出す。 */}
        <div role="tablist" aria-label={t.panelContentTabs} onKeyDown={handleHorizontalTabListKeyDown} className={styles.tabList}>
          <PanelTab id={commentsTabId} controls={commentsPanelId} active={tab === "comments"} onClick={() => setTab("comments")}>
            {t.tabComments}
          </PanelTab>
          <PanelTab id={qaTabId} controls={qaPanelId} active={tab === "qa"} onClick={() => setTab("qa")}>
            {t.tabQa(questions.length)}
          </PanelTab>
          {(citingArticles.length > 0 || articlesError) && (
            <PanelTab id={articlesTabId} controls={articlesPanelId} active={tab === "articles"} onClick={() => setTab("articles")}>
              {t.citingArticles(citingArticles.length)}
            </PanelTab>
          )}
        </div>

        {tab === "qa" ? (
          <div id={qaPanelId} role="tabpanel" aria-labelledby={qaTabId} className={styles.tabPanel}>
            {askOpen ? (
              <QAPostForm
                catalog={catalog}
                tags={tags}
                fixedLocation={{
                  verse: verse.id,
                  label: t.chapterVerseHeader(chapterNumber, verse.number),
                }}
                onSubmitted={() => {
                  setAskOpen(false);
                  loadQuestions();
                }}
                onCancel={() => setAskOpen(false)}
              />
            ) : (
              <button
                type="button"
                onClick={() => {
                  if (!user) { setShowLoginModal(true); return; }
                  setAskOpen(true);
                }}
                className={`card-glow card-glow-interactive ${styles.ctaButton}`}
              >
                <Icon name="help-circle" size={16} />
                {t.qaAskAboutThis}
              </button>
            )}
            {questions.length === 0 ? (
              <p className={styles.noticeTight}>
                {t.qaNoQuestionsHere}
              </p>
            ) : (
              // 箇所はこの節だと分かっているので、カードには出さない。
              questions.map((q) => <QACard key={q.id} question={q} showLocation={false} />)
            )}
          </div>
        ) : tab === "articles" ? (
          <div id={articlesPanelId} role="tabpanel" aria-labelledby={articlesTabId} className={styles.tabPanel}>
            {articlesError ? (
              <ErrorState title={t.loadErrorTitle} message={t.loadErrorDesc} />
            ) : citingArticles.map((article) => (
              <Link
                key={article.id}
                href={`/articles/${article.id}`}
                className="card-glow card-glow-interactive p-3 text-body no-underline"
              >
                <div className="mb-1 text-sm font-bold">{article.title}</div>
                <div className="text-xs leading-base text-muted">
                  {article.summary}
                </div>
                <div className="mt-2 text-xs text-faint">
                  {article.owner_username}
                </div>
              </Link>
            ))}
          </div>
        ) : (
        <div id={commentsPanelId} role="tabpanel" aria-labelledby={commentsTabId} className="contents">
        {/* Comment input (デフォルト折りたたみで読書圧を減らす) */}
        <div className={styles.section}>
          {composeOpen ? (
            <CommentInput
              onSubmit={handleSubmit}
              onCancel={() => setComposeOpen(false)}
              placeholder={t.verseCommentInput}
              submitLabel={t.submitComment}
              showTagOption
              autoFocus
            />
          ) : (
            <button
              type="button"
              onClick={handleOpenCompose}
              className={`card-glow card-glow-interactive ${styles.ctaButton}`}
            >
              <Icon name="message-square" size={16} />
              {t.writeCommentCta}
            </button>
          )}
        </div>

        {/* Ordering toggle */}
        <div className={`${styles.sectionTight} flex gap-2`}>
          {(["new", "votes"] as const).map((ord) => (
            <button
              key={ord}
              type="button"
              onClick={() => setOrdering(ord)}
              aria-pressed={ordering === ord}
              className={`${styles.orderButton} ${ordering === ord ? styles.orderButtonOn : ""}`}
            >
              {ord === "new" ? t.orderNew : t.orderVotes}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className={styles.sectionTight}>
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.searchLoadedComments}
            aria-label={t.searchLoadedComments}
            className={styles.search}
          />
        </div>

        {/* Comment list */}
        <div className={styles.commentList}>
          {loading ? (
            <p className={styles.notice}>
              {t.loading}
            </p>
          ) : error ? (
            <ErrorState title={t.loadErrorTitle} message={t.loadErrorDesc} onRetry={retry} retryLabel={t.retry} />
          ) : visibleComments.length === 0 ? (
            <p className={styles.notice}>
              {q ? t.filterCommentsNoMatch : t.noCommentsYet}
            </p>
          ) : (
            <>
              {visibleComments.map((node) => (
                <CommentItem
                  key={node.id}
                  comment={node}
                  onReply={handleReply}
                  onRefresh={reload}
                  initialBookmarkId={commentBookmarkMap[node.id]}
                  showVersionBadge
                />
              ))}
              <LoadMoreButton hasMore={hasMore} loading={loadingMore} error={!!loadMoreError} onClick={loadMore} />
            </>
          )}
        </div>
        </div>
        )}
      </div>
    </>
  );
}

function PanelTab({
  id,
  controls,
  active,
  onClick,
  children,
}: {
  id: string;
  controls: string;
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      id={id}
      type="button"
      role="tab"
      aria-selected={active}
      aria-controls={controls}
      tabIndex={active ? 0 : -1}
      onClick={onClick}
      className={`${styles.tab} ${active ? styles.tabActive : ""}`}
    >
      {children}
    </button>
  );
}
