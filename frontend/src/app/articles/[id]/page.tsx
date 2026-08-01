"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  fetchArticle,
  fetchArticles,
  formatRelativeTime,
  ApiError,
  type Article,
} from "@/lib/api";
import { visibilityLabel } from "@/lib/articles";
import { useAuth } from "@/contexts/AuthContext";
import { ArticleBody } from "@/components/articles/ArticleBody";
import { ArticleComments } from "@/components/articles/ArticleComments";
import { SkeletonList } from "@/components/ui";

export default function ArticleDetailPage({ params }: { params: Promise<{ id: string }> }) {
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
      if (reason instanceof ApiError && reason.status === 404) setError("この記事は見つかりませんでした。");
      else if (reason instanceof ApiError && (reason.status === 401 || reason.status === 403)) setError("この記事は非公開か、閲覧する権限がありません。");
      else setError("記事を読み込めませんでした。通信状態を確認して再試行してください。");
    } finally {
      setLoading(false);
    }
  }, [id]);

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
      <div style={containerStyle}>
        <SkeletonList count={3} />
      </div>
    );
  }

  if (error || !article) {
    return (
      <div style={containerStyle}>
        <p style={{ color: "var(--text-muted)" }}>{error ?? "この記事は読めません。"}</p>
        {error?.includes("読み込めません") && (
          <button type="button" onClick={() => void loadArticle()} style={retryButtonStyle}>再試行</button>
        )}
        <Link href="/articles" style={{ color: "var(--accent)" }}>
          記事の一覧へ
        </Link>
      </div>
    );
  }

  const isOwner = user?.username === article.owner_username;

  return (
    <div style={containerStyle}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        {article.visibility !== "public" && (
          <span className="badge" style={{ background: "rgba(255,255,255,0.08)", color: "var(--text-muted)" }}>
            {visibilityLabel(article.visibility)}
          </span>
        )}
        {isOwner && (
          <Link
            href={`/articles/${article.id}/edit`}
            style={{ marginLeft: "auto", fontSize: 13, color: "var(--accent)", textDecoration: "none" }}
          >
            編集する
          </Link>
        )}
      </div>

      <h1 style={{ fontFamily: '"Noto Serif JP", serif', fontSize: 26, fontWeight: 700, margin: "0 0 10px", lineHeight: 1.5 }}>
        {article.title}
      </h1>

      <div style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 13, color: "var(--text-muted)", marginBottom: 24, flexWrap: "wrap" }}>
        <Link href={`/profile/${article.owner_username}`} style={{ color: "var(--text-muted)", textDecoration: "none" }}>
          {article.owner_username}
        </Link>
        <time dateTime={article.created_at} title={new Date(article.created_at).toLocaleString("ja-JP")} style={{ color: "var(--text-muted)" }}>
          {formatRelativeTime(article.created_at)}
        </time>
      </div>

      {article.summary && <p style={{ margin: "0 0 28px", color: "var(--text-muted)", lineHeight: 1.8, fontSize: 15 }}>{article.summary}</p>}

      <ArticleBody body={article.body ?? ""} citations={article.citations ?? []} />

      {article.tags.length > 0 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 32 }}>
          {article.tags.map((tag) => (
            <Link
              key={tag.id}
              href={`/articles?tag=${tag.slug}`}
              style={{
                border: "1px solid var(--border)",
                borderRadius: 999,
                padding: "4px 12px",
                minHeight: 44,
                display: "inline-flex",
                alignItems: "center",
                fontSize: 13,
                color: "var(--text-muted)",
                textDecoration: "none",
              }}
            >
              {tag.name}
            </Link>
          ))}
        </div>
      )}

      {related.length > 0 && (
        <section style={{ marginTop: 36 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 12px" }}>同じ主題の記事</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {related.map((item) => (
              <Link
                key={item.id}
                href={`/articles/${item.id}`}
                className="card-glow card-glow-interactive"
                style={{ padding: "12px 14px", textDecoration: "none", color: "inherit" }}
              >
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>{item.title}</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{item.summary}</div>
              </Link>
            ))}
          </div>
        </section>
      )}
      {relatedLoading && <p role="status" style={{ marginTop: 24, color: "var(--text-muted)", fontSize: 13 }}>関連記事を読み込んでいます…</p>}
      {relatedError && <p role="alert" style={{ marginTop: 24, color: "var(--state-danger)", fontSize: 13 }}>関連記事を読み込めませんでした。</p>}

      <ArticleComments articleId={article.id} />
    </div>
  );
}

const containerStyle: React.CSSProperties = {
  maxWidth: 720,
  margin: "0 auto",
  padding: "32px 16px 64px",
};

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
