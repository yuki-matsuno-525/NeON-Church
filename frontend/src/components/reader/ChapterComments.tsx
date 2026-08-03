"use client";

import { useEffect, useState } from "react";
import { fetchTags, createComment, type Tag } from "@/lib/api";
import { useComments } from "@/hooks/useComments";
import { CommentInput } from "@/components/comments/CommentInput";
import { CommentItem } from "@/components/comments/CommentItem";
import { ErrorState, LoadMoreButton } from "@/components/ui";
import { useT } from "@/lib/i18n";

type Props = {
  // chapterId（章コメント）または bookId（書コメント）のどちらか一方を渡す。
  chapterId?: string;
  bookId?: string;
  label?: string;
  commentBookmarkMap?: Record<string, string>;
  // 翻訳プロジェクトの読書ページから使う場合、その翻訳専用のコメントとして扱う。
  translationProject?: string;
  // 全バージョン表示用：このレベル（章 or 書）の全バージョンid。2件以上でトグルを表示。
  allVersionIds?: string[];
};

export function ChapterComments({ chapterId, bookId, label, commentBookmarkMap = {}, translationProject }: Props) {
  const t = useT();
  const heading = label ?? t.chapterCommentsHeading;
  const [ordering, setOrdering] = useState<"new" | "votes">("new");
  const [tags, setTags] = useState<Tag[]>([]);
  const [tagsError, setTagsError] = useState(false);
  const [activeTagId, setActiveTagId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // コメントの紐付け先（章 or 書）。createComment / useComments で共用する。
  const target = bookId ? { book: bookId } : { chapter: chapterId };

  // 段階6D: 単一 id を backend が箇所へ解決し、訳をまたいで同じ章/書のコメントを集約する。
  // 各コメントには「投稿時: 〜」の訳ラベルが付く（全訳トグルは廃止）。
  const { comments, setComments, total, loading, loadingMore, hasMore, error, loadMoreError, loadMore, retry, reload } = useComments({
    chapter_id: chapterId,
    book_id: bookId,
    ordering,
    tag_id: activeTagId,
    translation_project: translationProject,
  });

  const loadTags = () => {
    setTagsError(false);
    fetchTags().then(setTags).catch(() => setTagsError(true));
  };

  useEffect(() => {
    let active = true;
    fetchTags()
      .then((items) => {
        if (active) {
          setTags(items);
          setTagsError(false);
        }
      })
      .catch(() => {
        if (active) setTagsError(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleSubmit = async (body: string, tagIds?: string[]) => {
    const comment = await createComment({ ...target, body, tag_ids: tagIds, translation_project: translationProject });
    setComments((prev) => [comment, ...prev]);
  };

  const handleReply = async (body: string, parentId: string) => {
    // 返信は親コメントの中に出るので、親一覧（comments）には足さない。
    // 投稿後の表示は CommentItem 側がその親の返信を取り直して行う。
    await createComment({ ...target, body, parent: parentId, translation_project: translationProject });
  };

  // 絞り込みは読み込み済みのコメントにだけ効く（サーバー検索ではない）。
  const q = searchQuery.trim().toLowerCase();
  const visibleComments = q
    ? comments.filter((c) => c.body.toLowerCase().includes(q))
    : comments;

  return (
    <section id="chapter-comments" style={{ marginTop: 40 }}>
      <hr style={{ border: "none", borderTop: "2px solid var(--border)", marginBottom: 24 }} />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <h2 className="m-0 text-md font-bold">
          {heading}{" "}
          <span style={{ color: "var(--text-faint)", fontWeight: 400, fontSize: 14 }}>
            ({total})
          </span>
        </h2>

        <div style={{ display: "flex", gap: 8 }}>
          {(["new", "votes"] as const).map((ord) => (
            <button
              key={ord}
              type="button"
              onClick={() => setOrdering(ord)}
              aria-pressed={ordering === ord}
              style={{
                fontSize: 12,
                padding: "3px 10px",
                minHeight: 44,
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
      </div>

      {/* タグフィルタ */}
      {tags.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
          <button
            type="button"
            onClick={() => setActiveTagId(null)}
            aria-pressed={activeTagId === null}
            style={{
              fontSize: 12,
              padding: "3px 10px",
              minHeight: 44,
              borderRadius: 999,
              border: "1px solid var(--border)",
              cursor: "pointer",
              background: activeTagId === null ? "var(--accent)" : "transparent",
              color: activeTagId === null ? "var(--accent-text)" : "var(--text-muted)",
              fontFamily: "inherit",
            }}
          >
            {t.all}
          </button>
          {tags.map((tag) => (
            <button
              key={tag.id}
              type="button"
              onClick={() => setActiveTagId(activeTagId === tag.id ? null : tag.id)}
              aria-pressed={activeTagId === tag.id}
              style={{
                fontSize: 12,
                padding: "3px 10px",
                minHeight: 44,
                borderRadius: 999,
                border: "1px solid var(--border)",
                cursor: "pointer",
                background: activeTagId === tag.id ? "var(--accent)" : "transparent",
                color: activeTagId === tag.id ? "var(--accent-text)" : "var(--text-muted)",
                fontFamily: "inherit",
              }}
            >
              {t.tagNames[tag.name] ?? tag.name}
            </button>
          ))}
        </div>
      )}
      {tagsError && (
        <div role="alert" style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, color: "var(--state-danger)", fontSize: 12 }}>
          <span>{t.tagsLoadFailed}</span>
          <button type="button" onClick={loadTags} className="tap-target">{t.retry}</button>
        </div>
      )}

      <div style={{ marginBottom: 12 }}>
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t.searchLoadedComments}
          aria-label={t.searchLoadedComments}
          style={{
            width: "100%",
            padding: "6px 12px",
            fontSize: 13,
            border: "1px solid var(--border)",
            borderRadius: 8,
            background: "var(--bg)",
            color: "var(--text)",
            fontFamily: "inherit",
            outline: "none",
            boxSizing: "border-box",
          }}
        />
      </div>

      <div className="mb-6">
        <CommentInput onSubmit={handleSubmit} showTagOption />
      </div>

      {loading ? (
        <p role="status" aria-live="polite" style={{ color: "var(--text-faint)", fontSize: 13 }}>{t.loading}</p>
      ) : error ? (
        <ErrorState title={t.loadErrorTitle} message={t.loadErrorDesc} onRetry={retry} retryLabel={t.retry} />
      ) : visibleComments.length === 0 ? (
        <p style={{ color: "var(--text-faint)", fontSize: 13 }}>
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
    </section>
  );
}
