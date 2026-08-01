"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  createCompiledVerse,
  deleteCompiledChapter,
  deleteCompiledVerse,
  fetchCompiledBook,
  reorderCompiledVerses,
  updateCompiledChapter,
  type CompiledBook,
  type CompiledChapter,
  type CompiledVerse,
} from "@/lib/api";
import { trayLabel } from "@/lib/compilations";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/useIsMobile";
import { LoginRequiredModal } from "@/components/ui/LoginRequiredModal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Icon } from "@/components/ui/Icon";
import { VerseCard } from "@/components/compilations/VerseCard";
import { VerseDropList, TRAY_LIST_ID } from "@/components/compilations/VerseDropList";
import { useAutosave, saveStatusLabel } from "@/hooks/useAutosave";

/**
 * 編纂の作業ページ。左が章、右が断章ボックス。
 * PC では右の断章を左へドラッグして章に入れ、章の中もドラッグで並べ替える。
 * スマホではドラッグが効かないので、代わりにカードのボタンで動かす。
 */
export default function CompilationChapterEditPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const isMobile = useIsMobile(900);
  const bookId = typeof params.id === "string" ? params.id : "";
  const chapterId = typeof params.chapterId === "string" ? params.chapterId : "";

  const [book, setBook] = useState<CompiledBook | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [confirmDeleteChapter, setConfirmDeleteChapter] = useState(false);

  const reload = useCallback(() => {
    if (!bookId) return;
    fetchCompiledBook(bookId)
      .then(setBook)
      .catch(() => setError("編纂書を読み込めませんでした。"))
      .finally(() => setLoading(false));
  }, [bookId]);

  useEffect(() => {
    if (authLoading || !user) return;
    reload();
  }, [authLoading, user, reload]);

  const chapter = (book?.chapters ?? []).find((c) => c.id === chapterId) ?? null;
  const chapterVerses = chapter?.verses ?? [];
  const trayVerses = book?.tray ?? [];

  /** 落とされた（またはボタンで送られた）断章を、置き場の中の指定位置へ動かす。 */
  const moveVerse = async (verseId: string, fromListId: string, toListId: string, toIndex: number) => {
    if (!book) return;
    const target = toListId === TRAY_LIST_ID ? trayVerses : chapterVerses;
    const orderedIds = target.map((verse) => verse.id);
    const fromIndex = orderedIds.indexOf(verseId);
    let insertAt = toIndex;
    if (fromIndex !== -1) {
      orderedIds.splice(fromIndex, 1);
      if (fromIndex < toIndex) insertAt = toIndex - 1;
    }
    orderedIds.splice(insertAt, 0, verseId);
    if (fromListId === toListId && fromIndex === insertAt) return;

    applyLocalMove(setBook, verseId, toListId, orderedIds);
    try {
      const next = await reorderCompiledVerses(book.id, toListId === TRAY_LIST_ID ? null : toListId, orderedIds);
      setBook(next);
    } catch {
      setError("動かせませんでした。読み込み直します。");
      reload();
    }
  };

  if (authLoading || loading) return <main style={{ padding: 32, color: "var(--text-muted)" }}>読み込み中...</main>;
  if (!user) {
    return (
      <main style={{ padding: 32 }}>
        <LoginRequiredModal
          onClose={() => router.push("/compilations")}
          from={`/compilations/${bookId}/edit/chapters/${chapterId}`}
          title="ログインして編纂を続ける"
          description="編纂書を編集するにはログインが必要です。"
        />
      </main>
    );
  }
  if (error && !book) return <main style={{ padding: 32, color: "var(--state-danger)" }}>{error}</main>;
  if (!book || !chapter) return <main style={{ padding: 32, color: "var(--state-danger)" }}>この章は見つかりません。</main>;

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "24px 16px", display: "flex", flexDirection: "column", minHeight: "calc(100vh - var(--navbar-height))" }}>
      <ConfirmDialog
        open={confirmDeleteChapter}
        destructive
        title={`第${chapter.number}章を消しますか？`}
        description={
          chapterVerses.length
            ? `中の${chapterVerses.length}節は捨てず、${trayLabel(book)}に戻ります。`
            : "この章には断章がありません。"
        }
        confirmText="章を消す"
        onCancel={() => setConfirmDeleteChapter(false)}
        onConfirm={async () => {
          setConfirmDeleteChapter(false);
          await deleteCompiledChapter(book.id, chapter.id);
          router.push(`/compilations/${book.id}/edit`);
        }}
      />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        <Link href={`/compilations/${book.id}/edit`} style={{ color: "var(--accent)", textDecoration: "none", fontSize: 13, display: "inline-flex", alignItems: "center", gap: 5 }}>
          <Icon name="arrow-left" size={14} />
          {book.title}
        </Link>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 12 }}>
          {(book.chapters ?? []).length > 1 && (
            <label style={{ fontSize: 12, color: "var(--text-muted)", display: "inline-flex", alignItems: "center", gap: 6 }}>
              章を移る
              <select
                data-testid="chapter-switch"
                value={chapter.id}
                onChange={(e) => router.push(`/compilations/${book.id}/edit/chapters/${e.target.value}`)}
                style={{ ...inputStyle, width: "auto" }}
              >
                {(book.chapters ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    第{c.number}章 {c.title}
                  </option>
                ))}
              </select>
            </label>
          )}
          <button
            type="button"
            data-testid="delete-chapter"
            onClick={() => setConfirmDeleteChapter(true)}
            style={{ ...smallButtonStyle, color: "var(--state-danger)" }}
          >
            <Icon name="trash" size={13} />
            この章を消す
          </button>
        </div>
      </div>

      {error && (
        <p role="alert" style={{ color: "var(--state-danger)", fontSize: 13 }}>
          {error}
        </p>
      )}

      <div
        className="compilation-work-grid"
        style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(300px, 420px)", gap: 16, alignItems: "stretch", flex: 1 }}
      >
        <ChapterPane
          book={book}
          chapter={chapter}
          verses={chapterVerses}
          isMobile={isMobile}
          onDropVerse={(verseId, fromListId, toIndex) => moveVerse(verseId, fromListId, chapter.id, toIndex)}
          onSendBackToTray={(verseId) => moveVerse(verseId, chapter.id, TRAY_LIST_ID, 0)}
          onMoveWithin={(verseId, toIndex) => moveVerse(verseId, chapter.id, chapter.id, toIndex)}
        />
        <TrayPane
          book={book}
          verses={trayVerses}
          chapterTitle={`第${chapter.number}章`}
          isMobile={isMobile}
          onDropVerse={(verseId, fromListId, toIndex) => moveVerse(verseId, fromListId, TRAY_LIST_ID, toIndex)}
          onSendToChapter={(verseId) => moveVerse(verseId, TRAY_LIST_ID, chapter.id, chapterVerses.length)}
          onChanged={reload}
        />
      </div>

      <style>{`
        @media (max-width: 900px) {
          .compilation-work-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}

/** ドラッグの結果を、通信を待たずに画面へ先に反映する。 */
function applyLocalMove(
  setBook: React.Dispatch<React.SetStateAction<CompiledBook | null>>,
  verseId: string,
  toListId: string,
  orderedIds: string[],
) {
  setBook((prev) => {
    if (!prev) return prev;
    const everyVerse = [...(prev.tray ?? []), ...(prev.chapters ?? []).flatMap((c) => c.verses)];
    const byId = new Map(everyVerse.map((verse) => [verse.id, verse]));
    const toTray = toListId === TRAY_LIST_ID;

    const placed: CompiledVerse[] = orderedIds.flatMap((id, index) => {
      const verse = byId.get(id);
      if (!verse) return [];
      return [{ ...verse, chapter: toTray ? null : toListId, order: index + 1, verse_number: toTray ? null : index + 1 }];
    });
    const placedIds = new Set(orderedIds);
    const removeMoved = (verses: CompiledVerse[]) =>
      verses.filter((verse) => !placedIds.has(verse.id)).map((verse, index) => ({ ...verse, verse_number: index + 1 }));

    return {
      ...prev,
      tray: toTray ? placed : (prev.tray ?? []).filter((verse) => !placedIds.has(verse.id)),
      chapters: (prev.chapters ?? []).map((c) =>
        c.id === toListId ? { ...c, verses: placed } : { ...c, verses: removeMoved(c.verses) },
      ),
    };
  });
}

function ChapterPane({
  book,
  chapter,
  verses,
  isMobile,
  onDropVerse,
  onSendBackToTray,
  onMoveWithin,
}: {
  book: CompiledBook;
  chapter: CompiledChapter;
  verses: CompiledVerse[];
  isMobile: boolean;
  onDropVerse: (verseId: string, fromListId: string, toIndex: number) => void;
  onSendBackToTray: (verseId: string) => void;
  onMoveWithin: (verseId: string, toIndex: number) => void;
}) {
  const [draft, setDraft] = useState({
    title: chapter.title,
    introduction: chapter.introduction,
    annotation: chapter.annotation,
  });
  const status = useAutosave(draft, (value) => updateCompiledChapter(book.id, chapter.id, value));

  return (
    <section style={paneStyle}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <h1 style={{ margin: 0, fontSize: 16, fontWeight: 700, whiteSpace: "nowrap" }}>第{chapter.number}章</h1>
        <input
          data-testid="chapter-title-input"
          aria-label="章タイトル"
          value={draft.title}
          onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
          placeholder="章のタイトル"
          style={{ ...inputStyle, flex: 1, fontSize: 15, fontFamily: '"Noto Serif JP", serif' }}
        />
        <span role="status" style={{ fontSize: 11, color: status === "error" ? "var(--state-danger)" : "var(--text-faint)", minWidth: 74, textAlign: "right" }}>
          {saveStatusLabel(status)}
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10, marginBottom: 14 }}>
        <Textarea
          testId="chapter-introduction"
          label="章の導入文"
          value={draft.introduction}
          onChange={(value) => setDraft((d) => ({ ...d, introduction: value }))}
        />
        <Textarea
          testId="chapter-annotation"
          label="章への注釈"
          value={draft.annotation}
          onChange={(value) => setDraft((d) => ({ ...d, annotation: value }))}
        />
      </div>

      <VerseDropList
        listId={chapter.id}
        verses={verses}
        draggable={!isMobile}
        onDropVerse={onDropVerse}
        emptyLabel={
          isMobile
            ? `下の${trayLabel(book)}から「${`第${chapter.number}章`}へ入れる」を押して、この章に並べます。`
            : `右の${trayLabel(book)}から断章をドラッグして、この章に並べます。`
        }
        renderCard={(verse, dragProps) => {
          const index = verses.findIndex((v) => v.id === verse.id);
          return (
            <VerseCard
              verse={verse}
              bookId={book.id}
              dragProps={dragProps}
              actions={
                isMobile ? (
                  <>
                    <button
                      type="button"
                      data-testid="move-verse-up"
                      style={smallButtonStyle}
                      disabled={index === 0}
                      onClick={() => onMoveWithin(verse.id, index - 1)}
                    >
                      <Icon name="chevron-up" size={13} />
                      上へ
                    </button>
                    <button
                      type="button"
                      data-testid="move-verse-down"
                      style={smallButtonStyle}
                      disabled={index === verses.length - 1}
                      onClick={() => onMoveWithin(verse.id, index + 2)}
                    >
                      <Icon name="chevron-down" size={13} />
                      下へ
                    </button>
                    <button
                      type="button"
                      data-testid="send-verse-to-tray"
                      style={smallButtonStyle}
                      onClick={() => onSendBackToTray(verse.id)}
                    >
                      <Icon name="arrow-right" size={13} />
                      {trayLabel(book)}に戻す
                    </button>
                  </>
                ) : null
              }
            />
          );
        }}
      />
    </section>
  );
}

function TrayPane({
  book,
  verses,
  chapterTitle,
  isMobile,
  onDropVerse,
  onSendToChapter,
  onChanged,
}: {
  book: CompiledBook;
  verses: CompiledVerse[];
  chapterTitle: string;
  isMobile: boolean;
  onDropVerse: (verseId: string, fromListId: string, toIndex: number) => void;
  onSendToChapter: (verseId: string) => void;
  onChanged: () => void;
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [discarding, setDiscarding] = useState<CompiledVerse | null>(null);

  return (
    <section style={paneStyle}>
      <ConfirmDialog
        open={Boolean(discarding)}
        destructive
        title="この断章を捨てますか？"
        description="元に戻せません。章に入れたい断章は、捨てずに章へ動かせます。"
        confirmText="捨てる"
        onCancel={() => setDiscarding(null)}
        onConfirm={async () => {
          const target = discarding;
          setDiscarding(null);
          if (!target) return;
          await deleteCompiledVerse(book.id, target.id);
          onChanged();
        }}
      />

      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
        <button
          type="button"
          data-testid="open-add-text"
          onClick={() => setAddOpen((open) => !open)}
          style={{ ...primaryButtonStyle, display: "inline-flex", alignItems: "center", gap: 5 }}
        >
          <Icon name="plus" size={14} />
          普通の本文を追加
        </button>
      </div>

      {addOpen && (
        <AddTextForm
          bookId={book.id}
          onAdded={() => {
            setAddOpen(false);
            onChanged();
          }}
          onCancel={() => setAddOpen(false)}
        />
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "4px 0 10px" }}>
        <span style={{ color: "var(--accent)", display: "inline-flex" }}>
          <Icon name="book-open" size={18} />
        </span>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{trayLabel(book)}</h2>
        <span style={countBadgeStyle}>{verses.length}</span>
      </div>

      <VerseDropList
        listId={TRAY_LIST_ID}
        verses={verses}
        draggable={!isMobile}
        onDropVerse={onDropVerse}
        emptyLabel="読む画面の「編纂に追加」や、上の「普通の本文を追加」で断章を集めます。"
        renderCard={(verse, dragProps) => (
          <VerseCard
            verse={verse}
            bookId={book.id}
            dragProps={dragProps}
            actions={
              <>
                {isMobile && (
                  <button
                    type="button"
                    data-testid="send-verse-to-chapter"
                    style={smallButtonStyle}
                    onClick={() => onSendToChapter(verse.id)}
                  >
                    <Icon name="arrow-left" size={13} />
                    {chapterTitle}へ入れる
                  </button>
                )}
                <button
                  type="button"
                  data-testid="delete-verse"
                  style={{ ...smallButtonStyle, color: "var(--state-danger)" }}
                  onClick={() => setDiscarding(verse)}
                >
                  <Icon name="trash" size={13} />
                  捨てる
                </button>
              </>
            }
          />
        )}
      />
    </section>
  );
}

function AddTextForm({ bookId, onAdded, onCancel }: { bookId: string; onAdded: () => void; onCancel: () => void }) {
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  const add = async () => {
    const text = body.trim();
    if (!text || saving) return;
    setSaving(true);
    setFailed(false);
    try {
      await createCompiledVerse(bookId, { source_kind: "note", body_snapshot: text });
      setBody("");
      onAdded();
    } catch {
      setFailed(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 8, padding: 10, marginBottom: 12, background: "var(--bg-alt)" }}>
      <label style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 12, fontWeight: 700, color: "var(--text-muted)" }}>
        本文
        <textarea
          data-testid="add-text-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={4}
          autoFocus
          placeholder="自分の言葉で書いた本文を、断章として加えます。"
          style={{ ...inputStyle, fontFamily: '"Noto Serif JP", serif', lineHeight: 1.8, resize: "vertical" }}
        />
      </label>
      {failed && <p style={{ color: "var(--state-danger)", fontSize: 12, margin: "6px 0 0" }}>追加できませんでした。</p>}
      <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
        <button data-testid="add-text-button" type="button" style={{ ...primaryButtonStyle, fontSize: 12 }} onClick={add} disabled={saving || !body.trim()}>
          {saving ? "追加中..." : "断章にする"}
        </button>
        <button type="button" style={smallButtonStyle} onClick={onCancel}>
          やめる
        </button>
      </div>
    </div>
  );
}

function Textarea({ label, value, onChange, testId }: { label: string; value: string; onChange: (value: string) => void; testId?: string }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 11, fontWeight: 700, color: "var(--text-muted)" }}>
      {label}
      <textarea
        data-testid={testId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={2}
        style={{ ...inputStyle, fontSize: 12, lineHeight: 1.6, resize: "vertical" }}
      />
    </label>
  );
}

const paneStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  padding: "18px 16px",
  border: "1px solid var(--border)",
  borderRadius: 14,
  background: "rgba(255,255,255,0.02)",
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
  background: "var(--accent-tint)",
  color: "var(--accent)",
};

const primaryButtonStyle: React.CSSProperties = {
  background: "var(--accent)",
  color: "var(--accent-text)",
  border: "none",
  borderRadius: 8,
  padding: "8px 14px",
  fontWeight: 700,
  fontSize: 13,
  cursor: "pointer",
  fontFamily: "inherit",
};

const smallButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  border: "1px solid var(--border)",
  borderRadius: 6,
  padding: "5px 8px",
  background: "var(--bg-alt)",
  color: "var(--text)",
  fontWeight: 700,
  fontSize: 12,
  cursor: "pointer",
  fontFamily: "inherit",
};
