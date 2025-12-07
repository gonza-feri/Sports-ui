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
        <!-- franjas -->
        <rect width="60" height="13.333" y="0" fill="#fff"/>
        <rect width="60" height="13.333" y="13.333" fill="#0057b8"/>
        <rect width="60" height="13.334" y="26.666" fill="#d52b1e"/>
        <!-- escudo simplificado en el cantón -->
        <g transform="translate(6,6)">
          <!-- escudo fondo -->
          <path d="M0 0 h12 a6 6 0 0 1 6 6 v8 a6 6 0 0 1 -6 6 h-12 z" fill="#003f87" stroke="#000" stroke-width="0.3"/>
          <!-- Monte Triglav (estilizado) -->
          <path d="M2.2 12 L6 5 L9.8 12 L8.6 12 L6 8.6 L3.4 12 Z" fill="#fff"/>
          <!-- ondas (ríos) -->
          <path d="M2 16 q2 -1 4 0 t4 0" stroke="#fff" stroke-width="0.9" fill="none" stroke-linecap="round"/>
          <!-- tres estrellas (amarillas) -->
          <g fill="#ffd24d">
            <polygon points="6 1.2 6.6 2.6 8.1 2.6 6.9 3.6 7.4 5 6 4 4.6 5 5.1 3.6 3.9 2.6 5.4 2.6"/>
            <polygon points="3 2.2 3.6 3.6 5.1 3.6 3.9 4.6 4.4 6 3 5 1.6 6 2.1 4.6 0.9 3.6 2.4 3.6"/>
            <polygon points="9 2.2 9.6 3.6 11.1 3.6 9.9 4.6 10.4 6 9 5 7.6 6 8.1 4.6 6.9 3.6 8.4 3.6"/>
          </g>
        </g>
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
