"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useDebouncedValue } from "./useDebouncedValue";

/**
 * 検索欄の値と URL の ?q= をつなぐ。
 *
 * 大事なのは「入力欄が持つ値が唯一の正で、URL は書き出し先でしかない」こと。
 * 以前は逆で、打つたびに router.replace して、返ってきた URL の値を入力欄へ戻していた。
 * router.replace の反映は1テンポ遅れるので、その間に打った文字が古い値で上書きされ、
 * 「消したのに戻る」「日本語変換中に文字が二重になる（キリスト→キリストキリスト）」が起きていた。
 * 変換中に React が input の値を書き換えると、IME 側の未確定の文字は残ったままなので、
 * 確定したときに同じ文字がもう一度入る。
 *
 * そこで、自分がこれから URL へ書こうとしている値を expected に控えておき、
 * URL がそれに追いつくまでは URL を見ない。こうすると自分の replace で入力欄が戻ることがなくなり、
 * 戻る・進む（＝自分が書いた覚えのない URL 変化）のときだけ入力欄を合わせられる。
 *
 * @param basePath  書き出し先のパス（例 "/qa"）
 * @param key       クエリパラメーターの名前
 * @param delayMs   手が止まったと見なすまでの時間
 * @returns value=入力欄に渡す値 / setValue=入力欄からの更新 / debounced=API・絞り込みに渡す値
 */
export function useQuerySearch(basePath: string, key = "q", delayMs = 300) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlValue = searchParams.get(key) ?? "";

  const [value, setValue] = useState(urlValue);
  // これから URL へ書く値。URL がここに追いつくまで、URL からの書き戻しはしない。
  const expected = useRef(urlValue);
  // replace を投げてから URL に反映されるまでの「待ち」。この間は URL を無視する。
  const pending = useRef(false);
  // 他のパラメーター（book など）を消さないよう最新を見たいが、
  // 依存に入れると URL が変わるたび書き出しが再発火してしまうので ref で持つ。
  const paramsRef = useRef(searchParams);
  useEffect(() => {
    paramsRef.current = searchParams;
  }, [searchParams]);

  // 書き出しは手が止まってから。判定と書き込みで同じ value を使う（食い違うと書き出しが延々と繰り返される）。
  useEffect(() => {
    if (value === expected.current) return;
    const timer = window.setTimeout(() => {
      expected.current = value;
      pending.current = true;
      const params = new URLSearchParams(paramsRef.current.toString());
      if (value) params.set(key, value);
      else params.delete(key);
      const query = params.toString();
      router.replace(query ? `${basePath}?${query}` : basePath, { scroll: false });
    }, delayMs);
    return () => window.clearTimeout(timer);
  }, [value, key, basePath, delayMs, router]);

  // 読み戻すのは戻る・進むのときだけ。
  useEffect(() => {
    if (urlValue === expected.current) {
      pending.current = false;
      return;
    }
    if (pending.current) return; // 自分が書いた URL の到着待ち
    expected.current = urlValue;
    // ブラウザーの戻る・進むで URL が変わったときだけ入力欄を合わせる。
    setValue(urlValue);
  }, [urlValue]);

  return { value, setValue, debounced: useDebouncedValue(value, delayMs) };
}
