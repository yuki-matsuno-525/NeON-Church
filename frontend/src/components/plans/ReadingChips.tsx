"use client";

import Link from "next/link";
import type { PlanReading } from "@/lib/types";
import { useT, type Translations } from "@/lib/i18n";
import { useLang } from "@/contexts/LanguageContext";
import { Icon } from "@/components/ui/Icon";
import { planUiText } from "@/components/plans/planUiText";
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
 *
 * 左の丸は読み終えた印。読んでいる人にだけ出す（onToggle が渡されたとき）。
 * 印は章ごとに付ける。1 日ぶんまとめて 1 つだと、3 章のうち 1 章だけ読んで
 * 中断した人が、次に開いたときにどこまで読んだか分からなくなるため。
 */
export function ReadingLinks({
  readings,
  onToggle,
  busyId = null,
}: {
  readings: PlanReading[];
  /** 読んでいる人にだけ渡す。渡されなければ印は出ない。 */
  onToggle?: (reading: PlanReading) => void;
  /** いま送信中の章。二重に押されないようにする。 */
  busyId?: string | null;
}) {
  const t = useT();
  const { lang } = useLang();
  const text = planUiText(lang);

  // 紫のカードの上に出る文字なので text-faint は使えない（コントラストが足りない）。
  if (readings.length === 0) {
    return <p role="status" className="text-sm text-soft m-0">{t.planNoReadings}</p>;
  }
  return (
    <>
      {readings.map((reading) => {
        const label = readingLabel(reading, t);
        return (
          <div key={reading.id} className={`${styles.row} ${styles.rowLink}`}>
            {!onToggle ? (
              // 読んでいない人には押せる印を出さない。丸の形だけ揃えて本の印にする。
              <span className={styles.rowBadge} aria-hidden="true">
                <Icon name="book-open" size={20} color="var(--neon-purple)" />
              </span>
            ) : (
              <button
                type="button"
                role="checkbox"
                aria-checked={reading.completed}
                aria-label={
                  reading.completed
                    ? text.unmarkReadingCompleted(label)
                    : text.markReadingCompleted(label)
                }
                aria-busy={busyId === reading.id}
                disabled={busyId !== null}
                onClick={() => onToggle(reading)}
                className={`${styles.check}${reading.completed ? ` ${styles.checkOn}` : ""}`}
              >
                <Icon name="check" size={20} />
              </button>
            )}
            <Link href={readingHref(reading)} className={styles.rowText}>
              <span className="text-md font-bold">{label}</span>
              {/* 訳の指定があるときだけ。「口語訳」のように既に読める形で入っている */}
              {reading.translation && (
                <span className="text-sm text-soft">{reading.translation}</span>
              )}
            </Link>
            <Icon name="chevron-right" size={20} color="var(--accent)" />
          </div>
        );
      })}
    </>
  );
}
