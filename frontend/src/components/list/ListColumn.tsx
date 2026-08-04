// この部品は受け取ったものを描くだけで、押した・入力したといった出来事を
// 扱わない。そのためサーバー側で組み立てる画面からもそのまま使える
// （"use client" を付けると、使う側がサーバーでもブラウザ側に回ってしまう）。
import type { ReactNode } from "react";
import { Icon, type IconName } from "@/components/ui/Icon";

type Props = {
  icon: IconName;
  /** アイコンと件数バッジの文字色 */
  color: string;
  /** 件数バッジの背景色 */
  tint: string;
  title: string;
  /** 見出しの横に出す件数。表示中の件数ではなく、サーバーが数えた総数を渡す */
  count: number;
  description: string;
  /** スマホのタブ切り替えで、選ばれていない列を隠すとき true */
  hidden?: boolean;
  /** 読み込み中であることを支援技術へ伝える */
  busy?: boolean;
  /** タブと列を結び付けるための id（ColumnTabs と組で使う） */
  id?: string;
  /** この列を説明しているタブの id（ColumnTabs と組で使う） */
  labelledBy?: string;
  children: ReactNode;
};

/**
 * 一覧画面の 1 カラム。アイコン・見出し・件数バッジ・説明という同じ形を持つ。
 *
 * 中身（カードの並べ方やデータの取り方）は children に任せるので、
 * 画面ごとに違うのは「何を並べるか」だけになる。
 */
export function ListColumn({
  icon,
  color,
  tint,
  title,
  count,
  description,
  hidden,
  busy,
  id,
  labelledBy,
  children,
}: Props) {
  return (
    <section
      id={id}
      // タブから開かれる列だけ tabpanel として扱う（PC ではタブが無いので付けない）
      role={labelledBy ? "tabpanel" : undefined}
      aria-labelledby={labelledBy}
      aria-busy={busy}
      className="list-column"
      style={hidden ? { display: "none" } : undefined}
    >
      <div className="mb-4">
        <div className="flex items-center gap-2">
          <span aria-hidden="true" style={{ color, display: "inline-flex" }}>
            <Icon name={icon} size={18} />
          </span>
          <h2 className="m-0 text-md font-bold">{title}</h2>
          <span className="badge badge-count" style={{ background: tint, color }}>
            {count}
          </span>
        </div>
        <p className="mt-2 mb-0 text-xs text-muted">{description}</p>
      </div>
      {children}
    </section>
  );
}
