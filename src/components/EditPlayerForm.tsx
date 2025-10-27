import { useState } from "react";
import api from "../services/api";
import type { Player } from "../types/types";

interface Props {
  player: Player;
  onPlayerUpdated: (player: Player) => void;
  onCancel: () => void;
}

export default function EditPlayerForm({ player, onPlayerUpdated, onCancel }: Props) {
  const [name, setName] = useState(player.name);
  const [position, setPosition] = useState(player.position);
  const [number, setNumber] = useState(player.number.toString());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.put(`/players/${player.id}`, {
        ...player,
        name,
        position,
        number: parseInt(number, 10),
      });
      onPlayerUpdated(res.data);
    } catch (error) {
      console.error("Error updating player:", error);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input value={name} onChange={(e) => setName(e.target.value)} />
      <input value={position} onChange={(e) => setPosition(e.target.value)} />
      <input value={number} onChange={(e) => setNumber(e.target.value)} />
      <button type="submit">Save</button>
      <button type="button" onClick={onCancel}>Cancel</button>
    </form>
  );
}
