// この部品は受け取ったものを描くだけで、押した・入力したといった出来事を
// 扱わない。そのためサーバー側で組み立てる画面からもそのまま使える
// （"use client" を付けると、使う側がサーバーでもブラウザ側に回ってしまう）。
import type { ReactNode } from "react";
import { Icon, type IconName } from "@/components/ui/Icon";
import { toneClass, type Tone } from "./tone";

type Props = {
  icon: IconName;
  /** この列の分類の色。list.css の tone-* から選ぶ（色の値は書かない） */
  tone: Tone;
  title: string;
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
 * 一覧画面の 1 カラム。アイコン・見出し・説明という同じ形を持つ。
 *
 * 中身（カードの並べ方やデータの取り方）は children に任せるので、
 * 画面ごとに違うのは「何を並べるか」だけになる。
 *
 * 見出しに件数は出さない。塗りバッジだとカードに付く状態バッジと同じ形・同じ色になり、
 * 数と状態が見分けられなくなるため。また、列の中を見ている人にとって
 * その列の総数は何も決めない（数が効くのはどの列を見るか選ぶ前）。
 */
export function ListColumn({
  icon,
  tone,
  title,
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
      className={`list-column ${toneClass(tone)}${hidden ? " hidden" : ""}`}
    >
      <div className="mb-4">
        <div className="flex items-center gap-2">
          <span aria-hidden="true" className="icon-tone">
            <Icon name={icon} size={18} />
          </span>
          <h2 className="m-0 text-md font-bold">{title}</h2>
        </div>
        {/* 説明は読ませたい文。--text-muted は紫みが強くて沈むので text-soft を使う
            （カードの要約や明細のラベルと同じ濃さになる）。 */}
        <p className="mt-2 mb-0 text-sm text-soft">{description}</p>
      </div>
      {children}
    </section>
  );
}
