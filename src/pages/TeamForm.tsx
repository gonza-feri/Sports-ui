import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import type { Player, Team } from "../types/types";

export default function TeamForm({ mode }: { mode: "add" | "edit" }) {
  const navigate = useNavigate();
  const { id } = useParams();
  const [team, setTeam] = useState<Team>({
    id: 0,
    name: "",
    description: "",
    logo: "",
    players: [],
  });

  useEffect(() => {
    if (mode === "edit" && id) {
      axios.get(`http://localhost:3000/teams/${id}`).then((res) => setTeam(res.data as Team));
    }
  }, [mode, id]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setTeam({ ...team, [e.target.name]: e.target.value });
  };

  const handlePlayerChange = (index: number, field: keyof Player, value: string) => {
    const updated = [...(team.players || [])];
    updated[index] = { ...updated[index], [field]: value };
    setTeam({ ...team, players: updated });
  };

  const addPlayer = () => {
    setTeam({
      ...team,
      players: [...(team.players || []), { name: "", number: "", position: "", image: "" }],
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "add") {
      await axios.post("http://localhost:3000/teams", {
        name: team.name,
        description: team.description,
        logo: team.logo,
        players: team.players || [],
      });
    } else if (mode === "edit" && id) {
      await axios.put(`http://localhost:3000/teams/${id}`, team);
    }
    navigate("/teams");
  };

  return (
    <form onSubmit={handleSubmit} className="team-form">
      <h2>{mode === "add" ? "Add Team" : "Edit Team"}</h2>

      <input
        type="text"
        name="name"
        placeholder="Team Name"
        value={team.name}
        onChange={handleChange}
        required
      />

      <textarea
        name="description"
        placeholder="Description"
        value={team.description || ""}
        onChange={handleChange}
      />

      <input
        type="text"
        name="logo"
        placeholder="Logo URL"
        value={team.logo || ""}
        onChange={handleChange}
      />

      <h3>Players</h3>
      {(team.players || []).map((player, index) => (
        <div key={index} className="player-form">
          <input
            type="text"
            placeholder="Name"
            value={player.name}
            onChange={(e) => handlePlayerChange(index, "name", e.target.value)}
          />
          <input
            type="text"
            placeholder="Number"
            value={player.number}
            onChange={(e) => handlePlayerChange(index, "number", e.target.value)}
          />
          <input
            type="text"
            placeholder="Position"
            value={player.position}
            onChange={(e) => handlePlayerChange(index, "position", e.target.value)}
          />
          <input
            type="text"
            placeholder="Image URL"
            value={player.image}
            onChange={(e) => handlePlayerChange(index, "image", e.target.value)}
          />
        </div>
      ))}
      <button type="button" onClick={addPlayer}>+ Add Player</button>

      <button type="submit">{mode === "add" ? "Save Team" : "Update Team"}</button>
    </form>
  );
}
