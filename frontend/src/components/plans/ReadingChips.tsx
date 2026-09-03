"use client";

import Link from "next/link";
import type { PlanReading } from "@/lib/types";
import { useT, type Translations } from "@/lib/i18n";
import { Icon } from "@/components/ui/Icon";
// 行の見た目は、その日の文章の行と揃える必要があるのでパネル側が持っている。
import styles from "./PlanReader.module.css";

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

/**
 * その日に読む章を、1 行 1 章で並べる。
 *
 * 行を包む箱はここでは作らない。呼ぶ側（PlanReader）が、その日の文章の行と
 * 同じ箱に入れて並べるため。そうしないと章と文章のあいだだけ間隔がずれる。
 */
export function ReadingLinks({ readings }: { readings: PlanReading[] }) {
  const t = useT();

  // 紫のカードの上に出る文字なので text-faint は使えない（コントラストが足りない）。
  if (readings.length === 0) {
    return <p role="status" className="text-sm text-soft m-0">{t.planNoReadings}</p>;
  }
  return (
    <>
      {readings.map((reading) => (
        <Link
          key={reading.id}
          href={readingHref(reading)}
          className={`${styles.row} ${styles.rowLink}`}
        >
          <span className={styles.rowBadge} aria-hidden="true">
            <Icon name="book-open" size={20} color="var(--neon-purple)" />
          </span>
          <span className={styles.rowText}>
            <span className="text-md font-bold">{readingLabel(reading, t)}</span>
            {/* 訳の指定があるときだけ。「口語訳」のように既に読める形で入っている */}
            {reading.translation && (
              <span className="text-sm text-soft">{reading.translation}</span>
            )}
          </span>
          <Icon name="chevron-right" size={20} color="var(--accent)" />
        </Link>
      ))}
    </>
  );
}
