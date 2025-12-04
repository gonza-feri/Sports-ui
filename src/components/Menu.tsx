import { useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import logo from "../assets/logo-dl.png";

export default function Menu() {
  const location = useLocation();
  const navigate = useNavigate();
  const isTeamsAdd = location.pathname.startsWith("/teams/add");

  // 👇 estado para mostrar/ocultar el header
  const [showHeader, ] = useState(true);

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

  // 👇 función genérica para confirmar salida
  const handleNavClick = (e: React.MouseEvent, path: string) => {
    e.preventDefault();
    if (isTeamsAdd) {
      const confirmLeave = window.confirm(
        "If you return, you will lose any unsaved changes. Do you want to continue?"
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
        <a
          href="/"
          onClick={(e) => handleNavClick(e, "/")}
          className={
            isTeamsAdd
              ? "nav-item inactive"
              : location.pathname === "/"
              ? "nav-item active"
              : "nav-item inactive"
          }
        >
          Home
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
          Teams
        </a>
      </nav>
    </header>
  );
}