import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";
import type { Team, Player } from "../types/types";
import Menu from "../components/Menu";
import FloatingButton from "../components/FloatingButton";

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [openMenu, setOpenMenu] = useState<number | null>(null);
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const menuElements = document.querySelectorAll(".menu-dropdown");
      const clickedInsideMenu = Array.from(menuElements).some(el => el.contains(e.target as Node));
      if (!clickedInsideMenu) {
        setOpenMenu(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      const [teamsRes, playersRes] = await Promise.all([api.get("/teams"), api.get("/players")]);
      setTeams(teamsRes.data);
      setPlayers(playersRes.data);
    };
    load();
  }, []);

  const handleEdit = (teamId: number) => {
    navigate(`/teams/add/${String(teamId)}`);
  };

  const handleOpen = (teamId: number) => {
    navigate(`/teams/${String(teamId)}`);
  };

  const deleteTeamCascade = async (team: Team) => {
    if (!window.confirm("Are you sure you want to delete this team?")) return;
    try {
      const relatedPlayers = players.filter((p) => p.teamId !== undefined && p.teamId === team.id);
      await Promise.all(relatedPlayers.map((p) => api.delete(`/players/${p.id}`)));
      await api.delete(`/teams/${team.id}`);
      setTeams((prev) => prev.filter((t) => t.id !== team.id));
      setPlayers((prev) => prev.filter((p) => p.teamId !== team.id));
    } catch (error) {
      console.error("Error deleting team:", error);
      alert("No se pudo borrar el equipo. Revisa el servidor o la consola.");
    }
  };

  return (
    <section className="teams-page">
      <Menu />

      <div className="teams-header">
        <h2>Teams</h2>
      </div>

      <ul className="team-list">
        {teams.map((team) => (
          <li key={team.id} className={`team-card ${openMenu === team.id ? "menu-open" : ""}`}>
            <div className="card-content team-row">
              {team.logo && (
                <img src={team.logo} alt={`${team.name} logo`} className="team-logo" />
              )}
              <Link to={`/teams/${String(team.id)}`} className="team-link">
                <span className="team-name">{team.name}</span>
              </Link>

              <div className="team-actions">
                <button
                  className="menu-button"
                  onClick={() =>
                    setOpenMenu(prev => (prev === team.id ? null : team.id))
                  }
                  aria-label="Open actions"
                >
                  ⋮
                </button>

                {openMenu === team.id && (
                  <div className="menu-dropdown">
                    <button className="menu-item" onClick={() => handleOpen(team.id)}>
                      Open team
                    </button>
                    <button className="menu-item" onClick={() => handleEdit(team.id)}>
                      Edit
                    </button>
                    <button className="menu-item" onClick={() => deleteTeamCascade(team)}>
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>

      <FloatingButton onClick={() => navigate("/teams/add")} />
    </section>
  );
}
