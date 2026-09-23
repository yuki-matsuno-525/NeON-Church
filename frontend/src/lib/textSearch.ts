// 画面の中で一覧を絞る検索の小道具。「読む」の書の検索と、解釈書の検索が共用する。

/** 検索語をそろえる（前後の空白を落とし、大文字小文字を区別しない）。 */
export function normalizeSearch(value: string): string {
  return value.trim().toLocaleLowerCase();
}

/** どれか1つの値に検索語が含まれていれば一致。query は normalizeSearch 済みのもの。 */
export function matchesSearch(query: string, values: Array<string | null | undefined>): boolean {
  return values.some((value) => value?.toLocaleLowerCase().includes(query));
}
