"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchArticles, fetchArticleTags, type Article, type ArticleTag } from "@/lib/api";
import { visibilityLabel } from "@/lib/articles";
import { useAuth } from "@/contexts/AuthContext";
import { Icon, type IconName } from "@/components/ui/Icon";
import { SkeletonList } from "@/components/ui";

export default function ArticlesPage() {
  const { user } = useAuth();
  const [publicArticles, setPublicArticles] = useState<Article[]>([]);
  const [myArticles, setMyArticles] = useState<Article[]>([]);
  const [tags, setTags] = useState<ArticleTag[]>([]);
  // 選んでいる主題。null は「すべて」。
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchArticleTags().then(setTags).catch(() => {});
  }, []);

  useEffect(() => {
    let alive = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    const tag = activeTag ?? undefined;
    Promise.all([
      fetchArticles({ tag }).then((r) => r.results).catch(() => []),
      user ? fetchArticles({ mine: true, tag }).then((r) => r.results).catch(() => []) : Promise.resolve([]),
    ]).then(([published, mine]) => {
      if (!alive) return;
      setPublicArticles(published);
      setMyArticles(mine);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [user, activeTag]);

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 16px" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>記事</h1>
          <p style={{ color: "var(--text-muted)", fontSize: 14, margin: "4px 0 0" }}>
            節を引きながら、主題について書いた文章。
          </p>
        </div>
        {user && (
          <Link href="/articles/new" style={newButtonStyle}>
            新しく書く
          </Link>
        )}
      </div>

      {tags.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
          <TagChip label="すべて" active={activeTag === null} onClick={() => setActiveTag(null)} />
          {tags.map((tag) => (
            <TagChip
              key={tag.id}
              label={tag.name}
              count={tag.article_count}
              active={activeTag === tag.slug}
              onClick={() => setActiveTag(tag.slug)}
            />
          ))}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16, alignItems: "start" }}>
        {user && (
          <ArticleColumn
            title="自分の記事"
            desc="下書きも含めて、自分が書いた記事。"
            icon="book-open"
            color="var(--accent)"
            tint="var(--accent-tint)"
            articles={myArticles}
            loading={loading}
            empty="まだ記事がありません。"
            editable
          />
        )}
        <ArticleColumn
          title="公開された記事"
          desc="誰でも読める記事。"
          icon="globe"
          color="var(--state-success)"
          tint="rgba(34,197,94,0.15)"
          articles={publicArticles}
          loading={loading}
          empty="公開された記事はまだありません。"
        />
      </div>
    </div>
  );
}

function TagChip({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count?: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
        background: active ? "var(--accent-tint)" : "transparent",
        color: active ? "var(--accent)" : "var(--text-muted)",
        borderRadius: 999,
        padding: "5px 12px",
        minHeight: 32,
        fontSize: 13,
        fontWeight: active ? 700 : 400,
        cursor: "pointer",
        fontFamily: "inherit",
      }}
    >
      {label}
      {count !== undefined && <span style={{ marginLeft: 5, fontSize: 11 }}>{count}</span>}
    </button>
  );
}

function ArticleColumn({
  title,
  desc,
  icon,
  color,
  tint,
  articles,
  loading,
  empty,
  editable = false,
}: {
  title: string;
  desc: string;
  icon: IconName;
  color: string;
  tint: string;
  articles: Article[];
  loading: boolean;
  empty: string;
  editable?: boolean;
}) {
  return (
    <section style={columnStyle}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color, display: "inline-flex" }}>
            <Icon name={icon} size={18} />
          </span>
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>{title}</h2>
          <span style={{ ...countBadgeStyle, background: tint, color }}>{articles.length}</span>
        </div>
        <p style={{ margin: "6px 0 0", fontSize: 12, color: "var(--text-muted)" }}>{desc}</p>
      </div>

      {loading ? (
        <SkeletonList count={2} />
      ) : articles.length === 0 ? (
        <p style={{ fontSize: 13, color: "var(--text-faint)", padding: "8px 2px" }}>{empty}</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {articles.map((article) => (
            <ArticleCard key={article.id} article={article} editable={editable} />
          ))}
        </div>
      )}
    </section>
  );
}

function ArticleCard({ article, editable }: { article: Article; editable: boolean }) {
  const isPublic = article.visibility === "public";
  return (
    <Link
      href={editable ? `/articles/${article.id}/edit` : `/articles/${article.id}`}
      style={{ textDecoration: "none", color: "inherit" }}
    >
      <div className="card-glow card-glow-interactive" style={{ padding: 16, display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
          <span
            className="badge"
            style={{
              background: isPublic ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.08)",
              color: isPublic ? "var(--state-success)" : "var(--text-muted)",
            }}
          >
            {visibilityLabel(article.visibility)}
          </span>
        </div>

        <h3 style={{ fontFamily: '"Noto Serif JP", serif', fontSize: "var(--font-size-md)", fontWeight: 700, margin: "0 0 var(--space-2)" }}>
          {article.title}
        </h3>

        {article.summary && (
          <p style={{ margin: "0 0 var(--space-2)", fontSize: "var(--font-size-sm)", color: "var(--text-muted)", lineHeight: 1.6 }}>
            {article.summary}
          </p>
        )}

        <div style={{ display: "flex", gap: 6, fontSize: "var(--font-size-xs)", color: "var(--text-faint)", flexWrap: "wrap" }}>
          <span style={metaPillStyle}>{article.owner_username}</span>
          {article.tags.map((tag) => (
            <span key={tag.id} style={metaPillStyle}>
              {tag.name}
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
}

const columnStyle: React.CSSProperties = {
  padding: "18px 16px",
  border: "1px solid var(--border)",
  borderRadius: 14,
  background: "rgba(255,255,255,0.02)",
};

const countBadgeStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: 22,
  height: 22,
  padding: "0 7px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 700,
};

const metaPillStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  minHeight: 24,
  padding: "2px 8px",
  borderRadius: 6,
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.10)",
  color: "var(--text-muted)",
};

const newButtonStyle: React.CSSProperties = {
  background: "var(--accent)",
  color: "var(--accent-text)",
  borderRadius: 8,
  padding: "8px 18px",
  textDecoration: "none",
  fontWeight: 700,
  fontSize: 14,
};
