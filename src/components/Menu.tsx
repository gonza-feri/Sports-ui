import { NavLink } from "react-router-dom";
import logo from "../assets/logo-dl.png";

export default function Menu() {
  return (
    <header className="app-header">
      {/* Logo + título */}
      <div className="logo-area">
        <img src={logo} alt="Dream League logo" className="logo-img" />
        <h1>Dream League</h1>
      </div>

      {/* Navegación */}
      <nav className="nav-text">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            isActive ? "nav-item active" : "nav-item inactive"
          }
        >
          Home
        </NavLink>
        <NavLink
          to="/teams"
          className={({ isActive }) =>
            isActive ? "nav-item active" : "nav-item inactive"
          }
        >
          Teams
        </NavLink>
      </nav>
    </header>
  );
}
