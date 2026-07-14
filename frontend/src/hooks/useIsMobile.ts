"use client";

import { useEffect, useState } from "react";

/**
 * 画面幅が狭い（スマホ相当）かどうかを返す。
 * ボード表示をスマホではタブ切り替えに、PCでは横並びのまま出し分けるのに使う。
 * SSR では false（PC 表示）で描画し、マウント後に実際の画面幅で判定し直す。
 */
export function useIsMobile(maxWidth = 640): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia(`(max-width: ${maxWidth}px)`);
    const update = () => setIsMobile(mq.matches);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [maxWidth]);

  return isMobile;
}
