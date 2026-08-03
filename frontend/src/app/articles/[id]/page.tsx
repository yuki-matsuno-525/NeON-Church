import Link from "next/link";
import { ApiError, type Article } from "@/lib/api";
import { serverFetch, serverFetchPage } from "@/lib/apiServer";
import { getT } from "@/lib/i18nServer";
import { articleTagLabel, visibilityLabel } from "@/lib/articles";
import { ArticleBody } from "@/components/articles/ArticleBody";
import { ArticleComments } from "@/components/articles/ArticleComments";
import { ArticleOwnerActions } from "@/components/articles/ArticleOwnerActions";
import { RelativeTime } from "@/components/ui/RelativeTime";

/**
 * 記事を読む画面。
 *
 * ここはサーバー側で本文まで組み立てる。以前は画面が出てから記事を取りに
 * 行っていたので、開いた直後は空の枠が出ていた。読むだけの画面なので、
 * 先に中身の入った状態を返せる。
 *
 * ブラウザ側に残しているのは、見ている人によって変わる部分だけ:
 * 書き手にだけ出す「編集」（ArticleOwnerActions）と、コメント欄。
 */
export default async function ArticleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await getT();

  let article: Article;
  try {
    article = await serverFetch<Article>(`/articles/${id}/`);
  } catch (reason) {
    const status = reason instanceof ApiError ? reason.status : 0;
    const message =
      status === 404 ? t.articleNotFound : status === 401 || status === 403 ? t.articlePrivate : t.articleLoadFailed;
    return (
      <div className="page page-detail">
        <p className="text-muted">{message}</p>
        <Link href="/articles" className="text-accent">
          {t.articleBackToList}
        </Link>
      </div>
    );
  }

  // 同じ主題の記事。最初のタグだけを見る（複数タグで混ぜると脈絡が薄くなるため）。
  // ここが取れなくても本文は読めるので、失敗したら黙って出さない。
  const tag = article.tags[0]?.slug;
  const related = tag
    ? await serverFetchPage<Article>(`/articles/?tag=${encodeURIComponent(tag)}`)
        .then((page) => page.results.filter((item) => item.id !== id).slice(0, 5))
        .catch(() => [])
    : [];

  return (
    <div className="page page-detail">
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        {article.visibility !== "public" && (
          <span className="badge" style={{ background: "rgba(255,255,255,0.08)", color: "var(--text-muted)" }}>
            {visibilityLabel(article.visibility, t)}
          </span>
        )}
        <ArticleOwnerActions articleId={article.id} ownerUsername={article.owner_username} />
      </div>

      <h1 className="font-serif text-2xl font-bold mt-0 mx-0 mb-3 leading-tight">
        {article.title}
      </h1>

      <div className="flex gap-3 items-center text-sm text-muted mb-6 flex-wrap">
        <Link href={`/profile/${article.owner_username}`} className="text-muted no-underline">
          {article.owner_username}
        </Link>
        <RelativeTime dateStr={article.created_at} className="text-muted" />
      </div>

      {article.summary && <p className="mt-0 mx-0 mb-6 text-muted leading-reading text-sm">{article.summary}</p>}

      <ArticleBody body={article.body ?? ""} citations={article.citations ?? []} />

      {article.tags.length > 0 && (
        <div className="flex gap-2 flex-wrap mt-8">
          {article.tags.map((articleTag) => (
            <Link
              key={articleTag.id}
              href={`/articles?tag=${articleTag.slug}`}
              className="border border-border rounded-full py-1 px-3 tap-target inline-flex items-center text-sm text-muted no-underline"
            >
              {articleTagLabel(articleTag.slug, articleTag.name, t)}
            </Link>
          ))}
        </div>
      )}

      {related.length > 0 && (
        <section className="mt-8">
          <h2 className="text-md font-bold mt-0 mx-0 mb-3">{t.articleRelated}</h2>
          <div className="flex flex-col gap-2">
            {related.map((item) => (
              <Link
                key={item.id}
                href={`/articles/${item.id}`}
                className="card-glow card-glow-interactive py-3 px-3 no-underline text-inherit"
              >
                <div className="text-sm font-bold mb-1">{item.title}</div>
                <div className="text-xs text-muted">{item.summary}</div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <ArticleComments articleId={article.id} />
    </div>
  );
}
