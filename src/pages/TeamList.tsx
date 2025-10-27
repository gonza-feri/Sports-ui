import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import type { Team, Player } from "../types/types";
import AddTeamForm from "../components/AddTeamForm";
import EditTeamForm from "../components/EditTeamForm";

export default function TeamList() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);

  useEffect(() => {
    api.get("/teams").then(res => setTeams(res.data));
    api.get("/players").then(res => setPlayers(res.data));
  }, []);

  return (
    <section>
      <h2>Teams</h2>

      <AddTeamForm onTeamAdded={(newTeam) => setTeams([...teams, newTeam])} />

      <ul>
        {teams.map(team => (
          <li key={team.id}>
            {editingTeam?.id === team.id ? (
              <EditTeamForm
                team={team}
                onTeamUpdated={(updated) => {
                  setTeams(teams.map(t => t.id === updated.id ? updated : t));
                  setEditingTeam(null);
                }}
                onCancel={() => setEditingTeam(null)}
              />
            ) : (
              <>
                <Link to={`/teams/${team.id}`}>{team.name}</Link>
                <button onClick={() => setEditingTeam(team)}>Edit</button>
                <button
                  onClick={async () => {
                    if (window.confirm("Are you sure you want to delete this team?")) {
                      try {
                        // 1. Delete players of this team
                        await Promise.all(
                          players
                            .filter(p => p.teamId === team.id)
                            .map(p => api.delete(`/players/${p.id}`))
                        );

                        // 2. Delete the team
                        await api.delete(`/teams/${team.id}`);

                        // 3. Update state
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
              </>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
