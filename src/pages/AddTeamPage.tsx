import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../services/api";
import type { PlayerForm, Team, Player } from "../types/types";
import Menu from "../components/Menu";
import "./AddTeamPage.css";
import { uploadFile } from "../services/upload";

export default function AddTeamPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>(); // 👈 detectar modo edición

  const [teamName, setTeamName] = useState("");
  const [description, setDescription] = useState("");
  const [logo, setLogo] = useState<File | null>(null);
  const [players, setPlayers] = useState<PlayerForm[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const positions = [
    "Undefined", "Goalkeeper (GK)", "Center Back (CB)", "Left Back (LB)", "Right Back (RB)", "Sweeper (SW)", "Wing Back (LWB/RWB)",
    "Defensive Midfielder (DM/CDM)", "Central Midfielder (CM)", "Attacking Midfielder (AM/CAM)", "Left Midfielder (LM)", "Right Midfielder (RM)",
    "Striker (ST)", "Center Forward (CF)", "Winger (LW/RW)", "Forward (FW)"
  ];

  // 👇 cargar datos si estamos editando
  useEffect(() => {
    const fetchTeam = async () => {
      if (!id) return;
      try {
        const teamRes = await api.get(`/teams/${id}`);
        const team: Team = teamRes.data;

        setTeamName(team.name ?? "");
        setDescription(team.description ?? "");

        // Mapeo mínimo a PlayerForm (sin tocar tipos): posiciones del backend o "Undefined"
        const mappedPlayers: PlayerForm[] = (team.players || []).map((p: Player) => ({
          name: p.name ?? "",
          number: p.number ?? 0,
          positions: p.positions?.length ? p.positions : ["Undefined"],
          photo: null // si guardas URL en backend, aquí podrías mostrarla en otro campo si lo necesitas
        }));
        setPlayers(mappedPlayers);
      } catch (err) {
        console.error("Error cargando equipo:", err);
        setError("No se pudo cargar el equipo.");
      }
    };
    fetchTeam();
  }, [id]);

  const addPlayer = () => {
    const newPlayer: PlayerForm = {
      name: "",
      number: 0,
      positions: ["Undefined"], // ✅ usar tu array, no string vacío
      photo: null
    };

    const updated = [...players, newPlayer];
    setPlayers(updated);
    setExpandedIndex(updated.length - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!teamName.trim()) {
      setError("The team name is mandatory.");
      return;
    }

    try {
      let logoUrl = null;
      if (logo) {
        logoUrl = await uploadFile(logo);
      }

      const payload = {
        name: teamName.trim(),
        description: description.trim(),
        logo: logoUrl ?? "" ,
        players: []
      };

      const teamRes = await api.post("/teams", payload);
      const createdTeam = teamRes.data;

      // 2) Crear jugadores (si tienen nombre)
      const createdPlayers: Player[] = [];
      for (const p of players) {
        if (!p.name?.trim()) continue;
        const playerRes = await api.post("/players", {
          name: p.name,
          number: p.number,
          positions: p.positions,
          photo: p.photo ? p.photo.name : "",
          teamId: createdTeam.id
        });
        createdPlayers.push(playerRes.data);
      }

      // 3) Actualizar equipo con jugadores embebidos
      if (createdPlayers.length > 0) {
        await api.put(`/teams/${createdTeam.id}`, {
          ...createdTeam,
          players: createdPlayers
        });
      }

      // 4) Redirigir a /teams
      navigate("/teams");
    } catch (err) {
      console.error("Error al guardar equipo:", err);
      setError("No se pudo guardar el equipo. Revisa la consola.");
    }
  };

  return (
    <div>
      <Menu />
      <section className="form-card">
        <h2>{id ? "Edit Team" : "Characteristics of the Team"}</h2>
        {error && <p className="error">{error}</p>}

        <form onSubmit={handleSubmit}>
          <label>Team Name</label>
          <input
            value={teamName}
            onChange={e => setTeamName(e.target.value)}
          />

          <label>Description</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Describe your team..."
          />

          <label>Logo</label>
          <input
            type="file"
            onChange={e => setLogo(e.target.files?.[0] ?? null)}
          />

          {logo && (
            <div className="logo-preview">
              <img
                src={URL.createObjectURL(logo)}
                alt="Team logo preview"
                style={{ width: "80px", height: "80px", objectFit: "cover", borderRadius: "50%" }}
              />
            </div>
          )}

          <div className="players-header">
            <h3>Players</h3>
            <button type="button" className="btn btn--red" onClick={addPlayer}>
              + Add Player
            </button>
          </div>

          {players.map((p, i) => (
            <div key={i} className="player-form">
              {expandedIndex === i ? (
                <>
                  <label>Name</label>
                  <input
                    value={p.name}
                    onChange={e => {
                      const updated = [...players];
                      updated[i].name = e.target.value;
                      setPlayers(updated);
                    }}
                  />

                  <label>Number</label>
                  <input
                    type="number"
                    value={p.number}
                    onChange={e => {
                      const updated = [...players];
                      updated[i].number = Number(e.target.value);
                      setPlayers(updated);
                    }}
                  />

                  <label>Positions</label>
                  {p.positions.map((pos, j) => (
                    <div key={j} style={{ display: "flex", alignItems: "center", marginBottom: "0.6rem" }}>
                      <select
                        value={pos}
                        onChange={e => {
                          const updated = [...players];
                          updated[i].positions[j] = e.target.value;
                          setPlayers(updated);
                        }}
                        style={{ flex: 1 }}
                      >
                        {positions.map(option => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>

                      {p.positions.length > 1 && (
                        <button
                          type="button"
                          className="btn-delete-position"
                          onClick={() => {
                            const updated = [...players];
                            updated[i].positions.splice(j, 1);
                            setPlayers(updated);
                          }}
                        >
                          ✖
                        </button>
                      )}
                    </div>
                  ))}

                  <span
                    className="add-position-link"
                    onClick={() => {
                      const updated = [...players];
                      updated[i].positions.push("Undefined");
                      setPlayers(updated);
                    }}
                  >
                    + Add Position
                  </span>

                  <label>Photo</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={e => {
                      const file = e.target.files?.[0] ?? null;
                      const updated = [...players];
                      updated[i].photo = file;
                      setPlayers(updated);
                    }}
                  />

                  {p.photo && (
                    <img
                      src={URL.createObjectURL(p.photo)}
                      alt={`${p.name || "Player"} photo`}
                      className="player-photo-preview"
                    />
                  )}

                  <div className="player-actions">
                    <button
                      type="button"
                      className="btn btn--green"
                      onClick={() => setExpandedIndex(null)}
                    >
                      Save player
                    </button>

                    <button
                      type="button"
                      className="btn btn--red"
                      onClick={() => {
                        const updated = [...players];
                        updated.splice(i, 1);
                        setPlayers(updated);
                        setExpandedIndex(null);
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </>
              ) : (
                <div className="player-summary">
                  <span
                    onClick={() => setExpandedIndex(i)}
                    style={{ flex: 1, cursor: "pointer" }}
                  >
                    {p.name || "Unnamed"} - {p.number || "?"} - {p.positions.join(" & ")}
                  </span>
                  <button
                    type="button"
                    className="btn btn--delete-text"
                    onClick={() => {
                      const updated = [...players];
                      updated.splice(i, 1);
                      setPlayers(updated);
                    }}
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          ))}

          <div className="form-actions">
            <button type="submit" className="btn btn--green">
              Save Team
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
