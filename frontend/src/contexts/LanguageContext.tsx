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

export function LanguageProvider({ children, initialLang = "ja" }: { children: ReactNode; initialLang?: Lang }) {
  const [lang, setLangState] = useState<Lang>(initialLang);

  useEffect(() => {
    const saved = localStorage.getItem("lang") as Lang | null;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (saved === "en" || saved === "ja") setLangState(saved);
  }, []);

  // ページの言語表示を実際の表示言語に合わせ、サーバー側にも Cookie で伝える。
  useEffect(() => {
    document.documentElement.lang = lang;
    document.cookie = `neon_lang=${lang}; Path=/; Max-Age=31536000; SameSite=Lax`;
  }, [lang]);

  // useMemo で包む value の中身なので、毎回作り直さないよう useCallback で固定する。
  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    localStorage.setItem("lang", l);
    document.documentElement.lang = l;
    document.cookie = `neon_lang=${l}; Path=/; Max-Age=31536000; SameSite=Lax`;
  }, []);

  // 毎回新しいオブジェクトを渡すと、useLang を使う全画面が無関係な再描画に巻き込まれる。
  const value = useMemo(() => ({ lang, setLang }), [lang, setLang]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLang() {
  return useContext(LanguageContext);
}
