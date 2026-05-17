"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { updateProfile, uploadAvatar, fetchBookmarks, fetchMyComments, type User, type Bookmark, type MyComment, formatRelativeTime } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { BOOKS } from "@/lib/books";

function slugFromBookName(name: string): string {
  return BOOKS.find((b) => b.name === name)?.slug ?? "";
}

type Tab = "bookmarks" | "comments";

export default function ProfilePage() {
  const { user, loading, setUser } = useAuth();
  const router = useRouter();
  const [bio, setBio] = useState("");
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("bookmarks");
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [myComments, setMyComments] = useState<MyComment[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login?from=/profile");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setBio(user.bio);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoadingData(true);
    Promise.all([
      fetchBookmarks().catch(() => [] as Bookmark[]),
      fetchMyComments().catch(() => [] as MyComment[]),
    ]).then(([bms, coms]) => {
      setBookmarks(bms);
      setMyComments(coms);
      setLoadingData(false);
    });
  }, [user]);

  if (loading) {
    return (
      <div style={{ padding: 32, color: "var(--text-muted)" }}>読み込み中...</div>
    );
  }

  if (!user) return null;

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    setMessage(null);
    try {
      const updated = await uploadAvatar(file);
      setUser(updated);
      setMessage({ type: "success", text: "プロフィール画像を更新しました。" });
    } catch {
      setMessage({ type: "error", text: "画像のアップロードに失敗しました。" });
    } finally {
      setAvatarUploading(false);
      e.target.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const updated: User = await updateProfile({ bio });
      setUser(updated);
      setMessage({ type: "success", text: "プロフィールを更新しました。" });
    } catch {
      setMessage({ type: "error", text: "更新に失敗しました。もう一度お試しください。" });
    } finally {
      setSaving(false);
    }
  };

  const joinedDate = new Date(user.created_at).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const tabStyle = (tab: Tab): React.CSSProperties => ({
    padding: "8px 16px",
    fontSize: 14,
    fontWeight: activeTab === tab ? 700 : 400,
    color: activeTab === tab ? "var(--accent)" : "var(--text-muted)",
    background: "transparent",
    border: "none",
    borderBottom: activeTab === tab ? "2px solid var(--accent)" : "2px solid transparent",
    cursor: "pointer",
    fontFamily: "inherit",
  });

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: "32px 24px" }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 32 }}>
        プロフィール
      </h1>

      {/* アバター */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: "50%",
            background: user.avatar_url ? "transparent" : "var(--accent)",
            color: "var(--accent-text)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 800,
            fontSize: 28,
            overflow: "hidden",
            flexShrink: 0,
            border: "2px solid var(--border)",
          }}
        >
          {user.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.avatar_url} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            user.username[0]?.toUpperCase() ?? "?"
          )}
        </div>
        <div>
          <label
            style={{
              display: "inline-block",
              fontSize: 13,
              color: "var(--accent)",
              cursor: avatarUploading ? "not-allowed" : "pointer",
              opacity: avatarUploading ? 0.6 : 1,
              fontWeight: 600,
            }}
          >
            {avatarUploading ? "アップロード中..." : "画像を変更"}
            <input
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={handleAvatarChange}
              disabled={avatarUploading}
            />
          </label>
          <p style={{ margin: "4px 0 0", fontSize: 11, color: "var(--text-faint)" }}>
            JPG・PNG・GIF（5MB以下）
          </p>
        </div>
      </div>

      <div
        style={{
          background: "var(--bg-alt)",
          border: "1px solid var(--border)",
          borderLeft: "3px solid rgba(192, 64, 240, 0.50)",
          borderRadius: 10,
          padding: "24px",
          marginBottom: 24,
        }}
      >
        <dl style={{ margin: 0, display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <dt style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>
              ユーザー名
            </dt>
            <dd style={{ margin: 0, fontWeight: 600 }}>{user.username}</dd>
          </div>
          <div>
            <dt style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>
              メールアドレス
            </dt>
            <dd style={{ margin: 0 }}>{user.email}</dd>
          </div>
          <div>
            <dt style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>
              登録日
            </dt>
            <dd style={{ margin: 0 }}>{joinedDate}</dd>
          </div>
        </dl>
      </div>

      <form onSubmit={handleSubmit} style={{ marginBottom: 40 }}>
        <div style={{ marginBottom: 16 }}>
          <label
            htmlFor="bio"
            style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 8 }}
          >
            自己紹介
          </label>
          <textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={4}
            placeholder="自己紹介を入力してください"
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 6,
              border: "1px solid var(--border)",
              background: "var(--bg)",
              color: "var(--text)",
              fontSize: 14,
              resize: "vertical",
              boxSizing: "border-box",
            }}
          />
        </div>

        {message && (
          <p
            style={{
              fontSize: 13,
              color: message.type === "success" ? "var(--accent)" : "#e53e3e",
              marginBottom: 12,
            }}
          >
            {message.text}
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          style={{
            background: saving ? "rgba(120, 30, 190, 0.5)" : "linear-gradient(135deg, #7618c5, #d81e80)",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            padding: "8px 20px",
            fontWeight: 700,
            fontSize: 14,
            cursor: saving ? "not-allowed" : "pointer",
            opacity: saving ? 0.6 : 1,
            boxShadow: saving ? "none" : "0 0 12px rgba(198, 44, 170, 0.35)",
            fontFamily: "inherit",
          }}
        >
          {saving ? "保存中..." : "保存"}
        </button>
      </form>

      {/* タブ */}
      <div style={{ borderBottom: "1px solid var(--border)", marginBottom: 20, display: "flex" }}>
        <button style={tabStyle("bookmarks")} onClick={() => setActiveTab("bookmarks")}>
          お気に入り ({bookmarks.length})
        </button>
        <button style={tabStyle("comments")} onClick={() => setActiveTab("comments")}>
          コメント ({myComments.length})
        </button>
      </div>

      {loadingData ? (
        <p style={{ color: "var(--text-muted)", fontSize: 14 }}>読み込み中...</p>
      ) : activeTab === "bookmarks" ? (
        <BookmarkList bookmarks={bookmarks} />
      ) : (
        <CommentList comments={myComments} />
      )}
    </div>
  );
}

function BookmarkList({ bookmarks }: { bookmarks: Bookmark[] }) {
  if (bookmarks.length === 0) {
    return <p style={{ color: "var(--text-muted)", fontSize: 14 }}>お気に入りはまだありません。</p>;
  }
  return (
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
  );
}

function CommentList({ comments }: { comments: MyComment[] }) {
  if (comments.length === 0) {
    return <p style={{ color: "var(--text-muted)", fontSize: 14 }}>コメントはまだありません。</p>;
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {comments.map((c) => (
        <div key={c.id} style={cardStyle}>
          <p style={{ fontSize: 12, fontWeight: 700, color: "var(--accent)", margin: "0 0 4px" }}>
            {c.location_label}
          </p>
          <p style={{ margin: 0, fontSize: 13, color: "var(--text)", lineHeight: 1.5 }}>
            {c.body}
          </p>
          <p style={{ margin: "6px 0 0", fontSize: 11, color: "var(--text-faint)" }}>
            {formatRelativeTime(c.created_at)} · ▲ {c.vote_count}
          </p>
        </div>
      ))}
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  background: "var(--bg-alt)",
  border: "1px solid var(--border)",
  borderLeft: "3px solid rgba(192, 64, 240, 0.50)",
  borderRadius: 10,
  padding: "12px 14px",
};
