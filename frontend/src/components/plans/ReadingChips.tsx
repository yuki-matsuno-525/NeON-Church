"use client";

import Link from "next/link";
import type { PlanReading } from "@/lib/types";
import { useLang } from "@/contexts/LanguageContext";
import { planUiText } from "./planUiText";

/** その章を読む画面へのリンク。訳の指定があればその訳で開く。 */
export function readingHref(reading: { book: string; chapter_number: number; translation: string }): string {
  const query = reading.translation
    ? `?translation=${encodeURIComponent(reading.translation)}`
    : "";
  return `/${reading.book}/${reading.chapter_number}${query}`;
}

export function readingLabel(reading: PlanReading, lang: "ja" | "en" = "ja"): string {
  return planUiText(lang).chapterLabel(reading.book_name, reading.chapter_number);
}

/** 読む画面で使う、章のリンク一覧。 */
export function ReadingLinks({ readings }: { readings: PlanReading[] }) {
  const { lang } = useLang();
  const ui = planUiText(lang);
  if (readings.length === 0) {
    return <p role="status" style={{ fontSize: 13, color: "var(--text-faint)", margin: 0 }}>{ui.readingEmpty}</p>;
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
            minHeight: 44,
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 13,
            color: "var(--text)",
            textDecoration: "none",
          }}
        >
          {readingLabel(reading, lang)}
          {reading.translation && (
            <span style={{ fontSize: 11, color: "var(--text-faint)" }}>{reading.translation}</span>
          )}
        </Link>
      ))}
    </div>
  );
}
