"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  fetchArticle,
  fetchArticles,
  ApiError,
  type Article,
} from "@/lib/api";
import { articleTagLabel, visibilityLabel } from "@/lib/articles";
import { useRelativeTime, useT } from "@/lib/i18n";
import { useAuth } from "@/contexts/AuthContext";
import { ArticleBody } from "@/components/articles/ArticleBody";
import { ArticleComments } from "@/components/articles/ArticleComments";
import { SkeletonList } from "@/components/ui";

export default function ArticleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const t = useT();
  const formatRelativeTime = useRelativeTime();
  const { id } = use(params);
  const { user } = useAuth();
  const [article, setArticle] = useState<Article | null>(null);
  const [related, setRelated] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [relatedLoading, setRelatedLoading] = useState(false);
  const [relatedError, setRelatedError] = useState(false);

  const loadArticle = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setArticle(await fetchArticle(id));
    } catch (reason) {
      if (reason instanceof ApiError && reason.status === 404) setError(t.articleNotFound);
      else if (reason instanceof ApiError && (reason.status === 401 || reason.status === 403)) setError(t.articlePrivate);
      else setError(t.articleLoadFailed);
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadArticle();
  }, [loadArticle]);

  // 同じ主題の記事。最初のタグだけを見る（複数タグで混ぜると脈絡が薄くなるため）。
  useEffect(() => {
    const tag = article?.tags[0]?.slug;
    if (!tag) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRelatedLoading(true);
    setRelatedError(false);
    fetchArticles({ tag })
      .then((response) => setRelated(response.results.filter((item) => item.id !== id).slice(0, 5)))
      .catch(() => setRelatedError(true))
      .finally(() => setRelatedLoading(false));
  }, [article, id]);

  if (loading) {
    return (
      <div className="page page-detail">
        <SkeletonList count={3} />
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="page page-detail">
        <p className="text-muted">{error ?? t.articleCannotRead}</p>
        {error === t.articleLoadFailed && (
          <button type="button" onClick={() => void loadArticle()} style={retryButtonStyle}>{t.retry}</button>
        )}
        <Link href="/articles" className="text-accent">
          {t.articleBackToList}
        </Link>
      </div>
    );
  }

  const isOwner = user?.username === article.owner_username;

  return (
    <div className="page page-detail">
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        {article.visibility !== "public" && (
          <span className="badge" style={{ background: "rgba(255,255,255,0.08)", color: "var(--text-muted)" }}>
            {visibilityLabel(article.visibility, t)}
          </span>
        )}
        {isOwner && (
          <Link
            href={`/articles/${article.id}/edit`}
            className="ml-auto text-sm text-accent no-underline"
          >
            {t.articleEdit}
          </Link>
        )}
      </div>

      <h1 style={{ fontFamily: "var(--font-serif)", fontSize: 26, fontWeight: 700, margin: "0 0 10px", lineHeight: 1.5 }}>
        {article.title}
      </h1>

      <div className="flex gap-3 items-center text-sm text-muted mb-6 flex-wrap">
        <Link href={`/profile/${article.owner_username}`} className="text-muted no-underline">
          {article.owner_username}
        </Link>
        <time dateTime={article.created_at} title={new Date(article.created_at).toLocaleString("ja-JP")} className="text-muted">
          {formatRelativeTime(article.created_at)}
        </time>
      </div>

      {article.summary && <p className="mt-0 mx-0 mb-6 text-muted leading-reading text-sm">{article.summary}</p>}

      <ArticleBody body={article.body ?? ""} citations={article.citations ?? []} />

      {article.tags.length > 0 && (
        <div className="flex gap-2 flex-wrap mt-8">
          {article.tags.map((tag) => (
            <Link
              key={tag.id}
              href={`/articles?tag=${tag.slug}`}
              className="border border-border rounded-full py-1 px-3 tap-target inline-flex items-center text-sm text-muted no-underline"
            >
              {articleTagLabel(tag.slug, tag.name, t)}
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
      {relatedLoading && <p role="status" className="mt-6 text-muted text-sm">関連記事を読み込んでいます…</p>}
      {relatedError && <p role="alert" className="mt-6 text-danger text-sm">関連記事を読み込めませんでした。</p>}

      <ArticleComments articleId={article.id} />
    </div>
  );
}


const retryButtonStyle: React.CSSProperties = {
  minHeight: 44,
  margin: "0 12px 16px 0",
  padding: "8px 14px",
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "transparent",
  color: "var(--text)",
  cursor: "pointer",
  fontFamily: "inherit",
};
