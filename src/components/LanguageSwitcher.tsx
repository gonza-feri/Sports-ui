/* src/components/LanguageSwitcher.tsx */
import React, { JSX, useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
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
  const { lang, setLang } = useI18n() as { lang: string; setLang: (l: string) => void };
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const [coords, setCoords] = useState<{ left: number; top: number; width: number } | null>(null);

  const current = (lang === "es" || lang === "sl") ? (lang as LangCode) : "en";
  const others: LangCode[] = (["en", "es", "sl"] as LangCode[]).filter((c) => c !== current);

  const updateCoords = () => {
    const btn = buttonRef.current;
    if (!btn) return setCoords(null);
    const rect = btn.getBoundingClientRect();
    setCoords({ left: rect.left + rect.width / 2, top: rect.top, width: rect.width });
  };

  useEffect(() => {
    if (open) updateCoords();
  }, [open]);

  useEffect(() => {
    const onResize = () => { if (open) updateCoords(); };
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
    };
  }, [open]);

  useEffect(() => {
    function onDocDown(e: MouseEvent) {
      const target = e.target as Node | null;
      if (!buttonRef.current) return;
      const pop = document.getElementById("ls-portal-popover");
      if (buttonRef.current.contains(target as Node)) return;
      if (pop && pop.contains(target as Node)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onDocDown, true);
    return () => document.removeEventListener("mousedown", onDocDown, true);
  }, []);

  const handleSelect = (code: LangCode) => {
    setOpen(false);
    setLang(code); // tu provider expone setLang, lo usamos directamente
  };

  const popover = open && coords ? ReactDOM.createPortal(
    <div
      id="ls-portal-popover"
      className="ls-portal"
      style={{
        position: "fixed",
        left: coords.left,
        top: coords.top - 8,
        transform: "translate(-50%, -100%)",
        zIndex: 2147483647,
        pointerEvents: "auto",
      }}
      role="menu"
      aria-hidden={!open}
    >
      <div className="ls-popover-portal">
        {others.map((c) => (
          <button
            key={c}
            type="button"
            className="ls-btn ls-option"
            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); handleSelect(c); }}
            aria-label={`Cambiar a ${c}`}
            title={c.toUpperCase()}
          >
            <span className="ls-flag">{FLAGS[c]}</span>
          </button>
        ))}
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <>
      <div className="language-switcher-inline" style={{ display: "inline-block" }}>
        <button
          ref={buttonRef}
          type="button"
          className="ls-btn ls-main"
          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); setOpen((s) => !s); }}
          aria-label="Cambiar idioma"
          title={current.toUpperCase()}
        >
          <span className="ls-flag">{FLAGS[current]}</span>
        </button>
      </div>

      {popover}
    </>
  );
}
