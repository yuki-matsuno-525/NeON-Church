"use client";

import Link from "next/link";
import { useT } from "@/lib/i18n";

export function Footer() {
  const t = useT();

  const links: { label: string; href: string; external?: boolean }[] = [
    { label: t.footerAbout, href: "/about" },
    { label: t.footerGuidelines, href: "/guidelines" },
    { label: t.footerLicenses, href: "/licenses" },
    { label: t.footerTerms, href: "/terms" },
    { label: t.footerPrivacy, href: "/privacy" },
    { label: t.footerFeedback, href: "/feedback" },
  ];

  return (
    <footer
      role="contentinfo"
      style={{
        position: "relative",
        zIndex: 2,
        padding: "24px 16px 32px",
        borderTop: "1px solid var(--border)",
        background: "rgba(8, 4, 24, 0.55)",
        color: "var(--text-muted)",
        fontSize: 13,
      }}
    >
      <nav
        aria-label={t.footerNavLabel}
        style={{
          maxWidth: 960,
          margin: "0 auto",
          display: "flex",
          flexWrap: "wrap",
          gap: "8px 18px",
          justifyContent: "center",
        }}
      >
        {links.map((link) =>
          link.external ? (
            <a
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "var(--text-muted)", textDecoration: "none" }}
            >
              {link.label}
            </a>
          ) : (
            <Link
              key={link.href}
              href={link.href}
              style={{ color: "var(--text-muted)", textDecoration: "none" }}
            >
              {link.label}
            </Link>
          )
        )}
      </nav>
      <p
        style={{
          maxWidth: 960,
          margin: "16px auto 0",
          textAlign: "center",
          fontSize: 12,
          color: "var(--text-faint)",
        }}
      >
        {t.footerBetaNote}
      </p>
    </footer>
  );
}
