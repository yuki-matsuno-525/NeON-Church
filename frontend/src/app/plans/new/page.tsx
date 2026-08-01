"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createPlan } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

/** 新しいプランを始める。題だけ聞いて下書きを作り、編集画面へ送る。 */
export default function NewPlanPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    const trimmed = title.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    setError(null);
    try {
      const plan = await createPlan({ title: trimmed, visibility: "private" });
      router.push(`/plans/${plan.id}/edit`);
    } catch {
      setError("プランを作れませんでした。");
      setBusy(false);
    }
  };

  if (!authLoading && !user) {
    return (
      <div style={containerStyle}>
        <p style={{ color: "var(--text-muted)" }}>プランを作るにはログインが必要です。</p>
        <Link href="/login?from=%2Fplans%2Fnew" style={{ color: "var(--accent)" }}>
          ログインする
        </Link>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <h1 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 6px" }}>新しいプラン</h1>
      <p style={{ color: "var(--text-muted)", fontSize: 14, margin: "0 0 24px" }}>
        題を決めると下書きができます。日や章はあとから足せます。
      </p>

      <label style={{ display: "block", fontSize: 13, color: "var(--text-muted)", marginBottom: 6 }}>
        題
      </label>
      <input
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") handleCreate();
        }}
        placeholder="例: 7日で読む終わりの日"
        autoFocus
        style={{
          width: "100%",
          boxSizing: "border-box",
          padding: "10px 12px",
          borderRadius: 8,
          border: "1px solid var(--border)",
          background: "var(--bg)",
          color: "var(--text)",
          fontFamily: "inherit",
          fontSize: 15,
        }}
      />

      {error && <p style={{ fontSize: 13, color: "var(--state-error)", marginTop: 8 }}>{error}</p>}

      <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
        <button
          type="button"
          onClick={handleCreate}
          disabled={!title.trim() || busy}
          style={{
            border: "none",
            borderRadius: 8,
            background: "var(--accent)",
            color: "var(--accent-text)",
            fontWeight: 700,
            fontSize: 14,
            padding: "10px 22px",
            cursor: !title.trim() || busy ? "default" : "pointer",
            opacity: !title.trim() || busy ? 0.6 : 1,
            fontFamily: "inherit",
          }}
        >
          {busy ? "作成中..." : "作りはじめる"}
        </button>
        <Link
          href="/plans"
          style={{ alignSelf: "center", fontSize: 13, color: "var(--text-muted)", textDecoration: "none" }}
        >
          やめる
        </Link>
      </div>
    </div>
  );
}

const containerStyle: React.CSSProperties = {
  maxWidth: 560,
  margin: "0 auto",
  padding: "48px 16px",
};
