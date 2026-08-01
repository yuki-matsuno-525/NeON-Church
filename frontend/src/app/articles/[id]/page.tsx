"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import {
  fetchArticle,
  fetchArticles,
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

  useEffect(() => {
    let alive = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    fetchArticle(id)
      .then((data) => {
        if (!alive) return;
        setArticle(data);
        setLoading(false);
      })
      .catch(() => {
        if (!alive) return;
        setError(t.articleCannotRead);
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [id, t]);

  // 同じ主題の記事。最初のタグだけを見る（複数タグで混ぜると脈絡が薄くなるため）。
  useEffect(() => {
    const tag = article?.tags[0]?.slug;
    if (!tag) return;
    fetchArticles({ tag })
      .then((response) => setRelated(response.results.filter((item) => item.id !== id).slice(0, 5)))
      .catch(() => {});
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
        <p style={{ color: "var(--text-muted)" }}>{error ?? t.articleCannotRead}</p>
        <Link href="/articles" style={{ color: "var(--accent)" }}>
          {t.articleBackToList}
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
            {visibilityLabel(article.visibility, t)}
          </span>
        )}
        {isOwner && (
          <Link
            href={`/articles/${article.id}/edit`}
            style={{ marginLeft: "auto", fontSize: 13, color: "var(--accent)", textDecoration: "none" }}
          >
            {t.articleEdit}
          </Link>
        )}
      </div>

      <h1 style={{ fontFamily: "var(--font-serif)", fontSize: 26, fontWeight: 700, margin: "0 0 10px", lineHeight: 1.5 }}>
        {article.title}
      </h1>

      <div style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 13, color: "var(--text-muted)", marginBottom: 24, flexWrap: "wrap" }}>
        <Link href={`/profile/${article.owner_username}`} style={{ color: "var(--text-muted)", textDecoration: "none" }}>
          {article.owner_username}
        </Link>
        <span style={{ color: "var(--text-faint)" }}>{formatRelativeTime(article.created_at)}</span>
      </div>

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
                fontSize: 13,
                color: "var(--text-muted)",
                textDecoration: "none",
              }}
            >
              {articleTagLabel(tag.slug, tag.name, t)}
            </Link>
          ))}
        </div>
      )}

      {related.length > 0 && (
        <section style={{ marginTop: 36 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 12px" }}>{t.articleRelated}</h2>
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

      <ArticleComments articleId={article.id} />
    </div>
  );
}

const containerStyle: React.CSSProperties = {
  maxWidth: 720,
  margin: "0 auto",
  padding: "32px 16px 64px",
};
