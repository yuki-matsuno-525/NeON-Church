"use client";

import Link from "next/link";
import { useT } from "@/lib/i18n";
import { useLang } from "@/contexts/LanguageContext";
import { ContentPageMeta } from "@/components/ContentPageMeta";

export function AboutContent() {
  const t = useT();
  const { lang } = useLang();

  return (
    <div className="content-page" style={{ maxWidth: "min(72ch, 100%)", margin: "0 auto", padding: "48px 24px" }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8, fontFamily: "var(--font-serif)" }}>
        {t.aboutTitle}
      </h1>
      <p style={{ color: "var(--text-muted)", fontSize: 14, marginBottom: 40, whiteSpace: "pre-line" }}>
        {t.aboutSubtitle}
      </p>

      <div role="status" style={{ display: "inline-flex", alignItems: "center", minHeight: 36, padding: "4px 12px", borderRadius: 999, background: "var(--bg-alt)", border: "1px solid var(--border)", color: "var(--text-muted)", fontSize: 13 }}>
        {lang === "ja" ? "現在ベータ版として改善中です" : "Currently improving in public beta"}
      </div>

      <ContentPageMeta
        updatedAt="2026-08-01"
        sections={[t.aboutSection1Title, t.aboutSection2Title, t.aboutSection3Title]}
        relatedLinks={[
          { href: "/read", label: lang === "ja" ? "書を読む" : "Read texts" },
          { href: "/qa", label: "Q&A" },
          { href: "/translations", label: lang === "ja" ? "翻訳に参加" : "Join translations" },
        ]}
        labels={lang === "ja"
          ? { updated: "更新日", contents: "このページの内容", related: "今すぐ始める" }
          : { updated: "Last updated", contents: "On this page", related: "Get started" }}
      />

      <Section id="section-1" title={t.aboutSection1Title}>
        <p>{t.aboutSection1Body}</p>
      </Section>

      <Section id="section-2" title={t.aboutSection2Title}>
        <ul style={{ paddingLeft: 20, lineHeight: 2, margin: 0 }}>
          {t.aboutFeatures.map((f, i) => <li key={i}>{f}</li>)}
        </ul>
      </Section>

      <Section id="section-3" title={t.aboutSection3Title}>
        <ul style={{ paddingLeft: 20, lineHeight: 2, margin: 0 }}>
          {t.aboutPlanned.map((f, i) => <li key={i}>{f}</li>)}
        </ul>
      </Section>

      <div style={{ marginTop: 40 }}>
        <Link
          href="/"
          style={{
            color: "var(--accent)",
            textDecoration: "none",
            fontWeight: 700,
            fontSize: 14,
          }}
        >
          {t.backToHome}
        </Link>
      </div>
    </div>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} style={{ marginBottom: 32, scrollMarginTop: 96 }}>
      <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, color: "var(--accent)" }}>
        {title}
      </h2>
      <div style={{ fontSize: 14, lineHeight: 1.8, color: "var(--text)", whiteSpace: "pre-line" }}>
        {children}
      </div>
    </section>
  );
}
