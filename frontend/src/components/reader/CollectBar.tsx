"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { addVersesToCompilation, fetchMyCompiledBooks, type CompiledBook } from "@/lib/api";
import { trayLabel } from "@/lib/compilations";
import { Icon } from "@/components/ui/Icon";

type Props = {
  /** 選ばれている節の id。押された順に入る。 */
  verseIds: string[];
  onDone: () => void;
  onCancel: () => void;
};

/**
 * 読む画面で「集める」モードのときに下へ出るバー。
 * 選んだ節を、選んだ順のまま断章ボックスへまとめて入れる。
 */
export function CollectBar({ verseIds, onDone, onCancel }: Props) {
  const [books, setBooks] = useState<CompiledBook[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    fetchMyCompiledBooks()
      .then((list) => {
        if (!alive) return;
        setBooks(list);
        setSelectedId((current) => current || list[0]?.id || "");
      })
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, []);

  const selected = books.find((book) => book.id === selectedId);
  const label = selected ? trayLabel(selected) : "断章ボックス";

  const add = async () => {
    if (!selectedId || busy || verseIds.length === 0) return;
    setBusy(true);
    setFailed(false);
    try {
      await addVersesToCompilation(selectedId, verseIds);
      setMessage(`${label}へ${verseIds.length}節入れました。`);
      onDone();
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      data-testid="collect-bar"
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 40,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        flexWrap: "wrap",
        padding: "12px 16px",
        background: "var(--glass-nav)",
        backdropFilter: "blur(12px)",
        borderTop: "1px solid var(--border)",
      }}
    >
      {books.length === 0 ? (
        <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>
          編纂書がまだありません。{" "}
          <Link href="/compilations/new" style={{ color: "var(--accent)", fontWeight: 700 }}>
            新しく作成
          </Link>
        </p>
      ) : (
        <>
          <span data-testid="collect-count" style={{ fontSize: 13, fontWeight: 700, whiteSpace: "nowrap" }}>
            {verseIds.length}節を選択中
          </span>

          <select
            data-testid="collect-book-select"
            aria-label="追加先の編纂書"
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            style={{
              padding: "7px 10px",
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "var(--bg)",
              color: "var(--text)",
              fontFamily: "inherit",
              fontSize: 13,
              maxWidth: 220,
            }}
          >
            {books.map((book) => (
              <option key={book.id} value={book.id}>
                {book.title}
              </option>
            ))}
          </select>

          <button
            data-testid="collect-submit"
            type="button"
            onClick={add}
            disabled={busy || verseIds.length === 0}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              background: "var(--accent)",
              color: "var(--accent-text)",
              border: "none",
              borderRadius: 8,
              padding: "8px 16px",
              fontWeight: 700,
              fontSize: 13,
              cursor: busy || verseIds.length === 0 ? "default" : "pointer",
              opacity: busy || verseIds.length === 0 ? 0.6 : 1,
              fontFamily: "inherit",
              whiteSpace: "nowrap",
            }}
          >
            <Icon name="book-open" size={14} />
            {busy ? "追加中..." : `${label}へ入れる`}
          </button>
        </>
      )}

      <button
        data-testid="collect-cancel"
        type="button"
        onClick={onCancel}
        style={{
          border: "1px solid var(--border)",
          borderRadius: 8,
          padding: "7px 12px",
          background: "var(--bg-alt)",
          color: "var(--text)",
          fontWeight: 700,
          fontSize: 13,
          cursor: "pointer",
          fontFamily: "inherit",
        }}
      >
        やめる
      </button>

      {message && (
        <p role="status" style={{ margin: 0, fontSize: 12, color: "var(--text-muted)" }}>
          {message}
        </p>
      )}
      {failed && (
        <p role="alert" style={{ margin: 0, fontSize: 12, color: "var(--state-danger)" }}>
          追加できませんでした。
        </p>
      )}
    </div>
  );
}
