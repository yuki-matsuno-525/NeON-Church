"use client";

import { useEffect, useState } from "react";
import { fetchTags, createComment, buildCommentTree, type Tag } from "@/lib/api";
import { useComments } from "@/hooks/useComments";
import { CommentInput } from "@/components/comments/CommentInput";
import { CommentItem } from "@/components/comments/CommentItem";

type Props = {
  chapterId: string;
  label?: string;
  commentBookmarkMap?: Record<string, string>;
};

export function ChapterComments({ chapterId, label = "章へのコメント", commentBookmarkMap = {} }: Props) {
  const [ordering, setOrdering] = useState<"new" | "votes">("new");
  const [tags, setTags] = useState<Tag[]>([]);
  const [activeTagId, setActiveTagId] = useState<string | null>(null);

  const { comments, setComments, loading, reload } = useComments({
    chapter_id: chapterId,
    ordering,
    tag_id: activeTagId,
  });

  useEffect(() => {
    fetchTags().then(setTags).catch(() => {});
  }, []);

  const handleSubmit = async (body: string, isQa?: boolean, tagIds?: string[]) => {
    const comment = await createComment({ chapter: chapterId, body, is_qa: isQa, tag_ids: tagIds });
    setComments((prev) => [comment, ...prev]);
  };

  const handleReply = async (body: string, parentId: string) => {
    const comment = await createComment({ chapter: chapterId, body, parent: parentId });
    setComments((prev) => [...prev, comment]);
  };

  const tree = buildCommentTree(comments);

  return (
    <section id="chapter-comments" style={{ marginTop: 40 }}>
      <hr style={{ border: "none", borderTop: "2px solid var(--border)", marginBottom: 24 }} />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>
          {label}{" "}
          <span style={{ color: "var(--text-faint)", fontWeight: 400, fontSize: 14 }}>
            ({comments.length})
          </span>
        </h2>

        <div style={{ display: "flex", gap: 8 }}>
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
            すべて
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
              {tag.name}
            </button>
          ))}
        </div>
      )}

      <div style={{ marginBottom: 24 }}>
        <CommentInput onSubmit={handleSubmit} showQaOption showTagOption />
      </div>

      {loading ? (
        <p style={{ color: "var(--text-faint)", fontSize: 13 }}>読み込み中...</p>
      ) : tree.length === 0 ? (
        <p style={{ color: "var(--text-faint)", fontSize: 13 }}>
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
    </section>
  );
}
