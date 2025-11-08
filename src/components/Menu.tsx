import { Link } from "react-router-dom";

export default function Menu({ onToggleForm }: { onToggleForm: () => void }) {
  return (
    <header className="app-header">
      <h1>Dream League</h1>
      <div className="header-actions">
        <Link to="/teams" className="nav-btn">
          Teams
        </Link>
        <button className="btn btn--secondary" onClick={onToggleForm}>
          Añadir equipo
        </button>
      </div>
    </header>
  );
}
