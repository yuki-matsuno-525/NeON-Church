"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchCompiledBooks, type CompiledBook } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Icon } from "@/components/ui/Icon";
import { LoginRequiredModal } from "@/components/ui/LoginRequiredModal";
import { useT } from "@/lib/i18n";

export default function CompilationsPage() {
  const { user } = useAuth();
  const t = useT();
  const [publicBooks, setPublicBooks] = useState<CompiledBook[]>([]);
  const [myBooks, setMyBooks] = useState<CompiledBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);

  useEffect(() => {
    let alive = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    Promise.all([
      fetchCompiledBooks().then((r) => r.results).catch(() => []),
      user ? fetchCompiledBooks({ mine: true }).then((r) => r.results).catch(() => []) : Promise.resolve([]),
    ]).then(([pub, mine]) => {
      if (!alive) return;
      setPublicBooks(pub);
      setMyBooks(mine);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [user]);

  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 20px" }}>
      {showLoginModal && (
        <LoginRequiredModal
          onClose={() => setShowLoginModal(false)}
          from="/compilations/new"
          title={t.compilationLoginTitle}
          description={t.compilationLoginDesc}
        />
      )}
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 28, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>編纂書</h1>
          <p style={{ margin: "6px 0 0", color: "var(--text-muted)", fontSize: 14 }}>
            既存の節や自分の本文を集め、章に編み、自分の読みの書として公開します。
          </p>
        </div>
        {user ? (
          <Link href="/compilations/new" className="btn btn-primary" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Icon name="book-open" size={16} />
            新しい編纂書
          </Link>
        ) : (
          <button type="button" className="btn btn-primary" onClick={() => setShowLoginModal(true)} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Icon name="book-open" size={16} />
            ログインして編纂を始める
          </button>
        )}
      </header>

      {loading ? (
        <p style={{ color: "var(--text-muted)" }}>読み込み中...</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 18, alignItems: "start" }}>
          {user && (
            <BookSection title="自分の編纂書" books={myBooks} empty="まだ編纂書がありません。" editable />
          )}
          <BookSection title="公開された編纂書" books={publicBooks} empty="公開された編纂書はまだありません。" />
        </div>
      )}
    </main>
  );
}

function BookSection({ title, books, empty, editable = false }: { title: string; books: CompiledBook[]; empty: string; editable?: boolean }) {
  return (
    <section style={{ border: "1px solid var(--border)", borderRadius: 8, padding: 16, background: "rgba(255,255,255,0.02)" }}>
      <h2 style={{ margin: "0 0 14px", fontSize: 16 }}>{title}</h2>
      {books.length === 0 ? (
        <p style={{ margin: 0, color: "var(--text-faint)", fontSize: 13 }}>{empty}</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {books.map((book) => (
            <article key={book.id} style={{ border: "1px solid var(--border)", borderRadius: 8, padding: 14, background: "var(--bg-alt)" }}>
              <Link href={`/compilations/${book.id}`} style={{ color: "var(--text)", textDecoration: "none" }}>
                <h3 style={{ margin: "0 0 6px", fontSize: 16, fontFamily: '"Noto Serif JP", serif' }}>{book.title}</h3>
              </Link>
              <p style={{ margin: "0 0 8px", fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5 }}>
                {book.description || "説明はありません。"}
              </p>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", fontSize: 12, color: "var(--text-faint)" }}>
                <span>{book.owner_username}</span>
                <span>{book.chapter_count}章</span>
                <span>{book.verse_count}節</span>
                <span>{visibilityLabel(book.visibility)}</span>
                {editable && (
                  <Link href={`/compilations/${book.id}/edit`} style={{ color: "var(--accent)", fontWeight: 700, textDecoration: "none" }}>
                    編集
                  </Link>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function visibilityLabel(visibility: CompiledBook["visibility"]) {
  if (visibility === "public") return "公開";
  if (visibility === "unlisted") return "限定公開";
  return "非公開";
}
