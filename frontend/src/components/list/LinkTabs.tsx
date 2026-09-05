// この部品は受け取ったものを描くだけなので、サーバー側で組み立てる画面からも使える
// （"use client" を付けると、使う側がサーバーでもブラウザ側に回ってしまう）。
import type { ReactNode } from "react";
import Link from "next/link";

export type LinkTab<K extends string> = {
  key: K;
  label: string;
  /** そのタブを開く URL。いまの絞り込みを保ったまま tab だけ差し替えたものを渡す */
  href: string;
};

type Props<K extends string> = {
  tabs: LinkTab<K>[];
  active: K;
  /** タブ全体が何のタブなのか（読み上げ用） */
  label: string;
  /** id を組み立てる前置き。TabPanel にも同じものを渡す */
  idPrefix: string;
};

/**
 * 一覧を 1 つずつ切り替えるタブ。押すと URL が変わる。
 *
 * 記事・プラン・翻訳・Q&A の 4 画面が同じものを使う。以前はプランの画面だけが
 * この形を直に書き、他の 3 画面は「PC は列を横並び、スマホだけタブ」という
 * 別の作りだった（画面幅の判定をブラウザ側でしていたので、開いた直後に
 * 列が並んでからタブへ切り替わることがあった）。
 *
 * どのタブを見ているかを URL に持つので、この 4 画面はサーバー側で組み立てられ、
 * その場所をそのまま人に渡せる。戻るボタンも効く。
 */
export function LinkTabs<K extends string>({ tabs, active, label, idPrefix }: Props<K>) {
  return (
    <div role="tablist" aria-label={label} className="tab-bar">
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          role="tab"
          aria-selected={tab.key === active}
          id={`${idPrefix}-tab-${tab.key}`}
          aria-controls={`${idPrefix}-panel-${tab.key}`}
          className={`tab-underline${tab.key === active ? " tab-underline-active" : ""}`}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}

/**
 * タブを開いた先の中身を入れる箱。
 *
 * 見出しや枠は持たない。タブを押した人はもうどのタブか分かっているので、
 * 中でもう一度名乗る必要がなく、枠を置くとカードの枠と二重になる。
 *
 * タブと結び付ける id / role / aria-labelledby は残す。これが無いと、
 * 画面読み上げでタブと中身の対応が切れる。
 */
export function TabPanel({
  idPrefix,
  tabKey,
  className = "flex flex-col gap-3",
  children,
}: {
  idPrefix: string;
  tabKey: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      id={`${idPrefix}-panel-${tabKey}`}
      role="tabpanel"
      aria-labelledby={`${idPrefix}-tab-${tabKey}`}
      className={className}
    >
      {children}
    </section>
  );
}
