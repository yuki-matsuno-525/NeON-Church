"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import {
  fetchUserProfile,
  fetchUserComments,
  fetchUserBookmarks,
  formatRelativeTime,
  type PublicUser,
  type Comment,
  type Bookmark,
} from "@/lib/api";
import { BOOKS } from "@/lib/books";
import { useAuth } from "@/contexts/AuthContext";

function slugFromBookName(name: string): string {
  return BOOKS.find((b) => b.name === name)?.slug ?? "";
}

type Tab = "favorites" | "comments";

export default function UserProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = use(params);
  const { user: me } = useAuth();
  const [profile, setProfile] = useState<PublicUser | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("favorites");

  useEffect(() => {
    fetchUserProfile(username)
      .then(setProfile)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [username]);

  useEffect(() => {
    if (!profile) return;
    Promise.all([
      fetchUserComments(username).catch(() => [] as Comment[]),
      fetchUserBookmarks(username).catch(() => [] as Bookmark[]),
    ]).then(([cms, bms]) => {
      setComments(cms);
      setBookmarks(bms);
    });
  }, [profile, username]);

  if (loading) return <div style={{ padding: 32, color: "var(--text-muted)" }}>読み込み中...</div>;
  if (notFound || !profile) return <div style={{ padding: 32, color: "var(--text-muted)" }}>ユーザーが見つかりません。</div>;

  if (me?.username === username) {
    return (
      <div style={{ padding: 32 }}>
        <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
          自分のプロフィールは <Link href="/profile" style={{ color: "var(--accent)" }}>こちら</Link> から確認できます。
        </p>
      </div>
    );
  }

  const tabStyle = (tab: Tab): React.CSSProperties => ({
    padding: "8px 16px",
    background: "transparent",
    border: "none",
    borderBottom: activeTab === tab ? "2px solid var(--accent)" : "2px solid transparent",
    color: activeTab === tab ? "var(--accent)" : "var(--text-muted)",
    fontWeight: activeTab === tab ? 700 : 400,
    cursor: "pointer",
    fontSize: 14,
    fontFamily: "inherit",
  });

  const cardStyle: React.CSSProperties = {
    background: "var(--bg-alt)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    padding: "12px 14px",
  };

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "32px 16px" }}>
      {/* プロフィールヘッダー */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
        {profile.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt={profile.username}
            style={{ width: 64, height: 64, borderRadius: "50%", objectFit: "cover", border: "2px solid var(--border)" }}
          />
        ) : (
          <div style={{
            width: 64, height: 64, borderRadius: "50%",
            background: "var(--bg-alt)", border: "2px solid var(--border)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 24, color: "var(--text-muted)",
          }}>
            {profile.username[0].toUpperCase()}
          </div>
        )}
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 4px" }}>{profile.username}</h1>
          <p style={{ fontSize: 12, color: "var(--text-faint)", margin: 0 }}>
            {new Date(profile.created_at).toLocaleDateString("ja-JP")} 登録
          </p>
        </div>
      </div>

      {profile.bio && (
        <p style={{ fontSize: 14, color: "var(--text-muted)", lineHeight: 1.6, marginBottom: 24 }}>
          {profile.bio}
        </p>
      )}

      {/* タブ */}
      <div style={{ borderBottom: "1px solid var(--border)", marginBottom: 20, display: "flex" }}>
        <button style={tabStyle("favorites")} onClick={() => setActiveTab("favorites")}>
          お気に入り ({bookmarks.length})
        </button>
        <button style={tabStyle("comments")} onClick={() => setActiveTab("comments")}>
          コメント ({comments.length})
        </button>
      </div>

      {activeTab === "favorites" ? (
        bookmarks.length === 0 ? (
          <p style={{ color: "var(--text-muted)", fontSize: 14 }}>お気に入りはまだありません。</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {bookmarks.map((bm) => {
              if (bm.target_type === "comment" && bm.comment_detail) {
                return (
                  <div key={bm.id} style={cardStyle}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: "var(--accent)", margin: "0 0 4px" }}>
                      コメント by {bm.comment_detail.username}
                    </p>
                    <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5 }}>
                      {bm.comment_detail.body}
                    </p>
                  </div>
                );
              }
              if (!bm.verse_detail) return null;
              const slug = slugFromBookName(bm.verse_detail.book_name);
              const href = slug ? `/${slug}/${bm.verse_detail.chapter_number}` : "#";
              return (
                <Link key={bm.id} href={href} style={{ textDecoration: "none" }}>
                  <div style={{ ...cardStyle, cursor: "pointer" }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: "var(--accent)", margin: "0 0 4px" }}>
                      {bm.verse_detail.book_name} {bm.verse_detail.chapter_number}章 {bm.verse_detail.number}節
                    </p>
                    <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5 }}>
                      {bm.verse_detail.text}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )
      ) : (
        comments.length === 0 ? (
          <p style={{ color: "var(--text-muted)", fontSize: 14 }}>コメントはまだありません。</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {comments.map((c) => (
              <div key={c.id} style={cardStyle}>
                <p style={{ margin: 0, fontSize: 13, color: "var(--text)", lineHeight: 1.5 }}>
                  {c.body}
                </p>
                <p style={{ margin: "6px 0 0", fontSize: 11, color: "var(--text-faint)" }}>
                  {formatRelativeTime(c.created_at)} · ▲ {(c as Comment & { vote_count?: number }).vote_count ?? 0}
                </p>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
