import Link from "next/link";
import { articleListPath, type Article, type ArticleTag, type ListPage } from "@/lib/api";
import { articleTagLabel } from "@/lib/articles";
import { serverFetchList, serverFetchPage, serverIsSignedIn } from "@/lib/apiServer";
import { getT } from "@/lib/i18nServer";
import type { Translations } from "@/lib/i18n";
import { LinkTabs, ListPageHeader, TabPanel } from "@/components/list";
import { EmptyState } from "@/components/ui";
import { Icon } from "@/components/ui/Icon";
import { ArticleFeed } from "@/components/articles/ArticleFeed";

/* ----- 一覧の切り替え -----
   以前は「公開された記事」と「自分の記事」を 2 列で横に並べていた。
   プランの画面と同じタブに揃える。どのタブを見ているかは URL（?tab=）で表す。
   この画面はサーバー側で組み立てるのでブラウザ側の状態を持てず、
   また URL に出るぶん、その場所をそのまま人に渡せる。 */
const ARTICLE_TABS = ["public", "mine"] as const;
type ArticleTabKey = (typeof ARTICLE_TABS)[number];

/**
 * 記事の一覧。
 *
 * いま開いているタブの 1 ページ目だけをここ（サーバー側）で取る。
 * 以前は 2 列ぶんをどちらも取っていたので、見えない側まで毎回取りに行っていた。
 *
 * 「公開された記事」には自分の記事も混ぜる。列を横に並べていた頃は同じものが
 * 2 か所に出てしまうので自分のぶんを除いていたが、タブなら一度に見えないうえ、
 * 公開したものが公開の一覧に出ないほうが分かりにくい（プランの「さがす」と同じ）。
 *
 * ブラウザ側に残しているのは「もっと見る」で続きを読み足すところだけ。
 * 主題での絞り込みも URL の tag で表すので、押すと別の URL へ移り、
 * 移った先をまたサーバーが組み立てて返す。
 */
export default async function ArticlesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; tag?: string }>;
}) {
  const { tab, tag } = await searchParams;
  const t = await getT();
  const signedIn = await serverIsSignedIn();
  const activeTab: ArticleTabKey =
    ARTICLE_TABS.includes(tab as ArticleTabKey) ? (tab as ArticleTabKey) : "public";

  // 一覧が取れなくても他の部分は出したいので、それぞれ個別に受け止める。
  // 取れなかった一覧は initial なしで渡し、ブラウザ側の取り直しに任せる。
  const [tags, feed] = await Promise.all([
    serverFetchList<ArticleTag>("/article-tags/").catch(() => null),
    activeTab === "mine"
      ? signedIn ? loadFeed({ mine: true, tag }) : undefined
      : loadFeed({ tag }),
  ]);

  const tabLabel = (key: ArticleTabKey) =>
    key === "public" ? t.articlePublicTitle : t.articleMineTitle;

  return (
    <div className="page page-full">
      <ListPageHeader
        title={t.articlesTitle}
        description={t.articlesDesc}
        action={
          signedIn ? (
            <Link href="/articles/new" className="cta-button">{t.articleNew}</Link>
          ) : (
            <Link href="/login?from=%2Farticles%2Fnew" className="cta-button">
              {t.articleLoginToWrite}
            </Link>
          )
        }
      />

      {/* 未ログインでもタブは 2 つとも出す。書いたものが自分の場所にたまる仕組みだと
          先に分かるほうが、ログインする理由が伝わるため。 */}
      <LinkTabs
        tabs={ARTICLE_TABS.map((key) => ({
          key,
          label: tabLabel(key),
          href: articlesHref(key, tag),
        }))}
        active={activeTab}
        label={t.articleTabsLabel}
        idPrefix="articles"
      />

      {/* 主題はタブの中を絞るものなので、タブより下に置く。タブを移っても保つ。 */}
      <div role="group" aria-label={t.articleTopicsLabel} className="flex flex-wrap gap-2 mb-4">
        <TagChip label={t.articleAllTopics} href={articlesHref(activeTab)} active={!tag} />
        {(tags ?? []).map((articleTag) => (
          <TagChip
            key={articleTag.id}
            label={articleTagLabel(articleTag.slug, articleTag.name, t)}
            count={articleTag.article_count}
            href={articlesHref(activeTab, articleTag.slug)}
            active={tag === articleTag.slug}
          />
        ))}
        {tags === null && (
          <span role="alert" className="inline-flex items-center gap-2 text-xs text-danger">
            {t.articleTopicsLoadFailed}
          </span>
        )}
      </div>

      {activeTab === "mine" && !signedIn ? (
        <SignInPanel t={t} />
      ) : (
        <TabPanel idPrefix="articles" tabKey={activeTab}>
          <ArticleFeed
            empty={activeTab === "mine" ? t.articleMineEmpty : t.articlePublicEmpty}
            editable={activeTab === "mine"}
            mine={activeTab === "mine" || undefined}
            tag={tag}
            initial={feed}
          />
        </TabPanel>
      )}
    </div>
  );
}

/**
 * 未ログインで「自分の記事」を開いたときに、一覧の代わりに置くログインの案内。
 *
 * ここで LoginRequiredModal を使わないのは、あれが押したときに出す覆いで
 * "use client" が付いているため。使うとこの画面ごとブラウザ側に回ってしまう。
 * EmptyState は受け取ったものを描くだけなのでサーバー側から呼べる。
 */
function SignInPanel({ t }: { t: Translations }) {
  return (
    <TabPanel idPrefix="articles" tabKey="mine">
      <EmptyState
        icon={<Icon name="lock" size={36} />}
        title={t.loginRequired}
        description={t.articleSignInMine}
        action={
          <Link href={`/login?from=${encodeURIComponent("/articles?tab=mine")}`} className="btn btn-primary">
            {t.loginBtn}
          </Link>
        }
      />
    </TabPanel>
  );
}

/** タブと主題を保った /articles の URL。既定のタブと空の主題は書かない。 */
function articlesHref(tab: ArticleTabKey, tag?: string): string {
  const qs = new URLSearchParams();
  if (tab !== "public") qs.set("tab", tab);
  if (tag) qs.set("tag", tag);
  const query = qs.toString();
  return query ? `/articles?${query}` : "/articles";
}

/** 一覧の 1 ページ目。取れなければ undefined を返し、ブラウザ側に任せる。 */
function loadFeed(params: { mine?: boolean; tag?: string }): Promise<ListPage<Article> | undefined> {
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
