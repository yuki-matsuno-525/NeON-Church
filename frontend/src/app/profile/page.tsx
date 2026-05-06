"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { updateProfile, type User } from "@/lib/api";

export default function ProfilePage() {
  const { user, loading, setUser } = useAuth();
  const router = useRouter();
  const [bio, setBio] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      setBio(user.bio);
    }
  }, [user]);

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
