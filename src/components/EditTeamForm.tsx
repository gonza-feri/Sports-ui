import { useState } from "react";
import api from "../services/api";
import type { Team } from "../types/types";

interface Props {
  team: Team;
  onTeamUpdated: (team: Team) => void;
  onCancel: () => void;
}

export default function EditTeamForm({ team, onTeamUpdated, onCancel }: Props) {
  const [name, setName] = useState(team.name);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.put(`/teams/${team.id}`, { ...team, name });
      onTeamUpdated(res.data);
    } catch (error) {
      console.error("Error updating team:", error);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: "inline" }}>
      <input value={name} onChange={(e) => setName(e.target.value)} />
      <button type="submit">Save</button>
      <button type="button" onClick={onCancel}>Cancel</button>
    </form>
  );
}
