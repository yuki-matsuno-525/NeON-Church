"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  createCompiledChapter,
  createCompiledVerse,
  fetchCompiledBook,
  publishCompiledBook,
  unpublishCompiledBook,
  updateCompiledBook,
  updateCompiledChapter,
  updateCompiledVerse,
  type CompiledBook,
  type CompiledChapter,
  type CompiledVerse,
  type CompiledVisibility,
} from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Icon } from "@/components/ui/Icon";

export default function CompilationEditPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const id = typeof params.id === "string" ? params.id : "";
  const [book, setBook] = useState<CompiledBook | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const reload = () => {
    if (!id) return;
    setLoading(true);
    fetchCompiledBook(id)
      .then(setBook)
      .catch(() => setError("編纂書を読み込めませんでした。"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!authLoading && !user) {
      router.push(`/login?from=/compilations/${id}/edit`);
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (user) reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user, authLoading, router]);

  const showMessage = (text: string) => {
    setMessage(text);
    setTimeout(() => setMessage(""), 2400);
  };

  if (authLoading || loading) return <main style={{ padding: 32, color: "var(--text-muted)" }}>読み込み中...</main>;
  if (error || !book) return <main style={{ padding: 32, color: "var(--state-danger)" }}>{error || "見つかりません。"}</main>;

  return (
    <main style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 18px" }}>
      <header style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 22 }}>
        <div>
          <Link href={`/compilations/${book.id}`} style={{ color: "var(--accent)", textDecoration: "none", fontSize: 13 }}>
            ← 閲覧ページ
          </Link>
          <h1 style={{ margin: "10px 0 4px", fontSize: 24 }}>編纂エディタ</h1>
          <p style={{ margin: 0, color: "var(--text-muted)", fontSize: 13 }}>
            追加・移動・保存はすべて下書きに残ります。
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
          {book.visibility === "public" ? (
            <button data-testid="unpublish-compilation-button" style={secondaryButtonStyle} onClick={async () => { setBook(await unpublishCompiledBook(book.id)); showMessage("非公開に戻しました。"); }}>
              非公開へ
            </button>
          ) : (
            <button data-testid="publish-compilation-button" style={primaryButtonStyle} onClick={async () => { setBook(await publishCompiledBook(book.id)); showMessage("公開しました。"); }}>
              公開する
            </button>
          )}
        </div>
      </header>

      {message && <p role="status" style={{ color: "var(--accent)", fontSize: 13, fontWeight: 700 }}>{message}</p>}

      <div style={{ display: "grid", gridTemplateColumns: "minmax(260px, 340px) minmax(0, 1fr)", gap: 18, alignItems: "start" }}>
        <aside style={panelStyle}>
          <BookForm book={book} onSaved={(next) => { setBook(next); showMessage("書を保存しました。"); }} />
          <AddTextForm bookId={book.id} onAdded={() => { reload(); showMessage("本文を追加しました。"); }} />
          <AddChapterForm bookId={book.id} onAdded={() => { reload(); showMessage("章を追加しました。"); }} />
        </aside>

        <section style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Tray verses={book.tray ?? []} chapters={book.chapters ?? []} bookId={book.id} onChanged={() => { reload(); showMessage("保存しました。"); }} />
          {(book.chapters ?? []).map((chapter) => (
            <ChapterEditor key={chapter.id} chapter={chapter} bookId={book.id} onChanged={() => { reload(); showMessage("保存しました。"); }} />
          ))}
        </section>
      </div>
    </main>
  );
}

function BookForm({ book, onSaved }: { book: CompiledBook; onSaved: (book: CompiledBook) => void }) {
  const [title, setTitle] = useState(book.title);
  const [description, setDescription] = useState(book.description);
  const [annotation, setAnnotation] = useState(book.annotation);
  const [visibility, setVisibility] = useState<CompiledVisibility>(book.visibility);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      onSaved(await updateCompiledBook(book.id, { title, description, annotation, visibility }));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <h2 style={panelHeadingStyle}>書の設定</h2>
      <Input label="書名" value={title} onChange={setTitle} />
      <Textarea label="説明" value={description} onChange={setDescription} rows={3} />
      <Textarea label="書への注釈" value={annotation} onChange={setAnnotation} rows={4} />
      <label style={labelStyle}>
        公開範囲
        <select value={visibility} onChange={(e) => setVisibility(e.target.value as CompiledVisibility)} style={inputStyle}>
          <option value="private">private</option>
          <option value="unlisted">unlisted</option>
          <option value="public">public</option>
        </select>
      </label>
      <button data-testid="book-save-button" type="button" style={primaryButtonStyle} onClick={save} disabled={saving || !title.trim()}>
        {saving ? "保存中..." : "下書き保存"}
      </button>
    </section>
  );
}

function AddTextForm({ bookId, onAdded }: { bookId: string; onAdded: () => void }) {
  const [body, setBody] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const add = async () => {
    const text = body.trim();
    if (!text || saving) return;
    setSaving(true);
    try {
      await createCompiledVerse(bookId, { source_kind: "note", body_snapshot: text, curator_note: note });
      setBody("");
      setNote("");
      onAdded();
    } finally {
      setSaving(false);
    }
  };

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 10, borderTop: "1px solid var(--border)", paddingTop: 14, marginTop: 14 }}>
      <h2 style={panelHeadingStyle}>普通の本文を追加</h2>
      <Textarea testId="add-text-body" label="本文" value={body} onChange={setBody} rows={4} />
      <Textarea testId="add-text-note" label="節への注釈" value={note} onChange={setNote} rows={3} />
      <button data-testid="add-text-button" type="button" style={secondaryButtonStyle} onClick={add} disabled={saving || !body.trim()}>
        {saving ? "追加中..." : "未整理トレイへ追加"}
      </button>
    </section>
  );
}

function AddChapterForm({ bookId, onAdded }: { bookId: string; onAdded: () => void }) {
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const add = async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle || saving) return;
    setSaving(true);
    try {
      await createCompiledChapter(bookId, { title: trimmedTitle });
      setTitle("");
      onAdded();
    } finally {
      setSaving(false);
    }
  };
  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 10, borderTop: "1px solid var(--border)", paddingTop: 14, marginTop: 14 }}>
      <h2 style={panelHeadingStyle}>章を追加</h2>
      <Input testId="add-chapter-title" label="章タイトル" value={title} onChange={setTitle} />
      <button data-testid="add-chapter-button" type="button" style={secondaryButtonStyle} onClick={add} disabled={saving || !title.trim()}>
        {saving ? "追加中..." : "章を作成"}
      </button>
    </section>
  );
}

function Tray({ verses, chapters, bookId, onChanged }: { verses: CompiledVerse[]; chapters: CompiledChapter[]; bookId: string; onChanged: () => void }) {
  return (
    <section style={panelStyle}>
      <h2 style={{ ...panelHeadingStyle, display: "flex", alignItems: "center", gap: 6 }}>
        <Icon name="book-open" size={16} />
        未整理トレイ
      </h2>
      {verses.length === 0 ? (
        <p style={emptyStyle}>読む画面の「編纂に追加」や、この画面の「普通の本文を追加」から断章を集めます。</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {verses.map((verse) => (
            <VerseEditor key={verse.id} verse={verse} bookId={bookId} chapters={chapters} onChanged={onChanged} />
          ))}
        </div>
      )}
    </section>
  );
}

function ChapterEditor({ chapter, bookId, onChanged }: { chapter: CompiledChapter; bookId: string; onChanged: () => void }) {
  const [title, setTitle] = useState(chapter.title);
  const [introduction, setIntroduction] = useState(chapter.introduction);
  const [annotation, setAnnotation] = useState(chapter.annotation);
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    try {
      await updateCompiledChapter(bookId, chapter.id, { title, introduction, annotation });
      onChanged();
    } finally {
      setSaving(false);
    }
  };
  return (
    <section style={panelStyle}>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: 10, alignItems: "start" }}>
        <div>
          <h2 style={panelHeadingStyle}>第{chapter.number}章</h2>
          <Input label="章タイトル" value={title} onChange={setTitle} />
        </div>
        <button data-testid="chapter-save-button" type="button" style={secondaryButtonStyle} onClick={save} disabled={saving}>
          {saving ? "保存中..." : "章を保存"}
        </button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 10, marginTop: 10 }}>
        <Textarea testId="chapter-introduction" label="章の導入文" value={introduction} onChange={setIntroduction} rows={3} />
        <Textarea testId="chapter-annotation" label="章への注釈" value={annotation} onChange={setAnnotation} rows={3} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 14 }}>
        {chapter.verses.length === 0 ? (
          <p style={emptyStyle}>この章にはまだ節がありません。</p>
        ) : (
          chapter.verses.map((verse) => (
            <VerseEditor key={verse.id} verse={verse} bookId={bookId} chapters={[]} onChanged={onChanged} />
          ))
        )}
      </div>
    </section>
  );
}

function VerseEditor({ verse, bookId, chapters, onChanged }: { verse: CompiledVerse; bookId: string; chapters: CompiledChapter[]; onChanged: () => void }) {
  const [body, setBody] = useState(verse.body_snapshot);
  const [note, setNote] = useState(verse.curator_note);
  const [saving, setSaving] = useState(false);
  const isNote = verse.source_kind === "note";

  const save = async () => {
    setSaving(true);
    try {
      await updateCompiledVerse(bookId, verse.id, {
        ...(isNote ? { body_snapshot: body } : {}),
        curator_note: note,
      });
      onChanged();
    } finally {
      setSaving(false);
    }
  };

  const moveToChapter = async (chapterId: string) => {
    if (!chapterId) return;
    setSaving(true);
    try {
      await updateCompiledVerse(bookId, verse.id, { chapter: chapterId });
      onChanged();
    } finally {
      setSaving(false);
    }
  };

  return (
    <article style={{ border: "1px solid var(--border)", borderRadius: 8, padding: 12, background: "rgba(255,255,255,0.03)" }}>
      <p style={{ margin: "0 0 8px", color: "var(--text-faint)", fontSize: 12 }}>
        {verse.chapter ? `第${verse.verse_number}節` : "未整理"} {verse.source_label && `・${verse.source_label}`}
      </p>
      {isNote ? (
        <textarea data-testid="verse-body-input" value={body} onChange={(e) => setBody(e.target.value)} rows={4} style={textareaStyle} />
      ) : (
        <p style={{ margin: "0 0 10px", fontSize: 15, lineHeight: 1.8, fontFamily: '"Noto Serif JP", serif', whiteSpace: "pre-wrap" }}>{verse.body_snapshot}</p>
      )}
      <Textarea testId="verse-note-input" label="節への注釈" value={note} onChange={setNote} rows={3} />
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginTop: 10 }}>
        <button data-testid="verse-save-button" type="button" style={secondaryButtonStyle} onClick={save} disabled={saving}>
          {saving ? "保存中..." : "節を保存"}
        </button>
        {chapters.length > 0 && (
          <select data-testid="move-verse-select" onChange={(e) => moveToChapter(e.target.value)} defaultValue="" style={{ ...inputStyle, maxWidth: 220 }}>
            <option value="">章へ移動...</option>
            {chapters.map((chapter) => (
              <option key={chapter.id} value={chapter.id}>第{chapter.number}章 {chapter.title}</option>
            ))}
          </select>
        )}
      </div>
    </article>
  );
}

function Input({ label, value, onChange, testId }: { label: string; value: string; onChange: (value: string) => void; testId?: string }) {
  return (
    <label style={labelStyle}>
      {label}
      <input data-testid={testId} value={value} onChange={(e) => onChange(e.target.value)} style={inputStyle} />
    </label>
  );
}

function Textarea({ label, value, onChange, rows, testId }: { label: string; value: string; onChange: (value: string) => void; rows: number; testId?: string }) {
  return (
    <label style={labelStyle}>
      {label}
      <textarea data-testid={testId} value={value} onChange={(e) => onChange(e.target.value)} rows={rows} style={textareaStyle} />
    </label>
  );
}

const panelStyle: React.CSSProperties = {
  border: "1px solid var(--border)",
  borderRadius: 8,
  padding: 16,
  background: "rgba(255,255,255,0.02)",
};

const panelHeadingStyle: React.CSSProperties = {
  margin: "0 0 10px",
  fontSize: 15,
  fontWeight: 800,
};

const labelStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 5,
  fontSize: 12,
  fontWeight: 700,
  color: "var(--text-muted)",
};

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

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  resize: "vertical",
  lineHeight: 1.6,
};

const primaryButtonStyle: React.CSSProperties = {
  border: "none",
  borderRadius: 6,
  padding: "9px 12px",
  background: "var(--accent)",
  color: "var(--accent-text)",
  fontWeight: 800,
  fontSize: 13,
  cursor: "pointer",
  fontFamily: "inherit",
};

const secondaryButtonStyle: React.CSSProperties = {
  border: "1px solid var(--border)",
  borderRadius: 6,
  padding: "8px 11px",
  background: "var(--bg-alt)",
  color: "var(--text)",
  fontWeight: 700,
  fontSize: 13,
  cursor: "pointer",
  fontFamily: "inherit",
};

const emptyStyle: React.CSSProperties = {
  margin: 0,
  color: "var(--text-faint)",
  fontSize: 13,
  lineHeight: 1.6,
};
