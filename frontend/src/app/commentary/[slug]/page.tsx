import type { Metadata } from "next";
import Link from "next/link";
import { ApiError, type CommentaryLink, type CommentarySection, type CommentaryWork } from "@/lib/api";
import { serverFetch } from "@/lib/apiServer";
import { getRequestLanguage, getT } from "@/lib/i18nServer";
import type { Translations } from "@/lib/i18n";
import { commentaryLinkHref, commentaryLinkLabel } from "@/lib/commentary";
import { Breadcrumb } from "@/components/list";
import { QueryPagination } from "@/components/ui/QueryPagination";
import styles from "@/components/commentary/Commentary.module.css";

// 1ページの区切りの数（backend の StandardPageNumberPagination と同じ）。
const PAGE_SIZE = 20;

type Paginated<T> = { count: number; next: string | null; results: T[] };

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  try {
    const work = await serverFetch<CommentaryWork>(`/commentary/works/${slug}/`);
    const title = `${work.author_ja || work.author}『${work.title_ja || work.title}』`;
    return { title, openGraph: { title }, twitter: { title } };
  } catch {
    return {};
  }
}

/**
 * 解釈書1冊を読むページ。
 *
 * 節のパネルの「全文を読む」からは ?around=<区切りの番号>#s-<番号> で飛んでくる。
 * around はその区切りを含むページを開くための印で、ページ送りを押すと ?page= が優先される。
 * 出典と権利はいつも見えるところに出す（パブリックドメインでも、どこから取ったかは明かす）。
 */
export default async function CommentaryWorkPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string; around?: string }>;
}) {
  const { slug } = await params;
  const { page, around } = await searchParams;
  const t = await getT();
  const lang = await getRequestLanguage();

  const query = new URLSearchParams();
  if (page) query.set("page", page);
  else if (around) query.set("around", around);

  let work: CommentaryWork;
  let sections: Paginated<CommentarySection>;
  try {
    [work, sections] = await Promise.all([
      serverFetch<CommentaryWork>(`/commentary/works/${slug}/`),
      serverFetch<Paginated<CommentarySection>>(`/commentary/works/${slug}/sections/?${query.toString()}`),
    ]);
  } catch (reason) {
    const notFound = reason instanceof ApiError && reason.status === 404;
    return (
      <div className="page page-detail">
        <p className="text-muted">{notFound ? t.notFoundTitle : t.loadErrorDesc}</p>
        <Link href="/commentary" className="text-accent">{t.commentaryBackToList}</Link>
      </div>
    );
  }

  const totalPages = Math.max(1, Math.ceil(sections.count / PAGE_SIZE));
  const firstOrder = sections.results[0]?.order ?? 0;
  const currentPage = Math.floor(firstOrder / PAGE_SIZE) + 1;
  const title = work.title_ja || work.title;

  return (
    <div className="page page-detail">
      <div className="mb-3">
        <Breadcrumb items={[{ label: t.commentary, href: "/commentary" }, { label: title }]} />
      </div>

      <header className={styles.workHeader}>
        <div className={styles.meta}>
          <span className="badge m-0">{t.commentaryTraditions[work.tradition] ?? work.tradition}</span>
          {work.year != null && <span>{t.commentaryYear(work.year)}</span>}
          {work.language !== "ja" && <span>{t.commentaryLanguages[work.language] ?? work.language}</span>}
        </div>
        <h1 className="font-serif text-2xl font-bold m-0 leading-tight">{title}</h1>
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

      <div className={styles.sections}>
        {sections.results.map((section) => (
          <section key={section.id} id={`s-${section.order}`} className={styles.section}>
            {section.heading && <h2 className={styles.sectionHeading}>{section.heading}</h2>}
            <p className={styles.sectionText} lang={work.language}>{section.text}</p>
            <PassageChips links={section.links} lang={lang} t={t} />
          </section>
        ))}
      </div>

      {totalPages > 1 && <QueryPagination page={currentPage} totalPages={totalPages} param="page" />}
    </div>
  );
}

/** その区切りが論じている箇所と、引いている箇所。押すと読書画面のその節へ。 */
function PassageChips({ links, lang, t }: { links: CommentaryLink[]; lang: string; t: Translations }) {
  const discussed = links.filter((link) => link.method === "structure");
  const cited = links.filter((link) => link.method !== "structure");
  if (links.length === 0) return null;

  const chip = (link: CommentaryLink, index: number) => (
    <Link key={`${index}-${link.book}-${link.chapter}-${link.verse}`} href={commentaryLinkHref(link)} className={styles.chip}>
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
