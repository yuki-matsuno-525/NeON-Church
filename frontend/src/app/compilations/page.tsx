"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchCompiledBooks, type CompiledBook } from "@/lib/api";
import { visibilityLabel } from "@/lib/compilations";
import { useAuth } from "@/contexts/AuthContext";
import { Icon, type IconName } from "@/components/ui/Icon";
import { SkeletonList } from "@/components/ui";
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
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 16px" }}>
      {showLoginModal && (
        <LoginRequiredModal
          onClose={() => setShowLoginModal(false)}
          from="/compilations/new"
          title={t.compilationLoginTitle}
          description={t.compilationLoginDesc}
        />
      )}

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>編纂書</h1>
          <p style={{ color: "var(--text-muted)", fontSize: 14, margin: "4px 0 0" }}>
            既存の節や自分の本文を集め、章に編み、自分の読みの書として公開します。
          </p>
        </div>
        {user ? (
          <Link href="/compilations/new" style={newButtonStyle}>
            新しい編纂書
          </Link>
        ) : (
          <button type="button" onClick={() => setShowLoginModal(true)} style={{ ...newButtonStyle, border: "none", cursor: "pointer", fontFamily: "inherit" }}>
            ログインして編纂を始める
          </button>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16, alignItems: "start" }}>
        {user && (
          <BookColumn
            title="自分の編纂書"
            desc="下書きも含めて、自分が編んでいる書。"
            icon="book-open"
            color="var(--accent)"
            tint="var(--accent-tint)"
            books={myBooks}
            loading={loading}
            empty="まだ編纂書がありません。"
            editable
          />
        )}
        <BookColumn
          title="公開された編纂書"
          desc="誰でも読める、編まれた書。"
          icon="globe"
          color="var(--state-success)"
          tint="rgba(34,197,94,0.15)"
          books={publicBooks}
          loading={loading}
          empty="公開された編纂書はまだありません。"
        />
      </div>
    </div>
  );
}

function BookColumn({
  title,
  desc,
  icon,
  color,
  tint,
  books,
  loading,
  empty,
  editable = false,
}: {
  title: string;
  desc: string;
  icon: IconName;
  color: string;
  tint: string;
  books: CompiledBook[];
  loading: boolean;
  empty: string;
  editable?: boolean;
}) {
  return (
    <section style={columnStyle}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color, display: "inline-flex" }}>
            <Icon name={icon} size={18} />
          </span>
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>{title}</h2>
          <span style={{ ...countBadgeStyle, background: tint, color }}>{books.length}</span>
        </div>
        <p style={{ margin: "6px 0 0", fontSize: 12, color: "var(--text-muted)" }}>{desc}</p>
      </div>

      {loading ? (
        <SkeletonList count={2} />
      ) : books.length === 0 ? (
        <p style={{ fontSize: 13, color: "var(--text-faint)", padding: "8px 2px" }}>{empty}</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {books.map((book) => (
            <BookCard key={book.id} book={book} editable={editable} />
          ))}
        </div>
      )}
    </section>
  );
}

function BookCard({ book, editable }: { book: CompiledBook; editable: boolean }) {
  const isPublic = book.visibility === "public";
  return (
    <Link href={editable ? `/compilations/${book.id}/edit` : `/compilations/${book.id}`} style={{ textDecoration: "none", color: "inherit" }}>
      <div className="card-glow card-glow-interactive" style={{ padding: "16px 16px", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "flex-end", gap: 10, marginBottom: 12 }}>
          <span
            className="badge"
            style={{
              background: isPublic ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.08)",
              color: isPublic ? "var(--state-success)" : "var(--text-muted)",
              display: "inline-flex",
              alignItems: "center",
              gap: 3,
              flexShrink: 0,
            }}
          >
            {visibilityLabel(book.visibility)}
          </span>
        </div>

        <h3 style={{ fontFamily: '"Noto Serif JP", serif', fontSize: "var(--font-size-md)", fontWeight: 700, margin: "0 0 var(--space-2)" }}>
          {book.title}
        </h3>

        {book.description && (
          <p style={{ margin: "0 0 var(--space-2)", fontSize: "var(--font-size-sm)", color: "var(--text-muted)", lineHeight: 1.5 }}>
            {book.description}
          </p>
        )}

        <div style={{ display: "flex", gap: 6, fontSize: "var(--font-size-xs)", color: "var(--text-faint)", flexWrap: "wrap" }}>
          <span style={metaPillStyle}>{book.owner_username}</span>
          <span style={metaPillStyle}>{book.chapter_count}章</span>
          <span style={metaPillStyle}>{book.verse_count}節</span>
        </div>
      </div>
    </Link>
  );
}

const columnStyle: React.CSSProperties = {
  padding: "18px 16px",
  border: "1px solid var(--border)",
  borderRadius: 14,
  background: "rgba(255,255,255,0.02)",
};

const countBadgeStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: 22,
  height: 22,
  padding: "0 7px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 700,
};

const metaPillStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  minHeight: 24,
  padding: "2px 8px",
  borderRadius: 6,
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.10)",
  color: "var(--text-muted)",
};

const newButtonStyle: React.CSSProperties = {
  background: "var(--accent)",
  color: "var(--accent-text)",
  borderRadius: 8,
  padding: "8px 18px",
  textDecoration: "none",
  fontWeight: 700,
  fontSize: 14,
};
