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
    <section className="card-glow" style={{ padding: "16px 18px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--accent)" }}>{dayLabel}</span>
        <span role="status" aria-live="polite" style={{ fontSize: 11, color: autosave.status === "error" ? "var(--state-danger)" : "var(--text-faint)" }}>
          {saveStatusLabel(autosave.status, t)}
        </span>
        {autosave.status === "error" && (
          <button type="button" onClick={() => void autosave.retry()} style={retryButtonStyle}>{t.retry}</button>
        )}
        <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          {canMoveUp && (
            <button type="button" onClick={() => onMove(-1)} aria-label={lang === "ja" ? `${dayLabel}を上へ移動` : `Move ${dayLabel} up`} style={iconButtonStyle}>
              ↑
            </button>
          )}
          {canMoveDown && (
            <button type="button" onClick={() => onMove(1)} aria-label={lang === "ja" ? `${dayLabel}を下へ移動` : `Move ${dayLabel} down`} style={iconButtonStyle}>
              ↓
            </button>
          )}
          {canDelete && (
            <button type="button" onClick={onDelete} aria-label={lang === "ja" ? `${dayLabel}を削除` : `Delete ${dayLabel}`} style={iconButtonStyle}>
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
          style={{ ...inputStyle, marginBottom: 10, fontWeight: 700 }}
        />
      </label>

      {/* 読む章 */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
        {readings.map((reading, index) => (
          <span
            key={`${reading.book}-${reading.chapter_number}-${index}`}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              border: "1px solid var(--border)",
              borderRadius: 8,
              padding: "4px 8px 4px 12px",
              fontSize: 13,
            }}
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
              style={{
                border: "none",
                background: "none",
                color: "var(--text-faint)",
                cursor: "pointer",
                fontFamily: "inherit",
                fontSize: 14,
                padding: "4px 6px",
                minHeight: 44,
                minWidth: 44,
              }}
            >
              ×
            </button>
          </span>
        ))}
        {readings.length < MAX_READINGS_PER_DAY && !picking && (
          <button type="button" onClick={() => setPicking(true)} style={addChapterStyle}>
            {t.planAddChapter}
          </button>
        )}
        {readings.length >= MAX_READINGS_PER_DAY && (
          <span style={{ fontSize: 11, color: "var(--text-faint)", alignSelf: "center" }}>
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
          style={{ ...inputStyle, marginTop: 10, resize: "vertical", lineHeight: 1.8 }}
        />
      </label>
    </section>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "var(--bg)",
  color: "var(--text)",
  fontFamily: "inherit",
  fontSize: 14,
  minHeight: 44,
};

const iconButtonStyle: React.CSSProperties = {
  border: "1px solid var(--border)",
  borderRadius: 6,
  background: "transparent",
  color: "var(--text-muted)",
  fontSize: 12,
  padding: "6px 10px",
  minHeight: 44,
  cursor: "pointer",
  fontFamily: "inherit",
};

const addChapterStyle: React.CSSProperties = {
  border: "1px dashed var(--border)",
  borderRadius: 8,
  background: "transparent",
  color: "var(--text-muted)",
  fontSize: 13,
  padding: "6px 12px",
  minHeight: 44,
  cursor: "pointer",
  fontFamily: "inherit",
};

const retryButtonStyle: React.CSSProperties = {
  border: 0,
  background: "transparent",
  color: "var(--accent)",
  textDecoration: "underline",
  fontSize: 12,
  minHeight: 44,
  cursor: "pointer",
};
