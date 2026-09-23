import type { Metadata } from "next";
import Link from "next/link";
import { ApiError, type CommentaryChapterDetail, type CommentarySection, type ListPage } from "@/lib/api";
import { serverFetch, serverFetchPage } from "@/lib/apiServer";
import { getT } from "@/lib/i18nServer";
import { CommentaryChapterReader } from "@/components/commentary/CommentaryChapterReader";
import { SECTION_PAGE_SIZE } from "@/lib/commentary";

type Params = Promise<{ slug: string; chapter: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug, chapter } = await params;
  try {
    const detail = await serverFetch<CommentaryChapterDetail>(`/commentary/works/${slug}/chapters/${Number(chapter)}/`);
    const title = `${detail.work.title_ja || detail.work.title} ${detail.title}`;
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
      serverFetch<CommentaryChapterDetail>(`/commentary/works/${slug}/chapters/${chapterNumber}/`),
      serverFetchPage<CommentarySection>(
        `/commentary/works/${slug}/chapters/${chapterNumber}/sections/?page=${page}&page_size=${SECTION_PAGE_SIZE}`,
      ),
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
