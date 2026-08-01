"use client";

import Link from "next/link";
import type { PlanReading } from "@/lib/types";

/** その章を読む画面へのリンク。訳の指定があればその訳で開く。 */
export function readingHref(reading: { book: string; chapter_number: number; translation: string }): string {
  const query = reading.translation
    ? `?translation=${encodeURIComponent(reading.translation)}`
    : "";
  return `/${reading.book}/${reading.chapter_number}${query}`;
}

export function readingLabel(reading: PlanReading): string {
  return `${reading.book_name} ${reading.chapter_number}章`;
}

/** 読む画面で使う、章のリンク一覧。 */
export function ReadingLinks({ readings }: { readings: PlanReading[] }) {
  if (readings.length === 0) {
    return <p style={{ fontSize: 13, color: "var(--text-faint)", margin: 0 }}>読む章がまだありません。</p>;
  }
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {readings.map((reading) => (
        <Link
          key={reading.id}
          href={readingHref(reading)}
          style={{
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: "6px 12px",
            minHeight: 36,
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 13,
            color: "var(--text)",
            textDecoration: "none",
          }}
        >
          {readingLabel(reading)}
          {reading.translation && (
            <span style={{ fontSize: 11, color: "var(--text-faint)" }}>{reading.translation}</span>
          )}
        </Link>
      ))}
    </div>
  );
}
