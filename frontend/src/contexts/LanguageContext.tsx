"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

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

  useEffect(() => {
    document.documentElement.lang = lang;
    document.cookie = `neon_lang=${lang}; Path=/; Max-Age=31536000; SameSite=Lax`;
  }, [lang]);

  const setLang = (l: Lang) => {
    setLangState(l);
    localStorage.setItem("lang", l);
    document.documentElement.lang = l;
    document.cookie = `neon_lang=${l}; Path=/; Max-Age=31536000; SameSite=Lax`;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLang() {
  return useContext(LanguageContext);
}
