"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { fetchQAComments, fetchBooks, fetchTags, type QAComment, type Book, type Tag } from "@/lib/api";
import { QAPostForm } from "@/components/qa/QAPostForm";
import { QACard } from "@/components/qa/QACard";
import { LoginRequiredModal } from "@/components/ui/LoginRequiredModal";

export default function QAPage() {
  const { user } = useAuth();
  const [comments, setComments] = useState<QAComment[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedBookId, setSelectedBookId] = useState("");
  const [selectedTagId, setSelectedTagId] = useState("");
  const [answeredFilter, setAnsweredFilter] = useState<"all" | "answered" | "unanswered">("all");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  useEffect(() => {
    Promise.all([fetchBooks("口語訳"), fetchTags()])
      .then(([bks, tgs]) => {
        setBooks(bks);
        setTags(tgs);
      })
      .catch(() => {});
  }, []);

  const loadComments = () => {
    setLoading(true);
    fetchQAComments({
      book_id: selectedBookId || undefined,
      tag_id: selectedTagId || undefined,
      answered: answeredFilter === "all" ? undefined : answeredFilter === "answered",
    })
      .then(setComments)
      .catch(() => setComments([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBookId, selectedTagId, answeredFilter]);

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "32px 16px" }}>
      {showLoginModal && (
        <LoginRequiredModal onClose={() => setShowLoginModal(false)} />
      )}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Q&A</h1>
        {!showForm && (
          <button
            onClick={() => {
              if (!user) { setShowLoginModal(true); return; }
              setShowForm(true);
            }}
            style={{
              padding: "7px 16px",
              border: "none",
              borderRadius: 8,
              background: "var(--accent)",
              color: "var(--accent-text)",
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            質問する
          </button>
        )}
      </div>
      <p style={{ color: "var(--text-muted)", fontSize: 14, marginBottom: 24 }}>
        聖書に関する質問・疑問のコメント一覧です。
      </p>

      {showForm && (
        <QAPostForm
          books={books}
          tags={tags}
          onSubmitted={() => {
            setShowForm(false);
            loadComments();
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* フィルター */}
      <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap", alignItems: "center" }}>
        {(["all", "unanswered", "answered"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setAnsweredFilter(f)}
            style={{
              fontSize: 12,
              padding: "4px 12px",
              borderRadius: 999,
              border: "1px solid var(--border)",
              cursor: "pointer",
              background: answeredFilter === f ? "var(--accent)" : "transparent",
              color: answeredFilter === f ? "var(--accent-text)" : "var(--text-muted)",
              fontFamily: "inherit",
            }}
          >
            {f === "all" ? "すべて" : f === "unanswered" ? "未解決" : "解決済み"}
          </button>
        ))}
        <select
          value={selectedBookId}
          onChange={(e) => setSelectedBookId(e.target.value)}
          style={{
            padding: "6px 10px",
            border: "1px solid var(--border)",
            borderRadius: 8,
            background: "var(--bg-alt)",
            color: "var(--text)",
            fontSize: 13,
          }}
        >
          <option value="">すべての書</option>
          {books.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>

        <select
          value={selectedTagId}
          onChange={(e) => setSelectedTagId(e.target.value)}
          style={{
            padding: "6px 10px",
            border: "1px solid var(--border)",
            borderRadius: 8,
            background: "var(--bg-alt)",
            color: "var(--text)",
            fontSize: 13,
          }}
        >
          <option value="">すべてのタグ</option>
          {tags.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div style={{ color: "var(--text-muted)", padding: 16 }}>読み込み中...</div>
      ) : comments.length === 0 ? (
        <div style={{ color: "var(--text-muted)", padding: 16 }}>Q&Aコメントはまだありません。</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {comments.map((c) => (
            <QACard
              key={c.id}
              comment={c}
              currentUserId={user?.id ?? null}
              onBestAnswerChange={loadComments}
            />
          ))}
        </div>
      )}
    </div>
  );
}
