"use client";

import { useCallback, useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/useIsMobile";
import { fetchQAComments, fetchTags, type QAComment, type Tag } from "@/lib/api";
import { QAPostForm } from "@/components/qa/QAPostForm";
import { QACard } from "@/components/qa/QACard";
import { LoginRequiredModal } from "@/components/ui/LoginRequiredModal";
import { SkeletonList, EmptyState, Button } from "@/components/ui";
import { Icon } from "@/components/ui/Icon";
import { ClearableSearchInput } from "@/components/ui/ClearableSearchInput";
import { useT, bookLabel } from "@/lib/i18n";
import { useLang } from "@/contexts/LanguageContext";
import { translationLabel } from "@/lib/translations";
import { getBookBySlug } from "@/lib/books";
import { useBookCatalog, catalogEntry, groupCatalogByGenre } from "@/lib/bookCatalog";
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
    <Suspense fallback={<div style={{ padding: 32, color: "var(--text-muted)" }}>{t.loading}</div>}>
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

  const catalog = useBookCatalog();
  const isMobile = useIsMobile();
  // スマホでは1カラムずつタブ切り替え。既定は「未解決」（回答が必要な列）。
  const [activeTab, setActiveTab] = useState<QAColumnKey>("unanswered");
  const [genreFilter, setGenreFilter] = useState("");
  const [questionSearch, setQuestionSearch] = useState("");
  const [comments, setComments] = useState<QAComment[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    fetchTags().then(setTags).catch(() => {});
  }, []);

  const loadComments = useCallback(() => {
    // 選んだ書（と任意の訳）から絞り込み用の Book id 群を決める。
    // 訳未指定ならその書の全訳 id をカンマ区切りで渡す（書だけで絞る）。
    const entry = selectedSlug ? catalogEntry(catalog, selectedSlug) : null;
    const bookIdParam = entry
      ? selectedVersion
        ? entry.translations.find((tr) => tr.id === selectedVersion)?.bookId
        : entry.translations.map((tr) => tr.bookId).join(",")
      : undefined;
    setLoading(true);
    fetchQAComments({
      book_id: bookIdParam || undefined,
      tag_id: selectedTagId || undefined,
      q: questionSearch,
    })
      .then(setComments)
      .catch(() => setComments([]))
      .finally(() => setLoading(false));
  }, [catalog, selectedSlug, selectedVersion, selectedTagId, questionSearch]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadComments();
  }, [loadComments]);

  const columnLabel = (key: QAColumnKey) =>
    key === "answered" ? t.filterAnswered : t.filterUnanswered;
  const columnDesc = (key: QAColumnKey) =>
    key === "answered" ? t.qaColAnsweredDesc : t.qaColUnansweredDesc;

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 16px" }}>
      {showLoginModal && (
        <LoginRequiredModal onClose={() => setShowLoginModal(false)} />
      )}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, gap: 12, flexWrap: "wrap" }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>{t.qaTitle}</h1>
        {!showForm && (
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
        )}
      </div>
      <p style={{ color: "var(--text-muted)", fontSize: 14, marginBottom: 24 }}>
        {t.qaDesc}
      </p>

      {showForm && (
        <QAPostForm
          catalog={catalog}
          tags={tags}
          onSubmitted={() => {
            setShowForm(false);
            loadComments();
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      <fieldset style={filterPanelStyle}>
        {/* フィルタの見出しは各ボタンのラベルと重複するため画面には出さない（スクリーンリーダー用に残す）。 */}
        <legend className="sr-only">
          {t.filterAll} / {t.filterUnanswered} / {t.filterAnswered}
        </legend>
        <div style={filterPanelHeaderStyle}>
          <span style={{ color: "var(--text-muted)", fontSize: 12, fontWeight: 700 }}>{t.qaFilters}</span>
          {!loading && (
            <span style={{ color: "var(--text-faint)", fontSize: 12 }}>{t.qaQuestionCount(comments.length)}</span>
          )}
        </div>
        <div style={filterRowStyle}>
          <ClearableSearchInput
            value={questionSearch}
            onChange={setQuestionSearch}
            placeholder={t.qaSearchPlaceholder}
            ariaLabel={t.qaSearchLabel}
            inputStyle={qaSearchInputStyle}
            wrapperStyle={{ minWidth: 220, flex: "1 1 240px" }}
          />
          {(() => {
            const groups = groupCatalogByGenre(catalog);
            const bookEntries = genreFilter ? groups.find((g) => g.genre === genreFilter)?.entries ?? [] : catalog;
            return (
              <>
                {/* カテゴリを先に選ぶと、次の書プルダウンがそのカテゴリの書に絞られる。 */}
                <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: "var(--font-size-sm)", color: "var(--text-muted)" }}>
                  <select
                    aria-label={t.allBooks}
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
                <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: "var(--font-size-sm)", color: "var(--text-muted)" }}>
                  <select
                    aria-label={t.allBooks}
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
            <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: "var(--font-size-sm)", color: "var(--text-muted)" }}>
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
          <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: "var(--font-size-sm)", color: "var(--text-muted)" }}>
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
      </fieldset>

      {loading ? (
        <SkeletonList count={3} />
      ) : comments.length === 0 ? (
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
          <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
            {QA_COLUMNS.map((col) => {
              const active = col.key === activeTab;
              const num = comments.filter((c) =>
                col.key === "answered" ? !!c.best_answer : !c.best_answer
              ).length;
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
                  {columnLabel(col.key)} ({num})
                </button>
              );
            })}
          </div>
        )}
        <div style={isMobile ? { display: "block" } : boardGridStyle}>
          {QA_COLUMNS.map((col) => {
            const items = comments.filter((c) =>
              col.key === "answered" ? !!c.best_answer : !c.best_answer
            );
            return (
              <section
                key={col.key}
                style={{ ...columnStyle, display: isMobile && col.key !== activeTab ? "none" : undefined }}
              >
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
                  <p style={{ fontSize: 13, color: "var(--text-faint)", padding: "8px 2px" }}>{t.qaEmptyColumn}</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {items.map((c) => (
                      <QACard
                        key={c.id}
                        comment={c}
                        currentUserId={user?.id ?? null}
                        onBestAnswerChange={loadComments}
                        onAnswerPosted={loadComments}
                        onLoginRequired={() => setShowLoginModal(true)}
                      />
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
        </>
      )}
    </div>
  );
}

const boardGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
  gap: 16,
  alignItems: "start",
};

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
  minHeight: 36,
  padding: "6px 10px",
  border: "1px solid var(--border)",
  borderRadius: 8,
  background: "var(--bg)",
  color: "var(--text)",
  fontSize: "var(--font-size-sm)",
  fontFamily: "inherit",
};

const qaSearchInputStyle: React.CSSProperties = {
  minHeight: 36,
  minWidth: 220,
  flex: "1 1 240px",
  padding: "6px 10px",
  border: "1px solid var(--border)",
  borderRadius: 8,
  background: "var(--bg)",
  color: "var(--text)",
  fontSize: "var(--font-size-sm)",
  fontFamily: "inherit",
  outline: "none",
};
