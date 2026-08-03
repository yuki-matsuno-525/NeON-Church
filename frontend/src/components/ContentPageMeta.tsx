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
      className="mt-6 mb-8 rounded-lg border border-border bg-bg-alt p-6"
    >
      <p className="mt-0 mb-4 text-xs text-muted">
        {labels.updated}: <time dateTime={updatedAt}>{updatedAt}</time>
      </p>
      <nav aria-label={labels.contents}>
        <strong className="text-sm">{labels.contents}</strong>
        <ol className="mt-2 mb-0 list-decimal pl-6 leading-reading">
          {sections.map((section, index) => (
            <li key={`${index}-${section}`}>
              <a href={`#section-${index + 1}`} className="text-accent">
                {section.replace(/^\d+[.．]\s*/, "")}
              </a>
            </li>
          ))}
        </ol>
      </nav>
      <nav aria-label={labels.related} className="mt-4">
        <strong className="text-sm">{labels.related}</strong>
        <div className="mt-2 flex flex-wrap gap-4">
          {relatedLinks.map((link) => (
            <Link key={link.href} href={link.href} className="text-accent">
              {link.label}
            </Link>
          ))}
        </div>
      </nav>
    </aside>
  );
}
