"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useEffect,
  type ReactNode,
} from "react";

export type Lang = "ja" | "en";

type LanguageContextType = {
  lang: Lang;
  setLang: (lang: Lang) => void;
};

const LanguageContext = createContext<LanguageContextType>({
  lang: "ja",
  setLang: () => {},
});

// 表示言語の保存先は Cookie（neon_lang）だけ。サーバー側も同じ Cookie を読むので
// （lib/serverLanguage.ts）、サーバーが描いた文字とブラウザの表示が食い違わない。
function writeLangCookie(lang: Lang) {
  document.documentElement.lang = lang;
  document.cookie = `neon_lang=${lang}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

export function LanguageProvider({ children, initialLang = "ja" }: { children: ReactNode; initialLang?: Lang }) {
  // initialLang はサーバーが Cookie から読んだ値。ここが表示言語の出発点になる。
  const [lang, setLangState] = useState<Lang>(initialLang);

  // 訪問のたびに Cookie の期限を1年先へ延ばす（切替なしで1年経つと消えてしまうため）。
  useEffect(() => {
    writeLangCookie(lang);
  }, [lang]);

  // useMemo で包む value の中身なので、毎回作り直さないよう useCallback で固定する。
  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    writeLangCookie(l);
  }, []);

  // 毎回新しいオブジェクトを渡すと、useLang を使う全画面が無関係な再描画に巻き込まれる。
  const value = useMemo(() => ({ lang, setLang }), [lang, setLang]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLang() {
  return useContext(LanguageContext);
}
