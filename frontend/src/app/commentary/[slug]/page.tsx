import type { Metadata } from "next";
import Link from "next/link";
import { ApiError, type CommentaryWorkDetail } from "@/lib/api";
import { serverFetch } from "@/lib/apiServer";
import { getT } from "@/lib/i18nServer";
import { Breadcrumb } from "@/components/list";
import { ChapterComments } from "@/components/reader/ChapterComments";
import { CommentaryBookmarkStar } from "@/components/commentary/CommentaryBookmarkStar";
import styles from "@/components/commentary/Commentary.module.css";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  try {
    const work = await serverFetch<CommentaryWorkDetail>(`/commentary/works/${slug}/`);
    const title = `${work.author_ja || work.author}『${work.title_ja || work.title}』`;
    return { title, openGraph: { title }, twitter: { title } };
  } catch {
    return {};
  }
}

/** 章がどれも「〇〇 N章」（聖書の章）なら、聖書の書のページと同じ番号の升目で出す。 */
function isNumberedByBibleChapter(work: CommentaryWorkDetail): boolean {
  return work.chapters.every((c) => c.title.endsWith(`${c.number}章`));
}

/**
 * 解釈書の書のページ。聖書の書のページ（app/[book]/page.tsx）と同じ作り:
 * 題と星、章を選ぶ升目、下に書へのコメント。出典と権利もここに出す。
 */
export default async function CommentaryWorkPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const t = await getT();

  let work: CommentaryWorkDetail;
  try {
    work = await serverFetch<CommentaryWorkDetail>(`/commentary/works/${slug}/`);
  } catch (reason) {
    const notFound = reason instanceof ApiError && reason.status === 404;
    return (
      <div className="page page-detail">
        <p className="text-muted">{notFound ? t.notFoundTitle : t.loadErrorDesc}</p>
        <Link href="/commentary" className="text-accent">{t.commentaryBackToList}</Link>
      </div>
    );
  }

  const title = work.title_ja || work.title;
  const numbered = isNumberedByBibleChapter(work);

  return (
    <div className="min-h-page">
      <div className="reader-sticky-header">
        <Breadcrumb items={[{ label: t.commentary, href: "/commentary" }, { label: title }]} />
      </div>
      <div className="page page-wide">
        <header className={styles.workHeader}>
          <div className={styles.meta}>
            <span className="badge m-0">{t.commentaryTraditions[work.tradition] ?? work.tradition}</span>
            {work.year != null && <span>{t.commentaryYear(work.year)}</span>}
            {work.language !== "ja" && <span>{t.commentaryLanguages[work.language] ?? work.language}</span>}
          </div>
          <div className="flex items-center gap-1">
            <h1 className="text-xl font-bold m-0">{title}</h1>
            <CommentaryBookmarkStar place={{ work: work.slug }} />
          </div>
          <div className="text-sm text-muted">
            {work.author_ja || work.author}
            {work.title_ja && work.title !== work.title_ja && <span lang={work.language}>　{work.title}</span>}
          </div>
          {!work.readable && <p className="m-0 text-sm text-muted">{t.commentaryExcerptsNote}</p>}
          <dl className={styles.sourceBox}>
            <dt>{t.commentarySource}</dt>
            <dd>
              <a href={work.source_url} target="_blank" rel="noopener noreferrer" className="text-accent">
                {work.source_name}
              </a>
            </dd>
            {work.translator && (
              <>
                <dt>{t.commentaryTranslator}</dt>
                <dd>{work.translator}</dd>
              </>
            )}
            <dt>{t.commentaryLicense}</dt>
            <dd>
              {t.commentaryLicenses[work.license] ?? work.license}
              {work.license_note && `\n${work.license_note}`}
            </dd>
          </dl>
        </header>

        <h2 className="text-sm font-bold text-muted mb-3">{t.selectChapterHeading}</h2>

        {numbered ? (
          <div className="chapter-board">
            {work.chapters.map((chapter) => (
              <Link
                key={chapter.number}
                href={`/commentary/${work.slug}/${chapter.number}`}
                title={chapter.title}
                className="chapter-cell"
              >
                {chapter.number}
              </Link>
            ))}
          </div>
        ) : (
          <ol className={styles.chapterList}>
            {work.chapters.map((chapter) => (
              <li key={chapter.number}>
                <Link href={`/commentary/${work.slug}/${chapter.number}`} className={styles.chapterItem}>
                  <span>{chapter.title || chapter.number}</span>
                  <span className={styles.chapterItemCount}>{t.commentarySectionCount(chapter.section_count)}</span>
                </Link>
              </li>
            ))}
          </ol>
        )}

        <ChapterComments commentary={{ work: work.slug }} label={t.bookCommentsHeading} />
      </div>
    </div>
  );
}
