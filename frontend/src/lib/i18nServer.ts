import "server-only";

import { getRequestLanguage } from "./serverLanguage";
import { translations, type Translations } from "./i18nDictionary";

/**
 * サーバー側で表示文言を取る。
 *
 * 画面に文字を出すだけの部品は、これを使えば `"use client"` を付けずに書ける。
 * クライアント側の `useT()` と同じ辞書を見るので、文言が二重管理にならない。
 *
 * 言語は Cookie（neon_lang）から読む。切替ボタンは押されたときに
 * この Cookie を書き換えるため、サーバーとブラウザで表示が食い違わない。
 */
export async function getT(): Promise<Translations> {
  const lang = await getRequestLanguage();
  return translations[lang] ?? translations.ja;
}

export { getRequestLanguage };
