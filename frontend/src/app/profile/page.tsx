"use client";

import { useEffect, useId, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { updateProfile, uploadAvatar, fetchBookmarks, fetchMyComments, type User, type Bookmark, type MyComment, type BookmarksVisibility, formatRelativeTime } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LanguageContext";
import { useT } from "@/lib/i18n";
import { BOOKS } from "@/lib/books";
import { SkeletonList, EmptyState, Button, Toggle } from "@/components/ui";

function slugFromBookName(name: string): string {
  return BOOKS.find((b) => b.name === name)?.slug ?? "";
}

type Tab = "bookmarks" | "comments";

export default function ProfilePage() {
  const { user, loading, setUser } = useAuth();
  const router = useRouter();
  const t = useT();
  const { lang } = useLang();
  const avatarInputId = useId();
  const messageId = useId();
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
      <div style={{ maxWidth: 600, margin: "0 auto", padding: "32px 24px" }}>
        <SkeletonList count={3} />
      </div>
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
      setMessage({ type: "success", text: t.profileUpdated });
    } catch {
      setMessage({ type: "error", text: t.avatarFailed });
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
      setMessage({ type: "success", text: t.profileUpdated });
    } catch {
      setMessage({ type: "error", text: t.profileUpdateFailed });
    } finally {
      setSaving(false);
    }
  };

  const handleVisibilityToggle = async (next: boolean) => {
    const visibility: BookmarksVisibility = next ? "public" : "private";
    setMessage(null);
    try {
      const updated = await updateProfile({ bookmarks_visibility: visibility });
      setUser(updated);
      setMessage({ type: "success", text: t.profileUpdated });
    } catch {
      setMessage({ type: "error", text: t.profileUpdateFailed });
    }
  };

  const joinedDate = new Date(user.created_at).toLocaleDateString(
    lang === "en" ? "en-US" : "ja-JP",
    { year: "numeric", month: "long", day: "numeric" }
  );

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
      <h1 style={{ fontSize: "var(--font-size-2xl)", fontWeight: 700, marginBottom: "var(--space-6)" }}>
        {t.profileTitle}
      </h1>

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
            htmlFor={avatarInputId}
            style={{
              display: "inline-block",
              fontSize: 13,
              color: "var(--accent)",
              cursor: avatarUploading ? "not-allowed" : "pointer",
              opacity: avatarUploading ? 0.6 : 1,
              fontWeight: 600,
            }}
          >
            {avatarUploading ? t.uploadingAvatar : t.changeAvatar}
          </label>
          <input
            id={avatarInputId}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={handleAvatarChange}
            disabled={avatarUploading}
          />
          <p style={{ margin: "4px 0 0", fontSize: 11, color: "var(--text-faint)" }}>
            {t.avatarHint}
          </p>
        </div>
      </div>

      <div
        style={{
          background: "var(--bg-alt)",
          border: "1px solid var(--border)",
          borderLeft: "3px solid var(--accent)",
          borderRadius: 10,
          padding: "24px",
          marginBottom: 24,
        }}
      >
        <dl style={{ margin: 0, display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <dt style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>
              {t.username}
            </dt>
            <dd style={{ margin: 0, fontWeight: 600 }}>{user.username}</dd>
          </div>
          <div>
            <dt style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>
              {t.email}
            </dt>
            <dd style={{ margin: 0 }}>{user.email}</dd>
          </div>
          <div>
            <dt style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>
              {t.joinedDate}
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
            {t.bio}
          </label>
          <textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={4}
            maxLength={500}
            placeholder={t.bioPlaceholder}
            autoComplete="off"
            aria-describedby={message ? messageId : undefined}
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
          <p style={{ textAlign: "right", margin: "4px 0 0", fontSize: "var(--font-size-xs)", color: bio.length >= 450 ? "var(--state-warning)" : "var(--text-faint)" }}>
            {bio.length}/500
          </p>
        </div>

        {message && (
          <p
            id={messageId}
            role={message.type === "error" ? "alert" : "status"}
            aria-live="polite"
            style={{
              fontSize: "var(--font-size-sm)",
              color: message.type === "success" ? "var(--accent)" : "var(--state-danger)",
              marginBottom: "var(--space-3)",
            }}
          >
            {message.text}
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="btn btn-primary"
        >
          {saving ? t.saving : t.save}
        </button>
      </form>

      {/* プライバシー設定 */}
      <section
        aria-labelledby="privacy-heading"
        style={{
          background: "var(--bg-alt)",
          border: "1px solid var(--border)",
          borderLeft: "3px solid var(--accent)",
          borderRadius: 10,
          padding: "20px 22px",
          marginBottom: 40,
        }}
      >
        <h2
          id="privacy-heading"
          style={{ fontSize: 14, fontWeight: 700, margin: "0 0 14px", color: "var(--text)" }}
        >
          {t.privacyHeading}
        </h2>
        <Toggle
          checked={user.bookmarks_visibility === "public"}
          onChange={handleVisibilityToggle}
          label={t.bookmarksVisibilityLabel}
          description={t.bookmarksVisibilityHint}
        />
      </section>

      <div style={{ borderBottom: "1px solid var(--border)", marginBottom: 20, display: "flex" }}>
        <button
          style={tabStyle("bookmarks")}
          onClick={() => setActiveTab("bookmarks")}
          aria-current={activeTab === "bookmarks" ? "page" : undefined}
        >
          {t.tabBookmarks} ({bookmarks.length})
        </button>
        <button
          style={tabStyle("comments")}
          onClick={() => setActiveTab("comments")}
          aria-current={activeTab === "comments" ? "page" : undefined}
        >
          {t.tabComments} ({myComments.length})
        </button>
      </div>

      {loadingData ? (
        <SkeletonList count={3} />
      ) : activeTab === "bookmarks" ? (
        <BookmarkList bookmarks={bookmarks} />
      ) : (
        <CommentList comments={myComments} />
      )}
    </div>
  );
}

function BookmarkList({ bookmarks }: { bookmarks: Bookmark[] }) {
  const t = useT();
  if (bookmarks.length === 0) {
    return (
      <EmptyState
        title={t.noMyBookmarks}
        description={t.emptyMyBookmarksDesc}
        action={
          <Link href="/read" style={{ textDecoration: "none" }}>
            <Button variant="primary">{t.emptyBookmarksCta}</Button>
          </Link>
        }
      />
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {bookmarks.map((bm) => {
        if (bm.target_type === "comment" && bm.comment_detail) {
          return (
            <div key={bm.id} style={cardStyle}>
              <p style={{ fontSize: 12, fontWeight: 700, color: "var(--accent)", margin: "0 0 4px" }}>
                {t.commentBy(bm.comment_detail.username)}
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
                {bm.verse_detail.book_name} {t.verseFmt(bm.verse_detail.chapter_number, bm.verse_detail.number)}
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
  const t = useT();
  if (comments.length === 0) {
    return (
      <EmptyState
        title={t.noMyComments}
        description={t.emptyMyCommentsDesc}
        action={
          <Link href="/read" style={{ textDecoration: "none" }}>
            <Button variant="primary">{t.emptyBookmarksCta}</Button>
          </Link>
        }
      />
    );
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
