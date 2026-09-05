import Link from "next/link";
import { getT, getRequestLanguage } from "@/lib/i18nServer";

/**
 * この画面は文字を並べるだけで、押したり入力したりする部分が無い。
 * 表示文言をサーバー側の getT() で取ることで `"use client"` が不要になり、
 * ブラウザに JavaScript を送らずに描ける。
 *
 * 目次のパネル（ContentPageMeta）は置かない。節が 3 つしかない画面で目次を出しても
 * 行き先が増えず、読み始める前に箱を 1 つまたぐことになるため。
 * 規約やプライバシーのように長い画面では引き続き使う。
 */
export async function AboutContent() {
  const t = await getT();
  const lang = await getRequestLanguage();

  return (
    /* 幅と余白は globals.css の .content-page が持つ（読み物ページ 6 枚で共通） */
    <div className="content-page">
      <h1 className="mb-2">{t.aboutTitle}</h1>
      <p className="mb-8 whitespace-pre-line text-sm text-muted">{t.aboutSubtitle}</p>

      <div
        role="status"
        className="inline-flex items-center rounded-full border border-border bg-bg-alt px-3 py-1 text-xs text-muted"
      >
        {lang === "ja" ? "現在ベータ版として改善中です" : "Currently improving in public beta"}
      </div>

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

      <div className="mt-8">
        <Link href="/" className="text-sm font-bold text-accent no-underline">
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
