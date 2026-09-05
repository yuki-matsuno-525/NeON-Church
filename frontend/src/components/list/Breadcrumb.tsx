// この部品は受け取ったものを描くだけなので、サーバー側で組み立てる画面からも使える
// （"use client" を付けると、使う側がサーバーでもブラウザ側に回ってしまう）。
import Link from "next/link";

export type Crumb = {
  label: string;
  /** 上の階層へのリンク先。いまいる場所（最後の 1 つ）には付けない */
  href?: string;
  /**
   * 離れる前に確かめたいとき（保存していない書きかけがある画面など）に渡す。
   * ブラウザ側で動く画面からしか渡せない。渡さないときは onClick 自体を付けない
   * （サーバー側で組み立てる画面から使えなくなるため）。
   */
  onNavigate?: () => void;
};

/**
 * いまどこにいるかと、上の階層への戻り道。
 *
 * これまでパンくずは読む画面にしか無く、しかも同じ書き方が 4 か所へ手で写されていた
 * （書の一覧・章・翻訳の章一覧・翻訳の章）。記事やプランの詳細には戻り道が無く、
 * ブラウザの戻るしか無かった。1 つの部品にして全画面で使う。
 *
 * 狭い画面では「マタイによる福音書 › 第1章」のような長い行が 2 段に折り返して
 * 場所を食うので、**すぐ上の階層への 1 段だけ**に切り替える（CSS 側で出し分ける。
 * 画面幅をブラウザ側で測ると、開いた直後に見た目が入れ替わってしまうため）。
 */
export function Breadcrumb({ items }: { items: Crumb[] }) {
  if (items.length === 0) return null;
  // 狭い画面で残すのは「すぐ上の階層」。最後の 1 つはいまいる場所なので、その 1 つ前。
  const parent = [...items].reverse().find((item) => item.href);

  return (
    <nav aria-label="breadcrumb" className="breadcrumb">
      {/* 広い画面用。全部の階層を › でつなぐ。 */}
      <ol className="breadcrumb-full">
        {items.map((item, index) => (
          <li key={`${index}-${item.label}`}>
            {index > 0 && <span aria-hidden="true" className="breadcrumb-sep">›</span>}
            {item.href ? (
              item.onNavigate ? (
                <Link href={item.href} onClick={item.onNavigate}>{item.label}</Link>
              ) : (
                <Link href={item.href}>{item.label}</Link>
              )
            ) : (
              <span aria-current="page">{item.label}</span>
            )}
          </li>
        ))}
      </ol>

      {/* 狭い画面用。すぐ上の階層へ戻る 1 段だけ。 */}
      {parent && (
        parent.onNavigate ? (
          <Link href={parent.href!} onClick={parent.onNavigate} className="breadcrumb-back">
            <span aria-hidden="true">‹</span> {parent.label}
          </Link>
        ) : (
          <Link href={parent.href!} className="breadcrumb-back">
            <span aria-hidden="true">‹</span> {parent.label}
          </Link>
        )
      )}
    </nav>
  );
}
