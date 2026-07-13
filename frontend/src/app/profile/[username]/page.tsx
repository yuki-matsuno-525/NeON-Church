"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import {
  fetchUserProfile,
  fetchUserComments,
  fetchUserBookmarks,
  type PublicUser,
  type Comment,
  type Bookmark,
} from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useT, bookLabel, useRelativeTime } from "@/lib/i18n";
import { passageHref } from "@/lib/passage";
import { useLang } from "@/contexts/LanguageContext";

type Tab = "favorites" | "comments";

export default function UserProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = use(params);
  const { user: me } = useAuth();
  const t = useT();
  const { lang } = useLang();
  const relTime = useRelativeTime();
  const [profile, setProfile] = useState<PublicUser | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("comments");

  useEffect(() => {
    fetchUserProfile(username)
      .then((p) => {
        setProfile(p);
        // ブックマーク公開ユーザーは favorites を初期タブにする
        if (p.bookmarks_visibility === "public") {
          setActiveTab("favorites");
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [username]);

  useEffect(() => {
    if (!profile) return;
    fetchUserComments(username)
      .then(setComments)
      .catch(() => setComments([]));
    // 非公開ユーザーはブックマーク API を呼ばない (空配列が返るが無駄な往復を避ける)
    if (profile.bookmarks_visibility === "public") {
      fetchUserBookmarks(username)
        .then(setBookmarks)
        .catch(() => setBookmarks([]));
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setBookmarks([]);
    }
  }, [profile, username]);

  if (loading) return <div style={{ padding: 32, color: "var(--text-muted)" }}>{t.loading}</div>;
  if (notFound || !profile) return <div style={{ padding: 32, color: "var(--text-muted)" }}>{t.userNotFound}</div>;

  if (me?.username === username) {
    return (
      <div style={{ padding: 32 }}>
        <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
          {t.selfProfileBefore} <Link href="/profile" style={{ color: "var(--accent)" }}>{t.selfProfileLink}</Link>{t.selfProfileAfter}
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
    borderRadius: "var(--radius-md)",
    padding: "12px 14px",
  };

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "32px 16px" }}>
      {/* プロフィールヘッダー */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
        <div style={{
          width: 64, height: 64, borderRadius: "50%",
          background: "var(--bg-alt)", border: "2px solid var(--border)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 24, color: "var(--text-muted)",
        }}>
          {profile.username[0].toUpperCase()}
        </div>
        <div>
          <h1 style={{ fontSize: "var(--font-size-xl)", fontWeight: 700, margin: "0 0 4px" }}>{profile.username}</h1>
          <p style={{ fontSize: 12, color: "var(--text-faint)", margin: 0 }}>
            {t.joinedOn(profile.created_at)}
          </p>
        </div>
      </div>

      {profile.bio && (
        <p style={{ fontSize: 14, color: "var(--text-muted)", lineHeight: 1.6, marginBottom: 24 }}>
          {profile.bio}
        </p>
      )}

      {/* タブ。ブックマークタブは visibility=public のときのみ表示 */}
      <div style={{ borderBottom: "1px solid var(--border)", marginBottom: 20, display: "flex" }}>
        {profile.bookmarks_visibility === "public" && (
          <button style={tabStyle("favorites")} onClick={() => setActiveTab("favorites")} aria-current={activeTab === "favorites" ? "page" : undefined}>
            {t.tabBookmarks} ({bookmarks.length})
          </button>
        )}
        <button style={tabStyle("comments")} onClick={() => setActiveTab("comments")} aria-current={activeTab === "comments" ? "page" : undefined}>
          {t.tabComments} ({comments.length})
        </button>
      </div>

      {activeTab === "favorites" && profile.bookmarks_visibility === "public" ? (
        bookmarks.length === 0 ? (
          <p style={{ color: "var(--text-muted)", fontSize: 14 }}>{t.noMyBookmarks}</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            {bookmarks.map((bm) => {
              if (bm.target_type === "comment" && bm.comment_detail) {
                const cd = bm.comment_detail;
                const commentPassageHref = passageHref(cd);
                const card = (
                  <>
                    <p style={{ fontSize: 12, fontWeight: 700, color: "var(--accent)", margin: "0 0 4px" }}>
                      {cd.location_label ? `${cd.location_label} · ` : ""}{t.commentBy(cd.username)}
                    </p>
                    <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5 }}>
                      {cd.body}
                    </p>
                  </>
                );
                return commentPassageHref ? (
                  <Link key={bm.id} href={commentPassageHref} style={{ ...cardStyle, display: "block", textDecoration: "none" }}>
                    {card}
                  </Link>
                ) : (
                  <div key={bm.id} style={cardStyle}>{card}</div>
                );
              }
              if (!bm.reference) return null;
              const href = `/${bm.reference.book}/${bm.reference.chapter}#verse-${bm.reference.verse}`;
              const bookDisplay = bookLabel(bm.reference.book, lang)?.name ?? bm.reference.book;
              return (
                <Link key={bm.id} href={href} style={{ textDecoration: "none" }}>
                  <div style={{ ...cardStyle, cursor: "pointer" }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: "var(--accent)", margin: 0 }}>
                      {bookDisplay} {t.verseFmt(bm.reference.chapter, bm.reference.verse)}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )
      ) : (
        comments.length === 0 ? (
          <p style={{ color: "var(--text-muted)", fontSize: 14 }}>{t.noMyComments}</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            {comments.map((c) => (
              <div key={c.id} style={cardStyle}>
                <p style={{ margin: 0, fontSize: 13, color: "var(--text)", lineHeight: 1.5 }}>
                  {c.body}
                </p>
                <p style={{ margin: "6px 0 0", fontSize: 11, color: "var(--text-faint)" }}>
                  {relTime(c.created_at)} · ▲ {(c as Comment & { vote_count?: number }).vote_count ?? 0}
                </p>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
