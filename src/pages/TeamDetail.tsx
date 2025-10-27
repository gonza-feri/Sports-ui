import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../services/api";
import type { Player, Team } from "../types/types";
import Warning from "../components/Warning";
import Info from "../components/Info";
import AddPlayerForm from "../components/AddPlayerForm";
import EditPlayerForm from "../components/EditPlayerForm";

export default function TeamDetail() {
  const { id } = useParams<{ id: string }>();
  const [team, setTeam] = useState<Team | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);

  useEffect(() => {
    if (!id) return;

    const fetchTeamAndPlayers = async () => {
      try {
        const teamRes = await api.get(`/teams/${id}`);
        const playersRes = await api.get(`/players?teamId=${id}`);
        setTeam(teamRes.data);
        setPlayers(playersRes.data);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching team or players:", error);
        setLoading(false);
      }
    };

    fetchTeamAndPlayers();
  }, [id]);

  if (loading) return <p>Loading team details...</p>;
  if (!team) return <p>Team not found.</p>;

  return (
    <section>
      <h2>{team.name}</h2>
      <p>Players: {players.length}</p>

      {players.length < 11 ? <Warning /> : <Info />}
      <AddPlayerForm
        teamId={team.id}
        onPlayerAdded={(newPlayer) => setPlayers([...players, newPlayer])}
      />
      <ul>
        {players.map(player => (
          <li key={player.id}>
            #{player.number} {player.name} – {player.position}
            <button onClick={() => setEditingPlayer(player)}>Edit</button>
            <button onClick={async () => {
              await api.delete(`/players/${player.id}`);
              setPlayers(players.filter(p => p.id !== player.id));
            }}>Delete</button>
          </li>
        ))}
        {editingPlayer && (
          <EditPlayerForm
            player={editingPlayer}
            onPlayerUpdated={(updated) => {
              setPlayers(players.map(p => p.id === updated.id ? updated : p));
              setEditingPlayer(null);
            }}
            onCancel={() => setEditingPlayer(null)}
          />
        )}
      </ul>
    </section>
  );
}