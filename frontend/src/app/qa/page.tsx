"use client";

import { useCallback, useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { fetchQAComments, fetchTags, type QAComment, type Tag } from "@/lib/api";
import { QAPostForm } from "@/components/qa/QAPostForm";
import { QACard } from "@/components/qa/QACard";
import { LoginRequiredModal } from "@/components/ui/LoginRequiredModal";
import { SkeletonList, EmptyState, Button } from "@/components/ui";
import { useT, bookLabel } from "@/lib/i18n";
import { useLang } from "@/contexts/LanguageContext";
import { translationLabel } from "@/lib/translations";
import { getBookBySlug } from "@/lib/books";
import { useBookCatalog, catalogEntry, groupCatalogByGenre } from "@/lib/bookCatalog";

const PAGE_SIZE = 10;

type AnsweredFilter = "all" | "answered" | "unanswered";

function parseAnswered(value: string | null): AnsweredFilter {
  return value === "answered" || value === "unanswered" ? value : "all";
}

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
  const answeredFilter = parseAnswered(searchParams.get("answered"));
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));

  const catalog = useBookCatalog();
  const [genreFilter, setGenreFilter] = useState("");
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

  // 書を切り替えたら訳とページはリセットする。
  const setSelectedSlug = (slug: string) => updateParams({ book: slug || null, version: null, page: null });
  const setSelectedVersion = (v: string) => updateParams({ version: v || null, page: null });
  const setSelectedTagId = (id: string) => updateParams({ tag: id || null, page: null });
  const setAnsweredFilter = (f: AnsweredFilter) =>
    updateParams({ answered: f === "all" ? null : f, page: null });
  const goToPage = (p: number) => updateParams({ page: p > 1 ? String(p) : null });

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
      answered: answeredFilter === "all" ? undefined : answeredFilter === "answered",
    })
      .then(setComments)
      .catch(() => setComments([]))
      .finally(() => setLoading(false));
  }, [catalog, selectedSlug, selectedVersion, selectedTagId, answeredFilter]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadComments();
  }, [loadComments]);

  const filterLabel = (f: AnsweredFilter) => {
    if (f === "all") return t.filterAll;
    if (f === "unanswered") return t.filterUnanswered;
    return t.filterAnswered;
  };

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "32px 16px" }}>
      {showLoginModal && (
        <LoginRequiredModal onClose={() => setShowLoginModal(false)} />
      )}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>{t.qaTitle}</h1>
        {!showForm && (
          <button
            onClick={() => {
              if (!user) { setShowLoginModal(true); return; }
              setShowForm(true);
            }}
            style={{
              padding: "10px 16px",
              minHeight: 44,
              border: "none",
              borderRadius: 8,
              background: "var(--accent)",
              color: "var(--accent-text)",
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            {t.askQuestion}
          </button>
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

      <fieldset style={{ border: "none", padding: 0, margin: "0 0 24px" }}>
        <legend style={{ fontSize: "var(--font-size-xs)", color: "var(--text-faint)", marginBottom: "var(--space-2)", fontWeight: 600, letterSpacing: "0.04em" }}>
          {t.filterAll} / {t.filterUnanswered} / {t.filterAnswered}
        </legend>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          {(["all", "unanswered", "answered"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setAnsweredFilter(f)}
              aria-pressed={answeredFilter === f}
              style={{
                fontSize: "var(--font-size-sm)",
                padding: "8px 12px",
                minHeight: 36,
                borderRadius: 999,
                border: "1px solid var(--border)",
                cursor: "pointer",
                background: answeredFilter === f ? "var(--accent)" : "transparent",
                color: answeredFilter === f ? "var(--accent-text)" : "var(--text-muted)",
                fontFamily: "inherit",
              }}
            >
              {filterLabel(f)}
            </button>
          ))}
          {(() => {
            const selectStyle = {
              padding: "6px 10px",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-md)",
              background: "var(--bg-alt)",
              color: "var(--text)",
              fontSize: "var(--font-size-sm)",
            } as const;
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
                    style={selectStyle}
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
                    style={selectStyle}
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
                style={{
                  padding: "6px 10px",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-md)",
                  background: "var(--bg-alt)",
                  color: "var(--text)",
                  fontSize: "var(--font-size-sm)",
                }}
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
              style={{
                padding: "6px 10px",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-md)",
                background: "var(--bg-alt)",
                color: "var(--text)",
                fontSize: "var(--font-size-sm)",
              }}
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
      ) : (() => {
        const totalPages = Math.ceil(comments.length / PAGE_SIZE);
        const safePage = Math.min(page, totalPages);
        const pageItems = comments.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
        return (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {pageItems.map((c) => (
                <QACard
                  key={c.id}
                  comment={c}
                  currentUserId={user?.id ?? null}
                  onBestAnswerChange={loadComments}
                />
              ))}
            </div>
            {totalPages > 1 && (
              <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 24 }}>
                <button onClick={() => goToPage(safePage - 1)} disabled={safePage <= 1} style={pageBtnStyle(safePage <= 1)}>{t.prev}</button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button key={p} onClick={() => goToPage(p)} aria-current={p === safePage ? "page" : undefined} style={pageBtnStyle(false, p === safePage)}>{p}</button>
                ))}
                <button onClick={() => goToPage(safePage + 1)} disabled={safePage >= totalPages} style={pageBtnStyle(safePage >= totalPages)}>{t.next}</button>
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
    opacity: disabled ? 0.5 : 1,
  };
}
