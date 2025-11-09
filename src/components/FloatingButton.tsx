import { Link } from "react-router-dom";

export default function FloatingButton() {
  return (
    <Link to="/teams/add" className="floating-btn">
      +
    </Link>
  );
}
