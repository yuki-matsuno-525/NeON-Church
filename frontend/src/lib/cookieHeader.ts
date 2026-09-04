/**
 * Cookie を1本のヘッダー文字列にまとめる。
 *
 * Next.js は Cookie の値を「読める形」に戻して渡してくる。読む訳のように日本語が
 * 入る値（口語訳・文語訳など）をそのままヘッダーに載せると、HTTP のヘッダーには
 * 使えない文字なので fetch がその場で例外を投げる。訳を選んだ人はどの書も開けなく
 * なっていた（画面には「読み込めませんでした」だけが出る）。
 *
 * そこで、ブラウザが送ってきたときの形（%E5%8F%A3…）へ戻してから並べる。
 * 英数字と記号だけの値（ログインのトークンなど）は1文字も変えない。
 */

/** そのままヘッダーに載せられる値（記号を含む ASCII だけ）。 */
const HEADER_SAFE = /^[!-~]*$/;

export function toCookieHeader(cookies: Iterable<{ name: string; value: string }>): string {
  return Array.from(cookies, ({ name, value }) =>
    `${name}=${HEADER_SAFE.test(value) ? value : encodeURIComponent(value)}`,
  ).join("; ");
}
