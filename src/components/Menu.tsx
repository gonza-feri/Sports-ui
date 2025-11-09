import { Link } from "react-router-dom";
import logo from "../assets/logo-dl.png";

export default function Menu() {
  return (
    <header className="app-header">
      <Link to="/" className="logo-link">
        <img src={logo} alt="Dream League logo" className="logo-img" />
        <h1>Dream League</h1>
      </Link>
    </header>
  );
}
