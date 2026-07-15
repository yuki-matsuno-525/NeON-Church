"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { fetchCompiledBook, type CompiledBook, type CompiledVerse } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { CompiledComments } from "@/components/compilations/CompiledComments";
import { Icon } from "@/components/ui/Icon";

export default function CompilationReadPage() {
  const params = useParams();
  const { user } = useAuth();
  const id = typeof params.id === "string" ? params.id : "";
  const [book, setBook] = useState<CompiledBook | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    fetchCompiledBook(id)
      .then(setBook)
      .catch(() => setError("この編纂書は見つからないか、非公開です。"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <main style={{ padding: 32, color: "var(--text-muted)" }}>読み込み中...</main>;
  if (error || !book) return <main style={{ padding: 32, color: "var(--state-danger)" }}>{error || "見つかりません。"}</main>;

  const canEdit = user?.username === book.owner_username;

  return (
    <main style={{ maxWidth: 880, margin: "0 auto", padding: "34px 20px" }}>
      <header style={{ marginBottom: 28 }}>
        <Link href="/compilations" style={{ color: "var(--accent)", textDecoration: "none", fontSize: 13 }}>← 編纂書一覧</Link>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap", marginTop: 14 }}>
          <div>
            <p style={{ margin: "0 0 8px", color: "var(--text-faint)", fontSize: 12 }}>
              {book.visibility} ・ {book.owner_username}
            </p>
            <h1 style={{ margin: 0, fontSize: 30, fontWeight: 900, fontFamily: '"Noto Serif JP", serif' }}>{book.title}</h1>
          </div>
          {canEdit && (
            <Link href={`/compilations/${book.id}/edit`} style={{ ...editLinkStyle, display: "inline-flex", gap: 6, alignItems: "center" }}>
              <Icon name="book-open" size={15} />
              編集
            </Link>
          )}
        </div>
        {book.description && (
          <p style={{ margin: "16px 0 0", color: "var(--text-muted)", lineHeight: 1.8, whiteSpace: "pre-wrap" }}>{book.description}</p>
        )}
        {book.annotation && (
          <aside style={annotationStyle}>
            <strong>書への注釈</strong>
            <p style={{ margin: "6px 0 0", whiteSpace: "pre-wrap" }}>{book.annotation}</p>
          </aside>
        )}
        <CompiledComments target={{ kind: "book", id: book.id }} title="書へのコメント" />
      </header>

      {(book.tray ?? []).length > 0 && (
        <section style={{ marginBottom: 28 }}>
          <h2 style={chapterHeadingStyle}>未整理の断章</h2>
          {(book.tray ?? []).map((verse) => (
            <ReadVerse key={verse.id} verse={verse} />
          ))}
        </section>
      )}

      {(book.chapters ?? []).map((chapter) => (
        <section key={chapter.id} style={{ marginBottom: 34 }}>
          <h2 style={chapterHeadingStyle}>第{chapter.number}章 {chapter.title}</h2>
          {chapter.introduction && <p style={{ color: "var(--text-muted)", lineHeight: 1.8, whiteSpace: "pre-wrap" }}>{chapter.introduction}</p>}
          {chapter.annotation && (
            <aside style={annotationStyle}>
              <strong>章への注釈</strong>
              <p style={{ margin: "6px 0 0", whiteSpace: "pre-wrap" }}>{chapter.annotation}</p>
            </aside>
          )}
          <CompiledComments target={{ kind: "chapter", id: chapter.id }} title="章へのコメント" />
          <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 18 }}>
            {chapter.verses.map((verse) => (
              <ReadVerse key={verse.id} verse={verse} />
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}

function ReadVerse({ verse }: { verse: CompiledVerse }) {
  return (
    <article style={{ padding: "14px 0", borderBottom: "1px solid var(--border)" }}>
      <p style={{ margin: "0 0 8px", color: "var(--text-faint)", fontSize: 12 }}>
        {verse.verse_number ? `${verse.verse_number}節` : "断章"} {verse.source_label && `・${verse.source_label}`}
      </p>
      <p style={{ margin: 0, fontSize: 17, lineHeight: 1.9, fontFamily: '"Noto Serif JP", serif', whiteSpace: "pre-wrap" }}>
        {verse.body_snapshot}
      </p>
      {verse.curator_note && (
        <aside style={annotationStyle}>
          <strong>節への注釈</strong>
          <p style={{ margin: "6px 0 0", whiteSpace: "pre-wrap" }}>{verse.curator_note}</p>
        </aside>
      )}
      <CompiledComments target={{ kind: "verse", id: verse.id }} title="節へのコメント" />
    </article>
  );
}

const chapterHeadingStyle: React.CSSProperties = {
  margin: "0 0 14px",
  fontSize: 22,
  fontFamily: '"Noto Serif JP", serif',
};

const annotationStyle: React.CSSProperties = {
  marginTop: 12,
  padding: "10px 12px",
  borderLeft: "3px solid var(--accent)",
  background: "rgba(255,255,255,0.04)",
  borderRadius: 6,
  color: "var(--text-muted)",
  fontSize: 13,
  lineHeight: 1.6,
};

const editLinkStyle: React.CSSProperties = {
  padding: "8px 12px",
  border: "1px solid var(--border)",
  borderRadius: 6,
  color: "var(--accent)",
  textDecoration: "none",
  fontSize: 13,
  fontWeight: 800,
};
