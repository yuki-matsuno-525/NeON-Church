"use client";

import { useCallback } from "react";
import Link from "next/link";
import { fetchArticlePage, type Article, type ListPage } from "@/lib/api";
import { articleTagLabel, visibilityLabel } from "@/lib/articles";
import { useT } from "@/lib/i18n";
import { useLoadMore } from "@/hooks/useLoadMore";
import { AsyncPagedList } from "@/components/ui";
import { type IconName } from "@/components/ui/Icon";
import { ListColumn, visibilityBadgeClass } from "@/components/list";
import type { Tone } from "@/components/list/tone";

type Props = {
  title: string;
  description: string;
  icon: IconName;
  /** 列の色。list.css の tone-* から選ぶ */
  tone: Tone;
  /** 0 件のときの一行メッセージ */
  empty: string;
  /** 自分の記事の列なら true。カードに「編集」を出す */
  editable?: boolean;
  /** 絞り込み。この 3 つが変わると 1 ページ目から読み直す */
  mine?: boolean;
  excludeMine?: boolean;
  tag?: string;
  /**
   * サーバーが取り終えた 1 ページ目。
   * 取れなかったときは省略する。その場合だけブラウザ側が取りに行く。
   */
  initial?: ListPage<Article>;
};

/**
 * 記事一覧の 1 列分。
 *
 * 1 ページ目はサーバーが取って initial で渡してくる。ここが受け持つのは
 * 「もっと見る」で続きを読み足すところだけ。
 */
export function ArticleFeedColumn({
  title,
  description,
  icon,
  tone,
  empty,
  editable = false,
  mine,
  excludeMine,
  tag,
  initial,
}: Props) {
  const fetchPage = useCallback(
    (page: number) => fetchArticlePage({ mine, excludeMine, tag, page }),
    [mine, excludeMine, tag],
  );
  const list = useLoadMore(fetchPage, initial);

  return (
    <ListColumn icon={icon} tone={tone} title={title} description={description} busy={list.loading}>
      <AsyncPagedList list={list} emptyText={empty}>
        <div className="flex flex-col gap-3">
          {list.items.map((article) => (
            <ArticleCard key={article.id} article={article} editable={editable} />
          ))}
        </div>
      </AsyncPagedList>
    </ListColumn>
  );
}

function ArticleCard({ article, editable }: { article: Article; editable: boolean }) {
  const t = useT();
  return (
    <article className="card-glow card-glow-interactive card-link p-4 flex flex-col">
      <div className="flex justify-between items-center gap-2 mb-3">
        <span className={visibilityBadgeClass(article.visibility)}>
          {visibilityLabel(article.visibility, t)}
        </span>
        {editable && (
          <Link href={`/articles/${article.id}/edit`} className="tap-target inline-flex items-center px-1 text-accent">
            {t.articleEditShort}
          </Link>
        )}
      </div>
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
