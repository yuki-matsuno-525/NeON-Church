"use client";

import { use, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  fetchPlan,
  updatePlan,
  deletePlan,
  addPlanDay,
  deletePlanDay,
  reorderPlanDays,
  type Plan,
  type PlanVisibility,
} from "@/lib/api";
import { VISIBILITY_OPTIONS } from "@/lib/plans";
import { useAuth } from "@/contexts/AuthContext";
import { useT } from "@/lib/i18n";
import { useAutosave, saveStatusLabel } from "@/hooks/useAutosave";
import { PlanDayEditor } from "@/components/plans/PlanDayEditor";
import { ConfirmDialog, SkeletonList } from "@/components/ui";

export default function PlanEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const t = useT();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deletingDayId, setDeletingDayId] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [note, setNote] = useState("");
  const [visibility, setVisibility] = useState<PlanVisibility>("private");

  const load = useCallback(
    () =>
      fetchPlan(id).then((data) => {
        setPlan(data);
        setTitle(data.title);
        setDescription(data.description);
        setNote(data.note ?? "");
        setVisibility(data.visibility);
      }),
    [id],
  );

  useEffect(() => {
    load()
      .catch(() => setError("このプランは編集できません。"))
      .finally(() => setLoading(false));
  }, [load]);

  const draft = useMemo(
    () => ({ title, description, note, visibility }),
    [title, description, note, visibility],
  );
  const handleSave = useCallback(async (value: typeof draft) => {
    await updatePlan(id, value);
  }, [id]);
  const status = useAutosave({ value: draft, onSave: handleSave, enabled: !loading && !error });

  const handleAddDay = async () => {
    await addPlanDay(id);
    await load();
  };

  const handleDeleteDay = async (dayId: string) => {
    setDeletingDayId(null);
    try {
      await deletePlanDay(id, dayId);
      await load();
    } catch {
      setError("この日は消せませんでした。読み始めた人がいるかもしれません。");
    }
  };

  const handleMoveDay = async (dayId: string, direction: -1 | 1) => {
    if (!plan?.days) return;
    const ids = plan.days.map((day) => day.id);
    const index = ids.indexOf(dayId);
    const target = index + direction;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    await reorderPlanDays(id, ids);
    await load();
  };

  const handleDeletePlan = async () => {
    setConfirmDelete(false);
    await deletePlan(id);
    router.push("/plans");
  };

  if (loading) {
    return (
      <div style={containerStyle}>
        <SkeletonList count={4} />
      </div>
    );
  }

  if (!plan) {
    return (
      <div style={containerStyle}>
        <p style={{ color: "var(--text-muted)" }}>{error ?? "このプランは編集できません。"}</p>
        <Link href="/plans" style={{ color: "var(--accent)" }}>
          プランの一覧へ
        </Link>
      </div>
    );
  }

  if (user && user.username !== plan.owner_username) {
    return (
      <div style={containerStyle}>
        <p style={{ color: "var(--text-muted)" }}>このプランはあなたのものではありません。</p>
      </div>
    );
  }

  const days = plan.days ?? [];
  const canReorder = plan.can_reorder_days !== false;
  const canPublish = days.length > 0;

  return (
    <div style={containerStyle}>
      <ConfirmDialog
        open={confirmDelete}
        title="このプランを削除しますか？"
        description="日と読む章が消えます。元には戻せません。"
        confirmText="削除する"
        destructive
        onConfirm={handleDeletePlan}
        onCancel={() => setConfirmDelete(false)}
      />
      <ConfirmDialog
        open={deletingDayId !== null}
        title="この日を消しますか？"
        description="この日の章と文章が消えます。"
        confirmText="消す"
        destructive
        onConfirm={() => deletingDayId && handleDeleteDay(deletingDayId)}
        onCancel={() => setDeletingDayId(null)}
      />

      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}>
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="題"
          style={{ ...inputStyle, flex: "1 1 280px", fontSize: 18, fontWeight: 700 }}
        />
        <select
          value={visibility}
          onChange={(event) => setVisibility(event.target.value as PlanVisibility)}
          style={{ ...inputStyle, width: "auto" }}
        >
          {VISIBILITY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value} disabled={option.value !== "private" && !canPublish}>
              {option.label}
            </option>
          ))}
        </select>
        <span style={{ fontSize: 12, color: status === "error" ? "var(--state-error)" : "var(--text-faint)", minWidth: 80 }}>
          {saveStatusLabel(status, t)}
        </span>
        <Link href={`/plans/${id}`} style={{ fontSize: 13, color: "var(--text-muted)", textDecoration: "none" }}>
          プランを見る
        </Link>
        <button type="button" onClick={() => setConfirmDelete(true)} style={plainButtonStyle}>
          削除
        </button>
      </div>

      <input
        value={description}
        onChange={(event) => setDescription(event.target.value)}
        placeholder="どんなプランかの短い説明"
        maxLength={300}
        style={{ ...inputStyle, marginBottom: 10 }}
      />

      {!canPublish && (
        <p style={{ fontSize: 12, color: "var(--text-faint)", margin: "0 0 10px" }}>
          日を1つ以上足すと、公開できるようになります。
        </p>
      )}

      <label style={{ display: "block", fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>
        読む人への注記（いつでも書き換えられます）
      </label>
      <textarea
        value={note}
        onChange={(event) => setNote(event.target.value)}
        rows={2}
        placeholder="例: 第5日と第6日を入れ違えました。すみません。"
        style={{ ...inputStyle, marginBottom: 8, resize: "vertical" }}
      />

      {!canReorder && (
        <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "0 0 16px", lineHeight: 1.7 }}>
          読み始めた人がいるので、日の並べ替えと削除はできません。
          日の中身（題・章・文章）は直せます。順番の誤りは、上の注記で伝えてください。
        </p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 16 }}>
        {days.map((day, index) => (
          <PlanDayEditor
            key={day.id}
            planId={id}
            day={day}
            canDelete={canReorder}
            canMoveUp={canReorder && index > 0}
            canMoveDown={canReorder && index < days.length - 1}
            onDelete={() => setDeletingDayId(day.id)}
            onMove={(direction) => handleMoveDay(day.id, direction)}
          />
        ))}
      </div>

      <button type="button" onClick={handleAddDay} style={addDayStyle}>
        ＋ 日を足す
      </button>
      {days.length > 0 && !canReorder && (
        <p style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 8 }}>
          日は末尾にならいつでも足せます。
        </p>
      )}
    </div>
  );
}

const containerStyle: React.CSSProperties = {
  maxWidth: 760,
  margin: "0 auto",
  padding: "24px 16px 64px",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "9px 12px",
  minHeight: 40,
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "var(--bg)",
  color: "var(--text)",
  fontFamily: "inherit",
  fontSize: 14,
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

const addDayStyle: React.CSSProperties = {
  width: "100%",
  marginTop: 16,
  border: "1px dashed var(--border)",
  borderRadius: 10,
  background: "transparent",
  color: "var(--text-muted)",
  fontSize: 14,
  padding: "14px 16px",
  minHeight: 48,
  cursor: "pointer",
  fontFamily: "inherit",
};
