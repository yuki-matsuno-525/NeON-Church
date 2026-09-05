"use client";

import { useCallback, useRef } from "react";

/**
 * 読書画面の上に貼り付く帯の高さを測って、CSS の --reader-header-height に入れる。
 *
 * 右に開くコメント欄は、この値のぶんだけ下げた位置に貼り付く。そうしないと帯と
 * コメント欄がどちらも上部バーのすぐ下に貼り付き、重なって読めなくなる。
 *
 * 帯の高さは中身（書名の長さ・訳の切り替えの有無・画面幅）で変わるので、決め打ちに
 * せず実際の高さを測る。返ってきた値を帯の ref に渡すだけでよい。
 */
export function useReaderHeaderHeight() {
  const observer = useRef<ResizeObserver | null>(null);

  // ref を関数で受け取るのは、帯が読み込みのあとに現れる画面（翻訳プロジェクト）でも
  // 現れた時点で測れるようにするため。外れるときは null で呼ばれる。
  return useCallback((el: HTMLElement | null) => {
    const root = document.documentElement;
    observer.current?.disconnect();
    observer.current = null;
    if (!el) {
      // 読書画面を離れたら、他の画面に値を持ち越さないよう片付ける。
      root.style.removeProperty("--reader-header-height");
      return;
    }
    const apply = () => root.style.setProperty("--reader-header-height", `${el.offsetHeight}px`);
    apply();
    // 帯の高さが変わったとき（画面の回転、訳名の長い言語への切り替えなど）に測り直す。
    if (typeof ResizeObserver === "undefined") return;
    observer.current = new ResizeObserver(apply);
    observer.current.observe(el);
  }, []);
}
