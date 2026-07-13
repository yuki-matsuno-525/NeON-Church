// 箇所（訳非依存 slug／章／節／投稿時訳）から読書画面の URL を組み立てる共通ヘルパー。
// 節まであれば #verse-N でその節へスクロール。章までなら章トップ、書だけなら書トップ。
// プロフィールのコメント一覧・コメント栞など、同じ箇所フィールドを持つ箇所で共用する。
export type PassageLocation = {
  book_slug: string;
  chapter_number: number | null;
  verse_number: number | null;
  source_translation: string;
};

export function passageHref(loc: PassageLocation): string {
  if (!loc.book_slug) return "";
  const tr = loc.source_translation
    ? `?translation=${encodeURIComponent(loc.source_translation)}`
    : "";
  if (loc.chapter_number == null) return `/${loc.book_slug}${tr}`;
  if (loc.verse_number == null) return `/${loc.book_slug}/${loc.chapter_number}${tr}`;
  return `/${loc.book_slug}/${loc.chapter_number}${tr}#verse-${loc.verse_number}`;
}
