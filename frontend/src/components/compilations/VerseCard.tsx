"use client";

import { useState, type ReactNode } from "react";
import { updateCompiledVerse, type CompiledVerse } from "@/lib/api";
import { useAutosave, saveStatusLabel } from "@/hooks/useAutosave";
import { Icon } from "@/components/ui/Icon";

export type VerseDragProps = {
  draggable: boolean;
  onDragStart: (event: React.DragEvent) => void;
  onDragEnd: (event: React.DragEvent) => void;
};

type Props = {
  verse: CompiledVerse;
  bookId: string;
  /** カードの下に並べる操作ボタン。スマホでだけ渡す（PCはドラッグで動かす）。 */
  actions?: ReactNode;
  /** カードごと掴んで動かすための属性。スマホでは渡さない。 */
  dragProps?: VerseDragProps;
};

/**
 * 編纂の1つの断章を表すカード。
 * 自分で書いた本文は書き換えられる。取り込んだ節の本文は書き換えず、注釈だけ付けられる。
 * 入力は自動保存されるので、保存ボタンは無い。
 */
export function VerseCard({ verse, bookId, actions, dragProps }: Props) {
  const isNote = verse.source_kind === "note";
  const [body, setBody] = useState(verse.body_snapshot);
  const [note, setNote] = useState(verse.curator_note);
  const [noteOpen, setNoteOpen] = useState(Boolean(verse.curator_note));

  const bodyStatus = useAutosave(body, (value) =>
    isNote ? updateCompiledVerse(bookId, verse.id, { body_snapshot: value }) : Promise.resolve(),
  );
  const noteStatus = useAutosave(note, (value) => updateCompiledVerse(bookId, verse.id, { curator_note: value }));
  const status = bodyStatus === "idle" ? noteStatus : bodyStatus;

  return (
    <article
      {...dragProps}
      data-testid="verse-card"
      data-verse-id={verse.id}
      style={{
        border: "1px solid var(--border)",
        borderRadius: 8,
        padding: 10,
        background: "var(--bg-alt)",
        cursor: dragProps ? "grab" : "default",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
        {dragProps && <Icon name="grip-vertical" size={14} style={{ color: "var(--text-faint)" }} />}
        <p style={{ margin: 0, color: "var(--text-faint)", fontSize: 12, flex: 1, minWidth: 0 }}>
          {verse.verse_number ? `${verse.verse_number}節` : "断章"}
          {verse.source_label && ` ・ ${verse.source_label}`}
        </p>
        {status !== "idle" && (
          <span role="status" style={{ fontSize: 11, color: status === "error" ? "var(--state-danger)" : "var(--text-faint)" }}>
            {saveStatusLabel(status)}
          </span>
        )}
      </div>

      {isNote ? (
        <textarea
          data-testid="verse-body-input"
          aria-label="本文"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: "8px 10px",
            borderRadius: 6,
            border: "1px solid var(--border)",
            background: "var(--bg)",
            color: "var(--text)",
            fontFamily: '"Noto Serif JP", serif',
            fontSize: 14,
            lineHeight: 1.8,
            resize: "vertical",
            cursor: "auto",
          }}
        />
      ) : (
        <p style={{ margin: 0, fontSize: 15, lineHeight: 1.8, fontFamily: '"Noto Serif JP", serif', whiteSpace: "pre-wrap" }}>
          {verse.body_snapshot}
        </p>
      )}

      {noteOpen ? (
        <label style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 8, fontSize: 11, fontWeight: 700, color: "var(--text-muted)" }}>
          節への注釈
          <textarea
            data-testid="verse-note-input"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "6px 8px",
              borderRadius: 6,
              border: "1px solid var(--border)",
              background: "var(--bg)",
              color: "var(--text)",
              fontFamily: "inherit",
              fontSize: 12,
              lineHeight: 1.6,
              resize: "vertical",
              cursor: "auto",
            }}
          />
        </label>
      ) : (
        <button
          data-testid="open-verse-note"
          type="button"
          onClick={() => setNoteOpen(true)}
          style={{
            border: "none",
            background: "none",
            padding: 0,
            marginTop: 8,
            color: "var(--accent)",
            fontSize: 12,
            fontWeight: 700,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          注釈を付ける
        </button>
      )}

      {actions && <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>{actions}</div>}
    </article>
  );
}
