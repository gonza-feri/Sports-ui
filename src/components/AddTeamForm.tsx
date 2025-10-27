import { useState } from "react";
import api from "../services/api";
import type { Team } from "../types/types";

interface Props {
  onTeamAdded: (team: Team) => void;
}

export default function AddTeamForm({ onTeamAdded }: Props) {
  const [name, setName] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      const res = await api.post("/teams", { name });
      onTeamAdded(res.data);
      setName("");
    } catch (error) {
      console.error("Error adding team:", error);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Team name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <button type="submit">Add Team</button>
    </form>
  );
}
