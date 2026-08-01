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

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("ja");

  useEffect(() => {
    const saved = localStorage.getItem("lang") as Lang | null;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (saved === "en" || saved === "ja") setLangState(saved);
  }, []);

  // ページの言語表示を実際の表示言語に合わせる。
  // <html lang> は "ja" 固定だったため、英語表示にしても読み上げソフトが
  // 日本語の発音で読んでしまっていた。
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    localStorage.setItem("lang", l);
  }, []);

  // 毎回新しいオブジェクトを渡すと、useLang を使う全画面が無関係な再描画に巻き込まれる。
  const value = useMemo(() => ({ lang, setLang }), [lang, setLang]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLang() {
  return useContext(LanguageContext);
}
