import type { Verse } from "@/lib/api";

// Nestle 1904 のマルコ16章は「短い結び」（写本によって伝わる異読）を
// 節番号 99 として保持している（元データの慣例）。写本では8節と9節の
// 間に現れるため、表示上もその位置に差し込み、番号ではなくラベルで示す。
//
// この特別扱いは「ギリシャ語訳・マルコ・16章・節99」に限定する。
const GREEK_TRANSLATION = "Nestle 1904 (GRC)";
const MARK_SHORTER_ENDING = 99;

// この節が「マルコの短い結び」かどうか。番号ではなくラベル表示にするか判定する。
export function isMarkShorterEnding(
  slug: string,
  translationId: string,
  verseNumber: number,
): boolean {
  return (
    slug === "mark" &&
    translationId === GREEK_TRANSLATION &&
    verseNumber === MARK_SHORTER_ENDING
  );
}

// 表示順に並べ替えた節配列を返す。
// マルコ16章（ギリシャ語）のときだけ、末尾にある節99（短い結び）を
// 8節の直後へ移動する。それ以外の章・訳はそのまま返す。
export function arrangeVerses(
  slug: string,
  chapterNum: number,
  translationId: string,
  verses: Verse[],
): Verse[] {
  if (slug !== "mark" || chapterNum !== 16 || translationId !== GREEK_TRANSLATION) {
    return verses;
  }
  const ending = verses.find((v) => v.number === MARK_SHORTER_ENDING);
  if (!ending) return verses;

  const result: Verse[] = [];
  for (const v of verses) {
    if (v.number === MARK_SHORTER_ENDING) continue; // 末尾の99は一旦除く
    result.push(v);
    if (v.number === 8) result.push(ending); // 8節の直後に差し込む
  }
  // 万一8節が無ければ、落とさず末尾に残す
  if (!result.includes(ending)) result.push(ending);
  return result;
}
