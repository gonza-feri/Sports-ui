import React, { JSX, useEffect, useRef, useState } from "react";
import "./LanguageSwitcher.css";
import { useI18n } from "../i18n/I18nProvider";

type LangCode = "en" | "es" | "sl";

/* SVG inline: no dependemos de archivos en public */
const FLAG_SVG: Record<LangCode, string> = {
  en: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 40">
        <rect width="60" height="40" fill="#012169"/>
        <path d="M0 0 L60 40 M60 0 L0 40" stroke="#fff" stroke-width="6"/>
        <rect x="25" width="10" height="40" fill="#c8102e"/>
        <rect y="15" width="60" height="10" fill="#c8102e"/>
      </svg>`,
  es: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 40">
        <rect width="60" height="40" fill="#c60b1e"/>
        <rect y="10" width="60" height="20" fill="#ffcc00"/>
      </svg>`,
  sl: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 40">
        <rect width="60" height="40" fill="#fff"/>
        <rect y="13" width="60" height="14" fill="#0057b8"/>
        <rect y="27" width="60" height="13" fill="#d52b1e"/>
      </svg>`,
};

function svgToDataUrl(svg: string) {
  return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
}

const FLAGS: Record<LangCode, string> = {
  en: svgToDataUrl(FLAG_SVG.en),
  es: svgToDataUrl(FLAG_SVG.es),
  sl: svgToDataUrl(FLAG_SVG.sl),
};

export default function LanguageSwitcher(): JSX.Element {
  // Usamos tu I18nProvider (lang, setLang) para mantener todo sincronizado
  const { lang, setLang } = useI18n();

  // Normaliza por si alguna vez llega "es-ES" o similar (no debería con tu provider)
  const normalized: LangCode = (["en", "es", "sl"].includes(lang) ? lang : "en") as LangCode;

  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  const current: LangCode = normalized;
  const options: LangCode[] = (["en", "es", "sl"] as LangCode[]).filter((c) => c !== current);

  const handleChangeLanguage = (lng: LangCode) => {
    if (lng === current) {
      setOpen(false);
      return;
    }
    setLang(lng);
    setOpen(false);
  };

  // Cerrar al hacer click fuera
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  return (
    <div ref={ref} className="lang-switcher">
      <img
        src={FLAGS[current]}
        className="lang-current-flag"
        alt={current}
        onClick={() => setOpen((s) => !s)}
      />

      {open && options.length > 0 && (
        <div className="lang-dropdown" role="menu" aria-label="Language options">
          {options.map((code) => (
            <button
              key={code}
              type="button"
              className="lang-option"
              role="menuitem"
              onClick={() => handleChangeLanguage(code)}
              aria-label={`Change language to ${code}`}
              title={code.toUpperCase()}
            >
              <img src={FLAGS[code]} className="lang-flag" alt={code} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
