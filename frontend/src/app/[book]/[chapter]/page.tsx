"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  fetchChapterRead,
  fetchChapterBookmarks,
  createBookmark,
  createChapterBookmark,
  removeBookmark,
  saveReadingProgress,
  type Verse,
  type Chapter,
  type Bookmark,
} from "@/lib/api";
import { BookmarkStar } from "@/components/ui/BookmarkStar";
import { saveLocalProgress } from "@/lib/readingProgress";
import { getBookBySlug, resolveTranslation, chapterTitle, adjacentChapter } from "@/lib/books";
import { resolveVersionChapterIds, resolveVersionVerseIds } from "@/lib/versions";
import { arrangeVerses, isMarkShorterEnding } from "@/lib/verses";
import { DEFAULT_TRANSLATION, translationLabel } from "@/lib/translations";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LanguageContext";
import { VerseList } from "@/components/reader/VerseList";
import { BulkBookmarkBar, useBulkBookmark } from "@/components/reader/BulkBookmarkBar";
import { CommentPanel } from "@/components/reader/CommentPanel";
import { ChapterComments } from "@/components/reader/ChapterComments";
import { SkeletonList } from "@/components/ui";
import { ErrorState } from "@/components/ui/ErrorState";
import { useT, useBookLabel } from "@/lib/i18n";
import { useToast } from "@/components/ui/Toast";

export default function ChapterPage() {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const t = useT();
  const toast = useToast();

  const slug = typeof params.book === "string" ? params.book : "";
  const chapterNum = typeof params.chapter === "string" ? Number(params.chapter) : 0;
  const meta = getBookBySlug(slug);
  const label = useBookLabel(slug);
  // セクション見出しで区切られる本（マリアの福音書など）の章名。無い本は null。
  const chapterName = chapterTitle(slug, chapterNum);
  // 章送りの行き先。章番号は連番とは限らない（トマスは第0章から、Q資料は飛び飛び）。
  const nav = adjacentChapter(slug, chapterNum);
  const { lang } = useLang();
  // 訳の切替候補は「この本が持つ訳」だけにする（エノク書なら Charles 英訳のみ）。
  const translationOptions = useMemo(
    () =>
      (meta?.translations ?? []).map((tr) => ({
        id: tr.id,
        label: translationLabel(tr.id, lang),
      })),
    [meta, lang]
  );

  const [verses, setVerses] = useState<Verse[]>([]);
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [chapterBusy, setChapterBusy] = useState(false);
  const [loadedBookId, setLoadedBookId] = useState<string | null>(null);
  const [progressError, setProgressError] = useState(false);
  const [bookmarkLoadError, setBookmarkLoadError] = useState(false);
  const [versionResolutionError, setVersionResolutionError] = useState(false);
  const selectedVerseId = searchParams.get("verse");
  const [loading, setLoading] = useState(true);
  const [highlightVerseNumber, setHighlightVerseNumber] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [showScrollTop, setShowScrollTop] = useState(false);
  // 全バージョン表示トグル用：この章・選択中の節の、各訳のid。
  const [allVersionChapterIds, setAllVersionChapterIds] = useState<string[]>([]);
  const [allVersionVerseIds, setAllVersionVerseIds] = useState<string[]>([]);
  // ?translation= がこの本の訳を指していればそれを優先（今日の聖句などからの遷移用）。
  const queryParam = searchParams.get("translation");
  const queryTranslation =
    queryParam && (meta?.translations.some((tr) => tr.id === queryParam) ?? false) ? queryParam : null;
  // translation は利用者の希望（localStorage の共通設定）。実際に使う訳は
  // resolveTranslation でこの本が持つ訳に解決する（無ければその本の訳にフォールバック）。
  const [translation, setTranslation] = useState<string>(() => {
    if (queryTranslation) return queryTranslation;
    return typeof window !== "undefined"
      ? (localStorage.getItem("bible-translation") ?? DEFAULT_TRANSLATION)
      : DEFAULT_TRANSLATION;
  });
  const activeTranslationId = resolveTranslation(slug, translation)?.id ?? translation;

  // クエリで指定された翻訳を以後の表示でも維持できるよう保存する
  // （初期stateで既に反映済みなので、ここでは localStorage への保存のみ）。
  useEffect(() => {
    if (queryTranslation) {
      localStorage.setItem("bible-translation", queryTranslation);
    }
  }, [queryTranslation]);

  useEffect(() => {
    if (!meta) {
      router.push("/matthew");
      return;
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError(null);

    // meta は上で確認済みなので resolveTranslation は必ず訳を返す。
    const active = resolveTranslation(slug, translation)!;
    // 書・章・節は1回でまとめて取る（以前は3回、しかも順番待ちだった）。
    fetchChapterRead(slug, chapterNum, active.id)
      .then(({ book, chapter: ch, verses: vs }) => {
        setLoadedBookId(book.id);
        setChapter(ch);
        saveLocalProgress(slug, {
          bookId: book.id,
          chapterId: ch.id,
          chapterNumber: ch.number,
          updatedAt: new Date().toISOString(),
        });
        if (user) {
          saveReadingProgress({ book: book.id, chapter: ch.id })
            .then(() => setProgressError(false))
            .catch(() => setProgressError(true));
        }
        setVerses(vs);
      })
      .catch((err) => {
        // サーバーは「その訳にこの書が無い」「その章が無い」を code で言い分ける。
        if (err.code === "book_not_found") {
          setError(
            translation !== DEFAULT_TRANSLATION
              ? t.translationNotFound(translation)
              : t.bookNotFound
          );
        } else if (err.code === "chapter_not_found") {
          setError(t.chapterNotFound);
        } else {
          setError(err.message);
        }
      })
      .finally(() => setLoading(false));
  }, [slug, chapterNum, translation, meta, router, user, t, reloadToken]);

  // この章に関わる栞（章栞・節栞・この章のコメントへの栞）だけをサーバー側で絞って取る。
  useEffect(() => {
    if (!user) return;
    fetchChapterBookmarks(slug, chapterNum)
      .then((items) => {
        setBookmarks(items);
        setBookmarkLoadError(false);
      })
      .catch(() => {
        setBookmarks([]);
        setBookmarkLoadError(true);
      });
  }, [user, slug, chapterNum]);

  // 全バージョン表示用：この章の各訳の章idを集める。
  useEffect(() => {
    resolveVersionChapterIds(slug, chapterNum)
      .then((ids) => {
        setAllVersionChapterIds(ids);
        setVersionResolutionError(false);
      })
      .catch(() => {
        setAllVersionChapterIds([]);
        setVersionResolutionError(true);
      });
  }, [slug, chapterNum, reloadToken]);

  // 選択中の節の、各訳の節idを集める（節を選び直すたびに更新）。
  useEffect(() => {
    let cancelled = false;
    const v = verses.find((vv) => vv.id === selectedVerseId);
    const p = v ? resolveVersionVerseIds(slug, chapterNum, v.number) : Promise.resolve<string[]>([]);
    p.then((ids) => {
      if (!cancelled) {
        setAllVersionVerseIds(ids);
        setVersionResolutionError(false);
      }
    }).catch(() => {
      if (!cancelled) {
        setAllVersionVerseIds([]);
        setVersionResolutionError(true);
      }
    });
    return () => { cancelled = true; };
  }, [slug, chapterNum, selectedVerseId, verses, reloadToken]);

  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 300);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.startsWith("#verse-")) {
      const num = parseInt(hash.slice(7), 10);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (!isNaN(num)) setHighlightVerseNumber(num);
    }
  }, []);

  useEffect(() => {
    if (loading || !highlightVerseNumber) return;
    const timer = setTimeout(() => {
      const el = document.getElementById(`verse-${highlightVerseNumber}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
    return () => clearTimeout(timer);
  }, [loading, highlightVerseNumber]);

  const verseUrl = (verseId: string | null) => {
    const next = new URLSearchParams(searchParams.toString());
    if (verseId) next.set("verse", verseId);
    else next.delete("verse");
    const query = next.toString();
    const hash = typeof window === "undefined" ? "" : window.location.hash;
    return `${pathname}${query ? `?${query}` : ""}${hash}`;
  };

  const handleClosePanel = () => {
    router.replace(verseUrl(null));
  };

  const handleSelectVerse = (verseId: string) => {
    if (verseId === selectedVerseId) {
      handleClosePanel();
    } else if (selectedVerseId) {
      router.replace(verseUrl(verseId));
    } else {
      router.push(verseUrl(verseId));
    }
  };

  const selectedVerse = verses.find((v) => v.id === selectedVerseId) ?? null;

  // まとめて栞。すでに栞のある節は飛ばして、入った分だけ一覧に足す。
  const bulk = useBulkBookmark(async (verseIds) => {
    const already = new Set(
      bookmarks
        .filter((bm) => bm.target_type === "verse" && bm.reference?.verse != null)
        .map((bm) => `${bm.reference!.book}/${bm.reference!.chapter}/${bm.reference!.verse}`),
    );
    const targets = verseIds.filter((id) => {
      const verse = verses.find((v) => v.id === id);
      return verse && !already.has(`${slug}/${chapterNum}/${verse.number}`);
    });
    const added: Bookmark[] = [];
    for (const verseId of targets) {
      added.push(await createBookmark(verseId));
    }
    if (added.length > 0) setBookmarks((prev) => [...prev, ...added]);
    return added.length;
  }, t);

  // 表示用に並べ替えた節（マルコ16のギリシャ語のみ「短い結び」を8節直後へ移動）。
  const displayVerses = useMemo(
    () => arrangeVerses(slug, chapterNum, activeTranslationId, verses),
    [slug, chapterNum, activeTranslationId, verses]
  );

  // 栞の仕分けは毎回作り直すと子（コメント欄・パネル）まで描き直しになるので覚えておく。
  const commentBookmarkMap: Record<string, string> = useMemo(
    () =>
      Object.fromEntries(
        bookmarks
          .filter((bm) => bm.target_type === "comment" && bm.comment_detail)
          .map((bm) => [bm.comment_detail!.id, bm.id])
      ),
    [bookmarks]
  );
  const verseBookmarks = useMemo(
    () => bookmarks.filter((bm) => bm.target_type === "verse" || bm.target_type === null),
    [bookmarks]
  );

  // この章そのものの栞（章栞）。reference が同じ書・同じ章で、節を持たないものが該当。
  const chapterBookmark = useMemo(
    () =>
      bookmarks.find(
        (bm) =>
          bm.target_type === "chapter" &&
          bm.reference?.book === slug &&
          bm.reference?.chapter === chapterNum
      ),
    [bookmarks, slug, chapterNum]
  );
  const toggleChapterBookmark = async () => {
    if (chapterBusy || !chapter) return;
    setChapterBusy(true);
    try {
      if (chapterBookmark) {
        await removeBookmark(chapterBookmark.id);
        setBookmarks((prev) => prev.filter((bm) => bm.id !== chapterBookmark.id));
      } else {
        const bm = await createChapterBookmark(chapter.id);
        setBookmarks((prev) => [...prev, bm]);
      }
    } catch {
      toast.show(t.errorActionFailed, { type: "error" });
    } finally {
      setChapterBusy(false);
    }
  };

  if (!meta) return null;

  if (loading) {
    return (
      <div role="status" aria-label={t.loading} style={{ padding: 32 }}>
        <SkeletonList count={5} />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 32 }}>
        <ErrorState
          title={t.loadErrorTitle}
          message={error}
          onRetry={() => setReloadToken((value) => value + 1)}
          retryLabel={t.retry}
          extraAction={translationOptions.filter((trans) => trans.id !== activeTranslationId).map((trans) => (
            <button
              key={trans.id}
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                localStorage.setItem("bible-translation", trans.id);
                setTranslation(trans.id);
              }}
            >
              {t.switchTranslation(trans.label)}
            </button>
          ))}
        />
      </div>
    );
  }

  return (
    <div style={{ minHeight: "calc(100vh - var(--navbar-height))" }}>
      <div className="reader-sticky-header" style={{
        position: "sticky",
        top: "var(--navbar-height)",
        zIndex: 10,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "8px 32px",
        background: "var(--glass-nav)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid var(--border)",
      }}>
          <p className="reader-breadcrumb" style={{ fontSize: 14, color: "var(--text-muted)", margin: 0, fontWeight: 500 }}>
            <Link href="/read" style={{ color: "var(--text-muted)", textDecoration: "none" }}>
              {t.bookList}
            </Link>
            {" › "}
            <Link href={`/${slug}?list=1`} style={{ color: "var(--text-muted)", textDecoration: "none" }}>
              {label?.short ?? meta.short}
            </Link>
            {" › "}
            <span>{t.chapterFmt(chapterNum)}</span>
          </p>
          <div className="reader-header-actions" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-muted)" }}>
              <span>{t.translationLabel}</span>
              <select
                value={activeTranslationId}
                onChange={(e) => {
                  localStorage.setItem("bible-translation", e.target.value);
                  setTranslation(e.target.value);
                }}
                style={{
                  fontSize: 12,
                  color: "var(--text)",
                  background: "var(--bg)",
                  cursor: "pointer",
                  padding: "4px 10px",
                  minHeight: 44,
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                }}
              >
                {translationOptions.map((trans) => (
                  <option key={trans.id} value={trans.id}>{trans.label}</option>
                ))}
              </select>
            </label>
            {chapter && (
              <a
                href="#chapter-comments"
                style={{
                  fontSize: 12,
                  color: "var(--text-faint)",
                  textDecoration: "none",
                  padding: "3px 10px",
                  minHeight: 44,
                  display: "inline-flex",
                  alignItems: "center",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  whiteSpace: "nowrap",
                }}
              >
                {t.toComments}
              </a>
            )}
          </div>
      </div>

      {(progressError || bookmarkLoadError || versionResolutionError) && (
        <div role="alert" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, flexWrap: "wrap", padding: "8px 16px", borderBottom: "1px solid var(--border)" }}>
          <span style={{ color: "var(--state-danger)", fontSize: 13 }}>{t.actionFailed}</span>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              if (progressError && user && loadedBookId && chapter) {
                saveReadingProgress({ book: loadedBookId, chapter: chapter.id })
                  .then(() => setProgressError(false))
                  .catch(() => setProgressError(true));
              }
              if (bookmarkLoadError && user) {
                fetchChapterBookmarks(slug, chapterNum)
                  .then((items) => {
                    setBookmarks(items);
                    setBookmarkLoadError(false);
                  })
                  .catch(() => setBookmarkLoadError(true));
              }
              if (versionResolutionError) {
                setReloadToken((value) => value + 1);
              }
            }}
          >
            {t.retry}
          </button>
        </div>
      )}

      <div
        className={`reader-wrapper${selectedVerse ? " has-verse" : ""}`}
        style={{ display: "flex" }}
      >
        <div
          className="reader-main"
          style={{
            flex: 1,
            minWidth: 0,
            padding: "32px 32px",
            overflowY: "auto",
          }}
        >

        <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 24 }}>
          <h1 style={{ fontSize: "var(--font-size-2xl)", fontWeight: 700, margin: 0 }}>
            {label?.short ?? meta.short} {t.chapterFmt(chapterNum)}
            {chapterName && (
              <span style={{ color: "var(--text-muted)", fontWeight: 500 }}>
                {" — "}{chapterName}
              </span>
            )}
          </h1>
          {user && chapter && (
            <BookmarkStar
              active={!!chapterBookmark}
              busy={chapterBusy}
              onToggle={toggleChapterBookmark}
              size={18}
            />
          )}
          {user && !bulk.pickMode && (
            <button
              type="button"
              onClick={bulk.start}
              style={{
                marginLeft: "auto",
                border: "1px solid var(--border)",
                borderRadius: 8,
                background: "transparent",
                color: "var(--text-muted)",
                fontSize: 12,
                padding: "6px 12px",
                minHeight: 36,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              {t.bulkBookmarkStart}
            </button>
          )}
        </div>

        <hr style={{ border: "none", borderTop: "2px solid var(--border)", marginBottom: 24 }} />

        <VerseList
          verses={displayVerses}
          selectedVerseId={selectedVerseId}
          onSelectVerse={handleSelectVerse}
          highlightVerseNumber={highlightVerseNumber}
          pickMode={bulk.pickMode}
          pickedIds={bulk.pickedIds}
          onTogglePick={bulk.toggle}
          numberLabel={(v) =>
            isMarkShorterEnding(slug, activeTranslationId, v.number)
              ? t.markShorterEnding
              : v.number
          }
        />

        {chapter && (
          <ChapterComments
            chapterId={chapter.id}
            label={`${label?.short ?? meta.short} ${t.chapterFmt(chapterNum)}`}
            commentBookmarkMap={commentBookmarkMap}
            allVersionIds={allVersionChapterIds}
          />
        )}

        </div>

        {selectedVerse && (
        <div className="reader-panel">
          <CommentPanel
            verse={selectedVerse}
            chapterNumber={chapterNum}
            onClose={handleClosePanel}
            commentBookmarkMap={commentBookmarkMap}
            verseBookmarks={verseBookmarks}
            bookSlug={slug}
            allVersionVerseIds={allVersionVerseIds}
            onVerseBookmarksChange={(updated) =>
              // 節栞だけ差し替え、コメント・章・書・プロジェクト栞はそのまま保持する。
              setBookmarks((prev) => [
                ...prev.filter((bm) => bm.target_type !== "verse" && bm.target_type !== null),
                ...updated,
              ])
            }
          />
        </div>
        )}
      </div>

      {bulk.pickMode && (
        <BulkBookmarkBar
          pickedCount={bulk.pickedIds.length}
          busy={bulk.busy}
          message={bulk.message}
          onSave={bulk.submit}
          onCancel={bulk.cancel}
        />
      )}

      {showScrollTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          aria-label={t.backToTop}
          style={{
            position: "fixed",
            bottom: selectedVerseId ? "calc(70vh + 12px)" : 24,
            right: 24,
            background: "var(--accent)",
            color: "var(--accent-text)",
            border: "none",
            borderRadius: "50%",
            width: 44,
            height: 44,
            cursor: "pointer",
            fontSize: 18,
            zIndex: 30,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 2px 10px rgba(0,0,0,0.3)",
          }}
        >
          ↑
        </button>
      )}

      {!selectedVerse && (
        <>
          {nav.prev !== null && (
            <Link
              href={`/${slug}/${nav.prev}`}
              title={t.chapterFmt(nav.prev)}
              aria-label={`${t.prevChapter} (${nav.prev})`}
              className="chapter-nav-prev"
              style={{
                position: "fixed",
                left: "var(--sidebar-width)",
                top: "50%",
                transform: "translateY(-50%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "18px 10px",
                background: "var(--bg-alt)",
                border: "1px solid var(--border)",
                borderLeft: "none",
                borderRadius: "0 8px 8px 0",
                color: "var(--text)",
                textDecoration: "none",
                fontSize: 20,
                opacity: 0.75,
                zIndex: 20,
                transition: "opacity 0.15s",
                lineHeight: 1,
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.opacity = "1")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.opacity = "0.75")}
            >
              ‹
            </Link>
          )}

          {nav.next !== null && (
            <Link
              href={`/${slug}/${nav.next}`}
              title={t.chapterFmt(nav.next)}
              aria-label={`${t.nextChapter} (${nav.next})`}
              className="chapter-nav-next"
              style={{
                position: "fixed",
                right: 0,
                top: "50%",
                transform: "translateY(-50%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "18px 10px",
                background: "var(--bg-alt)",
                border: "1px solid var(--border)",
                borderRight: "none",
                borderRadius: "8px 0 0 8px",
                color: "var(--text)",
                textDecoration: "none",
                fontSize: 20,
                opacity: 0.75,
                zIndex: 20,
                transition: "opacity 0.15s",
                lineHeight: 1,
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.opacity = "1")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.opacity = "0.75")}
            >
              ›
            </Link>
          )}
        </>
      )}
    </div>
  );
}
