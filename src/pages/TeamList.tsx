import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";
import type { Team, Player } from "../types/types";
import AddTeamForm from "../components/AddTeamForm";
import EditTeamForm from "../components/EditTeamForm";
// Si Menu ya está en App.tsx, puedes quitar este import y el <Menu />
import Menu from "../components/Menu";
import FloatingButton from "../components/FloatingButton";

export default function TeamList() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [showForm, setShowForm] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      const [teamsRes, playersRes] = await Promise.all([
        api.get("/teams"),
        api.get("/players"),
      ]);
      setTeams(teamsRes.data);
      setPlayers(playersRes.data);
    };
    load();
  }, []);

  const deleteTeamCascade = async (team: Team) => {
    if (!window.confirm("Are you sure you want to delete this team?")) return;

    try {
      // Jugadores relacionados por teamId (si existe)
      const relatedPlayers = players.filter(
        (p) => p.teamId !== undefined && p.teamId === team.id
      );

      // Borra jugadores primero
      await Promise.all(
        relatedPlayers.map((p) => api.delete(`/players/${p.id}`))
      );

      // Borra el equipo
      await api.delete(`/teams/${team.id}`);

      // Actualiza estado local
      setTeams((prev) => prev.filter((t) => t.id !== team.id));
      setPlayers((prev) => prev.filter((p) => p.teamId !== team.id));
    } catch (error) {
      console.error("Error deleting team:", error);
      alert("No se pudo borrar el equipo. Revisa el servidor o la consola.");
    }
  };

  return (
    <section className="teams-page">
      {/* Quita <Menu /> si ya lo montas en App */}
      <Menu />

      {showForm && (
        <div className="card form-card">
          <AddTeamForm
            onTeamAdded={(newTeam) => {
              setTeams((prev) => [...prev, newTeam]);
              setShowForm(false);
            }}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      <div className="teams-header">
        <h2>Teams</h2>
        {/* Si no usas AddTeamForm modal, navega al formulario de ruta */}
      </div>

      <ul className="team-list">
        {teams.map((team) => (
          <li key={team.id} className="team-card">
            {editingTeam?.id === team.id ? (
              <div className="card-content">
                <EditTeamForm
                  team={team}
                  onTeamUpdated={(updated) => {
                    setTeams((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
                    setEditingTeam(null);
                  }}
                  onCancel={() => setEditingTeam(null)}
                />
              </div>
            ) : (
              <div className="card-content">
                <Link to={`/teams/${team.id}`} className="team-link">
                  <span className="team-name">{team.name}</span>
                </Link>

                <div className="actions">
                  <button className="btn btn--secondary" onClick={() => setEditingTeam(team)}>
                    Edit
                  </button>

                  <button className="btn btn--danger" onClick={() => deleteTeamCascade(team)}>
                    Delete
                  </button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>

      {/* Si FloatingButton no navega aún, dale comportamiento */}
        <FloatingButton onClick={() => navigate("/teams/add")} />
    </section>
  );
}
