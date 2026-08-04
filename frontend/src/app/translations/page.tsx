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
import { AsyncList } from "@/components/ui";
import { ColumnTabs, ListColumn, ListPageHeader } from "@/components/list";
import { Pagination } from "@/components/ui/Pagination";
import { type IconName } from "@/components/ui/Icon";
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
      <ListPageHeader
        title={t.translationsTitle}
        description={t.translationsDesc}
        action={
          user ? (
            <Link href="/translations/new" className="cta-button">
              {t.newProject}
            </Link>
          ) : undefined
        }
      />

      <label className="block mb-4">
        <span className="sr-only">{t.projectSearchLabel}</span>
        <ClearableSearchInput
          value={projectSearch}
          onChange={handleProjectSearchChange}
          placeholder={t.projectSearchPlaceholder}
          ariaLabel={t.projectSearchLabel}
          inputClassName="form-control text-sm"
          wrapperStyle={{ width: "100%" }}
        />
      </label>

      {/* スマホだけカラム切り替えタブを出す。PC はタブなしで3カラムを横並び。 */}
      {isMobile && (
        <ColumnTabs
          tabs={visibleColumns.map((col) => ({ ...col, label: columnLabel(col.key) }))}
          active={activeTab}
          onChange={setActiveTab}
          label={t.translationsTitle}
          idPrefix="translations"
        />
      )}

      <div className="list-board">
        {visibleColumns.map((col) => (
          <TranslationColumn
            key={col.key}
            statusKey={col.key}
            icon={col.icon}
            color={col.color}
            tint={col.tint}
            label={columnLabel(col.key)}
            desc={columnDesc(col.key)}
            search={debouncedSearch}
            retryLabel={ui.retry}
            errorMessage={ui.loadError}
            hidden={isMobile && col.key !== activeTab}
            tabId={isMobile ? `translations-tab-${col.key}` : undefined}
            panelId={`translations-panel-${col.key}`}
          />
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
  hidden,
  tabId,
  panelId,
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
  hidden: boolean;
  tabId?: string;
  panelId: string;
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
    <ListColumn
      icon={icon}
      color={color}
      tint={tint}
      title={label}
      count={count}
      description={desc}
      hidden={hidden}
      id={panelId}
      labelledBy={tabId}
    >
      <AsyncList
        loading={loading}
        error={error ? errorMessage : null}
        isEmpty={items.length === 0}
        emptyText={t.emptyColumn}
        onRetry={() => setReloadKey((key) => key + 1)}
        retryLabel={retryLabel}
      >
        <div className="flex flex-col gap-3">
          {items.map((p) => (
            <ProjectCard key={p.id} project={p} accent={color} tint={tint} label={label} />
          ))}
        </div>
        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      </AsyncList>
    </ListColumn>
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

        <h3 className="card-title">{p.name}</h3>

        {p.description && (
          <p className="card-summary">
            {p.description}
          </p>
        )}

        <div className="flex gap-2 text-xs text-faint flex-wrap mb-3">
          <span className="meta-pill">{p.source_book_name}</span>
          <span className="meta-pill">{languageLabel(p.target_language)}</span>
          <span className="meta-pill">{t.createdBy} {p.owner_username}</span>
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
            className="progress-track mt-0"
          >
            <div className="progress-fill" style={{ width: `${progressPct}%`, background: accent }} />
          </div>
        </div>
      </div>
    </Link>
  );
}





