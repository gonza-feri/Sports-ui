import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import en from "./locales/en.json";
import es from "./locales/es.json";
import sl from "./locales/sl.json";

const RES: Record<string, Record<string,string>> = { en, es, sl };
const STORAGE_KEY = "appLanguage";

type I18nContext = {
  lang: string;
  t: (k: string) => string;
  setLang: (l: string) => void;
};

const ctx = createContext<I18nContext>({ lang: "en", t: (k)=>k, setLang: ()=>{} });

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<string>(() => localStorage.getItem(STORAGE_KEY) || "en");
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, lang);
    try { document.documentElement.lang = lang; } catch { /* empty */ }
  }, [lang]);
  const t = useMemo(() => (key: string) => RES[lang]?.[key] ?? key, [lang]);
  const setLang = (l: string) => setLangState(l);
  return <ctx.Provider value={{ lang, t, setLang }}>{children}</ctx.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const useI18n = () => useContext(ctx);
