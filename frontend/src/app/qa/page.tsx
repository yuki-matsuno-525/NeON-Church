"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { fetchQAComments, fetchBooks, fetchTags, type QAComment, type Book, type Tag } from "@/lib/api";
import { QAPostForm } from "@/components/qa/QAPostForm";
import { QACard } from "@/components/qa/QACard";
import { LoginRequiredModal } from "@/components/ui/LoginRequiredModal";
import { SkeletonList, EmptyState, Button } from "@/components/ui";
import { useT } from "@/lib/i18n";
import { useLang } from "@/contexts/LanguageContext";
import { defaultTranslationForLang } from "@/lib/translations";

const PAGE_SIZE = 10;

export default function QAPage() {
  const t = useT();
  return (
    <Suspense fallback={<div style={{ padding: 32, color: "var(--text-muted)" }}>{t.loading}</div>}>
      <QAContent />
    </Suspense>
  );
}

function QAContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const t = useT();
  const { lang } = useLang();
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const [comments, setComments] = useState<QAComment[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedBookId, setSelectedBookId] = useState("");
  const [selectedTagId, setSelectedTagId] = useState("");
  const [answeredFilter, setAnsweredFilter] = useState<"all" | "answered" | "unanswered">("all");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  useEffect(() => {
    Promise.all([fetchBooks(defaultTranslationForLang(lang)), fetchTags()])
      .then(([bks, tgs]) => {
        setBooks(bks);
        setTags(tgs);
      })
      .catch(() => {});
  }, [lang]);

  const loadComments = () => {
    setLoading(true);
    fetchQAComments({
      book_id: selectedBookId || undefined,
      tag_id: selectedTagId || undefined,
      answered: answeredFilter === "all" ? undefined : answeredFilter === "answered",
    })
      .then(setComments)
      .catch(() => setComments([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBookId, selectedTagId, answeredFilter]);

  const filterLabel = (f: "all" | "unanswered" | "answered") => {
    if (f === "all") return t.filterAll;
    if (f === "unanswered") return t.filterUnanswered;
    return t.filterAnswered;
  };

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "32px 16px" }}>
      {showLoginModal && (
        <LoginRequiredModal onClose={() => setShowLoginModal(false)} />
      )}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>{t.qaTitle}</h1>
        {!showForm && (
          <button
            onClick={() => {
              if (!user) { setShowLoginModal(true); return; }
              setShowForm(true);
            }}
            style={{
              padding: "7px 16px",
              border: "none",
              borderRadius: 8,
              background: "var(--accent)",
              color: "var(--accent-text)",
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            {t.askQuestion}
          </button>
        )}
      </div>
      <p style={{ color: "var(--text-muted)", fontSize: 14, marginBottom: 24 }}>
        {t.qaDesc}
      </p>

      {showForm && (
        <QAPostForm
          books={books}
          tags={tags}
          onSubmitted={() => {
            setShowForm(false);
            loadComments();
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap", alignItems: "center" }}>
        {(["all", "unanswered", "answered"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setAnsweredFilter(f)}
            style={{
              fontSize: 12,
              padding: "4px 12px",
              borderRadius: 999,
              border: "1px solid var(--border)",
              cursor: "pointer",
              background: answeredFilter === f ? "var(--accent)" : "transparent",
              color: answeredFilter === f ? "var(--accent-text)" : "var(--text-muted)",
              fontFamily: "inherit",
            }}
          >
            {filterLabel(f)}
          </button>
        ))}
        <select
          value={selectedBookId}
          onChange={(e) => setSelectedBookId(e.target.value)}
          style={{
            padding: "6px 10px",
            border: "1px solid var(--border)",
            borderRadius: 8,
            background: "var(--bg-alt)",
            color: "var(--text)",
            fontSize: 13,
          }}
        >
          <option value="">{t.allBooks}</option>
          {books.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>

        <select
          value={selectedTagId}
          onChange={(e) => setSelectedTagId(e.target.value)}
          style={{
            padding: "6px 10px",
            border: "1px solid var(--border)",
            borderRadius: 8,
            background: "var(--bg-alt)",
            color: "var(--text)",
            fontSize: 13,
          }}
        >
          <option value="">{t.allTags}</option>
          {tags.map((tag) => (
            <option key={tag.id} value={tag.id}>{tag.name}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <SkeletonList count={3} />
      ) : comments.length === 0 ? (
        <EmptyState
          title={t.qaEmpty}
          description={t.emptyQaDesc}
          action={
            <Button
              variant="primary"
              onClick={() => {
                if (!user) { setShowLoginModal(true); return; }
                setShowForm(true);
              }}
            >
              {t.emptyQaCta}
            </Button>
          }
        />
      ) : (() => {
        const totalPages = Math.ceil(comments.length / PAGE_SIZE);
        const safePage = Math.min(page, totalPages);
        const pageItems = comments.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
        const goTo = (p: number) => router.push(`/qa?page=${p}`);
        return (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {pageItems.map((c) => (
                <QACard
                  key={c.id}
                  comment={c}
                  currentUserId={user?.id ?? null}
                  onBestAnswerChange={loadComments}
                />
              ))}
            </div>
            {totalPages > 1 && (
              <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 24 }}>
                <button onClick={() => goTo(safePage - 1)} disabled={safePage <= 1} style={pageBtnStyle(safePage <= 1)}>{t.prev}</button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button key={p} onClick={() => goTo(p)} style={pageBtnStyle(false, p === safePage)}>{p}</button>
                ))}
                <button onClick={() => goTo(safePage + 1)} disabled={safePage >= totalPages} style={pageBtnStyle(safePage >= totalPages)}>{t.next}</button>
              </div>
            )}
          </>
        );
      })()}
    </div>
  );
}

function pageBtnStyle(disabled: boolean, active = false): React.CSSProperties {
  return {
    padding: "4px 12px",
    border: "1px solid var(--border)",
    borderRadius: 6,
    background: active ? "var(--accent)" : "transparent",
    color: active ? "var(--accent-text)" : disabled ? "var(--text-faint)" : "var(--text-muted)",
    cursor: disabled ? "default" : "pointer",
    fontSize: 13,
    fontFamily: "inherit",
    opacity: disabled ? 0.5 : 1,
  };
}
