// src/components/Menu.tsx
import { useI18n } from "../i18n/I18nProvider";
import { useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import logo from "../assets/logo-dl.png";
import LanguageSwitcher from "./LanguageSwitcher";

export default function Menu() {
  const { t } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();
  const isTeamsAdd = location.pathname.startsWith("/teams/add");

  const [showHeader] = useState(true);

  /**
   * Calculate how much space the menu takes up so that you can retransmit it.
   */
  useEffect(() => {
    const headerEl = document.querySelector(".app-header") as HTMLElement | null;
    const updateOffset = () => {
      if (headerEl) {
        const height = headerEl.offsetHeight;
        document.documentElement.style.setProperty("--top-offset", `${height}px`);
      }
    };
    updateOffset();
    window.addEventListener("resize", updateOffset);
    return () => window.removeEventListener("resize", updateOffset);
  }, []);

  /**
   * Generic function to confirm output of links such as forms from /teams/add/
   * @param e
   * @param path 
   */
  const handleNavClick = (e: React.MouseEvent, path: string) => {
    e.preventDefault();
    if (isTeamsAdd) {
      const confirmLeave = window.confirm(
        t("return_confirm")
      );
      if (confirmLeave) navigate(path);
    } else {
      navigate(path);
    }
  };

  return (
    <header className={`app-header ${showHeader ? "visible" : "hidden"}`}>
      {/* Logo + título como enlace */}
      <div className="logo-area">
        <a href="/" onClick={(e) => handleNavClick(e, "/")} className="logo-link">
          <img src={logo} alt="Dream League logo" className="logo-img" />
          <h1>Dream League</h1>
        </a>
      </div>

      {/* Navegación */}
      <nav className="nav-text">
        {/* Selector de idioma (a la izquierda de Home) */}
        <div className="nav-item" style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <LanguageSwitcher />
        </div>

        <a
          href="/"
          onClick={(e) => handleNavClick(e, "/")}
          className={
            isTeamsAdd ? "nav-item inactive" : location.pathname === "/" ? "nav-item active" : "nav-item inactive"
          }
        >
          {t("home")}
        </a>

        <a
          href="/teams"
          onClick={(e) => handleNavClick(e, "/teams")}
          className={
            isTeamsAdd
              ? "nav-item inactive"
              : location.pathname.startsWith("/teams")
              ? "nav-item active"
              : "nav-item inactive"
          }
        >
          {t("teams")}
        </a>
      </nav>
    </header>
  );
}
