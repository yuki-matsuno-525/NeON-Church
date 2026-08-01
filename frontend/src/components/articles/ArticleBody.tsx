"use client";

import { Fragment, type ReactNode } from "react";
import Link from "next/link";
import type { ArticleCitation } from "@/lib/types";
import { bookLabel, useT } from "@/lib/i18n";
import { useLang } from "@/contexts/LanguageContext";
import { translationLabel } from "@/lib/translations";

/**
 * 記事の本文を表示する。
 *
 * 本文は Markdown（見出し・箇条書き・太字・リンクなど、よく使うものだけ）と、
 * 引用の印でできている。印は citations の raw と突き合わせて中身に置き換える。
 *
 * 記事ページと、編集画面のプレビューの両方でこの部品を使う。
 * そうしておけば「書いている途中の見え方」と「公開後の見え方」がずれない。
 */
export function ArticleBody({
  body,
  citations,
}: {
  body: string;
  citations: ArticleCitation[];
}) {
  const t = useT();
  const byRaw = new Map(citations.map((citation) => [citation.raw, citation]));
  const blocks = parseBlocks(body);

  if (blocks.length === 0) {
    return <p style={{ color: "var(--text-faint)", fontSize: 14 }}>{t.articleEmptyBody}</p>;
  }

  return (
    <div style={{ fontSize: 16, lineHeight: 1.9, color: "var(--text)" }}>
      {blocks.map((block, index) => (
        <Fragment key={index}>{renderBlock(block, byRaw)}</Fragment>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 本文を段落・見出し・箇条書きなどのかたまりに分ける
// ---------------------------------------------------------------------------

type Block =
  | { kind: "heading"; level: 2 | 3; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "quote"; text: string }
  | { kind: "list"; ordered: boolean; items: string[] }
  | { kind: "rule" }
  | { kind: "citation"; raw: string };

// 引用ブロックの印。段落の途中にあっても、そこで段落を切って独立させる。
const BLOCK_MARK = /\{\{[^{}\n]+\}\}/g;
// 文中の参照の印。
const INLINE_MARK = /\[\[[^[\]\n]+\]\]/g;

export function parseBlocks(body: string): Block[] {
  const blocks: Block[] = [];
  const lines = body.replace(/\r\n/g, "\n").split("\n");

  // 同じ種類の行が続くあいだためておき、種類が変わったら1つのかたまりにする。
  let pending: { kind: "paragraph" | "quote" | "bullet" | "number"; lines: string[] } | null = null;

  const flush = () => {
    if (!pending) return;
    if (pending.kind === "paragraph") {
      pushParagraph(blocks, pending.lines.join("\n"));
    } else if (pending.kind === "quote") {
      blocks.push({ kind: "quote", text: pending.lines.join("\n") });
    } else {
      blocks.push({ kind: "list", ordered: pending.kind === "number", items: pending.lines });
    }
    pending = null;
  };

  const append = (kind: "paragraph" | "quote" | "bullet" | "number", text: string) => {
    if (pending && pending.kind === kind) {
      pending.lines.push(text);
    } else {
      flush();
      pending = { kind, lines: [text] };
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      flush();
    } else if (trimmed.startsWith("### ")) {
      flush();
      blocks.push({ kind: "heading", level: 3, text: trimmed.slice(4) });
    } else if (trimmed.startsWith("## ")) {
      flush();
      blocks.push({ kind: "heading", level: 2, text: trimmed.slice(3) });
    } else if (/^-{3,}$/.test(trimmed)) {
      flush();
      blocks.push({ kind: "rule" });
    } else if (trimmed.startsWith(">")) {
      append("quote", trimmed.replace(/^>\s?/, ""));
    } else if (/^[-*]\s+/.test(trimmed)) {
      append("bullet", trimmed.replace(/^[-*]\s+/, ""));
    } else if (/^\d+\.\s+/.test(trimmed)) {
      append("number", trimmed.replace(/^\d+\.\s+/, ""));
    } else {
      append("paragraph", trimmed);
    }
  }
  flush();

  return blocks;
}

/** 段落の中にある引用ブロックの印を、独立したかたまりとして取り出す。 */
function pushParagraph(blocks: Block[], text: string) {
  let lastIndex = 0;
  for (const match of text.matchAll(BLOCK_MARK)) {
    const before = text.slice(lastIndex, match.index).trim();
    if (before) blocks.push({ kind: "paragraph", text: before });
    blocks.push({ kind: "citation", raw: match[0] });
    lastIndex = match.index + match[0].length;
  }
  const rest = text.slice(lastIndex).trim();
  if (rest) blocks.push({ kind: "paragraph", text: rest });
}

// ---------------------------------------------------------------------------
// かたまりを画面に出す
// ---------------------------------------------------------------------------

function renderBlock(block: Block, byRaw: Map<string, ArticleCitation>): ReactNode {
  switch (block.kind) {
    case "heading":
      return block.level === 2 ? (
        <h2 style={headingStyle(20)}>{renderInline(block.text, byRaw)}</h2>
      ) : (
        <h3 style={headingStyle(17)}>{renderInline(block.text, byRaw)}</h3>
      );

    case "paragraph":
      return <p style={{ margin: "0 0 16px" }}>{renderInline(block.text, byRaw)}</p>;

    case "quote":
      return (
        <blockquote
          style={{
            margin: "0 0 16px",
            padding: "8px 0 8px 16px",
            borderLeft: "3px solid var(--border)",
            color: "var(--text-muted)",
          }}
        >
          {renderInline(block.text, byRaw)}
        </blockquote>
      );

    case "list": {
      const items = block.items.map((item, index) => (
        <li key={index} style={{ marginBottom: 6 }}>
          {renderInline(item, byRaw)}
        </li>
      ));
      const style = { margin: "0 0 16px", paddingLeft: 24 };
      return block.ordered ? <ol style={style}>{items}</ol> : <ul style={style}>{items}</ul>;
    }

    case "rule":
      return <hr style={{ border: "none", borderTop: "1px solid var(--border)", margin: "24px 0" }} />;

    case "citation":
      return <CitationBlock raw={block.raw} citation={byRaw.get(block.raw)} />;
  }
}

function headingStyle(fontSize: number) {
  return {
    fontFamily: '"Noto Serif JP", serif',
    fontSize,
    fontWeight: 700,
    margin: "28px 0 12px",
  } as const;
}

/** 引用ブロック。節の本文と出典を出す。 */
function CitationBlock({ raw, citation }: { raw: string; citation?: ArticleCitation }) {
  const t = useT();
  const { lang } = useLang();
  if (!citation || !citation.found) {
    return <NotFound raw={raw} block />;
  }
  return (
    <blockquote
      className="card-glow"
      style={{ margin: "0 0 20px", padding: "16px 18px", borderRadius: 10 }}
    >
      {citation.verses.map((verse) => (
        <p key={verse.number} style={{ margin: "0 0 8px", lineHeight: 1.9 }}>
          <span style={{ color: "var(--text-faint)", fontSize: 12, marginRight: 6 }}>
            {verse.number}
          </span>
          {verse.text}
        </p>
      ))}
      <Link
        href={verseHref(citation)}
        style={{
          display: "inline-block",
          marginTop: 4,
          fontSize: 12,
          color: "var(--text-muted)",
          textDecoration: "none",
        }}
      >
        {citationDisplayLabel(citation, lang, t)}（{translationLabel(citation.translation, lang)}）
      </Link>
    </blockquote>
  );
}

/** 文中の参照。（マタイによる福音書 6:16-18）というリンクになる。 */
function CitationLink({ raw, citation }: { raw: string; citation?: ArticleCitation }) {
  const t = useT();
  const { lang } = useLang();
  if (!citation || !citation.found) {
    return <NotFound raw={raw} />;
  }
  return (
    <Link href={verseHref(citation)} style={{ color: "var(--accent)", textDecoration: "none" }}>
      （{citationDisplayLabel(citation, lang, t)}）
    </Link>
  );
}

function citationDisplayLabel(
  citation: ArticleCitation,
  lang: "ja" | "en",
  t: ReturnType<typeof useT>,
): string {
  const name = bookLabel(citation.book_slug, lang)?.name ?? citation.book_name;
  if (citation.verse_number_start === null) return `${name} ${t.chapterFmt(citation.chapter_number)}`;
  const start = `${citation.chapter_number}:${citation.verse_number_start}`;
  const end = citation.verse_number_end;
  return end !== null && end !== citation.verse_number_start ? `${name} ${start}-${end}` : `${name} ${start}`;
}

function NotFound({ raw, block = false }: { raw: string; block?: boolean }) {
  const t = useT();
  const style = {
    color: "var(--text-faint)",
    fontSize: 13,
    ...(block ? { display: "block", margin: "0 0 16px" } : {}),
  };
  return (
    <span style={style} title={raw}>
      {t.articleCitationMissing}
    </span>
  );
}

function verseHref(citation: ArticleCitation): string {
  const query = citation.translation
    ? `?translation=${encodeURIComponent(citation.translation)}`
    : "";
  const hash = citation.verse_number_start ? `#verse-${citation.verse_number_start}` : "";
  return `/${citation.book_slug}/${citation.chapter_number}${query}${hash}`;
}

// ---------------------------------------------------------------------------
// 行の中身（引用の印と、かんたんな Markdown）
// ---------------------------------------------------------------------------

function renderInline(text: string, byRaw: Map<string, ArticleCitation>): ReactNode[] {
  const nodes: ReactNode[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(INLINE_MARK)) {
    pushMarkdown(nodes, text.slice(lastIndex, match.index));
    nodes.push(
      <CitationLink key={`c${match.index}`} raw={match[0]} citation={byRaw.get(match[0])} />,
    );
    lastIndex = match.index + match[0].length;
  }
  pushMarkdown(nodes, text.slice(lastIndex));

  return nodes;
}

// 太字・斜体・コード・リンクだけを見る。書く人が覚えることを増やさないため、これ以上は足さない。
const MARKDOWN_PATTERN = /(\*\*[^*\n]+\*\*|\*[^*\n]+\*|`[^`\n]+`|\[[^\]\n]+\]\([^)\s]+\))/g;

function pushMarkdown(nodes: ReactNode[], text: string) {
  if (!text) return;
  let lastIndex = 0;

  for (const match of text.matchAll(MARKDOWN_PATTERN)) {
    if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index));
    nodes.push(renderMarkdownToken(match[0], `m${nodes.length}`));
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
}

function renderMarkdownToken(token: string, key: string): ReactNode {
  if (token.startsWith("**")) {
    return <strong key={key}>{token.slice(2, -2)}</strong>;
  }
  if (token.startsWith("`")) {
    return (
      <code key={key} style={{ fontSize: "0.9em", background: "rgba(255,255,255,0.08)", padding: "1px 4px", borderRadius: 4 }}>
        {token.slice(1, -1)}
      </code>
    );
  }
  if (token.startsWith("[")) {
    const divider = token.indexOf("](");
    const label = token.slice(1, divider);
    const href = token.slice(divider + 2, -1);
    // javascript: のような危ないリンクは踏ませない。外部リンクと相対リンクだけ通す。
    if (!/^(https?:\/\/|\/)/.test(href)) return <span key={key}>{label}</span>;
    return (
      <a key={key} href={href} style={{ color: "var(--accent)" }} target={href.startsWith("/") ? undefined : "_blank"} rel="noreferrer">
        {label}
      </a>
    );
  }
  return <em key={key}>{token.slice(1, -1)}</em>;
}
