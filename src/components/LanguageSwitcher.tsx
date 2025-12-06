import React from "react";
import { useI18n } from "../i18n/I18nProvider";
import "./LanguageSwitcher.css";

const LANGS = [
  { code: "en", flag: "🇬🇧", label: "English" },
  { code: "es", flag: "🇪🇸", label: "Español" },
  { code: "sl", flag: "🇸🇮", label: "Slovenščina" },
];

export default function LanguageSwitcher() {
  const { lang, setLang } = useI18n();
  return (
    <div className="lang-switcher" aria-label="Language selector">
      {LANGS.map(l => (
        <button key={l.code} className={`lang-btn ${lang===l.code ? "active":""}`} onClick={() => setLang(l.code)} title={l.label} aria-pressed={lang===l.code}>
          <span aria-hidden>{l.flag}</span>
        </button>
      ))}
    </div>
  );
}
