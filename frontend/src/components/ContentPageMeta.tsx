import Link from "next/link";

type RelatedLink = { href: string; label: string };

export function ContentPageMeta({
  updatedAt,
  sections,
  relatedLinks,
  labels,
}: {
  updatedAt: string;
  sections: string[];
  relatedLinks: RelatedLink[];
  labels: { updated: string; contents: string; related: string };
}) {
  return (
    <aside
      aria-label={labels.contents}
      style={{
        margin: "24px 0 36px",
        padding: 20,
        border: "1px solid var(--border)",
        borderRadius: 12,
        background: "var(--bg-alt)",
      }}
    >
      <p style={{ margin: "0 0 16px", color: "var(--text-muted)", fontSize: 13 }}>
        {labels.updated}: <time dateTime={updatedAt}>{updatedAt}</time>
      </p>
      <nav aria-label={labels.contents}>
        <strong style={{ fontSize: 14 }}>{labels.contents}</strong>
        <ol style={{ margin: "8px 0 0", paddingLeft: 24, lineHeight: 1.8 }}>
          {sections.map((section, index) => (
            <li key={`${index}-${section}`}>
              <a href={`#section-${index + 1}`} style={{ color: "var(--accent)" }}>
                {section.replace(/^\d+[.．]\s*/, "")}
              </a>
            </li>
          ))}
        </ol>
      </nav>
      <nav aria-label={labels.related} style={{ marginTop: 18 }}>
        <strong style={{ fontSize: 14 }}>{labels.related}</strong>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginTop: 8 }}>
          {relatedLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              style={{ color: "var(--accent)", minHeight: 44, display: "inline-flex", alignItems: "center" }}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </nav>
    </aside>
  );
}
