import { useState } from "react";
import api from "../services/api";
import type { Team } from "../types/types";

type AddTeamFormProps = {
  onTeamAdded: (newTeam: Team) => void;
  onCancel?: () => void;
};

export default function AddTeamForm({ onTeamAdded, onCancel }: AddTeamFormProps) {
  const [team, setTeam] = useState<Omit<Team, "id">>({
    name: "",
    description: "",
    logo: "",
    players: [],
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setTeam({ ...team, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post("/teams", team);
      const createdTeam: Team = res.data;
      onTeamAdded(createdTeam);
    } catch (err) {
      console.error("Error creando equipo:", err);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
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
        value={team.description}
        onChange={handleChange}
      />
      <input
        type="text"
        name="logo"
        placeholder="Logo URL"
        value={team.logo}
        onChange={handleChange}
      />

      <button type="submit">Save</button>
      {onCancel && (
        <button type="button" onClick={onCancel}>
          Cancelar
        </button>
      )}
    </form>
  );
}
