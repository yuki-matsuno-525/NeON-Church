"use client";

import { useCallback, useMemo, useState } from "react";
import { updatePlanDay, type PlanDay } from "@/lib/api";
import { useAutosave, saveStatusLabel } from "@/hooks/useAutosave";
import { MAX_READINGS_PER_DAY } from "@/lib/plans";
import { useT } from "@/lib/i18n";
import { useLang } from "@/contexts/LanguageContext";
import { ChapterPicker, type PickedChapter } from "./ChapterPicker";
import { readingLabel } from "./ReadingChips";

/**
 * プランの1日ぶんを編集する。
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
}: {
  planId: string;
  day: PlanDay;
  canDelete: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onDelete: () => void;
  onMove: (direction: -1 | 1) => void;
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
  const [picking, setPicking] = useState(false);
  const t = useT();
  const { lang } = useLang();
  const dayLabel = t.planDayLabel(day.number);

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
      setReadings(
        saved.readings.map((reading) => ({
          book: reading.book,
          book_name: reading.book_name,
          chapter_number: reading.chapter_number,
          translation: reading.translation,
        })),
      );
    },
    [planId, day.id],
  );

  const autosave = useAutosave({ value: draft, onSave: handleSave });

  const addChapter = (picked: PickedChapter) => {
    setPicking(false);
    if (readings.length >= MAX_READINGS_PER_DAY) return;
    setReadings((current) => [...current, picked]);
  };

  return (
    <section className="card-glow py-4 px-4" >
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <span className="text-sm font-bold text-accent">{dayLabel}</span>
        <span role="status" aria-live="polite" className={autosave.status === "error" ? "text-xs text-danger" : "text-xs text-faint"}>
          {saveStatusLabel(autosave.status, t)}
        </span>
        {autosave.status === "error" && (
          <button type="button" onClick={() => void autosave.retry()} className="link-button">{t.retry}</button>
        )}
        <div className="ml-auto flex gap-2">
          {canMoveUp && (
            <button type="button" onClick={() => onMove(-1)} aria-label={lang === "ja" ? `${dayLabel}を上へ移動` : `Move ${dayLabel} up`} className="icon-button">
              ↑
            </button>
          )}
          {canMoveDown && (
            <button type="button" onClick={() => onMove(1)} aria-label={lang === "ja" ? `${dayLabel}を下へ移動` : `Move ${dayLabel} down`} className="icon-button">
              ↓
            </button>
          )}
          {canDelete && (
            <button type="button" onClick={onDelete} aria-label={lang === "ja" ? `${dayLabel}を削除` : `Delete ${dayLabel}`} className="icon-button">
              {t.delete}
            </button>
          )}
        </div>
      </div>

      <label>
        <span className="sr-only">{dayLabel}: {t.planTitleLabel}</span>
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder={t.planDayTitlePlaceholder}
          maxLength={200}
          className="form-control mb-3 font-bold"
        />
      </label>

      {/* 読む章 */}
      <div className="flex flex-wrap gap-2 mb-2">
        {readings.map((reading, index) => (
          <span
            key={`${reading.book}-${reading.chapter_number}-${index}`}
            className="reading-tag"
          >
            {readingLabel(
              { book_name: reading.book_name || reading.book, chapter_number: reading.chapter_number },
              t,
            )}
            {reading.translation && (
              <span className="text-xs text-faint">{reading.translation}</span>
            )}
            <button
              type="button"
              aria-label={lang === "ja"
                ? `${readingLabel({ book_name: reading.book_name || reading.book, chapter_number: reading.chapter_number }, t)}を外す`
                : `Remove ${readingLabel({ book_name: reading.book_name || reading.book, chapter_number: reading.chapter_number }, t)}`}
              onClick={() => setReadings((current) => current.filter((_, i) => i !== index))}
              className="icon-button"
            >
              ×
            </button>
          </span>
        ))}
        {readings.length < MAX_READINGS_PER_DAY && !picking && (
          <button type="button" onClick={() => setPicking(true)} className="dashed-button">
            {t.planAddChapter}
          </button>
        )}
        {readings.length >= MAX_READINGS_PER_DAY && (
          <span className="self-center text-xs text-faint">
            {t.planChapterLimit(MAX_READINGS_PER_DAY)}
          </span>
        )}
      </div>

      {picking && <ChapterPicker onPick={addChapter} onCancel={() => setPicking(false)} />}

      <label>
        <span className="sr-only">{dayLabel}: {t.planDevotionalPlaceholder}</span>
        <textarea
          value={devotional}
          onChange={(event) => setDevotional(event.target.value)}
          rows={4}
          placeholder={t.planDevotionalPlaceholder}
          className="form-control mt-3 resize-y leading-reading"
        />
      </label>
    </section>
  );
}


