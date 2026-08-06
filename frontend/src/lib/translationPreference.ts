// 「どの訳で読むか」の記憶場所。
//
// 以前はブラウザの控え（localStorage）に入れていたが、それだとサーバー側が
// 読めず、本文をサーバーで組み立てられなかった。表示言語（neon_lang）と同じく
// Cookie に置き、サーバーとブラウザが同じ値を見るようにしている。

export const TRANSLATION_COOKIE = "neon_translation";

/** 以前の置き場所。Cookie へ移し替えるためだけに読む。 */
export const TRANSLATION_STORAGE_KEY = "bible-translation";

/** ブラウザ側で今の設定を読む。Cookie が無ければ、以前の控えを見る。 */
export function readTranslationPreference(): string | null {
  if (typeof document === "undefined") return null;
  const fromCookie = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(`${TRANSLATION_COOKIE}=`))
    ?.slice(TRANSLATION_COOKIE.length + 1);
  if (fromCookie) return decodeURIComponent(fromCookie);
  return localStorage.getItem(TRANSLATION_STORAGE_KEY);
}

/**
 * 選んだ訳を覚える。Cookie が正で、以前の控えも一緒に更新しておく
 * （まだ古い画面が開いたままの場合に食い違わないようにするため）。
 */
export function saveTranslationPreference(id: string): void {
  if (typeof document === "undefined") return;
  document.cookie = `${TRANSLATION_COOKIE}=${encodeURIComponent(id)}; Path=/; Max-Age=31536000; SameSite=Lax`;
  localStorage.setItem(TRANSLATION_STORAGE_KEY, id);
}
