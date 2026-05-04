"use client";

import { useEffect, useState } from "react";
import { fetchComments, createComment, type Comment } from "@/lib/api";
import { CommentInput } from "@/components/comments/CommentInput";
import { CommentItem } from "@/components/comments/CommentItem";

type Props = {
  chapterId: string;
  /** The first verse ID of the chapter, used as a proxy for chapter-level comments */
  label?: string;
};

function buildTree(comments: Comment[]): { root: Comment; replies: Comment[] }[] {
  const roots = comments.filter((c) => !c.parent);
  const replyMap: Record<string, Comment[]> = {};
  for (const c of comments) {
    if (c.parent) {
      (replyMap[c.parent] ??= []).push(c);
    }
  }
  return roots.map((root) => ({ root, replies: replyMap[root.id] ?? [] }));
}

export function ChapterComments({ chapterId, label = "章へのコメント" }: Props) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [firstVerseId, setFirstVerseId] = useState<string | null>(null);

  const loadComments = () => {
    fetchComments({ chapter_id: chapterId })
      .then(setComments)
      .catch(() => setComments([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadComments();
  }, [chapterId]);

  // Find first verse ID from chapter comments (needed for posting)
  useEffect(() => {
    if (comments.length > 0) {
      // Use the verse from the first comment as a target, or we skip posting until we have verseId
      const first = comments[0];
      if (first) setFirstVerseId(first.verse);
    }
  }, [comments]);

  const handleSubmit = async (body: string) => {
    if (!firstVerseId) throw new Error("投稿先の節が見つかりません");
    const comment = await createComment({ verse: firstVerseId, body });
    setComments((prev) => [comment, ...prev]);
  };

  const handleReply = async (body: string, parentId: string) => {
    if (!firstVerseId) throw new Error("投稿先の節が見つかりません");
    const comment = await createComment({ verse: firstVerseId, body, parent: parentId });
    setComments((prev) => [...prev, comment]);
  };

  const tree = buildTree(comments);

  return (
    <section style={{ marginTop: 40 }}>
      <hr style={{ border: "none", borderTop: "2px solid var(--border)", marginBottom: 24 }} />

      <h2 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 16px" }}>
        {label}{" "}
        <span style={{ color: "var(--text-faint)", fontWeight: 400, fontSize: 14 }}>
          ({comments.length})
        </span>
      </h2>

      <div style={{ marginBottom: 24 }}>
        <CommentInput onSubmit={handleSubmit} />
      </div>

      {loading ? (
        <p style={{ color: "var(--text-faint)", fontSize: 13 }}>読み込み中...</p>
      ) : tree.length === 0 ? (
        <p style={{ color: "var(--text-faint)", fontSize: 13 }}>
          コメントはまだありません
        </p>
      ) : (
        tree.map(({ root, replies }) => (
          <CommentItem
            key={root.id}
            comment={root}
            replies={replies}
            onReply={handleReply}
            onRefresh={loadComments}
          />
        ))
      )}
    </section>
  );
}
