export type LocalProgress = {
  bookId: string;
  chapterId: string;
  chapterNumber: number;
  updatedAt: string; // ISO string
};

const KEY_PREFIX = "neon_progress_";
const LAST_BOOK_KEY = "neon_last_book";

export function saveLocalProgress(slug: string, p: LocalProgress): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY_PREFIX + slug, JSON.stringify(p));
    localStorage.setItem(LAST_BOOK_KEY, slug);
  } catch {}
}

export function getLocalProgress(slug: string): LocalProgress | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY_PREFIX + slug);
    return raw ? (JSON.parse(raw) as LocalProgress) : null;
  } catch {
    return null;
  }
}

export function getLastBookSlug(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(LAST_BOOK_KEY);
  } catch {
    return null;
  }
}
