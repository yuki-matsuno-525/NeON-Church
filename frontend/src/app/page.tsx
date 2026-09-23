import { Suspense } from "react";
import Link from "next/link";
import { getT, getRequestLanguage } from "@/lib/i18nServer";
import type { Translations } from "@/lib/i18nDictionary";
import { firstChapterOf } from "@/lib/books";
import { bookLabel } from "@/lib/i18nFormat";
import { SkeletonList } from "@/components/ui";
import { HomeActivity, VerseCard, VerseCardFallback } from "./HomeSections";
import styles from "./Home.module.css";

/**
 * 表紙。
 *
 * 初めて来た人が「最初に何を押せばいいか」迷わないよう、押すものを
 * 「登録せずに読んでみる」の1つに絞り、ほかの機能への入口は一番下に小さく置く。
 * 広い画面では、左に説明とボタン、右に今日の聖句を並べて最初の一画面に収める。
 *
 * 今日の聖句・盛り上がっている意見・最近の質問は、取れたところから流し込む
 * （Suspense）。以前は3つが揃うまで画面ごと待たせていたので、サーバーが
 * 寝起きのときは真っ白のまま何秒も止まっていた。
 * Suspense に言語を key として付けているのは、言語を切り替えたときに
 * 古い中身を出したまま待たず、すぐ枠に戻して新しい中身を待つため。
 *
 * 文字色: 背景の街の写真に直接載る説明文は text-soft（紫みを抑えて明るくした色）。
 * 紫の地に紫の文字は、コントラスト比の数字より読みにくいため。
 */

// 見出し。左の列は狭いので、スマホで「ひとつの権威ではなく、」が1行に収まる 24px、
// 広い画面では 40px にする。
const HERO_TITLE =
  "mb-4 mt-0 whitespace-pre-line font-serif text-[24px] font-bold leading-[1.35] text-white sm:text-hero";

// 初めての人に勧める3冊。正典だけに偏らないよう、外典（トマス）を1つ混ぜる。
const FIRST_BOOKS: { slug: string; note: (t: Translations) => string }[] = [
  { slug: "john", note: (t) => t.homeFirstBookJohn },
  { slug: "mark", note: (t) => t.homeFirstBookMark },
  { slug: "thomas", note: (t) => t.homeFirstBookThomas },
];

export default async function Home() {
  const t = await getT();
  const lang = await getRequestLanguage();

  const others = [
    { title: t.qa, href: "/qa" },
    { title: t.translate, href: "/translations" },
    { title: t.articles, href: "/articles" },
    { title: t.plans, href: "/plans" },
  ];

  return (
    <div className={styles.content}>
      <div className="flex flex-col gap-12">
        {/* 説明とボタン（左）、今日の聖句（右）。スマホでは縦に積む */}
        <section className="grid items-center gap-8 pt-6 md:grid-cols-[3fr_2fr]">
          <div className="flex flex-col gap-6">
            <div>
              <p className={styles.heroEyebrow}>NeON Church</p>
              <h1 className={HERO_TITLE}>{t.homeTagline}</h1>
              <p className="m-0 max-w-[30em] text-md leading-[1.9] text-soft">{t.homeDesc}</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Link href="/read" className="btn btn-primary w-full px-6 sm:w-auto">
                {t.homeStartReading} →
              </Link>
              <Link
                href="/about"
                className="outline-button inline-flex w-full items-center justify-center px-6 no-underline sm:w-auto"
              >
                {t.homeAboutLink}
              </Link>
            </div>
            <p className="m-0 text-sm leading-[1.8] text-soft">
              {t.homeNoSignup}
              <br />
              {t.homeWelcome}
            </p>
          </div>
          <Suspense key={`verse-${lang}`} fallback={<VerseCardFallback t={t} />}>
            <VerseCard t={t} lang={lang} />
          </Suspense>
        </section>

        {/* 見出しの余白は Home.module.css 側の margin:0 が勝つので、gap で空ける */}
        <section className="flex flex-col gap-4">
          <h2 className={styles.listHeading}>{t.homeFirstBooks}</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {FIRST_BOOKS.map(({ slug, note }) => (
              <Link
                key={slug}
                href={`/${slug}/${firstChapterOf(slug)}`}
                className="card-glow card-glow-interactive flex flex-col gap-2 p-6 text-body no-underline"
              >
                <span className="font-serif text-xl font-bold leading-tight">
                  {bookLabel(slug, lang)?.short}
                </span>
                <span className="text-sm leading-[1.7] text-soft">{note(t)}</span>
              </Link>
            ))}
          </div>
        </section>

        <div className="flex flex-col gap-8">
          <Suspense key={`activity-${lang}`} fallback={<SkeletonList count={2} />}>
            <HomeActivity t={t} lang={lang} />
          </Suspense>
        </div>

        {/* 読む以外の機能は小さく一列に */}
        <nav aria-label={t.homeMoreSections} className="flex flex-wrap justify-center gap-2 pb-6">
          {others.map((o) => (
            <Link key={o.href} href={o.href} className="action-chip">
              {o.title} →
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
