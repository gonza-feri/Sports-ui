import { useState } from "react";
import type { PlayerForm } from "../types/types";

export default function AddTeamPage() {
  const [teamName, setTeamName] = useState("");
  const [description, setDescription] = useState("");
  const [logo, setLogo] = useState<File | null>(null);
  const [players, setPlayers] = useState<PlayerForm[]>([]);

  const positions = ["Portero", "Defensa", "Centrocampista", "Delantero"];

  const addPlayer = () => {
    setPlayers([
        ...players,
        { name: "", age: 0, position: positions[0], photo: null }
    ]);
  };

  return (
    <section className="form-card">
      <h2>Crear nuevo equipo</h2>
      <form>
        <label>Nombre del equipo</label>
        <input value={teamName} onChange={e => setTeamName(e.target.value)} />

        <label>Descripción</label>
        <textarea value={description} onChange={e => setDescription(e.target.value)} />

        <label>Escudo</label>
        <input
        type="file"
        onChange={e => setLogo(e.target.files?.[0] ?? null)}
        />

        {logo && (
        <div className="logo-preview">
            <p>Escudo seleccionado:</p>
            <img
            src={URL.createObjectURL(logo)}
            alt="Team logo preview"
            style={{ width: "80px", height: "80px", objectFit: "cover" }}
            />
        </div>
        )}

        <h3>Jugadores</h3>
        {players.map((p, i) => (
            <div key={i} className="player-form">
                <input
                placeholder="Nombre"
                value={p.name}
                onChange={e => {
                    const updated = [...players];
                    updated[i].name = e.target.value;
                    setPlayers(updated);
                }}
                />
                <input
                placeholder="Edad"
                type="number"
                value={p.age}
                onChange={e => {
                    const updated = [...players];
                    updated[i].age = Number(e.target.value);
                    setPlayers(updated);
                }}
                />
                <select
                value={p.position}
                onChange={e => {
                    const updated = [...players];
                    updated[i].position = e.target.value;
                    setPlayers(updated);
                }}
                >
                {positions.map(pos => (
                    <option key={pos} value={pos}>{pos}</option>
                ))}
                </select>
                <input
                type="file"
                onChange={e => {
                    const updated = [...players];
                    updated[i].photo = e.target.files?.[0] ?? null;
                    setPlayers(updated);
                }}
                />
            </div>
            ))}
        <button type="button" onClick={addPlayer}>Añadir jugador</button>

        <button type="submit">Guardar equipo</button>
      </form>
    </section>
  );
}
