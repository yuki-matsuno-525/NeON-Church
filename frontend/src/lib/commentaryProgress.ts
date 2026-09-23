/**
 * 解釈書をどこまで読んだかの控え（このブラウザだけ）。聖書の lib/readingProgress.ts の解釈書版。
 *
 * 本ごとに「最後に開いた章と区切り」を残し、書のページでその章に印を付ける。
 * 別に「最後に読んだ場所」を1つ、題と章の名前ごと残す。「読む」の解釈書タブの
 * 「続きから読む」は、これだけで出せる（通信しない）。
 */

/** 最後に読んだ場所。名前は日本語と英語の両方を持ち、表示するときに言語で選ぶ。 */
export type CommentaryResume = {
  work: string;
  chapter: number;
  /** 最後に開いた区切り。章を開いただけなら null */
  number: number | null;
  title: { ja: string; en: string };
  chapterTitle: { ja: string; en: string };
  updatedAt: string;
};

const KEY_PREFIX = "neon_commentary_progress_";
const LAST_KEY = "neon_commentary_last";

function read<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

/** 読んだ場所を残す（本ごとの控えと、最後に読んだ場所の両方）。 */
export function saveCommentaryProgress(resume: Omit<CommentaryResume, "updatedAt">): void {
  if (typeof window === "undefined") return;
  const entry: CommentaryResume = { ...resume, updatedAt: new Date().toISOString() };
  try {
    localStorage.setItem(KEY_PREFIX + resume.work, JSON.stringify({ chapter: entry.chapter, number: entry.number }));
    localStorage.setItem(LAST_KEY, JSON.stringify(entry));
  } catch {}
}

/** その本で最後に開いた章（と区切り）。 */
export function getCommentaryProgress(work: string): { chapter: number; number: number | null } | null {
  const saved = read<{ chapter: number; number: number | null }>(KEY_PREFIX + work);
  return saved && Number.isInteger(saved.chapter) ? saved : null;
}

/** 最後に読んだ場所。 */
export function getLastCommentary(): CommentaryResume | null {
  const saved = read<CommentaryResume>(LAST_KEY);
  return saved && saved.work && Number.isInteger(saved.chapter) ? saved : null;
}
