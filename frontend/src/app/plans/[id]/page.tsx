"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import {
  fetchPlan,
  subscribeToPlan,
  unsubscribeFromPlan,
  restartPlan,
  completePlanDay,
  uncompletePlanDay,
  type Plan,
} from "@/lib/api";
import { dayNumberToday, visibilityLabel } from "@/lib/plans";
import { useAuth } from "@/contexts/AuthContext";
import { ReadingLinks } from "@/components/plans/ReadingChips";
import { ConfirmDialog, SkeletonList } from "@/components/ui";

export default function PlanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmRestart, setConfirmRestart] = useState(false);

  const reload = () => fetchPlan(id).then(setPlan);

  useEffect(() => {
    fetchPlan(id)
      .then(setPlan)
      .catch(() => setError("このプランは読めません。"))
      .finally(() => setLoading(false));
  }, [id]);

  const subscription = plan?.subscription ?? null;
  const isReading = subscription?.is_active === true;

  const handleStart = async () => {
    setBusy(true);
    try {
      await subscribeToPlan(id);
      await reload();
    } finally {
      setBusy(false);
    }
  };

  const handleStop = async () => {
    setBusy(true);
    try {
      await unsubscribeFromPlan(id);
      await reload();
    } finally {
      setBusy(false);
    }
  };

  const handleRestart = async () => {
    setConfirmRestart(false);
    setBusy(true);
    try {
      await restartPlan(id);
      await reload();
    } finally {
      setBusy(false);
    }
  };

  const toggleDay = async (dayId: string, completed: boolean) => {
    // 押した手応えをすぐ返すため、先に画面を切り替えてから送る。
    setPlan((current) =>
      current
        ? {
            ...current,
            days: current.days?.map((day) =>
              day.id === dayId ? { ...day, completed: !completed } : day,
            ),
          }
        : current,
    );
    try {
      if (completed) await uncompletePlanDay(id, dayId);
      else await completePlanDay(id, dayId);
    } catch {
      await reload();
    }
  };

  if (loading) {
    return (
      <div style={containerStyle}>
        <SkeletonList count={3} />
      </div>
    );
  }

  if (error || !plan) {
    return (
      <div style={containerStyle}>
        <p style={{ color: "var(--text-muted)" }}>{error ?? "このプランは読めません。"}</p>
        <Link href="/plans" style={{ color: "var(--accent)" }}>
          プランの一覧へ
        </Link>
      </div>
    );
  }

  const isOwner = user?.username === plan.owner_username;
  const today = subscription ? dayNumberToday(subscription.started_at) : null;
  const doneCount = plan.days?.filter((day) => day.completed).length ?? 0;

  return (
    <div style={containerStyle}>
      <ConfirmDialog
        open={confirmRestart}
        title="最初からやり直しますか？"
        description="読み終えた印がすべて消えて、今日から数え直します。"
        confirmText="やり直す"
        destructive
        onConfirm={handleRestart}
        onCancel={() => setConfirmRestart(false)}
      />

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        {plan.visibility !== "public" && (
          <span className="badge" style={{ background: "rgba(255,255,255,0.08)", color: "var(--text-muted)" }}>
            {visibilityLabel(plan.visibility)}
          </span>
        )}
        {isOwner && (
          <Link
            href={`/plans/${plan.id}/edit`}
            style={{ marginLeft: "auto", fontSize: 13, color: "var(--accent)", textDecoration: "none" }}
          >
            編集する
          </Link>
        )}
      </div>

      <h1 style={{ fontFamily: '"Noto Serif JP", serif', fontSize: 26, fontWeight: 700, margin: "0 0 8px", lineHeight: 1.5 }}>
        {plan.title}
      </h1>
      <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16 }}>
        <Link href={`/profile/${plan.owner_username}`} style={{ color: "var(--text-muted)", textDecoration: "none" }}>
          {plan.owner_username}
        </Link>
        <span style={{ marginLeft: 8 }}>{plan.day_count}日</span>
      </div>

      {plan.description && (
        <p style={{ fontSize: 15, lineHeight: 1.8, margin: "0 0 16px" }}>{plan.description}</p>
      )}

      {plan.note && (
        // 日の並びは公開後に固まるので、訂正はここに書かれる。目立つ場所に出す。
        <div
          style={{
            border: "1px solid var(--border)",
            borderRadius: 10,
            padding: "12px 14px",
            marginBottom: 20,
            background: "rgba(255,255,255,0.03)",
          }}
        >
          <div style={{ fontSize: 12, color: "var(--text-faint)", marginBottom: 4 }}>作った人からの注記</div>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{plan.note}</p>
        </div>
      )}

      {/* 読む・やめる */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 24 }}>
        {!user ? (
          <p style={{ fontSize: 13, color: "var(--text-faint)", margin: 0 }}>
            読み始めるにはログインが必要です。
          </p>
        ) : isReading ? (
          <>
            <span style={{ fontSize: 14, fontWeight: 700 }}>
              {today && today <= plan.day_count ? `今日は${today}日目` : "読書中"}
            </span>
            <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
              {doneCount} / {plan.day_count} 日ぶん読み終わり
            </span>
            <button type="button" onClick={() => setConfirmRestart(true)} disabled={busy} style={plainButtonStyle}>
              最初からやり直す
            </button>
            <button type="button" onClick={handleStop} disabled={busy} style={plainButtonStyle}>
              やめる
            </button>
          </>
        ) : (
          <button type="button" onClick={handleStart} disabled={busy} style={startButtonStyle}>
            {subscription ? "また読み始める" : "読み始める"}
          </button>
        )}
      </div>

      {/* 日ごとの中身 */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {(plan.days ?? []).map((day) => (
          <section
            key={day.id}
            className="card-glow"
            style={{ padding: "16px 18px", opacity: day.completed ? 0.7 : 1 }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--accent)" }}>
                第{day.number}日
              </span>
              {day.title && <span style={{ fontSize: 15, fontWeight: 700 }}>{day.title}</span>}
              {isReading && (
                <button
                  type="button"
                  onClick={() => toggleDay(day.id, day.completed)}
                  aria-pressed={day.completed}
                  style={{
                    marginLeft: "auto",
                    border: `1px solid ${day.completed ? "var(--accent)" : "var(--border)"}`,
                    background: day.completed ? "var(--accent-tint)" : "transparent",
                    color: day.completed ? "var(--accent)" : "var(--text-muted)",
                    borderRadius: 8,
                    fontSize: 12,
                    padding: "6px 12px",
                    minHeight: 36,
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  {day.completed ? "読み終わり ✓" : "読み終えた"}
                </button>
              )}
            </div>

            <ReadingLinks readings={day.readings} />

            {day.devotional && (
              <p style={{ margin: "12px 0 0", fontSize: 15, lineHeight: 1.9, whiteSpace: "pre-wrap" }}>
                {day.devotional}
              </p>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}

const containerStyle: React.CSSProperties = {
  maxWidth: 720,
  margin: "0 auto",
  padding: "32px 16px 64px",
};

const startButtonStyle: React.CSSProperties = {
  border: "none",
  borderRadius: 8,
  background: "var(--accent)",
  color: "var(--accent-text)",
  fontWeight: 700,
  fontSize: 14,
  padding: "10px 22px",
  minHeight: 44,
  cursor: "pointer",
  fontFamily: "inherit",
};

const plainButtonStyle: React.CSSProperties = {
  border: "1px solid var(--border)",
  borderRadius: 8,
  background: "transparent",
  color: "var(--text-muted)",
  fontSize: 13,
  padding: "8px 14px",
  minHeight: 40,
  cursor: "pointer",
  fontFamily: "inherit",
};
