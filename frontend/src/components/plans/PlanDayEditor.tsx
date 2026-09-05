"use client";

import { useCallback, useMemo, useState } from "react";
import { updatePlanDay, type PlanDay } from "@/lib/api";
import { useAutosave, saveErrorLabel } from "@/hooks/useAutosave";
import { useDragReorder } from "@/hooks/useDragReorder";
import { MAX_READINGS_PER_DAY } from "@/lib/plans";
import { useT } from "@/lib/i18n";
import { useLang } from "@/contexts/LanguageContext";
import { Icon } from "@/components/ui/Icon";
import { planUiText } from "@/components/plans/planUiText";
import { ChapterPicker, type PickedChapter } from "./ChapterPicker";
import { readingLabel, readingsSummary } from "./ReadingChips";
import { PlanDayPanel } from "./PlanDayPanel";
// 章の行の形は、読む画面と同じものを使う。作る画面と読む画面で形がずれないようにするため。
import styles from "./PlanDay.module.css";

/** 画面が持っている章 1 つぶん。サーバーの PlanReading から表示に要る分だけ取り出したもの。 */
type EditableReading = {
  book: string;
  book_name: string;
  chapter_number: number;
  translation: string;
};

/**
 * プランの1日ぶんを編集する。パネルの形は、プランを読む画面の日パネルと同じ。
 *
 * 中は 4 つの区画に分かれている（題・選んだ章・章を足す・添える文章）。
 * 番号を振ってあるのは、上から順にやれば 1 日ぶんが出来上がるため。
 *
 * 読み始めた人がいても、日の中身（題・章・文章）は直せる。読んだ記録は「第N日」に
 * 紐づいているので、中身が変わっても記録は壊れないため。
 */
export function PlanDayEditor({
  planId,
  day,
  canDelete,
  canMoveUp,
  canMoveDown,
  onDelete,
  onMove,
  open,
  onToggle,
}: {
  planId: string;
  day: PlanDay;
  canDelete: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onDelete: () => void;
  onMove: (direction: -1 | 1) => void;
  /** この日を開いているか。開け閉めは日の一覧を持つ側が覚える。 */
  open: boolean;
  onToggle: () => void;
}) {
  const [title, setTitle] = useState(day.title);
  const [devotional, setDevotional] = useState(day.devotional);
  const [readings, setReadings] = useState(
    day.readings.map((reading) => ({
      book: reading.book,
      book_name: reading.book_name,
      chapter_number: reading.chapter_number,
      translation: reading.translation,
    })),
  );
  // 指で並べ替えるための持ち方。細い取っ手をねらわずに、行のどこでもつかめるようにする。
  const [reorderMode, setReorderMode] = useState(false);
  const t = useT();
  const { lang } = useLang();
  const text = planUiText(lang);

  const draft = useMemo(
    () => ({
      title,
      devotional,
      readings: readings.map(({ book, chapter_number, translation }) => ({
        book,
        chapter_number,
        translation,
      })),
    }),
    [title, devotional, readings],
  );

  const handleSave = useCallback(
    async (value: typeof draft) => {
      const saved = await updatePlanDay(planId, day.id, value);
      // 書名はサーバー側で訳に合わせて決まるので、保存の返事で入れ直す。
      //
      // ただし中身が同じなら、今の並びをそのまま返して配列を作り直さない。
      // 作り直すと draft（useMemo）が別物になり、自動保存が「変わった」と見て
      // また保存する、という輪になる。何も触っていないのに 1.2 秒ごとに
      // 保存が飛び続けていたのはこれが原因。
      const next = saved.readings.map((reading) => ({
        book: reading.book,
        book_name: reading.book_name,
        chapter_number: reading.chapter_number,
        translation: reading.translation,
      }));
      setReadings((current) => (sameReadings(current, next) ? current : next));
    },
    [planId, day.id],
  );

  const autosave = useAutosave({ value: draft, onSave: handleSave });

  const addChapter = (picked: PickedChapter) => {
    if (readings.length >= MAX_READINGS_PER_DAY) return;
    setReadings((current) => [...current, picked]);
  };

  /** 章の並びを持ち替える。順番はこの配列のままサーバーへ送られて、そのまま覚えられる。 */
  const moveChapter = useCallback((from: number, to: number) => {
    setReadings((current) => {
      const next = [...current];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }, []);

  const drag = useDragReorder({ count: readings.length, onReorder: moveChapter });
  const canAdd = readings.length < MAX_READINGS_PER_DAY;

  return (
    <PlanDayPanel
      number={day.number}
      title={title}
      open={open}
      onToggle={onToggle}
      summary={readingsSummary(
        readings.map((reading) => ({
          book_name: reading.book_name || reading.book,
          chapter_number: reading.chapter_number,
        })),
        t,
        lang,
      )}
      leading={<Icon name="calendar" size={20} color="var(--accent)" />}
      note={
        /* うまくいっているときは何も出さない。日が並ぶ画面で「保存しました」が
           あちこち点滅するのを避けるため。失敗したときだけ、その日の見出しに出す。 */
        autosave.status === "error" ? (
          /* 赤い字は紫のカードの上だと地に沈むので、暗い地の小さな札に載せる。 */
          <span role="alert" className="text-xs text-danger bg-bg rounded-sm px-2 py-1">
            {saveErrorLabel(autosave.status, t)}{" "}
            <button type="button" onClick={() => void autosave.retry()} className="link-button">{text.retry}</button>
          </span>
        ) : undefined
      }
      actions={
        <>
          {canMoveUp && (
            <button type="button" onClick={() => onMove(-1)} aria-label={text.moveUp(day.number)} className="icon-button">
              ↑
            </button>
          )}
          {canMoveDown && (
            <button type="button" onClick={() => onMove(1)} aria-label={text.moveDown(day.number)} className="icon-button">
              ↓
            </button>
          )}
          {canDelete && (
            <button type="button" onClick={onDelete} aria-label={text.deleteDay(day.number)} className="icon-button flex items-center gap-1">
              <Icon name="trash" size={18} />
              {t.delete}
            </button>
          )}
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {/* 1. この日の題 */}
        <div className="note-box">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="step-badge" aria-hidden="true">1</span>
            <span className="text-md font-bold">{text.stepTitle}</span>
          </div>
          <label>
            <span className="sr-only">{text.dayTitleLabel(day.number)}</span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={text.dayTitleInputPlaceholder}
              maxLength={200}
              className="form-control font-bold"
            />
          </label>
        </div>

        {/* 2. 選んだ章。上から読む順に並ぶ。 */}
        <div className="note-box">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="step-badge" aria-hidden="true">2</span>
            <span className="text-md font-bold">{text.stepSelected}</span>
            {readings.length > 1 && (
              <span className="text-xs text-soft">
                {reorderMode ? text.reorderHintOn : text.reorderHint}
              </span>
            )}
            {readings.length > 1 && (
              <button
                type="button"
                onClick={() => setReorderMode((on) => !on)}
                aria-pressed={reorderMode}
                className="outline-button ml-auto flex items-center gap-2"
              >
                <Icon name="arrow-up-down" size={16} />
                {text.reorderMode}
              </button>
            )}
          </div>

          {readings.length === 0 ? (
            <p role="status" className="m-0 text-sm text-muted leading-reading">{text.readingEmpty}</p>
          ) : (
            <div
              className={[
                styles.rows,
                styles.rowsEditable,
                reorderMode ? styles.rowsReorderable : "",
                drag.draggingIndex !== null ? styles.rowsDragging : "",
              ].filter(Boolean).join(" ")}
            >
              {readings.map((reading, index) => {
                const label = readingLabel(
                  { book_name: reading.book_name || reading.book, chapter_number: reading.chapter_number },
                  t,
                );
                const rowProps = drag.rowProps(index);
                const handleProps = drag.handleProps(index);
                return (
                  <div
                    key={`${reading.book}-${reading.chapter_number}-${index}`}
                    className={styles.row}
                    {...rowProps}
                    // 並び替えモードのときは、行のどこをつかんでも動かせる。
                    // ただし取っ手や × の上から始まったときは、そちらに任せる
                    // （ここでも受けると同じ操作が二重に始まってしまう）。
                    onPointerDown={reorderMode ? (event) => {
                      if ((event.target as HTMLElement).closest("button")) return;
                      handleProps.onPointerDown(event);
                    } : undefined}
                  >
                    <button
                      type="button"
                      aria-label={text.dragHandle(label)}
                      className="drag-handle"
                      {...handleProps}
                    >
                      <Icon name="grip-vertical" size={18} />
                    </button>
                    <span className={styles.rowBadge} aria-hidden="true">{drag.previewIndex(index) + 1}</span>
                    <span className={styles.rowText}>
                      <span className="text-md font-bold">{label}</span>
                      {reading.translation && (
                        <span className="text-sm text-soft">{reading.translation}</span>
                      )}
                    </span>
                    <button
                      type="button"
                      aria-label={text.removeChapter(label)}
                      onClick={() => setReadings((current) => current.filter((_, i) => i !== index))}
                      className="circle-button circle-button-quiet"
                    >
                      <Icon name="x" size={18} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 3. 章を足す */}
        <div className="note-box">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="step-badge" aria-hidden="true">3</span>
            <span className="text-md font-bold">{text.stepAdd}</span>
            {!canAdd && (
              <span className="text-xs text-soft">{text.chapterLimit(MAX_READINGS_PER_DAY)}</span>
            )}
          </div>
          <ChapterPicker
            picked={readings.map(({ book, chapter_number }) => ({ book, chapter_number }))}
            canAdd={canAdd}
            onPick={addChapter}
          />
        </div>

        {/* 4. この日に添える文章 */}
        <div className="note-box">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="step-badge" aria-hidden="true">4</span>
            <span className="text-md font-bold">{text.stepDevotional}</span>
          </div>
          <label>
            <span className="sr-only">{text.devotionalLabel(day.number)}</span>
            <textarea
              value={devotional}
              onChange={(event) => setDevotional(event.target.value)}
              rows={4}
              placeholder={text.devotionalInputPlaceholder}
              className="form-control resize-y leading-reading"
            />
          </label>
        </div>
      </div>
    </PlanDayPanel>
  );
}

/** 章の並びが同じか。順番も中身も一致していれば同じとみなす。 */
function sameReadings(a: EditableReading[], b: EditableReading[]): boolean {
  return (
    a.length === b.length
    && a.every((reading, index) =>
      reading.book === b[index].book
      && reading.chapter_number === b[index].chapter_number
      && reading.translation === b[index].translation
      // 書名はサーバー側が訳に合わせて決めるので、変わったら入れ直す必要がある。
      && reading.book_name === b[index].book_name)
  );
}
