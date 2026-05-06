"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { updateProfile, fetchReadingProgress, formatRelativeTime, type User, type ReadingProgress } from "@/lib/api";
import { BOOKS } from "@/lib/books";

export default function ProfilePage() {
  const { user, loading, setUser } = useAuth();
  const router = useRouter();
  const [bio, setBio] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [readingProgress, setReadingProgress] = useState<ReadingProgress[]>([]);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      setBio(user.bio);
      fetchReadingProgress().then(setReadingProgress).catch(() => {});
    }
  }, [user]);

  function getBookSlug(bookName: string): string | null {
    const found = BOOKS.find((b) => b.name === bookName);
    return found ? found.slug : null;
  }

  if (loading) {
    return (
      <div style={{ padding: 32, color: "var(--text-muted)" }}>読み込み中...</div>
    );
  }

  if (!user) return null;

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

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: "32px 24px" }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 32 }}>
        プロフィール
      </h1>

      {readingProgress.length > 0 && (
        <div
          style={{
            background: "var(--bg-alt)",
            border: "1px solid var(--border)",
            borderRadius: 10,
            padding: "20px 24px",
            marginBottom: 24,
          }}
        >
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, margin: "0 0 16px" }}>
            読書の記録
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {readingProgress.map((progress) => {
              const slug = getBookSlug(progress.book_name);
              const href = slug ? `/${slug}/${progress.chapter_number}` : null;
              return (
                <div
                  key={progress.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    padding: "10px 14px",
                    background: "var(--bg)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                  }}
                >
                  <div>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>
                      {progress.book_name.replace("による福音書", "")}
                    </span>
                    <span style={{ fontSize: 13, color: "var(--text-muted)", marginLeft: 8 }}>
                      第{progress.chapter_number}章 {progress.verse_number}節まで
                    </span>
                    <span style={{ fontSize: 12, color: "var(--text-faint)", marginLeft: 8 }}>
                      {formatRelativeTime(progress.updated_at)}
                    </span>
                  </div>
                  {href && (
                    <Link
                      href={href}
                      style={{
                        fontSize: 12,
                        color: "var(--accent)",
                        textDecoration: "none",
                        padding: "4px 12px",
                        border: "1px solid var(--accent)",
                        borderRadius: 12,
                        whiteSpace: "nowrap",
                        flexShrink: 0,
                      }}
                    >
                      続きから読む
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div
        style={{
          background: "var(--bg-alt)",
          border: "1px solid var(--border)",
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

      <form onSubmit={handleSubmit}>
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
            background: "var(--accent)",
            color: "var(--accent-text)",
            border: "none",
            borderRadius: 6,
            padding: "8px 20px",
            fontWeight: 700,
            fontSize: 14,
            cursor: saving ? "not-allowed" : "pointer",
            opacity: saving ? 0.6 : 1,
          }}
        >
          {saving ? "保存中..." : "保存"}
        </button>
      </form>
    </div>
  );
}
