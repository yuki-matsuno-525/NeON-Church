"use client";

import { useState, type ReactNode } from "react";
import type { CompiledVerse } from "@/lib/api";
import type { VerseDragProps } from "./VerseCard";

/** ドラッグ中の断章を表す独自のデータ形式。編纂の断章以外を受け取らないために使う。 */
export const VERSE_DRAG_TYPE = "application/x-neon-compiled-verse";

/** 断章ボックスを表す listId。章は章の id をそのまま listId に使う。 */
export const TRAY_LIST_ID = "tray";

type Props = {
  /** この置き場の id。断章ボックスなら "tray"、章なら章の id。 */
  listId: string;
  verses: CompiledVerse[];
  /** 断章が落とされたときに呼ばれる。toIndex は落とした先の何番目か（0 が一番上）。 */
  onDropVerse: (verseId: string, fromListId: string, toIndex: number) => void;
  renderCard: (verse: CompiledVerse, dragProps?: VerseDragProps) => ReactNode;
  emptyLabel: string;
  /** スマホではドラッグが効かないので、掴めるようにせず、代わりにボタンで動かす。 */
  draggable: boolean;
};

/**
 * 断章を縦に並べ、ドラッグで順番を入れ替えたり、別の置き場から受け取ったりできるリスト。
 * カードはボタンや入力欄以外のどこを掴んでも動かせる。
 */
export function VerseDropList({ listId, verses, onDropVerse, renderCard, emptyLabel, draggable }: Props) {
  const [dropIndex, setDropIndex] = useState<number | null>(null);

  const isVerseDrag = (event: React.DragEvent) => event.dataTransfer.types.includes(VERSE_DRAG_TYPE);

  const dragPropsFor = (verseId: string): VerseDragProps => ({
    draggable: true,
    onDragStart: (event) => {
      // ボタンや入力欄を操作しているときは、カードのドラッグを始めない。
      const from = event.target as HTMLElement;
      if (typeof from.closest === "function" && from.closest("button, input, textarea, select, a")) {
        event.preventDefault();
        return;
      }
      const payload = JSON.stringify({ verseId, fromListId: listId });
      event.dataTransfer.setData(VERSE_DRAG_TYPE, payload);
      event.dataTransfer.setData("text/plain", payload);
      event.dataTransfer.effectAllowed = "move";
    },
    onDragEnd: () => setDropIndex(null),
  });

  const handleItemDragOver = (event: React.DragEvent, index: number) => {
    if (!isVerseDrag(event)) return;
    event.preventDefault();
    event.stopPropagation();
    const rect = event.currentTarget.getBoundingClientRect();
    const isLowerHalf = event.clientY > rect.top + rect.height / 2;
    setDropIndex(isLowerHalf ? index + 1 : index);
  };

  const handleContainerDragOver = (event: React.DragEvent) => {
    if (!isVerseDrag(event)) return;
    event.preventDefault();
    setDropIndex(verses.length);
  };

  const handleDrop = (event: React.DragEvent) => {
    if (!isVerseDrag(event)) return;
    event.preventDefault();
    const targetIndex = dropIndex ?? verses.length;
    setDropIndex(null);
    const raw = event.dataTransfer.getData(VERSE_DRAG_TYPE) || event.dataTransfer.getData("text/plain");
    if (!raw) return;
    try {
      const payload = JSON.parse(raw) as { verseId?: unknown; fromListId?: unknown };
      if (typeof payload.verseId !== "string" || typeof payload.fromListId !== "string") return;
      onDropVerse(payload.verseId, payload.fromListId, targetIndex);
    } catch {
      // 編纂の断章ではないものが落とされたときは何もしない。
    }
  };

  return (
    <div
      data-testid={`verse-drop-list-${listId}`}
      onDragOver={draggable ? handleContainerDragOver : undefined}
      onDragLeave={draggable ? () => setDropIndex(null) : undefined}
      onDrop={draggable ? handleDrop : undefined}
      // 空いた場所にも落とせるよう、置き場は下まで伸ばしておく。
      style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1, minHeight: 120 }}
    >
      {verses.length === 0 && dropIndex === null && (
        <p style={{ margin: 0, padding: "22px 10px", textAlign: "center", color: "var(--text-faint)", fontSize: 12, lineHeight: 1.7, border: "1px dashed var(--border)", borderRadius: 8 }}>
          {emptyLabel}
        </p>
      )}
      {verses.map((verse, index) => (
        <div key={verse.id} onDragOver={draggable ? (event) => handleItemDragOver(event, index) : undefined}>
          {dropIndex === index && <DropLine />}
          {renderCard(verse, draggable ? dragPropsFor(verse.id) : undefined)}
        </div>
      ))}
      {dropIndex === verses.length && <DropLine />}
    </div>
  );
}

function DropLine() {
  return <div data-testid="drop-line" style={{ height: 3, borderRadius: 2, background: "var(--accent)", margin: "3px 0" }} />;
}
