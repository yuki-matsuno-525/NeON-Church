import type { Metadata } from "next";
import Link from "next/link";
import { ApiError, type CommentaryChapterDetail, type CommentarySection, type ListPage } from "@/lib/api";
import { serverFetchPublic } from "@/lib/apiServer";
import { getRequestLanguage, getT } from "@/lib/i18nServer";
import { CommentaryChapterReader } from "@/components/commentary/CommentaryChapterReader";
import { SECTION_PAGE_SIZE, chapterName, workTitle } from "@/lib/commentary";

type Params = Promise<{ slug: string; chapter: string }>;

// 解釈書の中身は seed を入れ直したときにしか変わらない。誰が見ても同じなので、1時間は取り置きを使う。
// （お気に入りなど人によって違うものは、画面側で別に取る）
const CHAPTER_REVALIDATE_SECONDS = 3600;

function fetchChapter(slug: string, chapter: number) {
  return serverFetchPublic<CommentaryChapterDetail>(
    `/commentary/works/${slug}/chapters/${chapter}/`,
    CHAPTER_REVALIDATE_SECONDS,
  );
}

/** 区切りの1ページ。useLoadMore などと同じ形（ListPage）にして返す。 */
async function fetchSectionPage(slug: string, chapter: number, page: number): Promise<ListPage<CommentarySection>> {
  const data = await serverFetchPublic<{ results: CommentarySection[]; count: number; next: string | null }>(
    `/commentary/works/${slug}/chapters/${chapter}/sections/?page=${page}&page_size=${SECTION_PAGE_SIZE}`,
    CHAPTER_REVALIDATE_SECONDS,
  );
  return { results: data.results, count: data.count, hasMore: data.next !== null, counts: undefined };
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug, chapter } = await params;
  try {
    const detail = await fetchChapter(slug, Number(chapter));
    const lang = await getRequestLanguage();
    const title = `${workTitle(detail.work, lang)} ${chapterName(detail, lang)}`;
    return { title, openGraph: { title }, twitter: { title } };
  } catch {
    return {};
  }
}

/**
 * 解釈書の章のページ。上の部分と区切りの最初のページはサーバーで取り、
 * 押す・読み足す・コメントするところはブラウザ側（CommentaryChapterReader）に任せる。
 *
 * ?s=<区切りの番号> で開かれたら、その区切りを含むページから始める（節のパネルの「全文を読む」から）。
 */
export default async function CommentaryChapterPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Promise<{ s?: string }>;
}) {
  const { slug, chapter } = await params;
  const { s } = await searchParams;
  const t = await getT();
  const chapterNumber = Number(chapter);
  const target = Number(s);
  const page = Number.isInteger(target) && target > 0 ? Math.ceil(target / SECTION_PAGE_SIZE) : 1;

  let loaded: [CommentaryChapterDetail, ListPage<CommentarySection>];
  try {
    loaded = await Promise.all([
      fetchChapter(slug, chapterNumber),
      fetchSectionPage(slug, chapterNumber, page),
    ]);
  } catch (reason) {
    const notFound = reason instanceof ApiError && reason.status === 404;
    return (
      <div className="page page-detail">
        <p className="text-muted">{notFound ? t.chapterNotFound : t.loadErrorDesc}</p>
        <Link href={`/commentary/${slug}`} className="text-accent">{t.commentaryBackToList}</Link>
      </div>
    );
  }
  const [detail, sections] = loaded;
  return <CommentaryChapterReader key={`${slug}-${chapterNumber}`} chapter={detail} initial={sections} initialPage={page} />;
}
