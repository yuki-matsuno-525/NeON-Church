"use client";

import Link from "next/link";
import type { PlanReading } from "@/lib/types";
import { useT, type Translations } from "@/lib/i18n";

/** その章を読む画面へのリンク。訳の指定があればその訳で開く。 */
export function readingHref(reading: { book: string; chapter_number: number; translation: string }): string {
  const query = reading.translation
    ? `?translation=${encodeURIComponent(reading.translation)}`
    : "";
  return `/${reading.book}/${reading.chapter_number}${query}`;
}

export function readingLabel(
  reading: { book_name: string; chapter_number: number },
  t: Translations,
): string {
  return t.planReadingLabel(reading.book_name, reading.chapter_number);
}

/** 読む画面で使う、章のリンク一覧。 */
export function ReadingLinks({ readings }: { readings: PlanReading[] }) {
  const t = useT();

  if (readings.length === 0) {
    return <p role="status" style={{ fontSize: 13, color: "var(--text-faint)", margin: 0 }}>{t.planNoReadings}</p>;
  }
  return (
    <div className="flex flex-wrap gap-2">
      {readings.map((reading) => (
        <Link
          key={reading.id}
          href={readingHref(reading)}
          style={{
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: "6px 12px",
            minHeight: 44,
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 13,
            color: "var(--text)",
            textDecoration: "none",
          }}
        >
          {readingLabel(reading, t)}
          {reading.translation && (
            <span className="text-xs text-faint">{reading.translation}</span>
          )}
        </Link>
      ))}
    </div>
  );
}
