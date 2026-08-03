"use client";

import { useDeferredValue, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { fetchTranslations, type TranslationProject, type TranslationStatus } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useT } from "@/lib/i18n";
import { languageLabel } from "@/lib/languages";
import { Button, SkeletonList } from "@/components/ui";
import { Pagination } from "@/components/ui/Pagination";
import { Icon, type IconName } from "@/components/ui/Icon";
import { ClearableSearchInput } from "@/components/ui/ClearableSearchInput";
import { useLang } from "@/contexts/LanguageContext";
import { translationUiText } from "./translationUiText";

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
  const { lang } = useLang();
  const ui = translationUiText(lang);
  const isMobile = useIsMobile();
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get("q") ?? "";
  // スマホでは1カラムずつタブ切り替え。既定は「公開済み」。
  const [activeTab, setActiveTab] = useState<StatusKey>("published");
  const [projectSearch, setProjectSearch] = useState(searchQuery);
  const deferredProjectSearch = useDeferredValue(projectSearch);
  // 入力欄とURLは即時同期しつつ、3列分の検索リクエストは入力が止まってから送る。
  const debouncedSearch = useDebouncedValue(deferredProjectSearch);
  const visibleColumns = user ? COLUMNS : COLUMNS.filter((column) => column.key !== "draft");

  useEffect(() => {
    // ブラウザーの戻る・進む操作で URL が変わったとき、入力欄も同じ値へ戻す。
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProjectSearch(searchQuery);
  }, [searchQuery]);

  const handleProjectSearchChange = (value: string) => {
    setProjectSearch(value);
    const nextParams = new URLSearchParams(searchParams.toString());
    if (value) nextParams.set("q", value);
    else nextParams.delete("q");
    const query = nextParams.toString();
    router.replace(query ? `/translations?${query}` : "/translations", { scroll: false });
  };

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
    <div className="page page-full">
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="m-0 text-lg font-bold">{t.translationsTitle}</h1>
          <p className="mt-1 mb-0 text-sm text-muted">
            {t.translationsDesc}
          </p>
        </div>
        {user && (
          <Link
            href="/translations/new"
            className="bg-accent text-accent-text rounded-md py-2 px-4 no-underline font-bold text-sm"
          >
            {t.newProject}
          </Link>
        )}
      </div>

      {/* スマホだけカラム切り替えタブを出す。PC はタブなしで3カラムを横並び。 */}
      <label className="block mb-4">
        <span className="sr-only">{t.projectSearchLabel}</span>
        <ClearableSearchInput
          value={projectSearch}
          onChange={handleProjectSearchChange}
          placeholder={t.projectSearchPlaceholder}
          ariaLabel={t.projectSearchLabel}
          inputStyle={projectSearchInputStyle}
          wrapperStyle={{ width: "100%" }}
        />
      </label>

      {isMobile && (
        <div className="flex gap-2 mb-4">
          {visibleColumns.map((col) => {
            const active = col.key === activeTab;
            return (
              <button
                key={col.key}
                type="button"
                aria-pressed={active}
                onClick={() => setActiveTab(col.key)}
                style={{
                  flex: 1,
                  minHeight: 44,
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
        {visibleColumns.map((col) => (
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
              search={debouncedSearch}
              retryLabel={ui.retry}
              errorMessage={ui.loadError}
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
  retryLabel,
  errorMessage,
}: {
  statusKey: StatusKey;
  icon: IconName;
  color: string;
  tint: string;
  label: string;
  desc: string;
  search: string;
  retryLabel: string;
  errorMessage: string;
}) {
  const t = useT();
  const [items, setItems] = useState<TranslationProject[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError(false);
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
        setError(true);
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [statusKey, page, search, reloadKey]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPage(1);
  }, [search]);

  const totalPages = Math.ceil(count / PAGE_SIZE);

  return (
    <section style={columnStyle}>
      <div className="mb-4">
        <div className="flex items-center gap-2">
          <span style={{ color, display: "inline-flex" }}>
            <Icon name={icon} size={18} />
          </span>
          <h2 className="m-0 text-md font-bold">{label}</h2>
          <span style={{ ...countBadgeStyle, background: tint, color }}>{count}</span>
        </div>
        <p className="mt-2 mb-0 text-xs text-muted">{desc}</p>
      </div>

      {loading ? (
        <SkeletonList count={2} />
      ) : error ? (
        <div role="alert" className="py-3 px-1">
          <p className="text-sm text-muted mt-0 mx-0 mb-3">{errorMessage}</p>
          <Button variant="ghost" size="sm" onClick={() => setReloadKey((key) => key + 1)}>{retryLabel}</Button>
        </div>
      ) : items.length === 0 ? (
        <p className="px-1 py-2 text-sm text-faint">{t.emptyColumn}</p>
      ) : (
        <>
          <div className="flex flex-col gap-3">
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
    <Link href={`/translations/${p.id}`} className="no-underline text-inherit">
      <div className="card-glow card-glow-interactive py-4 px-4 flex flex-col" >
        <div className="flex items-start justify-end gap-3 mb-3">
          <span className="badge" style={{ background: tint, color: accent, display: "inline-flex", alignItems: "center", gap: 3, flexShrink: 0 }}>
            {label}
          </span>
        </div>

        <h3 style={{ fontFamily: "var(--font-serif)", fontSize: "var(--font-size-md)", fontWeight: 700, margin: "0 0 var(--space-2)" }}>{p.name}</h3>

        {p.description && (
          <p style={{ margin: "0 0 var(--space-2)", fontSize: "var(--font-size-sm)", color: "var(--text-muted)", lineHeight: 1.5 }}>
            {p.description}
          </p>
        )}

        <div className="flex gap-2 text-xs text-faint flex-wrap mb-3">
          <span style={metaPillStyle}>{p.source_book_name}</span>
          <span style={metaPillStyle}>{languageLabel(p.target_language)}</span>
          <span style={metaPillStyle}>{t.createdBy} {p.owner_username}</span>
        </div>

        <div className="mt-auto">
          <div className="flex justify-between gap-3 text-xs text-muted mb-1">
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
  minHeight: 44,
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
