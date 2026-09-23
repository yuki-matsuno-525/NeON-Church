"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  fetchCommentaryBookmarks,
  fetchCommentarySections,
  type Bookmark,
  type CommentaryChapterDetail,
  type CommentaryLink,
  type CommentarySection,
  type ListPage,
  type Verse,
} from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LanguageContext";
import { useT } from "@/lib/i18n";
import {
  COMMENTARY_INDEX_HREF,
  SECTION_PAGE_SIZE,
  chapterName,
  commentaryLinkHref,
  commentaryLinkLabel,
  workByline,
  workTitle as workTitleIn,
} from "@/lib/commentary";
import { saveCommentaryProgress } from "@/lib/commentaryProgress";
import { Breadcrumb } from "@/components/list";
import { LoadMoreButton } from "@/components/ui";
import { ChapterComments } from "@/components/reader/ChapterComments";
import { CommentPanel } from "@/components/reader/CommentPanel";
import { CommentaryBookmarkStar } from "./CommentaryBookmarkStar";
import styles from "./Commentary.module.css";

type Props = {
  chapter: CommentaryChapterDetail;
  /** サーバーで取った区切りのページ（ふつうは1ページ目。?s= で飛んできたときはその区切りのページ） */
  initial: ListPage<CommentarySection>;
  initialPage: number;
};

/**
 * 解釈書の章のページ。聖書の章のページ（ChapterReader）と同じ作り:
 * 区切り（節にあたる）を並べ、押すと右（スマホでは下）にパネルが開く。下に章へのコメント。
 * パネルは聖書と同じ CommentPanel を、解釈書の場所（解釈書・章・区切り）で使う。
 */
export function CommentaryChapterReader({ chapter, initial, initialPage }: Props) {
  const t = useT();
  const { lang } = useLang();
  const { user } = useAuth();
  const work = chapter.work;
  const workTitle = workTitleIn(work, lang);
  const chapterTitle = chapterName(chapter, lang);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // この章のお気に入り（章そのものと、区切りのもの）。星とパネルで同じものを使い、取りに行くのは1回だけ。
  const [bookmarks, setBookmarks] = useState<Bookmark[] | null>(null);

  const sections = usePagedSections(work.slug, chapter.number, initial, initialPage);

  // 読んだ場所を残す（「読む」の解釈書タブの「続きから読む」と、書のページの印に使う）。
  // 章を開いたとき、区切りを選んだとき。区切りは選ばれたものか、#s- で飛んできたもの。
  const selectedNumber = sections.items.find((s) => s.id === selectedId)?.number ?? null;
  useEffect(() => {
    const fromHash = window.location.hash.match(/^#s-(\d+)$/);
    saveCommentaryProgress({
      work: work.slug,
      chapter: chapter.number,
      number: selectedNumber ?? (fromHash ? Number(fromHash[1]) : null),
      title: { ja: workTitleIn(work, "ja"), en: workTitleIn(work, "en") },
      chapterTitle: { ja: chapterName(chapter, "ja"), en: chapterName(chapter, "en") },
    });
  }, [work, chapter, selectedNumber]);

  // この章のお気に入り（章の星とパネルの星に使う）。
  useEffect(() => {
    if (!user) return;
    let alive = true;
    fetchCommentaryBookmarks(work.slug, chapter.number)
      .then((items) => {
        if (alive) setBookmarks(items);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [user, work.slug, chapter.number]);

  // #s-3 で開かれたら、その区切りまで送る（節のパネルの「全文を読む」から来たとき）。
  useEffect(() => {
    const match = window.location.hash.match(/^#s-(\d+)$/);
    if (match) document.getElementById(`s-${match[1]}`)?.scrollIntoView({ block: "center" });
  }, []);

  const selected = sections.items.find((s) => s.id === selectedId) ?? null;
  // パネルは節（Verse）の形を受け取るので、区切りをその形にして渡す。
  const selectedVerse: Verse | null = useMemo(
    () => (selected ? { id: selected.id, chapter: String(chapter.number), number: selected.number, text: selected.text } : null),
    [selected, chapter.number],
  );
  const sectionBookmarks = (bookmarks ?? []).filter((bm) => bm.commentary_reference?.number != null);
  const chapterBookmarks = bookmarks?.filter((bm) => bm.commentary_reference?.number == null) ?? null;

  return (
    <div className="min-h-page">
      <div className="reader-sticky-header">
        <Breadcrumb
          items={[
            { label: t.commentary, href: COMMENTARY_INDEX_HREF },
            { label: workTitle, href: `/commentary/${work.slug}` },
            { label: chapterTitle || String(chapter.number) },
          ]}
        />
        <div className="reader-header-actions flex items-center gap-2">
          <a
            href="#chapter-comments"
            className="text-xs text-faint no-underline py-1 px-3 tap-target inline-flex items-center border border-border rounded-lg whitespace-nowrap"
          >
            {t.toComments}
          </a>
        </div>
      </div>

      <div className={`reader-wrapper${selectedVerse ? " has-verse" : ""}`}>
        <div className="reader-main">
          <div className="flex items-center gap-1 mb-2">
            <h1 className="text-xl font-bold m-0 text-balance">{chapterTitle || `${workTitle} ${chapter.number}`}</h1>
            <CommentaryBookmarkStar
              place={{ work: work.slug, chapter: chapter.number }}
              bookmarks={chapterBookmarks}
              onChange={(updated) =>
                setBookmarks((prev) => [
                  ...(prev ?? []).filter((bm) => bm.commentary_reference?.number != null),
                  ...(updated ? [updated] : []),
                ])
              }
            />
          </div>
          <div className="mb-4 text-sm text-muted">{workByline(work, lang)}</div>

          <LinkChips links={chapter.links} lang={lang} />

          <hr className="section-divider" />

          {sections.firstPage > 1 && (
            <button type="button" className="btn btn-ghost mb-2" disabled={sections.busy} onClick={sections.loadPrev}>
              {t.commentaryLoadEarlier}
            </button>
          )}
          <div>
            {sections.items.map((section) => (
              <SectionRow
                key={section.id}
                section={section}
                language={work.language}
                lang={lang}
                selected={section.id === selectedId}
                onSelect={() => setSelectedId(section.id)}
              />
            ))}
          </div>
          <LoadMoreButton
            hasMore={sections.hasMore}
            loading={sections.busy}
            error={sections.failed}
            onClick={sections.loadNext}
          />

          <ChapterComments commentary={{ work: work.slug, chapter: chapter.number }} label={t.chapterCommentsHeading} />
        </div>

        {selected && selectedVerse && (
          <div className="reader-panel">
            <CommentPanel
              verse={selectedVerse}
              chapterNumber={chapter.number}
              onClose={() => setSelectedId(null)}
              commentaryPlace={{ work: work.slug, chapter: chapter.number, number: selected.number }}
              headerLabel={`${chapterTitle || chapter.number} › ${selected.number}`}
              verseBookmarks={sectionBookmarks}
              onVerseBookmarksChange={(updated) =>
                setBookmarks((prev) => [...(prev ?? []).filter((bm) => bm.commentary_reference?.number == null), ...updated])
              }
            />
          </div>
        )}
      </div>

      {!selectedVerse && (
        <>
          {chapter.prev_number !== null && (
            <Link
              href={`/commentary/${work.slug}/${chapter.prev_number}`}
              aria-label={`${t.prevChapter} (${chapter.prev_number})`}
              className="chapter-nav chapter-nav-prev"
            >
              ‹
            </Link>
          )}
          {chapter.next_number !== null && (
            <Link
              href={`/commentary/${work.slug}/${chapter.next_number}`}
              aria-label={`${t.nextChapter} (${chapter.next_number})`}
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

/**
 * 区切り1つ。聖書の節の行（VerseList）と同じ見た目・同じ操作（押すとパネル、Enter / Space でも）。
 * 区切りが引いている聖書の箇所は、行の下にリンクとして並べる（ボタンの中にリンクは置けないため外に出す）。
 */
function SectionRow({
  section,
  language,
  lang,
  selected,
  onSelect,
}: {
  section: CommentarySection;
  language: string;
  lang: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <div id={`s-${section.number}`} className={styles.sectionRow}>
      <button
        type="button"
        data-testid="commentary-section"
        aria-pressed={selected}
        onClick={onSelect}
        className={`verse-row${selected ? " verse-row-selected" : ""}`}
      >
        <span className="verse-text" lang={language}>
          <sup className="verse-number">{section.number}</sup>
          {section.heading && <span className={styles.rowHeading}>{section.heading}</span>}
          <span className={styles.rowText}>{section.text}</span>
        </span>
      </button>
      {section.links.length > 0 && (
        <div className={styles.rowChips}>
          <LinkChips links={section.links} lang={lang} />
        </div>
      )}
    </div>
  );
}

/**
 * 聖書の箇所へのリンクの列。論じている箇所（構造）と引いている箇所（引用・AI判定）を分けて出す。
 * 押すと読書画面のその節へ。AI判定には必ずその印を付ける。
 */
function LinkChips({ links, lang }: { links: CommentaryLink[]; lang: string }) {
  const t = useT();
  const discussed = links.filter((link) => link.method === "structure");
  const cited = links.filter((link) => link.method !== "structure");
  const chip = (link: CommentaryLink, index: number) => (
    <Link key={index} href={commentaryLinkHref(link)} className={styles.chip}>
      {commentaryLinkLabel(link, lang)}
      {link.method === "ai" && ` · ${t.commentaryMethods.ai}`}
    </Link>
  );
  return (
    <>
      {discussed.length > 0 && (
        <div className={styles.chips}>
          <span>{t.commentaryDiscussedPassages}</span>
          {discussed.map(chip)}
        </div>
      )}
      {cited.length > 0 && (
        <div className={styles.chips}>
          <span>{t.commentaryCitedPassages}</span>
          {cited.map(chip)}
        </div>
      )}
    </>
  );
}

/**
 * 区切りをページ単位で前後に読み足す。?s= で章の途中から開いたときは、そのページから始まるので、
 * 「もっと見る」（後ろ）に加えて「前を読む」（前）も要る（useLoadMore は前へは読めない）。
 */
function usePagedSections(work: string, chapter: number, initial: ListPage<CommentarySection>, initialPage: number) {
  const [items, setItems] = useState(initial.results);
  const [firstPage, setFirstPage] = useState(initialPage);
  const [lastPage, setLastPage] = useState(initialPage);
  const [hasMore, setHasMore] = useState(initial.hasMore);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const load = async (page: number, where: "before" | "after") => {
    setBusy(true);
    setFailed(false);
    try {
      const next = await fetchCommentarySections(work, chapter, page, SECTION_PAGE_SIZE);
      if (where === "before") {
        setItems((prev) => [...next.results, ...prev]);
        setFirstPage(page);
      } else {
        setItems((prev) => [...prev, ...next.results]);
        setLastPage(page);
        setHasMore(next.hasMore);
      }
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  return {
    items,
    firstPage,
    hasMore,
    busy,
    failed,
    loadPrev: () => load(firstPage - 1, "before"),
    loadNext: () => load(lastPage + 1, "after"),
  };
}
