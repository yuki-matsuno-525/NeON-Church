import type { Metadata } from "next";
import Link from "next/link";
import { ApiError, type CommentaryWorkDetail } from "@/lib/api";
import { serverFetchPublic } from "@/lib/apiServer";
import { getRequestLanguage, getT } from "@/lib/i18nServer";
import { Breadcrumb } from "@/components/list";
import { ChapterComments } from "@/components/reader/ChapterComments";
import { CommentaryBookmarkStar } from "@/components/commentary/CommentaryBookmarkStar";
import { CommentaryChapterBoard } from "@/components/commentary/CommentaryChapterBoard";
import styles from "@/components/commentary/Commentary.module.css";
import { COMMENTARY_INDEX_HREF, workAuthor, workByline, workNote, workTitle } from "@/lib/commentary";

// 解釈書の中身は seed を入れ直したときにしか変わらない。誰が見ても同じなので、1時間は取り置きを使う。
const WORK_REVALIDATE_SECONDS = 3600;

/** 解釈書1冊（章の一覧つき）。同じ描画の中の generateMetadata と本体で1回の取得にまとまる。 */
function fetchWork(slug: string) {
  return serverFetchPublic<CommentaryWorkDetail>(`/commentary/works/${slug}/`, WORK_REVALIDATE_SECONDS);
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  try {
    const work = await fetchWork(slug);
    const title = workByline(work, await getRequestLanguage());
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
  const lang = await getRequestLanguage();

  let work: CommentaryWorkDetail;
  try {
    work = await fetchWork(slug);
  } catch (reason) {
    const notFound = reason instanceof ApiError && reason.status === 404;
    return (
      <div className="page page-detail">
        <p className="text-muted">{notFound ? t.notFoundTitle : t.loadErrorDesc}</p>
        <Link href={COMMENTARY_INDEX_HREF} className="text-accent">{t.commentaryBackToList}</Link>
      </div>
    );
  }

  const title = workTitle(work, lang);
  // 題の下に添える、もう一方の言語の題（原題または和題）
  const otherTitle = lang === "en" ? work.title_ja : work.title;
  const numbered = isNumberedByBibleChapter(work);

  return (
    <div className="min-h-page">
      <div className="reader-sticky-header">
        <Breadcrumb items={[{ label: t.commentary, href: COMMENTARY_INDEX_HREF }, { label: title }]} />
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
            {workAuthor(work, lang)}
            {otherTitle && otherTitle !== title && (
              <span lang={lang === "en" ? "ja" : work.language}>　{otherTitle}</span>
            )}
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
                <dd>{workNote(work.translator, work.translator_en, lang)}</dd>
              </>
            )}
            <dt>{t.commentaryLicense}</dt>
            <dd>
              {t.commentaryLicenses[work.license] ?? work.license}
              {work.license_note && `\n${workNote(work.license_note, work.license_note_en, lang)}`}
            </dd>
          </dl>
        </header>

        <h2 className="text-sm font-bold text-muted mb-3">{t.selectChapterHeading}</h2>

        <CommentaryChapterBoard work={work.slug} chapters={work.chapters} numbered={numbered} />

        <ChapterComments commentary={{ work: work.slug }} label={t.bookCommentsHeading} />
      </div>
    </div>
  );
}
