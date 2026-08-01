"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { useLang } from "@/contexts/LanguageContext";
import { planUiText } from "@/components/plans/planUiText";

/**
 * 「まとめて栞」モードの下のバー。
 *
 * 読んでいる途中で気になった節をいくつも見つけたとき、1つずつ開いて栞を付けるのは手間が多い。
 * 選んでからまとめて入れられるようにする。
 */
export function BulkBookmarkBar({
  pickedCount,
  busy,
  message,
  onSave,
  onCancel,
}: {
  pickedCount: number;
  busy: boolean;
  message: string | null;
  onSave: () => void;
  onCancel: () => void;
}) {
  const { lang } = useLang();
  const ui = planUiText(lang);
  const barRef = useRef<HTMLDivElement>(null);
  const cancelOnEscape = useEffectEvent(onCancel);

  useEffect(() => {
    barRef.current?.focus();
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      cancelOnEscape();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, []);

  return (
    <div
      ref={barRef}
      data-testid="bulk-bookmark-bar"
      role="region"
      aria-label={ui.bulkRegion}
      aria-busy={busy}
      tabIndex={-1}
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 40,
        padding: "12px 16px",
        display: "flex",
        alignItems: "center",
        gap: 12,
        flexWrap: "wrap",
        background: "var(--glass-bg)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderTop: "1px solid var(--glass-border)",
      }}
    >
      <span style={{ fontSize: 13, fontWeight: 700 }}>
        {pickedCount > 0 ? ui.pickedVerses(pickedCount) : ui.pickVerses}
      </span>
      {message && <span role="status" aria-live="polite" style={{ fontSize: 12, color: "var(--text-muted)" }}>{message}</span>}
      <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
        <button type="button" onClick={onCancel} style={cancelStyle}>
          {ui.cancel}
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={pickedCount === 0 || busy}
          style={{
            ...saveStyle,
            cursor: pickedCount === 0 || busy ? "default" : "pointer",
            opacity: pickedCount === 0 || busy ? 0.6 : 1,
          }}
        >
          {busy ? ui.savingBookmarks : ui.saveBookmarks}
        </button>
      </div>
    </div>
  );
}

const cancelStyle: React.CSSProperties = {
  border: "1px solid var(--border)",
  borderRadius: 8,
  background: "transparent",
  color: "var(--text-muted)",
  fontSize: 13,
  padding: "8px 16px",
  minHeight: 44,
  cursor: "pointer",
  fontFamily: "inherit",
};

const saveStyle: React.CSSProperties = {
  border: "none",
  borderRadius: 8,
  background: "var(--accent)",
  color: "var(--accent-text)",
  fontWeight: 700,
  fontSize: 13,
  padding: "8px 18px",
  minHeight: 44,
  fontFamily: "inherit",
};

/**
 * 「まとめて栞」の状態をまとめて持つ。ページ側は使うだけにする。
 * 保存そのものは呼び出し側から渡す（栞の一覧の持ち方はページが知っているため）。
 */
export function useBulkBookmark(save: (verseIds: string[]) => Promise<number>) {
  const { lang } = useLang();
  const ui = planUiText(lang);
  const [pickMode, setPickMode] = useState(false);
  const [pickedIds, setPickedIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const start = () => {
    setPickMode(true);
    setPickedIds([]);
    setMessage(null);
  };

  const cancel = () => {
    setPickMode(false);
    setPickedIds([]);
    setMessage(null);
  };

  const toggle = (verseId: string) => {
    setPickedIds((current) =>
      current.includes(verseId)
        ? current.filter((id) => id !== verseId)
        : [...current, verseId],
    );
  };

  const submit = async () => {
    if (pickedIds.length === 0 || busy) return;
    setBusy(true);
    setMessage(null);
    try {
      const added = await save(pickedIds);
      // すでに栞のある節は数に入らない。何件入ったかを出して、押した手応えを返す。
      setMessage(added === pickedIds.length ? null : ui.bulkPartial(added));
      if (added === pickedIds.length) {
        setPickMode(false);
        setPickedIds([]);
      } else {
        setPickedIds([]);
      }
    } catch {
      setMessage(ui.bulkError);
    } finally {
      setBusy(false);
    }
  };

  return { pickMode, pickedIds, busy, message, start, cancel, toggle, submit };
}
