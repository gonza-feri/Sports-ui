import { useState } from "react";
import api from "../services/api";
import type { Player } from "../types/types";

interface Props {
  teamId: number;
  onPlayerAdded: (player: Player) => void;
}

export default function AddPlayerForm({ teamId, onPlayerAdded }: Props) {
  const [name, setName] = useState("");
  const [position, setPosition] = useState("");
  const [number, setNumber] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !position.trim() || !number.trim()) return;

    try {
      const res = await api.post("/players", {
        teamId,
        name,
        position,
        number: parseInt(number, 10),
      });
      onPlayerAdded(res.data);
      setName("");
      setPosition("");
      setNumber("");
    } catch (error) {
      console.error("Error adding player:", error);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ marginBottom: "1rem" }}>
      <input
        type="text"
        placeholder="Player name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <input
        type="text"
        placeholder="Position"
        value={position}
        onChange={(e) => setPosition(e.target.value)}
      />
      <input
        type="number"
        placeholder="Number"
        value={number}
        onChange={(e) => setNumber(e.target.value)}
      />
      <button type="submit">Add Player</button>
    </form>
  );
}