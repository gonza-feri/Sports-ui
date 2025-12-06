/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { JSX, useEffect, useRef, useState } from "react";
import "./LanguageSwitcher.css";
import { useI18n } from "../i18n/I18nProvider";

type LangCode = "en" | "es" | "sl";

const FLAGS: Record<LangCode, JSX.Element> = {
  en: (
    <svg viewBox="0 0 60 40" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <rect width="60" height="40" fill="#012169" />
      <path d="M0 0 L60 40 M60 0 L0 40" stroke="#fff" strokeWidth="6" />
      <rect x="25" width="10" height="40" fill="#c8102e" />
      <rect y="15" width="60" height="10" fill="#c8102e" />
    </svg>
  ),
  es: (
    <svg viewBox="0 0 60 40" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <rect width="60" height="40" fill="#c60b1e" />
      <rect y="10" width="60" height="20" fill="#ffcc00" />
    </svg>
  ),
  sl: (
    <svg viewBox="0 0 60 40" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <rect width="60" height="40" fill="#fff" />
      <rect y="13" width="60" height="14" fill="#0057b8" />
      <rect y="27" width="60" height="13" fill="#d52b1e" />
    </svg>
  ),
};

export default function LanguageSwitcher(): JSX.Element {
  const i18n = useI18n() as { lang?: string; setLang?: (l: string) => void } | any;
  const lang = i18n?.lang ?? "en";
  const setLang = i18n?.setLang;

  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  const current = (lang === "es" || lang === "sl") ? (lang as LangCode) : "en";

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  // debug: si no abre, mira la consola para ver estos logs
  useEffect(() => {
    console.debug("[LanguageSwitcher] mounted, current lang:", lang);
  }, [lang]);

  const handleSelect = (code: LangCode) => {
    setOpen(false);
    if (typeof setLang === "function") {
      setLang(code);
      return;
    }
    window.dispatchEvent(new CustomEvent("app:setLang", { detail: { lang: code } }));
  };

  const others: LangCode[] = (["en", "es", "sl"] as LangCode[]).filter((c) => c !== current);

  return (
    <div
      ref={ref}
      className={`language-switcher ${open ? "open" : ""}`}
      aria-hidden={false}
      data-current={current}
    >
      <button
        type="button"
        className="ls-btn ls-main"
        onClick={(e) => {
          e.stopPropagation();
          console.debug("[LanguageSwitcher] main clicked, open before:", open);
          setOpen((s) => {
            const next = !s;
            console.debug("[LanguageSwitcher] toggling open ->", next);
            return next;
          });
        }}
        aria-label="Cambiar idioma"
        title={current.toUpperCase()}
      >
        <span className="ls-flag">{FLAGS[current]}</span>
      </button>

      <div className="ls-popover" role="menu" aria-hidden={!open}>
        {others.map((c) => (
          <button
            key={c}
            type="button"
            className="ls-btn ls-option"
            onClick={(e) => {
              e.stopPropagation();
              console.debug("[LanguageSwitcher] option clicked:", c);
              handleSelect(c);
            }}
            aria-label={`Cambiar a ${c}`}
            title={c.toUpperCase()}
          >
            <span className="ls-flag">{FLAGS[c]}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
