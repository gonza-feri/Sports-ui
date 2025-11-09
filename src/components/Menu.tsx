import { Link } from "react-router-dom";
import logo from "../assets/logo-dl.png";
import { NavLink } from "react-router-dom";

export default function Menu() {
  return (
    <header className="app-header">
      <Link to="/" className="logo-link">
        <img src={logo} alt="Dream League logo" className="logo-img" />
        <h1>Dream League</h1>
      </Link>
      <nav className="home-nav">
        <NavLink to="/" className={({ isActive }) => isActive ? "nav-btn active" : "nav-btn"}>Home</NavLink>
        <NavLink to="/teams" className={({ isActive }) => isActive ? "nav-btn active" : "nav-btn"}>Teams</NavLink>
      </nav>
    </header>
  );
}
