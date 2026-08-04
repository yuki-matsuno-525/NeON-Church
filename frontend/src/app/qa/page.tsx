"use client";

import { useCallback, useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/useIsMobile";
import { fetchQuestionPage, fetchTags, type Tag } from "@/lib/api";
import { QAPostForm } from "@/components/qa/QAPostForm";
import { QACard } from "@/components/qa/QACard";
import { LoginRequiredModal } from "@/components/ui/LoginRequiredModal";
import { AsyncList, SkeletonList, EmptyState, ErrorState, Button, LoadMoreButton } from "@/components/ui";
import { ColumnTabs, ListColumn, ListPageHeader } from "@/components/list";
import { useLoadMore } from "@/hooks/useLoadMore";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { Icon } from "@/components/ui/Icon";
import { ClearableSearchInput } from "@/components/ui/ClearableSearchInput";
import { useT, bookLabel } from "@/lib/i18n";
import { useLang } from "@/contexts/LanguageContext";
import { translationLabel } from "@/lib/translations";
import { getBookBySlug } from "@/lib/books";
import { useBookCatalogState, catalogEntry, groupCatalogByGenre } from "@/lib/bookCatalog";
import type { IconName } from "@/components/ui/Icon";

// 翻訳プロジェクト一覧と同じ「解決済み / 未解決」の 2 列ボード。
type QAColumnKey = "answered" | "unanswered";
const QA_COLUMNS: { key: QAColumnKey; icon: IconName; color: string; tint: string }[] = [
  { key: "answered",   icon: "check-circle", color: "var(--state-success)", tint: "rgba(34,197,94,0.15)" },
  { key: "unanswered", icon: "help-circle",  color: "var(--state-warning)", tint: "rgba(245,158,11,0.15)" },
];

export default function QAPage() {
  const t = useT();
  return (
    <Suspense fallback={<div className="p-8 text-muted">{t.loading}</div>}>
      <QAContent />
    </Suspense>
  );
}

function QAContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const t = useT();
  const { lang } = useLang();

  // URL を単一の真実とする。state は URL から派生。
  // book = slug、version = 訳 id（任意。未指定ならその書の全訳で絞る）。
  const selectedSlug = searchParams.get("book") ?? "";
  const selectedVersion = searchParams.get("version") ?? "";
  const selectedTagId = searchParams.get("tag") ?? "";

  const { catalog, loading: catalogLoading, error: catalogError, retry: retryCatalog } = useBookCatalogState();
  const isMobile = useIsMobile();
  // スマホでは1カラムずつタブ切り替え。既定は「未解決」（回答が必要な列）。
  const [activeTab, setActiveTab] = useState<QAColumnKey>("unanswered");
  const [genreFilter, setGenreFilter] = useState("");
  const urlQuestionSearch = searchParams.get("q") ?? "";
  const [questionSearch, setQuestionSearch] = useState(urlQuestionSearch);
  const [lastUrlQuestionSearch, setLastUrlQuestionSearch] = useState(urlQuestionSearch);
  if (urlQuestionSearch !== lastUrlQuestionSearch) {
    setLastUrlQuestionSearch(urlQuestionSearch);
    setQuestionSearch(urlQuestionSearch);
  }
  const [tags, setTags] = useState<Tag[]>([]);
  const [tagsError, setTagsError] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  /** クエリパラメータを部分更新して URL に反映する。null/空文字は削除。 */
  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value == null || value === "") params.delete(key);
        else params.set(key, value);
      }
      const q = params.toString();
      // router.replace で履歴を汚さない (連続フィルタ変更で戻るが効きすぎないため)
      router.replace(q ? `/qa?${q}` : "/qa", { scroll: false });
    },
    [searchParams, router]
  );

  // 書を切り替えたら訳はリセットする。
  const setSelectedSlug = (slug: string) => updateParams({ book: slug || null, version: null });
  const setSelectedVersion = (v: string) => updateParams({ version: v || null });
  const setSelectedTagId = (id: string) => updateParams({ tag: id || null });

  const loadTags = useCallback(() => {
    setTagsError(false);
    fetchTags().then(setTags).catch(() => setTagsError(true));
  }, []);

  useEffect(() => {
    fetchTags().then(setTags).catch(() => setTagsError(true));
  }, []);

  // 選んだ書（と任意の訳）から絞り込み用の Book id 群を決める。
  // 訳未指定ならその書の全訳 id をカンマ区切りで渡す（書だけで絞る）。
  const entry = selectedSlug ? catalogEntry(catalog, selectedSlug) : null;
  const bookIdParam = entry
    ? selectedVersion
      ? entry.translations.find((tr) => tr.id === selectedVersion)?.bookId
      : entry.translations.map((tr) => tr.bookId).join(",")
    : undefined;

  // 列ごとに独立して読み足す。全件取ってから画面側で2列に振り分けていた頃は、
  // 件数バッジが「読み込めた分」の数になり、片方の列だけ増えるといった破綻が起きる。
  // 検索欄は手が止まってから投げる（1文字ごとに2列ぶんのリクエストが飛ぶのを防ぐ）。
  const debouncedSearch = useDebouncedValue(questionSearch);
  const filters = { book_id: bookIdParam || undefined, tag_id: selectedTagId || undefined, q: debouncedSearch };
  const filterKey = `${filters.book_id ?? ""}|${filters.tag_id ?? ""}|${filters.q}`;

  const fetchAnswered = useCallback(
    (page: number) => fetchQuestionPage({ ...filters, answered: true, page }),
    // filters は毎回作り直されるので、中身を表す filterKey を依存に使う
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filterKey]
  );
  const fetchUnanswered = useCallback(
    (page: number) => fetchQuestionPage({ ...filters, answered: false, page }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filterKey]
  );
  const answeredList = useLoadMore(fetchAnswered);
  const unansweredList = useLoadMore(fetchUnanswered);

  const columnList = (key: QAColumnKey) => (key === "answered" ? answeredList : unansweredList);

  const reloadAnswered = answeredList.reload;
  const reloadUnanswered = unansweredList.reload;
  // 質問を投稿すると未解決の列に増える。列をまたぐ変化に備えて両方を取り直す。
  const reloadQuestions = useCallback(() => {
    reloadAnswered();
    reloadUnanswered();
  }, [reloadAnswered, reloadUnanswered]);

  const loading = answeredList.loading || unansweredList.loading;
  const totalCount = answeredList.total + unansweredList.total;

  const columnLabel = (key: QAColumnKey) =>
    key === "answered" ? t.filterAnswered : t.filterUnanswered;
  const columnDesc = (key: QAColumnKey) =>
    key === "answered" ? t.qaColAnsweredDesc : t.qaColUnansweredDesc;

  return (
    <div className="page page-full">
      {showLoginModal && (
        <LoginRequiredModal onClose={() => setShowLoginModal(false)} />
      )}
      <ListPageHeader
        title={t.qaTitle}
        description={t.qaDesc}
        action={
          !showForm ? (
            <Button
              variant="secondary"
              leftIcon={<Icon name="help-circle" size={14} />}
              onClick={() => {
                if (!user) { setShowLoginModal(true); return; }
                setShowForm(true);
              }}
            >
              {t.askQuestion}
            </Button>
          ) : undefined
        }
      />

      {showForm && (
        <QAPostForm
          catalog={catalog}
          tags={tags}
          onSubmitted={() => {
            setShowForm(false);
            reloadQuestions();
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {catalogLoading && <p role="status" className="text-sm text-muted">{t.loading}</p>}
      {catalogError && (
        <div role="alert" className="mb-4">
          <p className="text-sm text-danger">{lang === "ja" ? "書の一覧を読み込めませんでした。" : "Could not load the book list."}</p>
          <Button variant="ghost" size="sm" onClick={retryCatalog}>{t.retry}</Button>
        </div>
      )}

      <fieldset style={filterPanelStyle}>
        {/* フィルタの見出しは各ボタンのラベルと重複するため画面には出さない（スクリーンリーダー用に残す）。 */}
        <legend className="sr-only">
          {t.filterAll} / {t.filterUnanswered} / {t.filterAnswered}
        </legend>
        <div style={filterPanelHeaderStyle}>
          <span className="text-muted text-xs font-bold">{t.qaFilters}</span>
          {/* 表示中の件数ではなく、絞り込み後の総数（2列の合計） */}
          {!loading && (
            <span className="text-xs text-faint">{t.qaQuestionCount(totalCount)}</span>
          )}
        </div>
        <div style={filterRowStyle}>
          <ClearableSearchInput
            value={questionSearch}
            onChange={(value) => {
              setQuestionSearch(value);
              updateParams({ q: value || null });
            }}
            placeholder={t.qaSearchPlaceholder}
            ariaLabel={t.qaSearchLabel}
            inputClassName="form-control"
            wrapperStyle={{ minWidth: 220, flex: "1 1 240px" }}
          />
          {(() => {
            const groups = groupCatalogByGenre(catalog);
            const bookEntries = genreFilter ? groups.find((g) => g.genre === genreFilter)?.entries ?? [] : catalog;
            return (
              <>
                {/* カテゴリを先に選ぶと、次の書プルダウンがそのカテゴリの書に絞られる。 */}
                <label className="inline-flex items-center gap-2 text-sm text-muted">
                  <select
                    aria-label={t.genreFilterLabel}
                    disabled={catalogLoading || catalogError}
                    value={genreFilter}
                    onChange={(e) => { setGenreFilter(e.target.value); setSelectedSlug(""); }}
                    style={qaSelectStyle}
                  >
                    <option value="">{t.all}</option>
                    {groups.map(({ genre }) => (
                      <option key={genre} value={genre}>{t.genreNames[genre] ?? genre}</option>
                    ))}
                  </select>
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-muted">
                  <select
                    aria-label={t.allBooks}
                    disabled={catalogLoading || catalogError}
                    value={selectedSlug}
                    onChange={(e) => setSelectedSlug(e.target.value)}
                    style={qaSelectStyle}
                  >
                    <option value="">{t.allBooks}</option>
                    {bookEntries.map((e) => (
                      <option key={e.slug} value={e.slug}>{bookLabel(e.slug, lang)?.short ?? e.slug}</option>
                    ))}
                  </select>
                </label>
              </>
            );
          })()}
          {/* 訳（任意）。書を選んだときだけ出す。未指定ならその書の全訳が対象。 */}
          {selectedSlug && (
            <label className="inline-flex items-center gap-2 text-sm text-muted">
              <select
                aria-label={t.allVersions}
                value={selectedVersion}
                onChange={(e) => setSelectedVersion(e.target.value)}
                style={qaSelectStyle}
              >
                <option value="">{t.allVersions}</option>
                {(getBookBySlug(selectedSlug)?.translations ?? []).map((tr) => (
                  <option key={tr.id} value={tr.id}>{translationLabel(tr.id, lang)}</option>
                ))}
              </select>
            </label>
          )}
          <label className="inline-flex items-center gap-2 text-sm text-muted">
            <select
              aria-label={t.allTags}
              value={selectedTagId}
              onChange={(e) => setSelectedTagId(e.target.value)}
              style={qaSelectStyle}
            >
              <option value="">{t.allTags}</option>
              {tags.map((tag) => (
                <option key={tag.id} value={tag.id}>{t.tagNames[tag.name] ?? tag.name}</option>
              ))}
            </select>
          </label>
        </div>
        {tagsError && (
          <div role="alert" className="flex items-center gap-2 mt-2 text-danger text-xs">
            <span>{t.tagsLoadFailed}</span>
            <button type="button" onClick={loadTags} className="tap-target">{t.retry}</button>
          </div>
        )}
      </fieldset>

      {loading ? (
        <SkeletonList count={3} />
      ) : answeredList.error || unansweredList.error ? (
        <ErrorState
          title={t.loadErrorTitle}
          message={t.loadErrorDesc}
          onRetry={reloadQuestions}
          retryLabel={t.retry}
        />
      ) : totalCount === 0 ? (
        <EmptyState
          title={t.qaEmpty}
          description={t.emptyQaDesc}
          action={
            <Button
              variant="primary"
              onClick={() => {
                if (!user) { setShowLoginModal(true); return; }
                setShowForm(true);
              }}
            >
              {t.emptyQaCta}
            </Button>
          }
        />
      ) : (
        <>
        {/* スマホだけカラム切り替えタブを出す。PC はタブなしで2カラムを横並び。 */}
        {isMobile && (
          <ColumnTabs
            // 表示中の件数ではなく、サーバーが数えたその列の総数
            tabs={QA_COLUMNS.map((col) => ({ ...col, label: columnLabel(col.key), count: columnList(col.key).total }))}
            active={activeTab}
            onChange={setActiveTab}
            label={t.qaTitle}
            idPrefix="qa"
          />
        )}
        <div className="list-board">
          {QA_COLUMNS.map((col) => {
            const list = columnList(col.key);
            const items = list.items;
            return (
              <ListColumn
                key={col.key}
                icon={col.icon}
                color={col.color}
                tint={col.tint}
                title={columnLabel(col.key)}
                // 表示中の件数ではなく、サーバーが数えたその列の総数
                count={list.total}
                description={columnDesc(col.key)}
                hidden={isMobile && col.key !== activeTab}
                id={`qa-panel-${col.key}`}
                labelledBy={isMobile ? `qa-tab-${col.key}` : undefined}
              >
                <AsyncList loading={false} isEmpty={items.length === 0} emptyText={t.qaEmptyColumn}>
                  <div className="flex flex-col gap-3">
                    {items.map((q) => (
                      <QACard key={q.id} question={q} />
                    ))}
                  </div>
                  {/* 列ごとに独立して読み足す */}
                  <LoadMoreButton
                    hasMore={list.hasMore}
                    loading={list.loadingMore}
                    error={!!list.loadMoreError}
                    onClick={list.loadMore}
                  />
                </AsyncList>
              </ListColumn>
            );
          })}
        </div>
        </>
      )}
    </div>
  );
}



const filterPanelStyle: React.CSSProperties = {
  border: "1px solid var(--border)",
  borderRadius: 8,
  padding: 12,
  margin: "0 0 24px",
  background: "var(--bg-alt)",
};

const filterPanelHeaderStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  marginBottom: 10,
};

const filterRowStyle: React.CSSProperties = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
  alignItems: "center",
};

const qaSelectStyle: React.CSSProperties = {
  minHeight: 44,
  padding: "6px 10px",
  border: "1px solid var(--border)",
  borderRadius: 8,
  background: "var(--bg)",
  color: "var(--text)",
  fontSize: "var(--text-sm)",
  fontFamily: "inherit",
};

