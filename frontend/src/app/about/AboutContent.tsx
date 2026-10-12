import Link from "next/link";
import { getT } from "@/lib/i18nServer";

/**
 * この画面は文字を並べるだけで、押したり入力したりする部分が無い。
 * 表示文言をサーバー側の getT() で取ることで `"use client"` が不要になり、
 * ブラウザに JavaScript を送らずに描ける。
 *
 * 目次のパネル（ContentPageMeta）は置かない。節が 4 つしかない画面で目次を出しても
 * 行き先が増えず、読み始める前に箱を 1 つまたぐことになるため。
 * 規約やプライバシーのように長い画面では引き続き使う。
 *
 * ベータ版の知らせは、副題のすぐ下に本文と同じ流れの一行で置く。
 * 以前は枠付きの小さな札で、副題と本文の間に左寄せで浮いて見えていた。
 * 最後は表紙と同じ「読んでみる」「トップへ戻る」の組で、読み終えた人の行き先を示す。
 */
export async function AboutContent() {
  const t = await getT();

  return (
    /* 幅と余白は globals.css の .content-page が持つ（読み物ページ 6 枚で共通） */
    <div className="content-page">
      <h1 className="mb-2">{t.aboutTitle}</h1>
      <p className="mb-4 whitespace-pre-line text-sm text-muted">{t.aboutSubtitle}</p>

      <p role="status" className="mb-8 border-b border-border pb-6 text-sm leading-[1.8] text-soft">
        {t.aboutBetaNoteBefore}
        {/* .content-page a の「44px の押せる箱」を外し、文の中に収める */}
        <Link href="/feedback" className="inline min-h-0 text-accent">{t.aboutBetaNoteLink}</Link>
        {t.aboutBetaNoteAfter}
      </p>

      <Section id="section-1" title={t.aboutSection1Title}>
        <p className="m-0">{t.aboutSection1Body}</p>
      </Section>

      <Section id="section-2" title={t.aboutSection2Title}>
        <ul className="m-0 list-disc pl-6 leading-reading">
          {t.aboutFeatures.map((f, i) => <li key={i}>{f}</li>)}
        </ul>
      </Section>

      <Section id="section-3" title={t.aboutSection3Title}>
        <ul className="m-0 list-disc pl-6 leading-reading">
          {t.aboutPlanned.map((f, i) => <li key={i}>{f}</li>)}
        </ul>
      </Section>

      <Section id="section-4" title={t.aboutSection4Title}>
        <ul className="m-0 list-disc pl-6 leading-reading">
          {t.aboutNotices.map((f, i) => <li key={i}>{f}</li>)}
        </ul>
      </Section>

      {/* 表紙（app/page.tsx）の最初のボタンの組と同じ部品 */}
      <div className="flex flex-wrap items-center gap-3 border-t border-border pt-6">
        <Link href="/read" className="btn btn-primary w-full px-6 sm:w-auto">
          {t.homeStartReading} →
        </Link>
        <Link
          href="/"
          className="outline-button inline-flex w-full items-center justify-center px-6 no-underline sm:w-auto"
        >
          {t.backToHome}
        </Link>
      </div>
    </div>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mb-8">
      {/* 大きさは globals.css の h2 の既定（20px）に任せる */}
      <h2 className="mb-3 text-accent">{title}</h2>
      <div className="whitespace-pre-line text-md leading-reading text-body">{children}</div>
    </section>
  );
}
