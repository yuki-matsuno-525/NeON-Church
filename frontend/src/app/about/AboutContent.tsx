"use client";

import Link from "next/link";
import { useT } from "@/lib/i18n";

export function AboutContent() {
  const t = useT();

  return (
    <div style={{ maxWidth: "min(72ch, 100%)", margin: "0 auto", padding: "48px 24px" }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8, fontFamily: '"Noto Serif JP", serif' }}>
        {t.aboutTitle}
      </h1>
      <p style={{ color: "var(--text-muted)", fontSize: 14, marginBottom: 40 }}>
        {t.aboutSubtitle}
      </p>

      <Section title={t.aboutSection1Title}>
        <p>{t.aboutSection1Body}</p>
      </Section>

      <Section title={t.aboutSection2Title}>
        <ul style={{ paddingLeft: 20, lineHeight: 2, margin: 0 }}>
          {t.aboutFeatures.map((f, i) => <li key={i}>{f}</li>)}
        </ul>
      </Section>

      <Section title={t.aboutSection3Title}>
        <ul style={{ paddingLeft: 20, lineHeight: 2, margin: 0 }}>
          {t.aboutPlanned.map((f, i) => <li key={i}>{f}</li>)}
        </ul>
      </Section>

      <nav
        aria-label={t.footerNavLabel}
        style={{
          marginBottom: 32,
          paddingTop: 16,
          borderTop: "1px solid var(--border)",
        }}
      >
        <ul
          style={{
            listStyle: "none",
            padding: 0,
            margin: 0,
            display: "flex",
            flexWrap: "wrap",
            gap: "8px 18px",
            fontSize: 13,
          }}
        >
          <li>
            <Link href="/guidelines" style={trustLinkStyle}>{t.footerGuidelines}</Link>
          </li>
          <li>
            <Link href="/licenses" style={trustLinkStyle}>{t.footerLicenses}</Link>
          </li>
          <li>
            <Link href="/terms" style={trustLinkStyle}>{t.footerTerms}</Link>
          </li>
          <li>
            <Link href="/privacy" style={trustLinkStyle}>{t.footerPrivacy}</Link>
          </li>
          <li>
            <Link href="/feedback" style={trustLinkStyle}>{t.footerFeedback}</Link>
          </li>
        </ul>
      </nav>

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

const trustLinkStyle: React.CSSProperties = {
  color: "var(--accent)",
  textDecoration: "none",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, color: "var(--accent)" }}>
        {title}
      </h2>
      <div style={{ fontSize: 14, lineHeight: 1.8, color: "var(--text)" }}>
        {children}
      </div>
    </div>
  );
}
