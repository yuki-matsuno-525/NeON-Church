import Link from "next/link";
import type { CommentaryTradition, CommentaryWork } from "@/lib/api";
import { serverFetchList } from "@/lib/apiServer";
import { getT } from "@/lib/i18nServer";
import { ListPageHeader } from "@/components/list";
import { EmptyState } from "@/components/ui";
import { ErrorState } from "@/components/ui/ErrorState";
import styles from "@/components/commentary/Commentary.module.css";

// 並べる順。時代の古い立場から。
const TRADITION_ORDER: CommentaryTradition[] = ["jewish", "patristic", "medieval", "reformation", "mukyokai"];

/**
 * 解釈書の一覧。立場（ユダヤ教・教父・中世・宗教改革・無教会）ごとに、時代順に並べる。
 * 読むだけの画面なので、サーバー側で組み立てて返す。
 */
export default async function CommentaryListPage() {
  const t = await getT();
  const works = await serverFetchList<CommentaryWork>("/commentary/works/").catch(() => null);

  return (
    <div className="page page-full">
      <ListPageHeader title={t.commentary} description={t.commentaryDesc} />

      {works === null ? (
        <ErrorState title={t.loadErrorTitle} message={t.loadErrorDesc} />
      ) : works.length === 0 ? (
        <EmptyState title={t.commentaryEmpty} />
      ) : (
        <div className={styles.groups}>
          {TRADITION_ORDER.map((tradition) => {
            const group = works.filter((work) => work.tradition === tradition);
            if (group.length === 0) return null;
            return (
              <section key={tradition} aria-labelledby={`tradition-${tradition}`}>
                <h2 id={`tradition-${tradition}`} className={styles.groupTitle}>
                  {t.commentaryTraditions[tradition]}
                </h2>
                <div className={styles.workGrid}>
                  {group.map((work) => (
                    <Link key={work.slug} href={`/commentary/${work.slug}`} className={`card-glow card-glow-interactive ${styles.workCard}`}>
                      <div className={styles.meta}>
                        {work.year != null && <span>{t.commentaryYear(work.year)}</span>}
                        {work.language !== "ja" && <span>{t.commentaryLanguages[work.language] ?? work.language}</span>}
                        {work.section_count != null && <span>{t.commentarySectionCount(work.section_count)}</span>}
                      </div>
                      <div className={styles.author}>{work.author_ja || work.author}</div>
                      <div className="text-sm">{work.title_ja || work.title}</div>
                    </Link>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
