"use client";

import { useId, type ReactNode } from "react";
import { useT } from "@/lib/i18n";
import { Icon } from "@/components/ui/Icon";
import styles from "./PlanDay.module.css";

/**
 * プランの「第N日」を入れる箱。読む画面と作る画面が同じものを使う。
 *
 * 見出しを押すと中身が開け閉めできる。40 日のプランでは、全部の日が
 * 開いていると画面がどこまでも続いて、目当ての日にたどり着けないため。
 * 閉じているときは、その日に読む章を 1 行にまとめて見出しの下に出す。
 * 開かないと何の日か分からない、という状態を作らないため。
 *
 * 中身と見出しの右側は呼ぶ側が決める（読む画面は進み具合、作る画面は
 * 日の移動と削除）。箱の見た目だけをここが持つ。
 */
export function PlanDayPanel({
  number,
  title,
  open,
  onToggle,
  summary,
  leading,
  note,
  actions,
  dimmed = false,
  children,
}: {
  number: number;
  title: string;
  open: boolean;
  onToggle: () => void;
  /** 閉じているときに見出しの下に出す 1 行。 */
  summary?: string;
  /** 「第N日」の前に置く印。 */
  leading?: ReactNode;
  /** 見出しの中、題のあと（作る画面の保存の状態など）。 */
  note?: ReactNode;
  /** 見出しの右端。 */
  actions?: ReactNode;
  /** 読み終えた日を薄くする。 */
  dimmed?: boolean;
  children: ReactNode;
}) {
  const t = useT();
  const bodyId = useId();
  const dayLabel = t.planDayLabel(number);

  return (
    <section className={`card-glow card-glow-strong p-6${dimmed ? " opacity-70" : ""}`}>
      <div className="flex items-center gap-3 flex-wrap">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-controls={bodyId}
          className="panel-head-button"
        >
          <Icon name={open ? "chevron-up" : "chevron-down"} size={20} color="var(--accent)" />
          {leading}
          <span className="flex flex-col min-w-0">
            <span className="flex items-center gap-3 flex-wrap">
              <span className="text-xl font-bold">{dayLabel}</span>
              {title && (
                <>
                  <span className={styles.headDivider} aria-hidden="true" />
                  <span className="text-lg text-accent">{title}</span>
                </>
              )}
            </span>
            {/* 閉じているときだけ。開いていれば同じことが下に並んでいる。 */}
            {!open && summary && <span className="panel-head-summary">{summary}</span>}
          </span>
        </button>
        {note}
        {actions && <div className="ml-auto flex items-center gap-1">{actions}</div>}
      </div>

      {open && <div id={bodyId} className="mt-4">{children}</div>}
    </section>
  );
}
