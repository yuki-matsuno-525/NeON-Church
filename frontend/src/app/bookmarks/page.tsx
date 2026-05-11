"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { fetchBookmarks, removeBookmark, type Bookmark } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { BOOKS } from "@/lib/books";

function slugFromBookName(name: string): string {
  return BOOKS.find((b) => b.name === name)?.slug ?? "";
}

export default function BookmarksPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    fetchBookmarks()
      .then(setBookmarks)
      .catch(() => setBookmarks([]))
      .finally(() => setFetching(false));
  }, [user]);

  if (loading || fetching) {
    return (
      <div style={{ padding: 32, color: "var(--text-muted)" }}>読み込み中...</div>
    );
  }

  return (
    <div style={{ maxWidth: 700, margin: "0 auto", padding: "32px 24px" }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>
        ブックマーク
      </h1>

      {bookmarks.length === 0 ? (
        <p style={{ color: "var(--text-muted)" }}>ブックマークはまだありません。</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {bookmarks.map((bm) => {
            if (bm.target_type === "comment" && bm.comment_detail) {
              return (
                <div
                  key={bm.id}
                  style={{
                    background: "var(--bg-alt)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    padding: "16px",
                  }}
                >
                  <p style={{ fontSize: 13, fontWeight: 700, color: "var(--accent)", margin: "0 0 6px" }}>
                    コメント by {bm.comment_detail.username}
                  </p>
                  <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: "var(--text-muted)" }}>
                    {bm.comment_detail.body}
                  </p>
                  <button
                    onClick={async () => {
                      await removeBookmark(bm.id);
                      setBookmarks((prev) => prev.filter((b) => b.id !== bm.id));
                    }}
                    style={{
                      marginTop: 8,
                      fontSize: 12,
                      color: "var(--text-faint)",
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      padding: 0,
                      fontFamily: "inherit",
                    }}
                  >
                    解除
                  </button>
                </div>
              );
            }

            if (!bm.verse_detail) return null;
            const slug = slugFromBookName(bm.verse_detail.book_name);
            const href = slug ? `/${slug}/${bm.verse_detail.chapter_number}` : "#";

            return (
              <Link
                key={bm.id}
                href={href}
                style={{
                  display: "block",
                  background: "var(--bg-alt)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  padding: "16px",
                  textDecoration: "none",
                  color: "var(--text)",
                }}
              >
                <p
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: "var(--accent)",
                    margin: "0 0 6px",
                  }}
                >
                  {bm.verse_detail.book_name} {bm.verse_detail.chapter_number}章{" "}
                  {bm.verse_detail.number}節
                </p>
                <p
                  style={{
                    margin: 0,
                    fontSize: 14,
                    lineHeight: 1.6,
                    color: "var(--text-muted)",
                    overflow: "hidden",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                  }}
                >
                  {bm.verse_detail.text}
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
