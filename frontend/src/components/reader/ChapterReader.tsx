"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
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
import { getBookBySlug, chapterTitle, adjacentChapter } from "@/lib/books";
import { resolveVersionChapterIds, resolveVersionVerseIds } from "@/lib/versions";
import { arrangeVerses, isMarkShorterEnding } from "@/lib/verses";
import { translationLabel } from "@/lib/translations";
import { readTranslationPreference, saveTranslationPreference } from "@/lib/translationPreference";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LanguageContext";
import { VerseList } from "@/components/reader/VerseList";
import { BulkBookmarkBar, useBulkBookmark } from "@/components/reader/BulkBookmarkBar";
import { CommentPanel } from "@/components/reader/CommentPanel";
import { ChapterComments } from "@/components/reader/ChapterComments";
import { useReaderHeaderHeight } from "@/hooks/useReaderHeaderHeight";
import { useT, useBookLabel } from "@/lib/i18n";
import { useToast } from "@/components/ui/Toast";
import { Breadcrumb } from "@/components/list";

type Props = {
  slug: string;
  chapterNumber: number;
  /** サーバーが実際に使った訳。この書が持っていない訳を頼まれたら別の訳に解決されている */
  translationId: string;
  /** その訳が URL（?translation=）で指定されたものか。指定されていれば以後もそれを使う */
  fromQuery: boolean;
  /** この書で実際に本文が入っている訳。切替の候補はここから作る（books.ts の宣言ではない） */
  translations: string[];
  /** 頼んだ訳がまだ収録されていないときのお知らせ。無ければ null */
  notice: string | null;
  /** 覚えている訳がサイトのどこにも無いとき、代わりに覚え直す訳。無ければ null */
  correctCookieTo: string | null;
  /** 本文を取ってきた DB の書 id。読書履歴の保存に使う */
  bookId: string;
  chapter: Chapter;
  verses: Verse[];
};

/**
 * 本文を読む画面のうち、押して動くところ全部。
 *
 * 本文そのものはサーバーが取ってから渡ってくる（page.tsx）。ここが受け持つのは
 * 節を選ぶ・お気に入り・コメント欄・読書履歴の記録といった、開いたあとの操作。
 */
export function ChapterReader({
  slug,
  chapterNumber,
  translationId,
  fromQuery,
  translations,
  notice,
  correctCookieTo,
  bookId,
  chapter,
  verses,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const t = useT();
  const toast = useToast();
  const { lang } = useLang();
  // 上に貼り付く帯の高さを測って、コメント欄がその下から始まるようにする。
  const headerRef = useReaderHeaderHeight();

  const meta = getBookBySlug(slug);
  const label = useBookLabel(slug);
  // セクション見出しで区切られる本（マリアの福音書など）の章名。無い本は null。
  const chapterName = chapterTitle(slug, chapterNumber);
  // 章送りの行き先。章番号は連番とは限らない（トマスは第0章から、Q資料は飛び飛び）。
  const nav = adjacentChapter(slug, chapterNumber);
  // 訳の切替候補は「この本に本文が入っている訳」だけにする（エノク書なら Charles 英訳のみ）。
  // サーバーが数えた実データを使う。books.ts の宣言だけを見ていた頃は、まだ本文を
  // 入れていない訳も候補に並び、選ぶとその訳が載っている書が全部開けなくなっていた。
  const translationOptions = useMemo(
    () =>
      (translations.length > 0 ? translations : (meta?.translations ?? []).map((tr) => tr.id)).map((id) => ({
        id,
        label: translationLabel(id, lang),
      })),
    [translations, meta, lang],
  );

  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [chapterBusy, setChapterBusy] = useState(false);
  const [progressError, setProgressError] = useState(false);
  const [bookmarkLoadError, setBookmarkLoadError] = useState(false);
  const [versionResolutionError, setVersionResolutionError] = useState(false);
  const [highlightVerseNumber, setHighlightVerseNumber] = useState<number | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  // 全バージョン表示トグル用：この章・選択中の節の、各訳のid。
  const [allVersionChapterIds, setAllVersionChapterIds] = useState<string[]>([]);
  const [allVersionVerseIds, setAllVersionVerseIds] = useState<string[]>([]);
  const [versionToken, setVersionToken] = useState(0);
  const selectedVerseId = searchParams.get("verse");

  /** 訳を選び直す。覚えたうえで、サーバーにその訳の本文を組み立て直してもらう。 */
  const chooseTranslation = (id: string) => {
    saveTranslationPreference(id);
    router.refresh();
  };

  useEffect(() => {
    // URL で訳を指定して来たときは、以後もその訳で読めるよう覚えるだけ。
    if (fromQuery) {
      saveTranslationPreference(translationId);
      return;
    }
    // 覚えている訳がサイトのどこにも本文を持っていないときは、今出している訳に覚え直す。
    // そのままだと、どの書を開いても代わりの訳になってお知らせが出続けてしまう。
    if (correctCookieTo) {
      saveTranslationPreference(correctCookieTo);
      return;
    }
    // 以前はブラウザの控えに訳を覚えていた。まだ移し替えていない人のために、
    // 1度だけ Cookie へ写して読み直す（次からはサーバーが最初から正しい訳で返す）。
    const remembered = readTranslationPreference();
    if (!remembered || remembered === translationId) return;
    if (!translations.includes(remembered)) return;
    saveTranslationPreference(remembered);
    router.refresh();
  }, [fromQuery, correctCookieTo, translationId, translations, router]);

  // 読んだところを覚える。控えはこのブラウザに、履歴はログイン中ならサーバーにも。
  useEffect(() => {
    saveLocalProgress(slug, {
      bookId,
      chapterId: chapter.id,
      chapterNumber: chapter.number,
      updatedAt: new Date().toISOString(),
    });
    if (!user) return;
    saveReadingProgress({ book: bookId, chapter: chapter.id })
      .then(() => setProgressError(false))
      .catch(() => setProgressError(true));
  }, [slug, bookId, chapter, user]);

  // この章に関わるお気に入り（章・節・この章のコメント）だけをサーバー側で絞って取る。
  useEffect(() => {
    if (!user) return;
    fetchChapterBookmarks(slug, chapterNumber)
      .then((items) => {
        setBookmarks(items);
        setBookmarkLoadError(false);
      })
      .catch(() => {
        setBookmarks([]);
        setBookmarkLoadError(true);
      });
  }, [user, slug, chapterNumber]);

  // 全バージョン表示用：この章の各訳の章idを集める。
  useEffect(() => {
    resolveVersionChapterIds(slug, chapterNumber)
      .then((ids) => {
        setAllVersionChapterIds(ids);
        setVersionResolutionError(false);
      })
      .catch(() => {
        setAllVersionChapterIds([]);
        setVersionResolutionError(true);
      });
  }, [slug, chapterNumber, versionToken]);

  // 選択中の節の、各訳の節idを集める（節を選び直すたびに更新）。
  useEffect(() => {
    let cancelled = false;
    const verse = verses.find((v) => v.id === selectedVerseId);
    const pending = verse
      ? resolveVersionVerseIds(slug, chapterNumber, verse.number)
      : Promise.resolve<string[]>([]);
    pending
      .then((ids) => {
        if (cancelled) return;
        setAllVersionVerseIds(ids);
        setVersionResolutionError(false);
      })
      .catch(() => {
        if (cancelled) return;
        setAllVersionVerseIds([]);
        setVersionResolutionError(true);
      });
    return () => { cancelled = true; };
  }, [slug, chapterNumber, selectedVerseId, verses, versionToken]);

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
    if (!highlightVerseNumber) return;
    const timer = setTimeout(() => {
      const el = document.getElementById(`verse-${highlightVerseNumber}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
    return () => clearTimeout(timer);
  }, [highlightVerseNumber]);

  const verseUrl = (verseId: string | null) => {
    const next = new URLSearchParams(searchParams.toString());
    if (verseId) next.set("verse", verseId);
    else next.delete("verse");
    const query = next.toString();
    const hash = typeof window === "undefined" ? "" : window.location.hash;
    return `${pathname}${query ? `?${query}` : ""}${hash}`;
  };

  // 節の選び直しは URL だけを書き換える。scroll: false を付けないと Next.js が
  // 画面を一番上へ戻してしまい、コメント欄を開くたびに読んでいた場所を見失う。
  const handleClosePanel = () => router.replace(verseUrl(null), { scroll: false });

  const handleSelectVerse = (verseId: string) => {
    if (verseId === selectedVerseId) handleClosePanel();
    else if (selectedVerseId) router.replace(verseUrl(verseId), { scroll: false });
    else router.push(verseUrl(verseId), { scroll: false });
  };

  const selectedVerse = verses.find((v) => v.id === selectedVerseId) ?? null;

  // まとめてお気に入り。すでにお気に入りのある節は飛ばして、入った分だけ一覧に足す。
  const bulk = useBulkBookmark(async (verseIds) => {
    const already = new Set(
      bookmarks
        .filter((bm) => bm.target_type === "verse" && bm.reference?.verse != null)
        .map((bm) => `${bm.reference!.book}/${bm.reference!.chapter}/${bm.reference!.verse}`),
    );
    const targets = verseIds.filter((id) => {
      const verse = verses.find((v) => v.id === id);
      return verse && !already.has(`${slug}/${chapterNumber}/${verse.number}`);
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
    () => arrangeVerses(slug, chapterNumber, translationId, verses),
    [slug, chapterNumber, translationId, verses],
  );

  // お気に入りの仕分けは毎回作り直すと子（コメント欄・パネル）まで描き直しになるので覚えておく。
  const commentBookmarkMap: Record<string, string> = useMemo(
    () =>
      Object.fromEntries(
        bookmarks
          .filter((bm) => bm.target_type === "comment" && bm.comment_detail)
          .map((bm) => [bm.comment_detail!.id, bm.id]),
      ),
    [bookmarks],
  );
  const verseBookmarks = useMemo(
    () => bookmarks.filter((bm) => bm.target_type === "verse" || bm.target_type === null),
    [bookmarks],
  );

  // この章そのもののお気に入り。reference が同じ書・同じ章で、節を持たないものが該当。
  const chapterBookmark = useMemo(
    () =>
      bookmarks.find(
        (bm) =>
          bm.target_type === "chapter" &&
          bm.reference?.book === slug &&
          bm.reference?.chapter === chapterNumber,
      ),
    [bookmarks, slug, chapterNumber],
  );

  const toggleChapterBookmark = async () => {
    if (chapterBusy) return;
    setChapterBusy(true);
    try {
      if (chapterBookmark) {
        await removeBookmark(chapterBookmark.id);
        setBookmarks((prev) => prev.filter((bm) => bm.id !== chapterBookmark.id));
      } else {
        const created = await createChapterBookmark(chapter.id);
        setBookmarks((prev) => [...prev, created]);
      }
    } catch {
      toast.show(t.errorActionFailed, { type: "error" });
    } finally {
      setChapterBusy(false);
    }
  };

  const title = `${label?.short ?? meta?.short ?? slug} ${t.chapterFmt(chapterNumber)}`;

  return (
    <div className="min-h-page">
      <div ref={headerRef} className="reader-sticky-header">
        <Breadcrumb
          items={[
            { label: t.bookList, href: "/read" },
            { label: label?.short ?? meta?.short ?? slug, href: `/${slug}?list=1` },
            { label: t.chapterFmt(chapterNumber) },
          ]}
        />
        <div className="reader-header-actions flex items-center gap-2">
          <label className="inline-flex items-center gap-2 text-xs text-muted">
            <span>{t.translationLabel}</span>
            <select
              value={translationId}
              onChange={(e) => chooseTranslation(e.target.value)}
              className="select-sm bg-bg text-body"
            >
              {translationOptions.map((trans) => (
                <option key={trans.id} value={trans.id}>{trans.label}</option>
              ))}
            </select>
          </label>
          <a
            href="#chapter-comments"
            className="text-xs text-faint no-underline py-1 px-3 tap-target inline-flex items-center border border-border rounded-lg whitespace-nowrap"
          >
            {t.toComments}
          </a>
        </div>
      </div>

      {notice && (
        <p role="status" className="m-0 py-2 px-4 text-sm text-muted border-b border-border text-center">
          {notice}
        </p>
      )}

      {(progressError || bookmarkLoadError || versionResolutionError) && (
        <div role="alert" className="flex items-center justify-center gap-3 flex-wrap py-2 px-4 border-b border-border">
          <span className="text-sm text-danger">{t.actionFailed}</span>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              if (progressError && user) {
                saveReadingProgress({ book: bookId, chapter: chapter.id })
                  .then(() => setProgressError(false))
                  .catch(() => setProgressError(true));
              }
              if (bookmarkLoadError && user) {
                fetchChapterBookmarks(slug, chapterNumber)
                  .then((items) => {
                    setBookmarks(items);
                    setBookmarkLoadError(false);
                  })
                  .catch(() => setBookmarkLoadError(true));
              }
              if (versionResolutionError) setVersionToken((value) => value + 1);
            }}
          >
            {t.retry}
          </button>
        </div>
      )}

      <div className={`reader-wrapper${selectedVerse ? " has-verse" : ""}`}>
        <div className="reader-main">
          <div className="flex items-center gap-1 mb-6">
            <h1 className="text-xl font-bold m-0">
              {title}
              {chapterName && <span className="text-muted font-bold">{" — "}{chapterName}</span>}
            </h1>
            {user && (
              <BookmarkStar
                active={!!chapterBookmark}
                busy={chapterBusy}
                onToggle={toggleChapterBookmark}
                size={18}
              />
            )}
            {user && !bulk.pickMode && (
              <button type="button" onClick={bulk.start} className="day-toggle">
                {t.bulkBookmarkStart}
              </button>
            )}
          </div>

          <hr className="section-divider" />

          <VerseList
            verses={displayVerses}
            selectedVerseId={selectedVerseId}
            onSelectVerse={handleSelectVerse}
            highlightVerseNumber={highlightVerseNumber}
            pickMode={bulk.pickMode}
            pickedIds={bulk.pickedIds}
            onTogglePick={bulk.toggle}
            numberLabel={(v) =>
              isMarkShorterEnding(slug, translationId, v.number) ? t.markShorterEnding : v.number
            }
          />

          <ChapterComments
            chapterId={chapter.id}
            label={title}
            commentBookmarkMap={commentBookmarkMap}
            allVersionIds={allVersionChapterIds}
          />
        </div>

        {selectedVerse && (
          <div className="reader-panel">
            <CommentPanel
              verse={selectedVerse}
              chapterNumber={chapterNumber}
              onClose={handleClosePanel}
              commentBookmarkMap={commentBookmarkMap}
              verseBookmarks={verseBookmarks}
              bookSlug={slug}
              allVersionVerseIds={allVersionVerseIds}
              onVerseBookmarksChange={(updated) =>
                // 節のお気に入りだけ差し替え、コメント・章・書・プロジェクトのお気に入りはそのまま保持する。
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

      {/* 一番上へ戻るボタン。コメント欄を開いている間は、その邪魔になるので出さない。 */}
      {showScrollTop && !selectedVerse && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          aria-label={t.backToTop}
          className="fab"
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
              className="chapter-nav chapter-nav-prev"
            >
              ‹
            </Link>
          )}
          {nav.next !== null && (
            <Link
              href={`/${slug}/${nav.next}`}
              title={t.chapterFmt(nav.next)}
              aria-label={`${t.nextChapter} (${nav.next})`}
              className="chapter-nav chapter-nav-next"
            >
              ›
            </Link>
          )}
        </>
      )}
    </div>
  );
}
