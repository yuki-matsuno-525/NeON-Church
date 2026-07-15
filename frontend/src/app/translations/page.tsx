"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchTranslations, type TranslationProject, type TranslationStatus } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useT } from "@/lib/i18n";
import { languageLabel } from "@/lib/languages";
import { SkeletonList } from "@/components/ui";
import { Pagination } from "@/components/ui/Pagination";
import { Icon, type IconName } from "@/components/ui/Icon";

type StatusKey = TranslationStatus;

const PAGE_SIZE = 20;

// ステータスごとのカラム。色はステータスの意味に合わせる（公開=緑 / 進行中=アクセント / 下書き=琥珀）。
const COLUMNS: { key: StatusKey; icon: IconName; color: string; tint: string }[] = [
  { key: "published", icon: "check-circle", color: "var(--state-success)", tint: "rgba(34,197,94,0.15)" },
  { key: "active",    icon: "circle-dot",   color: "var(--accent)",        tint: "var(--accent-tint)" },
  { key: "draft",     icon: "lock",         color: "var(--state-warning)", tint: "rgba(245,158,11,0.15)" },
];

export default function TranslationsPage() {
  const { user } = useAuth();
  const t = useT();
  const isMobile = useIsMobile();
  // スマホでは1カラムずつタブ切り替え。既定は「公開済み」。
  const [activeTab, setActiveTab] = useState<StatusKey>("published");
  const [projectSearch, setProjectSearch] = useState("");

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

      {/* スマホだけカラム切り替えタブを出す。PC はタブなしで3カラムを横並び。 */}
      <label style={{ display: "block", marginBottom: 16 }}>
        <span className="sr-only">{t.projectSearchLabel}</span>
        <input
          type="search"
          value={projectSearch}
          onChange={(e) => setProjectSearch(e.target.value)}
          placeholder={t.projectSearchPlaceholder}
          aria-label={t.projectSearchLabel}
          style={projectSearchInputStyle}
        />
      </label>

      {isMobile && (
        <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
          {COLUMNS.map((col) => {
            const active = col.key === activeTab;
            return (
              <button
                key={col.key}
                type="button"
                aria-pressed={active}
                onClick={() => setActiveTab(col.key)}
                style={{
                  flex: 1,
                  padding: "8px 6px",
                  border: `1px solid ${active ? col.color : "var(--border)"}`,
                  borderRadius: 8,
                  background: active ? col.tint : "var(--bg-alt)",
                  color: active ? col.color : "var(--text-muted)",
                  fontWeight: active ? 700 : 600,
                  fontSize: 13,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                {columnLabel(col.key)}
              </button>
            );
          })}
        </div>
      )}

      <div
        style={
          isMobile
            ? { display: "block" }
            : { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16, alignItems: "start" }
        }
      >
        {COLUMNS.map((col) => (
          <div
            key={col.key}
            style={{ display: isMobile && col.key !== activeTab ? "none" : "block" }}
          >
            <TranslationColumn
              statusKey={col.key}
              icon={col.icon}
              color={col.color}
              tint={col.tint}
              label={columnLabel(col.key)}
              desc={columnDesc(col.key)}
              search={projectSearch}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function TranslationColumn({
  statusKey,
  icon,
  color,
  tint,
  label,
  desc,
  search,
}: {
  statusKey: StatusKey;
  icon: IconName;
  color: string;
  tint: string;
  label: string;
  desc: string;
  search: string;
}) {
  const t = useT();
  const [items, setItems] = useState<TranslationProject[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    fetchTranslations(statusKey, page, search)
      .then((res) => {
        if (!active) return;
        setItems(res.results);
        setCount(res.count);
      })
      .catch(() => {
        if (!active) return;
        setItems([]);
        setCount(0);
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [statusKey, page, search]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPage(1);
  }, [search]);

  const totalPages = Math.ceil(count / PAGE_SIZE);

  return (
    <section style={columnStyle}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color, display: "inline-flex" }}>
            <Icon name={icon} size={18} />
          </span>
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>{label}</h2>
          <span style={{ ...countBadgeStyle, background: tint, color }}>{count}</span>
        </div>
        <p style={{ margin: "6px 0 0", fontSize: 12, color: "var(--text-muted)" }}>{desc}</p>
      </div>

      {loading ? (
        <SkeletonList count={2} />
      ) : items.length === 0 ? (
        <p style={{ fontSize: 13, color: "var(--text-faint)", padding: "8px 2px" }}>{t.emptyColumn}</p>
      ) : (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {items.map((p) => (
              <ProjectCard key={p.id} project={p} accent={color} tint={tint} label={label} />
            ))}
          </div>
          <Pagination page={page} totalPages={totalPages} onChange={setPage} />
        </>
      )}
    </section>
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

const projectSearchInputStyle: React.CSSProperties = {
  width: "100%",
  minHeight: 40,
  padding: "8px 12px",
  border: "1px solid var(--border)",
  borderRadius: 8,
  background: "var(--bg)",
  color: "var(--text)",
  fontSize: "var(--font-size-sm)",
  fontFamily: "inherit",
  outline: "none",
  boxSizing: "border-box",
};

const progressTrackStyle: React.CSSProperties = {
  height: 7,
  width: "100%",
  borderRadius: 999,
  overflow: "hidden",
  background: "rgba(255,255,255,0.12)",
};
