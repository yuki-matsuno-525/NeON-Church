"use client";

import { useEffect, useState } from "react";
import { fetchTags, createComment, buildCommentTree, type Tag } from "@/lib/api";
import { useComments } from "@/hooks/useComments";
import { CommentInput } from "@/components/comments/CommentInput";
import { CommentItem } from "@/components/comments/CommentItem";
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

export function ChapterComments({ chapterId, bookId, label, commentBookmarkMap = {}, translationProject, allVersionIds }: Props) {
  const t = useT();
  const heading = label ?? t.chapterCommentsHeading;
  const [ordering, setOrdering] = useState<"new" | "votes">("new");
  const [tags, setTags] = useState<Tag[]>([]);
  const [activeTagId, setActiveTagId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAll, setShowAll] = useState(false);

  // コメントの紐付け先（章 or 書）。createComment / useComments で共用する。
  const target = bookId ? { book: bookId } : { chapter: chapterId };

  // 全バージョンが2件以上あるときだけ「すべて表示」が意味を持つ。
  const canShowAll = (allVersionIds?.length ?? 0) > 1;
  const useAll = showAll && canShowAll;

  const { comments, setComments, loading, reload } = useComments({
    chapter_id: useAll ? undefined : chapterId,
    book_id: useAll ? undefined : bookId,
    chapter_ids: useAll && chapterId ? allVersionIds : undefined,
    book_ids: useAll && bookId ? allVersionIds : undefined,
    all_versions: useAll,
    ordering,
    tag_id: activeTagId,
    translation_project: useAll ? undefined : translationProject,
  });

  useEffect(() => {
    fetchTags().then(setTags).catch(() => {});
  }, []);

  const handleSubmit = async (body: string, isQa?: boolean, tagIds?: string[], title?: string) => {
    const comment = await createComment({ ...target, title, body, is_qa: isQa, tag_ids: tagIds, translation_project: translationProject });
    setComments((prev) => [comment, ...prev]);
  };

  const handleReply = async (body: string, parentId: string) => {
    const comment = await createComment({ ...target, body, parent: parentId, translation_project: translationProject });
    setComments((prev) => [...prev, comment]);
  };

  const q = searchQuery.trim().toLowerCase();
  const filteredComments = q
    ? comments.filter((c) => c.body.toLowerCase().includes(q))
    : comments;
  const tree = buildCommentTree(filteredComments);

  return (
    <section id="chapter-comments" style={{ marginTop: 40 }}>
      <hr style={{ border: "none", borderTop: "2px solid var(--border)", marginBottom: 24 }} />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>
          {heading}{" "}
          <span style={{ color: "var(--text-faint)", fontWeight: 400, fontSize: 14 }}>
            ({comments.length})
          </span>
        </h2>

        <div style={{ display: "flex", gap: 8 }}>
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
      </div>

      {/* タグフィルタ */}
      {tags.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
          <button
            onClick={() => setActiveTagId(null)}
            style={{
              fontSize: 12,
              padding: "3px 10px",
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
              onClick={() => setActiveTagId(activeTagId === tag.id ? null : tag.id)}
              style={{
                fontSize: 12,
                padding: "3px 10px",
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

      <div style={{ marginBottom: 12 }}>
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t.searchComments}
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

      <div style={{ marginBottom: 24 }}>
        <CommentInput onSubmit={handleSubmit} showQaOption showTagOption />
      </div>

      {loading ? (
        <p style={{ color: "var(--text-faint)", fontSize: 13 }}>{t.loading}</p>
      ) : tree.length === 0 ? (
        <p style={{ color: "var(--text-faint)", fontSize: 13 }}>
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
    </section>
  );
}
