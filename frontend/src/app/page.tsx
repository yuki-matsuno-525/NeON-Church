import { Suspense } from "react";
import Link from "next/link";
import { getT, getRequestLanguage } from "@/lib/i18nServer";
import { SkeletonList } from "@/components/ui";
import { HomeActivity, VerseCard, VerseCardFallback } from "./HomeSections";
import styles from "./Home.module.css";

type HomeSection = { title: string; href: string; icon: string; featured?: boolean };

/**
 * 表紙。
 *
 * 見出しとパネルはすぐに返し、今日の聖句・盛り上がっている意見・最近の質問は
 * 取れたところから流し込む（Suspense）。以前は3つが揃うまで画面ごと待たせて
 * いたので、サーバーが寝起きのときは真っ白のまま何秒も止まっていた。
 *
 * Suspense に言語を key として付けているのは、言語を切り替えたときに
 * 古い中身を出したまま待たず、すぐ枠に戻して新しい中身を待つため。
 */
export default async function Home() {
  const t = await getT();
  const lang = await getRequestLanguage();

  const sections: HomeSection[] = [
    { title: t.read, href: "/read", icon: "/img/icon-read.webp", featured: true },
    { title: t.qa, href: "/qa", icon: "/img/icon-qa.webp" },
    { title: t.translate, href: "/translations", icon: "/img/icon-translation.webp" },
    { title: t.articles, href: "/articles", icon: "/img/icon-articles.webp" },
    { title: t.plans, href: "/plans", icon: "/img/icon-plans.webp" },
  ];

  return (
    <div className={styles.content}>
      {/* ヒーローセクション */}
      <div className="pt-6 pb-2">
        <p className={styles.heroEyebrow}>NeON Church</p>
        <h1 className={styles.heroTitle}>{t.homeTagline}</h1>
        <p className={styles.heroDesc}>{t.homeDesc}</p>
      </div>

      <Suspense key={`verse-${lang}`} fallback={<VerseCardFallback t={t} />}>
        <VerseCard t={t} lang={lang} />
      </Suspense>

      {/* セクションカード */}
      <div className={styles.cards}>
        {sections.map((section) => (
          <SectionCard key={section.href} {...section} />
        ))}
      </div>

      <Suspense key={`activity-${lang}`} fallback={<SkeletonList count={2} />}>
        <HomeActivity t={t} lang={lang} />
      </Suspense>
    </div>
  );
}

function SectionCard({ title, href, icon, featured = false }: HomeSection) {
  // 触れたときに明るくするのは CSS の :hover / :focus-visible に任せる。
  // 以前は JavaScript で style を直接書き換えていたため、キーボードで
  // 選んだときには光らなかった。
  const cardClass = [
    "card-glow card-glow-strong card-glow-interactive",
    styles.sectionCard,
    featured ? "card-glow-featured" : null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <Link href={href} className={cardClass}>
      <div className={styles.sectionRow}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={icon} alt="" className={styles.sectionIcon} />
        <p className={styles.sectionTitle}>{title}</p>
      </div>
    </Link>
  );
}
