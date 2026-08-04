"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { useT, type Translations } from "@/lib/i18n";

/**
 * 「まとめてお気に入り」モードの下のバー。
 *
 * 読んでいる途中で気になった節をいくつも見つけたとき、1つずつ開いてお気に入りを付けるのは手間が多い。
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
  const t = useT();
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
      aria-label={t.bulkBookmarkStart}
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
      <span className="text-sm font-bold">
        {pickedCount > 0 ? t.bulkPickedCount(pickedCount) : t.bulkPickPrompt}
      </span>
      {message && <span role="status" aria-live="polite" className="text-xs text-muted">{message}</span>}
      <div className="ml-auto flex gap-2">
        <button type="button" onClick={onCancel} style={cancelStyle}>
          {t.articleCancel}
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
          {busy ? t.bulkSaving : t.bulkSave}
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
 * 「まとめてお気に入り」の状態をまとめて持つ。ページ側は使うだけにする。
 * 保存そのものは呼び出し側から渡す（お気に入りの一覧の持ち方はページが知っているため）。
 */
export function useBulkBookmark(
  save: (verseIds: string[]) => Promise<number>,
  t: Translations,
) {
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
      // すでにお気に入りのある節は数に入らない。何件入ったかを出して、押した手応えを返す。
      setMessage(added === pickedIds.length ? null : t.bulkPartial(added));
      if (added === pickedIds.length) {
        setPickMode(false);
        setPickedIds([]);
      } else {
        setPickedIds([]);
      }
    } catch {
      setMessage(t.bulkFailed);
    } finally {
      setBusy(false);
    }
  };

  return { pickMode, pickedIds, busy, message, start, cancel, toggle, submit };
}
