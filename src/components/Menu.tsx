import { Link } from "react-router-dom";

export default function Menu() {
  return (
    <header className="menu">
      <h1>Sports Manager</h1>
      <nav>
        <Link to="/">Teams</Link>
      </nav>
    </header>
  );
}