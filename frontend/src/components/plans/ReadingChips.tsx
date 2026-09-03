"use client";

import Link from "next/link";
import type { PlanReading } from "@/lib/types";
import { useT, type Translations } from "@/lib/i18n";
import { Icon } from "@/components/ui/Icon";
import styles from "./ReadingChips.module.css";

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

  // 紫のカードの上に出る文字なので text-faint は使えない（コントラストが足りない）。
  if (readings.length === 0) {
    return <p role="status" className="text-sm text-soft m-0">{t.planNoReadings}</p>;
  }
  return (
    <div className={styles.readings}>
      {readings.map((reading) => (
        <Link key={reading.id} href={readingHref(reading)} className={styles.reading}>
          <Icon name="book-open" size={18} color="var(--accent)" />
          <span>
            {readingLabel(reading, t)}
            {reading.translation && (
              <span className={styles.readingSub}>{reading.translation}</span>
            )}
          </span>
        </Link>
      ))}
    </div>
  );
}
