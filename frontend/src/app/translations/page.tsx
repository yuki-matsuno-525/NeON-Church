"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchTranslations, type TranslationProject } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useT } from "@/lib/i18n";
import { languageLabel } from "@/lib/languages";
import { SkeletonList, EmptyState, Button } from "@/components/ui";
import { Icon, type IconName } from "@/components/ui/Icon";

type StatusKey = "published" | "active" | "draft";

// ステータスごとのカラム。色はステータスの意味に合わせる（公開=緑 / 進行中=アクセント / 下書き=琥珀）。
const COLUMNS: { key: StatusKey; icon: IconName; color: string; tint: string }[] = [
  { key: "published", icon: "check-circle", color: "var(--state-success)", tint: "rgba(34,197,94,0.15)" },
  { key: "active",    icon: "circle-dot",   color: "var(--accent)",        tint: "var(--accent-tint)" },
  { key: "draft",     icon: "lock",         color: "var(--state-warning)", tint: "rgba(245,158,11,0.15)" },
];

export default function TranslationsPage() {
  const { user } = useAuth();
  const t = useT();
  const [projects, setProjects] = useState<TranslationProject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTranslations()
      .then(setProjects)
      .catch(() => setProjects([]))
      .finally(() => setLoading(false));
  }, []);

  const columnLabel = (key: StatusKey) => {
    if (key === "published") return t.statusPublished;
    if (key === "active") return t.statusActive;
    return t.colDraftLabel;
  };
  const columnDesc = (key: StatusKey) => {
    if (key === "published") return t.colPublishedDesc;
    if (key === "active") return t.colActiveDesc;
    return t.colDraftDesc;
  };

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 16px" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
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
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: 16,
            alignItems: "start",
          }}
        >
          {COLUMNS.map((col) => {
            const items = projects.filter((p) => p.status === col.key);
            return (
              <section key={col.key} style={columnStyle}>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ color: col.color, display: "inline-flex" }}>
                      <Icon name={col.icon} size={18} />
                    </span>
                    <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>{columnLabel(col.key)}</h2>
                    <span style={{ ...countBadgeStyle, background: col.tint, color: col.color }}>{items.length}</span>
                  </div>
                  <p style={{ margin: "6px 0 0", fontSize: 12, color: "var(--text-muted)" }}>{columnDesc(col.key)}</p>
                </div>

                {items.length === 0 ? (
                  <p style={{ fontSize: 13, color: "var(--text-faint)", padding: "8px 2px" }}>{t.emptyColumn}</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {items.map((p) => (
                      <ProjectCard key={p.id} project={p} accent={col.color} tint={col.tint} label={columnLabel(col.key)} />
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ProjectCard({
  project: p,
  accent,
  tint,
  label,
}: {
  project: TranslationProject;
  accent: string;
  tint: string;
  label: string;
}) {
  const t = useT();
  const progressPct = p.unit_count > 0 ? Math.round((p.done_count / p.unit_count) * 100) : 0;
  const progressText = p.unit_count > 0
    ? `${p.done_count}/${p.unit_count} (${progressPct}%)`
    : `${p.done_count}/${p.unit_count}`;

  return (
    <Link href={`/translations/${p.id}`} style={{ textDecoration: "none", color: "inherit" }}>
      <div className="card-glow card-glow-interactive" style={{ padding: "16px 16px", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "flex-end", gap: 10, marginBottom: 12 }}>
          <span className="badge" style={{ background: tint, color: accent, display: "inline-flex", alignItems: "center", gap: 3, flexShrink: 0 }}>
            {label}
          </span>
        </div>

        <h3 style={{ fontFamily: '"Noto Serif JP", serif', fontSize: "var(--font-size-md)", fontWeight: 700, margin: "0 0 var(--space-2)" }}>{p.name}</h3>

        {p.description && (
          <p style={{ margin: "0 0 var(--space-2)", fontSize: "var(--font-size-sm)", color: "var(--text-muted)", lineHeight: 1.5 }}>
            {p.description}
          </p>
        )}

        <div style={{ display: "flex", gap: 6, fontSize: "var(--font-size-xs)", color: "var(--text-faint)", flexWrap: "wrap", marginBottom: 12 }}>
          <span style={metaPillStyle}>{languageLabel(p.target_language)}</span>
          <span style={metaPillStyle}>{t.createdBy} {p.owner_username}</span>
        </div>

        <div style={{ marginTop: "auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: "var(--font-size-xs)", color: "var(--text-muted)", marginBottom: 5 }}>
            <span>{t.progress}</span>
            <span>{progressText}</span>
          </div>
          <div
            role="progressbar"
            aria-label={`${p.name} ${t.progress}`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progressPct}
            style={progressTrackStyle}
          >
            <div style={{ width: `${progressPct}%`, height: "100%", background: accent, borderRadius: 999 }} />
          </div>
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

const progressTrackStyle: React.CSSProperties = {
  height: 7,
  width: "100%",
  borderRadius: 999,
  overflow: "hidden",
  background: "rgba(255,255,255,0.12)",
};
