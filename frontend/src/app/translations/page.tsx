"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { fetchTranslations, type TranslationProject } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useT } from "@/lib/i18n";
import { languageLabel } from "@/lib/languages";
import { SkeletonList, EmptyState, Button } from "@/components/ui";
import { Icon, type IconName } from "@/components/ui/Icon";

const PAGE_SIZE = 10;

const STATUS_STYLE: Record<string, { bg: string; color: string; icon: IconName }> = {
  active:    { bg: "var(--accent-tint)",           color: "var(--accent)",        icon: "circle-dot" },
  published: { bg: "rgba(34,197,94,0.15)",          color: "var(--state-success)", icon: "check-circle" },
};

export default function TranslationsPage() {
  const t = useT();
  return (
    <Suspense fallback={<div style={{ padding: 32, color: "var(--text-muted)" }}>{t.loading}</div>}>
      <TranslationsContent />
    </Suspense>
  );
}

function TranslationsContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const t = useT();
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const [projects, setProjects] = useState<TranslationProject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTranslations()
      .then(setProjects)
      .catch(() => setProjects([]))
      .finally(() => setLoading(false));
  }, []);

  const statusLabel = (status: string) => {
    if (status === "active") return t.statusActive;
    if (status === "published") return t.statusPublished;
    return status;
  };

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "32px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>{t.translationsTitle}</h1>
          <p style={{ color: "var(--text-muted)", fontSize: 14, margin: "4px 0 0" }}>
            {t.translationsDesc}
          </p>
        </div>
        {user && (
          <Link
            href="/translations/new"
            style={{
              background: "var(--accent)",
              color: "var(--accent-text)",
              borderRadius: 8,
              padding: "8px 18px",
              textDecoration: "none",
              fontWeight: 700,
              fontSize: 14,
            }}
          >
            {t.newProject}
          </Link>
        )}
      </div>

      {loading ? (
        <SkeletonList count={3} />
      ) : projects.length === 0 ? (
        <EmptyState
          title={t.noProjects}
          description={t.emptyTranslationsDesc}
          action={
            user ? (
              <Link href="/translations/new" style={{ textDecoration: "none" }}>
                <Button variant="primary">{t.emptyTranslationsCta}</Button>
              </Link>
            ) : undefined
          }
        />
      ) : (() => {
        const totalPages = Math.ceil(projects.length / PAGE_SIZE);
        const safePage = Math.min(page, Math.max(1, totalPages));
        const pageItems = projects.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
        const goTo = (p: number) => router.push(`/translations?page=${p}`);
        return (
          <>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 12 }}>
          {pageItems.map((p) => {
            const st = STATUS_STYLE[p.status] ?? { bg: "var(--bg-hover)", color: "var(--text-muted)", icon: "lock" as IconName };
            return (
              <Link
                key={p.id}
                href={`/translations/${p.id}`}
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <div
                  className="card card-hover"
                  style={{
                    transition: "border-color var(--duration-fast) var(--ease-out), box-shadow var(--duration-fast) var(--ease-out)",
                    height: "100%",
                  }}
                  onMouseEnter={(e) => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.borderColor = "var(--accent)";
                    el.style.boxShadow = "var(--shadow-card)";
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.borderColor = "var(--border)";
                    el.style.boxShadow = "none";
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: "var(--space-2)" }}>
                    <h3 style={{ fontFamily: '"Noto Serif JP", serif', fontSize: "var(--font-size-md)", fontWeight: 700, flex: 1, margin: 0 }}>{p.name}</h3>
                    <span
                      className="badge"
                      style={{ background: st.bg, color: st.color, display: "inline-flex", alignItems: "center", gap: 3, flexShrink: 0 }}
                    >
                      <Icon name={st.icon} size={11} />
                      {statusLabel(p.status)}
                    </span>
                  </div>

                  {p.description && (
                    <p style={{ margin: "0 0 var(--space-2)", fontSize: "var(--font-size-sm)", color: "var(--text-muted)", lineHeight: 1.5 }}>
                      {p.description}
                    </p>
                  )}

                  <div style={{ display: "flex", gap: 16, fontSize: "var(--font-size-xs)", color: "var(--text-faint)", flexWrap: "wrap" }}>
                    <span>📖 {p.source_book_name}</span>
                    <span>🌐 {languageLabel(p.target_language)}</span>
                    <span>{t.createdBy} {p.owner_username}</span>
                    <span>
                      {t.progress} {p.done_count}/{p.unit_count}
                      {p.unit_count > 0 && (
                        <span style={{ marginLeft: 6 }}>
                          ({Math.round((p.done_count / p.unit_count) * 100)}%)
                        </span>
                      )}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
        {totalPages > 1 && (
          <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 24 }}>
            <button onClick={() => goTo(safePage - 1)} disabled={safePage <= 1} style={pageBtnStyle(safePage <= 1)}>{t.prev}</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
              <button key={n} onClick={() => goTo(n)} style={pageBtnStyle(false, n === safePage)}>{n}</button>
            ))}
            <button onClick={() => goTo(safePage + 1)} disabled={safePage >= totalPages} style={pageBtnStyle(safePage >= totalPages)}>{t.next}</button>
          </div>
        )}
          </>
        );
      })()}
    </div>
  );
}

function pageBtnStyle(disabled: boolean, active = false): React.CSSProperties {
  return {
    padding: "8px 14px",
    minHeight: 40,
    border: "1px solid var(--border)",
    borderRadius: 6,
    background: active ? "var(--accent)" : "transparent",
    color: active ? "var(--accent-text)" : disabled ? "var(--text-faint)" : "var(--text-muted)",
    cursor: disabled ? "default" : "pointer",
    fontSize: 13,
    fontFamily: "inherit",
    opacity: disabled ? 0.4 : 1,
  };
}
