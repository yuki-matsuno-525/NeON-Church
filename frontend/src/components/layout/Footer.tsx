import Link from "next/link";
import { getT } from "@/lib/i18nServer";

/**
 * 画面の一番下に出す案内。
 *
 * 押したり入力したりするところが無いので、サーバー側で組み立てて返す。
 * ここに置く 7 つの文言は、ブラウザへ送られなくなる。
 */
export async function Footer() {
  const t = await getT();

  const links = [
    { label: t.footerAbout, href: "/about" },
    { label: t.footerGuidelines, href: "/guidelines" },
    { label: t.footerLicenses, href: "/licenses" },
    { label: t.footerTerms, href: "/terms" },
    { label: t.footerPrivacy, href: "/privacy" },
    { label: t.footerFeedback, href: "/feedback" },
  ];

  return (
    <footer role="contentinfo" className="site-footer">
      <nav aria-label={t.footerNavLabel} className="site-footer-nav">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="text-muted no-underline tap-target inline-flex items-center"
          >
            {link.label}
          </Link>
        ))}
      </nav>
      <p className="site-footer-note">{t.footerBetaNote}</p>
    </footer>
  );
}
