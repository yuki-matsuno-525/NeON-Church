"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  createCompiledChapter,
  deleteCompiledBook,
  fetchCompiledBook,
  reorderCompiledChapters,
  updateCompiledBook,
  type CompiledBook,
  type CompiledChapter,
  type CompiledVisibility,
} from "@/lib/api";
import { trayLabel, visibilityDescription } from "@/lib/compilations";
import { useAuth } from "@/contexts/AuthContext";
import { Icon } from "@/components/ui/Icon";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { LoginRequiredModal } from "@/components/ui/LoginRequiredModal";
import { useAutosave, saveStatusLabel } from "@/hooks/useAutosave";

/**
 * 編纂書の設定ページ。書の情報と章立てを決め、章を選ぶと作業ページ（章と断章ボックスの画面）へ進む。
 */
export default function CompilationEditPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const id = typeof params.id === "string" ? params.id : "";

  const [book, setBook] = useState<CompiledBook | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const reload = useCallback(() => {
    if (!id) return;
    fetchCompiledBook(id)
      .then(setBook)
      .catch(() => setError("編纂書を読み込めませんでした。"))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (authLoading || !user) return;
    reload();
  }, [authLoading, user, reload]);

  if (authLoading || loading) return <main style={{ padding: 32, color: "var(--text-muted)" }}>読み込み中...</main>;
  if (!user) {
    return (
      <main style={{ padding: 32 }}>
        <LoginRequiredModal
          onClose={() => router.push("/compilations")}
          from={`/compilations/${id}/edit`}
          title="ログインして編纂を続ける"
          description="編纂書を編集するにはログインが必要です。"
        />
      </main>
    );
  }
  if (error || !book) return <main style={{ padding: 32, color: "var(--state-danger)" }}>{error || "見つかりません。"}</main>;

  return (
    <main style={{ maxWidth: 800, margin: "0 auto", padding: "32px 16px" }}>
      <header style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center", marginBottom: 22 }}>
        <Link href="/compilations" style={{ color: "var(--accent)", textDecoration: "none", fontSize: 13, display: "inline-flex", alignItems: "center", gap: 5 }}>
          <Icon name="arrow-left" size={14} />
          編纂書一覧
        </Link>
        <Link href={`/compilations/${book.id}`} style={{ color: "var(--accent)", textDecoration: "none", fontSize: 13, fontWeight: 700 }}>
          読む形で見る
        </Link>
      </header>

      <BookSettings book={book} onSaved={setBook} />

      <ChapterGrid book={book} onChanged={setBook} />

      <DeleteBook book={book} onDeleted={() => router.push("/compilations")} />
    </main>
  );
}

function BookSettings({ book, onSaved }: { book: CompiledBook; onSaved: (book: CompiledBook) => void }) {
  const [draft, setDraft] = useState({
    title: book.title,
    description: book.description,
    annotation: book.annotation,
    tray_name: book.tray_name,
    visibility: book.visibility,
  });
  const status = useAutosave(draft, async (value) => onSaved(await updateCompiledBook(book.id, value)));

  return (
    <section style={{ marginBottom: 34 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>{draft.title || "無題の編纂書"}</h1>
        <span role="status" style={{ fontSize: 11, color: status === "error" ? "var(--state-danger)" : "var(--text-faint)" }}>
          {saveStatusLabel(status)}
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
        <Field label="書名">
          <input
            data-testid="book-title-input"
            value={draft.title}
            onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
            maxLength={200}
            style={{ ...inputStyle, fontFamily: '"Noto Serif JP", serif', fontSize: 15 }}
          />
        </Field>
        <Field label="断章ボックスの名前" hint="空のままなら「断章ボックス」と呼びます。">
          <input
            data-testid="tray-name-input"
            value={draft.tray_name}
            onChange={(e) => setDraft((d) => ({ ...d, tray_name: e.target.value }))}
            maxLength={100}
            placeholder="断章ボックス"
            style={inputStyle}
          />
        </Field>
        <Field label="説明">
          <textarea
            data-testid="book-description-input"
            value={draft.description}
            onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
            rows={3}
            style={{ ...inputStyle, lineHeight: 1.6, resize: "vertical" }}
          />
        </Field>
        <Field label="書への注釈">
          <textarea
            data-testid="book-annotation-input"
            value={draft.annotation}
            onChange={(e) => setDraft((d) => ({ ...d, annotation: e.target.value }))}
            rows={3}
            style={{ ...inputStyle, lineHeight: 1.6, resize: "vertical" }}
          />
        </Field>
        <Field label="公開範囲" hint={visibilityDescription(draft.visibility)}>
          <select
            data-testid="visibility-select"
            value={draft.visibility}
            onChange={(e) => setDraft((d) => ({ ...d, visibility: e.target.value as CompiledVisibility }))}
            style={inputStyle}
          >
            <option value="private">非公開</option>
            <option value="unlisted">限定公開</option>
            <option value="public">公開</option>
          </select>
        </Field>
      </div>
    </section>
  );
}

/**
 * 読む画面の「章を選択」と同じ形の章立て。数字のパネルを押すとその章の作業ページへ進む。
 * ＋のパネルで章を足し、パネルをドラッグすると章の順番が変わる。
 */
function ChapterGrid({ book, onChanged }: { book: CompiledBook; onChanged: (book: CompiledBook) => void }) {
  const chapters = book.chapters ?? [];
  const [adding, setAdding] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const addChapter = async () => {
    if (adding) return;
    setAdding(true);
    try {
      await createCompiledChapter(book.id, {});
      onChanged(await fetchCompiledBook(book.id));
    } finally {
      setAdding(false);
    }
  };

  const dropOn = async (targetIndex: number) => {
    const ids = chapters.map((c) => c.id);
    const fromIndex = draggingId ? ids.indexOf(draggingId) : -1;
    setDraggingId(null);
    setOverId(null);
    if (fromIndex === -1 || fromIndex === targetIndex) return;
    const [moved] = ids.splice(fromIndex, 1);
    ids.splice(targetIndex, 0, moved);
    onChanged(await reorderCompiledChapters(book.id, ids));
  };

  return (
    <section style={{ marginBottom: 40 }}>
      <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-muted)", marginBottom: 12 }}>章を選択</h2>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(44px, 1fr))", gap: "var(--space-2)" }}>
        {chapters.map((chapter, index) => (
          <ChapterPanel
            key={chapter.id}
            book={book}
            chapter={chapter}
            isOver={overId === chapter.id && draggingId !== chapter.id}
            isDragging={draggingId === chapter.id}
            onDragStart={() => setDraggingId(chapter.id)}
            onDragEnd={() => {
              setDraggingId(null);
              setOverId(null);
            }}
            onDragOver={() => setOverId(chapter.id)}
            onDrop={() => dropOn(index)}
          />
        ))}

        <button
          type="button"
          data-testid="add-chapter-button"
          onClick={addChapter}
          aria-label="章を追加"
          title="章を追加"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: 44,
            minWidth: 44,
            border: "1px dashed var(--border)",
            borderRadius: "var(--radius-md)",
            background: "var(--bg-alt)",
            color: "var(--text-muted)",
            cursor: "pointer",
            padding: 0,
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget as HTMLElement;
            el.style.background = "var(--accent-tint)";
            el.style.color = "var(--accent)";
            el.style.borderColor = "var(--accent)";
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget as HTMLElement;
            el.style.background = "var(--bg-alt)";
            el.style.color = "var(--text-muted)";
            el.style.borderColor = "var(--border)";
          }}
        >
          <Icon name="plus" size={18} />
        </button>
      </div>

      {chapters.length === 0 && (
        <p style={{ margin: "12px 0 0", fontSize: 12, color: "var(--text-faint)", lineHeight: 1.7 }}>
          ＋で章を作ると、{trayLabel(book)}の断章をその章へ並べられます。
        </p>
      )}
    </section>
  );
}

function ChapterPanel({
  book,
  chapter,
  isOver,
  isDragging,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
}: {
  book: CompiledBook;
  chapter: CompiledChapter;
  isOver: boolean;
  isDragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDragOver: () => void;
  onDrop: () => void;
}) {
  const border = isOver ? "var(--accent)" : "var(--border)";
  return (
    <Link
      href={`/compilations/${book.id}/edit/chapters/${chapter.id}`}
      data-testid="chapter-panel"
      title={`第${chapter.number}章 ${chapter.title || "（無題）"} ・ ${chapter.verses.length}節`}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", chapter.id);
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      onDragOver={(e) => {
        e.preventDefault();
        onDragOver();
      }}
      onDrop={(e) => {
        e.preventDefault();
        onDrop();
      }}
      style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: 44,
        minWidth: 44,
        border: `1px solid ${border}`,
        borderRadius: "var(--radius-md)",
        textDecoration: "none",
        color: isOver ? "var(--accent)" : "var(--text-muted)",
        fontWeight: 700,
        fontSize: "var(--font-size-sm)",
        background: isOver ? "var(--accent-tint)" : "var(--bg-alt)",
        opacity: isDragging ? 0.4 : 1,
        transition: "border-color var(--duration-fast) var(--ease-out), background var(--duration-fast) var(--ease-out), color var(--duration-fast) var(--ease-out), box-shadow var(--duration-fast) var(--ease-out)",
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.background = "var(--accent-tint)";
        el.style.color = "var(--accent)";
        el.style.borderColor = "var(--accent)";
        el.style.boxShadow = "var(--shadow-glow)";
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.background = isOver ? "var(--accent-tint)" : "var(--bg-alt)";
        el.style.color = isOver ? "var(--accent)" : "var(--text-muted)";
        el.style.borderColor = border;
        el.style.boxShadow = "none";
      }}
    >
      {chapter.number}
      {chapter.verses.length > 0 && (
        <span
          aria-label={`${chapter.verses.length}節`}
          style={{ position: "absolute", bottom: 3, left: 3, width: 4, height: 4, borderRadius: "50%", background: "var(--accent)" }}
        />
      )}
    </Link>
  );
}

function DeleteBook({ book, onDeleted }: { book: CompiledBook; onDeleted: () => void }) {
  const [confirming, setConfirming] = useState(false);
  return (
    <section style={{ borderTop: "1px solid var(--border)", paddingTop: 16 }}>
      <ConfirmDialog
        open={confirming}
        destructive
        title={`「${book.title}」を消しますか？`}
        description="章も断章もすべて消えます。元に戻せません。"
        confirmText="編纂書を消す"
        onCancel={() => setConfirming(false)}
        onConfirm={async () => {
          setConfirming(false);
          await deleteCompiledBook(book.id);
          onDeleted();
        }}
      />
      <button
        type="button"
        data-testid="delete-book"
        onClick={() => setConfirming(true)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          border: "none",
          background: "none",
          padding: 0,
          color: "var(--state-danger)",
          fontSize: 12,
          fontWeight: 700,
          cursor: "pointer",
          fontFamily: "inherit",
        }}
      >
        <Icon name="trash" size={13} />
        この編纂書を消す
      </button>
    </section>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 12, fontWeight: 700, color: "var(--text-muted)" }}>
      {label}
      {children}
      {hint && <span style={{ fontWeight: 400, fontSize: 11, color: "var(--text-faint)", lineHeight: 1.5 }}>{hint}</span>}
    </label>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "8px 10px",
  borderRadius: 6,
  border: "1px solid var(--border)",
  background: "var(--bg)",
  color: "var(--text)",
  fontFamily: "inherit",
  fontSize: 13,
};
