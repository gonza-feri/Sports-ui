import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import type { Team } from "../types/types";
import AddTeamForm from "../components/AddTeamForm";

export default function TeamList() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/teams")
      .then(response => {
        setTeams(response.data);
        setLoading(false);
      })
      .catch(error => {
        console.error("Error fetching teams:", error);
        setLoading(false);
      });
  }, []);

  if (loading) return <p>Loading teams...</p>;

  return (
    <section>
      <h2>Teams</h2>
      <AddTeamForm onTeamAdded={(newTeam) => setTeams([...teams, newTeam])} />
      <ul>
        {teams.map(team => (
          <li key={team.id}>
            <Link to={`/teams/${team.id}`}>{team.name}</Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
