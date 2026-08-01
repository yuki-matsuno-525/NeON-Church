"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { fetchArticles, fetchArticleTags, type Article, type ArticleTag } from "@/lib/api";
import { articleTagLabel, visibilityLabel } from "@/lib/articles";
import { useT } from "@/lib/i18n";
import { useAuth } from "@/contexts/AuthContext";
import { Icon, type IconName } from "@/components/ui/Icon";
import { LoadMoreButton, SkeletonList } from "@/components/ui";

type ArticleFeed = {
  articles: Article[];
  total: number;
  nextPage: number;
  hasMore: boolean;
  loading: boolean;
  error: string | null;
};

const emptyFeed: ArticleFeed = {
  articles: [],
  total: 0,
  nextPage: 1,
  hasMore: false,
  loading: true,
  error: null,
};

export default function ArticlesPage() {
  const t = useT();
  const { user } = useAuth();
  const [publicFeed, setPublicFeed] = useState<ArticleFeed>(emptyFeed);
  const [myFeed, setMyFeed] = useState<ArticleFeed>(emptyFeed);
  const [tags, setTags] = useState<ArticleTag[]>([]);
  const [tagError, setTagError] = useState(false);
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const loadTags = useCallback(async () => {
    setTagError(false);
    try {
      setTags(await fetchArticleTags());
    } catch {
      setTagError(true);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadTags();
  }, [loadTags]);

  useEffect(() => {
    const syncFromUrl = () => setActiveTag(new URLSearchParams(window.location.search).get("tag"));
    syncFromUrl();
    window.addEventListener("popstate", syncFromUrl);
    return () => window.removeEventListener("popstate", syncFromUrl);
  }, []);

  const loadFeed = useCallback(async (kind: "public" | "mine", page: number, append: boolean) => {
    const setter = kind === "public" ? setPublicFeed : setMyFeed;
    setter((current) => ({ ...current, loading: true, error: null }));
    try {
      const response = await fetchArticles({
        mine: kind === "mine" || undefined,
        excludeMine: kind === "public" && !!user || undefined,
        tag: activeTag ?? undefined,
        page,
      });
      setter((current) => ({
        articles: append ? [...current.articles, ...response.results.filter((item) => !current.articles.some((old) => old.id === item.id))] : response.results,
        total: response.count,
        nextPage: page + 1,
        hasMore: response.next !== null,
        loading: false,
        error: null,
      }));
    } catch {
      setter((current) => ({ ...current, loading: false, error: t.articleLoadFailed }));
    }
  }, [activeTag, t.articleLoadFailed, user]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadFeed("public", 1, false);
    if (user) void loadFeed("mine", 1, false);
    else setMyFeed({ ...emptyFeed, loading: false });
  }, [loadFeed, user]);

  const selectTag = (tag: string | null) => {
    setActiveTag(tag);
    const params = new URLSearchParams(window.location.search);
    if (tag) params.set("tag", tag);
    else params.delete("tag");
    const query = params.toString();
    window.history.pushState(null, "", query ? `/articles?${query}` : "/articles");
  };

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 16px" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>{t.articlesTitle}</h1>
          <p style={{ color: "var(--text-muted)", fontSize: 14, margin: "4px 0 0" }}>
            {t.articlesDesc}
          </p>
        </div>
        {user ? (
          <Link href="/articles/new" style={newButtonStyle}>{t.articleNew}</Link>
        ) : (
          <Link href="/login?from=%2Farticles%2Fnew" style={secondaryLinkStyle}>{t.articleLoginToWrite}</Link>
        )}
      </div>

      <div role="group" aria-label={t.articleTopicsLabel} style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
        <TagChip label={t.articleAllTopics} active={activeTag === null} onClick={() => selectTag(null)} />
        {tags.map((tag) => (
          <TagChip key={tag.id} label={articleTagLabel(tag.slug, tag.name, t)} count={tag.article_count} active={activeTag === tag.slug} onClick={() => selectTag(tag.slug)} />
        ))}
        {tagError && (
          <span role="alert" style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--state-danger)" }}>
            {t.articleTopicsLoadFailed}
            <button type="button" onClick={() => void loadTags()} style={inlineRetryStyle}>{t.retry}</button>
          </span>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))", gap: 16, alignItems: "start" }}>
        {user && (
          <ArticleColumn
            title={t.articleMineTitle}
            desc={t.articleMineDesc}
            icon="book-open"
            color="var(--accent)"
            tint="var(--accent-tint)"
            feed={myFeed}
            empty={t.articleMineEmpty}
            editable
            onRetry={() => void loadFeed("mine", 1, false)}
            onLoadMore={() => void loadFeed("mine", myFeed.nextPage, true)}
          />
        )}
        <ArticleColumn
          title={t.articlePublicTitle}
          desc={t.articlePublicDesc}
          icon="globe"
          color="var(--state-success)"
          tint="rgba(34,197,94,0.15)"
          feed={publicFeed}
          empty={t.articlePublicEmpty}
          onRetry={() => void loadFeed("public", 1, false)}
          onLoadMore={() => void loadFeed("public", publicFeed.nextPage, true)}
        />
      </div>
    </div>
  );
}

function TagChip({ label, count, active, onClick }: { label: string; count?: number; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active} style={{
      border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
      background: active ? "var(--accent-tint)" : "transparent",
      color: active ? "var(--accent)" : "var(--text-muted)",
      borderRadius: 999,
      padding: "8px 14px",
      minHeight: 44,
      fontSize: 13,
      fontWeight: active ? 700 : 400,
      cursor: "pointer",
      fontFamily: "inherit",
    }}>
      {label}{count !== undefined && <span style={{ marginLeft: 5, fontSize: 11 }}>({count})</span>}
    </button>
  );
}

function ArticleColumn({
  title, desc, icon, color, tint, feed, empty, editable = false, onRetry, onLoadMore,
}: {
  title: string;
  desc: string;
  icon: IconName;
  color: string;
  tint: string;
  feed: ArticleFeed;
  empty: string;
  editable?: boolean;
  onRetry: () => void;
  onLoadMore: () => void;
}) {
  const t = useT();
  return (
    <section style={columnStyle} aria-busy={feed.loading}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span aria-hidden="true" style={{ color, display: "inline-flex" }}><Icon name={icon} size={18} /></span>
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>{title}</h2>
          <span aria-label={`${feed.total}件`} style={{ ...countBadgeStyle, background: tint, color }}>{feed.total}</span>
        </div>
        <p style={{ margin: "6px 0 0", fontSize: 12, color: "var(--text-muted)" }}>{desc}</p>
      </div>

      {feed.loading && feed.articles.length === 0 ? (
        <SkeletonList count={2} />
      ) : feed.error && feed.articles.length === 0 ? (
        <div role="alert">
          <p style={{ color: "var(--state-danger)", fontSize: 13 }}>{feed.error}</p>
          <button type="button" onClick={onRetry} style={inlineRetryStyle}>{t.retry}</button>
        </div>
      ) : feed.articles.length === 0 ? (
        <p style={{ fontSize: 13, color: "var(--text-muted)", padding: "8px 2px" }}>{empty}</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {feed.articles.map((article) => <ArticleCard key={article.id} article={article} editable={editable} />)}
        </div>
      )}

      {feed.error && feed.articles.length > 0 && <p role="alert" style={{ color: "var(--state-danger)", fontSize: 12 }}>{feed.error}</p>}
      <LoadMoreButton hasMore={feed.hasMore || !!feed.error} loading={feed.loading} error={!!feed.error} onClick={feed.error ? onRetry : onLoadMore} />
    </section>
  );
}

function ArticleCard({ article, editable }: { article: Article; editable: boolean }) {
  const t = useT();
  const isPublic = article.visibility === "public";
  return (
    <article className="card-glow" style={{ padding: 16, display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <span className="badge" style={{ background: isPublic ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.08)", color: isPublic ? "var(--state-success)" : "var(--text-muted)" }}>
          {visibilityLabel(article.visibility, t)}
        </span>
        {editable && <Link href={`/articles/${article.id}/edit`} style={{ color: "var(--accent)", minHeight: 44, display: "inline-flex", alignItems: "center", padding: "0 6px" }}>{t.articleEditShort}</Link>}
      </div>
      <h3 style={{ fontFamily: '"Noto Serif JP", serif', fontSize: "var(--font-size-md)", fontWeight: 700, margin: "0 0 var(--space-2)" }}>
        <Link href={`/articles/${article.id}`} style={{ color: "inherit", textDecoration: "none" }}>{article.title}</Link>
      </h3>
      {article.summary && <p style={{ margin: "0 0 var(--space-2)", fontSize: "var(--font-size-sm)", color: "var(--text-muted)", lineHeight: 1.6 }}>{article.summary}</p>}
      <div style={{ display: "flex", gap: 6, fontSize: "var(--font-size-xs)", color: "var(--text-muted)", flexWrap: "wrap" }}>
        <Link href={`/profile/${article.owner_username}`} style={{ ...metaPillStyle, textDecoration: "none" }}>{article.owner_username}</Link>
        {article.tags.map((tag) => <Link key={tag.id} href={`/articles?tag=${tag.slug}`} style={{ ...metaPillStyle, textDecoration: "none" }}>{articleTagLabel(tag.slug, tag.name, t)}</Link>)}
      </div>
    </article>
  );
}

const columnStyle: React.CSSProperties = { padding: "18px 16px", border: "1px solid var(--border)", borderRadius: 14, background: "rgba(255,255,255,0.02)" };
const countBadgeStyle: React.CSSProperties = { display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: 22, height: 22, padding: "0 7px", borderRadius: 999, fontSize: 12, fontWeight: 700 };
const metaPillStyle: React.CSSProperties = { display: "inline-flex", alignItems: "center", minHeight: 44, padding: "8px 10px", borderRadius: 6, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)", color: "var(--text-muted)" };
const newButtonStyle: React.CSSProperties = { background: "var(--accent)", color: "var(--accent-text)", borderRadius: 8, padding: "10px 18px", minHeight: 44, display: "inline-flex", alignItems: "center", textDecoration: "none", fontWeight: 700, fontSize: 14 };
const secondaryLinkStyle: React.CSSProperties = { ...newButtonStyle, background: "transparent", color: "var(--accent)", border: "1px solid var(--accent)" };
const inlineRetryStyle: React.CSSProperties = { minHeight: 44, padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--text)", cursor: "pointer", fontFamily: "inherit" };
