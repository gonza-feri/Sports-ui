import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import type { Team, Player } from "../types/types";
import AddTeamForm from "../components/AddTeamForm";
import EditTeamForm from "../components/EditTeamForm";
import Menu from "../components/Menu";
import FloatingButton from "../components/FloatingButton";

export default function TeamList() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    api.get("/teams").then(res => setTeams(res.data));
    api.get("/players").then(res => setPlayers(res.data));
  }, []);

  return (
  <section>
    <Menu />

    {showForm && (
      <div className="card form-card">
        <AddTeamForm
          onTeamAdded={(newTeam) => {
            setTeams([...teams, newTeam]);
            setShowForm(false); // opcional: cerrar tras añadir
          }}
        />
      </div>
    )}
      <ul className="team-list">
        {teams.map(team => (
          <li key={team.id} className="team-card">
            {editingTeam?.id === team.id ? (
              <div className="card-content">
                <EditTeamForm
                  team={team}
                  onTeamUpdated={(updated) => {
                    setTeams(teams.map(t => t.id === updated.id ? updated : t));
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
                  <button
                    className="btn btn--secondary"
                    onClick={() => setEditingTeam(team)}
                  >
                    Edit
                  </button>

                  <button
                    className="btn btn--danger"
                    onClick={async () => {
                      if (window.confirm("Are you sure you want to delete this team?")) {
                        try {
                          await Promise.all(
                            players
                              .filter(p => p.teamId === team.id)
                              .map(p => api.delete(`/players/${p.id}`))
                          );
                          await api.delete(`/teams/${team.id}`);
                          setTeams(teams.filter(t => t.id !== team.id));
                          setPlayers(players.filter(p => p.teamId !== team.id));
                        } catch (error) {
                          console.error("Error deleting team:", error);
                        }
                      }
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
      <FloatingButton />
    </section>
  );
}
