import Link from "next/link";
import { articleListPath, type Article, type ArticleTag, type ListPage } from "@/lib/api";
import { articleTagLabel } from "@/lib/articles";
import { serverFetchList, serverFetchPage, serverIsSignedIn } from "@/lib/apiServer";
import { getT } from "@/lib/i18nServer";
import { ListPageHeader } from "@/components/list";
import { ArticleFeedColumn } from "@/components/articles/ArticleFeedColumn";

/**
 * 記事の一覧。
 *
 * 1 ページ目はここ（サーバー側）で取る。以前は画面が出てから取りに行っていたので、
 * 開いた直後は空の枠が並んでいた。
 *
 * ブラウザ側に残しているのは「もっと見る」で続きを読み足すところだけ。
 * 主題での絞り込みは URL の tag で表すようにしたので、押すと別の URL へ移り、
 * 移った先をまたサーバーが組み立てて返す。
 */
export default async function ArticlesPage({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string }>;
}) {
  const { tag } = await searchParams;
  const t = await getT();
  const signedIn = await serverIsSignedIn();

  // 一覧が取れなくても他の部分は出したいので、それぞれ個別に受け止める。
  // 取れなかった一覧は initial なしで渡し、ブラウザ側の取り直しに任せる。
  const [tags, publicFeed, myFeed] = await Promise.all([
    serverFetchList<ArticleTag>("/article-tags/").catch(() => null),
    loadFeed({ excludeMine: signedIn || undefined, tag }),
    signedIn ? loadFeed({ mine: true, tag }) : undefined,
  ]);

  return (
    <div className="page page-full">
      <ListPageHeader
        title={t.articlesTitle}
        description={t.articlesDesc}
        action={
          signedIn ? (
            <Link href="/articles/new" className="cta-button">{t.articleNew}</Link>
          ) : (
            <Link href="/login?from=%2Farticles%2Fnew" className="cta-button cta-button-outline">
              {t.articleLoginToWrite}
            </Link>
          )
        }
      />

      <div role="group" aria-label={t.articleTopicsLabel} className="flex flex-wrap gap-2 mb-4">
        <TagChip label={t.articleAllTopics} href="/articles" active={!tag} />
        {(tags ?? []).map((articleTag) => (
          <TagChip
            key={articleTag.id}
            label={articleTagLabel(articleTag.slug, articleTag.name, t)}
            count={articleTag.article_count}
            href={`/articles?tag=${encodeURIComponent(articleTag.slug)}`}
            active={tag === articleTag.slug}
          />
        ))}
        {tags === null && (
          <span role="alert" className="inline-flex items-center gap-2 text-xs text-danger">
            {t.articleTopicsLoadFailed}
          </span>
        )}
      </div>

      <div className="list-board">
        {signedIn && (
          <ArticleFeedColumn
            title={t.articleMineTitle}
            description={t.articleMineDesc}
            icon="book-open"
            tone="active"
            empty={t.articleMineEmpty}
            editable
            mine
            tag={tag}
            initial={myFeed}
          />
        )}
        <ArticleFeedColumn
          title={t.articlePublicTitle}
          description={t.articlePublicDesc}
          icon="globe"
          tone="ok"
          empty={t.articlePublicEmpty}
          excludeMine={signedIn || undefined}
          tag={tag}
          initial={publicFeed}
        />
      </div>
    </div>
  );
}

/** 一覧の 1 ページ目。取れなければ undefined を返し、ブラウザ側に任せる。 */
function loadFeed(params: { mine?: boolean; excludeMine?: boolean; tag?: string }): Promise<ListPage<Article> | undefined> {
  return serverFetchPage<Article>(articleListPath(params)).catch(() => undefined);
}

function TagChip({ label, count, href, active }: { label: string; count?: number; href: string; active: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`chip chip-bold${active ? " chip-active" : ""}`}
    >
      {label}
      {count !== undefined && <span className="ml-1 text-xs">({count})</span>}
    </Link>
  );
}
