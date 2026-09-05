"use client";

import { useCallback } from "react";
import Link from "next/link";
import { fetchArticlePage, type Article, type ListPage } from "@/lib/api";
import { articleTagLabel, visibilityLabel } from "@/lib/articles";
import { useT } from "@/lib/i18n";
import { useLoadMore } from "@/hooks/useLoadMore";
import { AsyncPagedList } from "@/components/ui";
import { visibilityBadgeClass } from "@/components/list";

type Props = {
  /** 0 件のときの一行メッセージ */
  empty: string;
  /** 自分の記事のタブなら true。カードに「編集」を出す */
  editable?: boolean;
  /** 絞り込み。この 2 つが変わると 1 ページ目から読み直す */
  mine?: boolean;
  tag?: string;
  /**
   * サーバーが取り終えた 1 ページ目。
   * 取れなかったときは省略する。その場合だけブラウザ側が取りに行く。
   */
  initial?: ListPage<Article>;
};

/**
 * 記事の一覧 1 つ分（いま開いているタブの中身）。
 *
 * 1 ページ目はサーバーが取って initial で渡してくる。ここが受け持つのは
 * 「もっと見る」で続きを読み足すところだけ。
 */
export function ArticleFeed({ empty, editable = false, mine, tag, initial }: Props) {
  const fetchPage = useCallback(
    (page: number) => fetchArticlePage({ mine, tag, page }),
    [mine, tag],
  );
  const list = useLoadMore(fetchPage, initial);

  return (
    <AsyncPagedList list={list} emptyText={empty}>
      <div className="flex flex-col gap-3">
        {list.items.map((article) => (
          <ArticleCard key={article.id} article={article} editable={editable} />
        ))}
      </div>
    </AsyncPagedList>
  );
}

function ArticleCard({ article, editable }: { article: Article; editable: boolean }) {
  const t = useT();
  return (
    <article className="card-glow card-glow-interactive card-link p-4 flex flex-col">
      {/* 公開はこの一覧では当たり前なので、札は出さない。
          下書き・限定公開だけ、まだ人に見えていないことを示すために出す。 */}
      {(article.visibility !== "public" || editable) && (
        <div className="flex justify-between items-center gap-2 mb-3">
          {article.visibility !== "public" && (
            <span className={visibilityBadgeClass(article.visibility)}>
              {visibilityLabel(article.visibility, t)}
            </span>
          )}
          {editable && (
            <Link href={`/articles/${article.id}/edit`} className="tap-target inline-flex items-center px-1 text-accent ml-auto">
              {t.articleEditShort}
            </Link>
          )}
        </div>
      )}
      <h3 className="card-title">
        {/* card-link-main が影でカード全体を覆うので、どこを押しても記事へ飛ぶ。
            書いた人と主題はその上に載っていて、別々に押せる。 */}
        <Link href={`/articles/${article.id}`} className="card-link-main text-inherit no-underline">
          {article.title}
        </Link>
      </h3>
      {article.summary && <p className="card-summary">{article.summary}</p>}
      {/* 灰色の箱を横に並べるのをやめ、翻訳カードと同じ明細に揃える。
          箱では「tanaka」と「詩篇」が同じ見た目で、どちらが何なのか分からなかった。 */}
      <dl className="meta-rows">
        <dt>{t.cardAuthor}</dt>
        <dd>
          <Link href={`/profile/${article.owner_username}`}>{article.owner_username}</Link>
        </dd>
        {article.tags.length > 0 && (
          <>
            <dt>{t.cardTopics}</dt>
            <dd>
              {article.tags.map((articleTag) => (
                <Link key={articleTag.id} href={`/articles?tag=${articleTag.slug}`}>
                  {articleTagLabel(articleTag.slug, articleTag.name, t)}
                </Link>
              ))}
            </dd>
          </>
        )}
      </dl>
    </article>
  );
}
