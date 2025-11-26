// src/pages/AddTeamPage.tsx
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../services/api";
import type { PlayerForm, Team, Player } from "../types/types";
import Menu from "../components/Menu";
import "./AddTeamPage.css";

export default function AddTeamPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [teamName, setTeamName] = useState("");
  const [description, setDescription] = useState("");
  const [logo, setLogo] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null); // Data URL o URL persistente
  const [players, setPlayers] = useState<PlayerForm[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  // Cargar equipo en edición
  useEffect(() => {
    const loadTeam = async () => {
      if (!id) return;
      try {
        const res = await api.get(`/teams/${id}`);
        const team: Team = res.data;
        setTeamName(team.name ?? "");
        setDescription(team.description ?? "");
        setLogo(null);
        setLogoPreview(team.logo ?? null); // si backend tiene Data URL o URL persistente

        const mappedPlayers: PlayerForm[] = (team.players ?? []).map((p: Player) => ({
          id: p.id,
          name: p.name ?? "",
          number: p.number ?? 0,
          positions: p.positions?.length ? p.positions : ["Undefined"],
          photo: null,
          photoPreview: p.photo ?? null,
          isStarter: !!p.isStarter
        }));
        setPlayers(mappedPlayers);
      } catch (err) {
        console.error("Error cargando equipo:", err);
        setError("No se pudo cargar el equipo.");
      }
    };
    loadTeam();
  }, [id]);

  // Helper: leer File como Data URL
  const fileToDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const addPlayer = () => {
    const newPlayer: PlayerForm = {
      name: "",
      number: 0,
      positions: ["Undefined"],
      photo: null,
      photoPreview: null,
      isStarter: false
    };
    const updated = [newPlayer, ...players];
    setPlayers(updated);
    setExpandedIndex(0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!teamName.trim()) {
      setError("The team name is mandatory.");
      return;
    }

    try {
      // Si se seleccionó un File en logo, convertirlo a Data URL antes de enviar
      if (logo && !logoPreview) {
        const dataUrl = await fileToDataUrl(logo);
        setLogoPreview(dataUrl);
      }

      // Preparamos payload del equipo con logoPreview (Data URL o string)
      const teamPayload = {
        name: teamName.trim(),
        description: description.trim(),
        logo: logoPreview ?? "", // guardamos la Data URL o cadena persistente
        players: [] as Player[]
      };

      // Crear o editar equipo
      const teamRes = id
        ? await api.put(`/teams/${id}`, teamPayload)
        : await api.post("/teams", teamPayload);

      const savedTeam: Team = teamRes.data;

      // Crear/actualizar jugadores
      const savedPlayers: Player[] = [];
      for (const p of players) {
        if (!p.name?.trim()) continue;

        // Si hay File y no hay photoPreview, convertirlo
        if (p.photo && !p.photoPreview) {
          p.photoPreview = await fileToDataUrl(p.photo);
        }

        const playerPayload = {
          name: p.name,
          number: p.number,
          positions: p.positions,
          photo: p.photoPreview ?? "",
          teamId: savedTeam.id,
          isStarter: !!p.isStarter
        };

        const playerRes = p.id && id
          ? await api.put(`/players/${p.id}`, playerPayload)
          : await api.post("/players", playerPayload);

        savedPlayers.push(playerRes.data);
      }

      // Actualizar equipo con jugadores guardados
      if (savedPlayers.length > 0) {
        await api.put(`/teams/${savedTeam.id}`, {
          ...savedTeam,
          players: savedPlayers
        });
      }

      navigate("/teams");
    } catch (err) {
      console.error("Error al guardar equipo:", err);
      setError("No se pudo guardar el equipo. Revisa la consola.");
    }
  };

  // Botón Cancelar: confirmar y volver a /teams sin guardar
  const handleCancel = () => {
    const confirmed = window.confirm("¿Estás seguro? Los cambios no guardados se perderán.");
    if (confirmed) navigate("/teams");
  };

  return (
    <div>
      <Menu />
      <section className="form-card">
        <h2>{id ? "Edit Team" : "Characteristics of the Team"}</h2>
        {error && <p className="error">{error}</p>}

        <form onSubmit={handleSubmit}>
          <label>Team Name</label>
          <input value={teamName} onChange={e => setTeamName(e.target.value)} />

          <label>Description</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} />

          <label>Logo</label>
          <input
            type="file"
            accept="image/*"
            onChange={async e => {
              const file = e.target.files?.[0] ?? null;
              setLogo(file);
              if (file) {
                // convertimos inmediatamente a Data URL para preview y persistencia
                const dataUrl = await fileToDataUrl(file);
                setLogoPreview(dataUrl);
              } else {
                setLogoPreview(null);
              }
            }}
          />

          {logoPreview && (
            <div className="logo-preview">
              <img
                src={logoPreview}
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
            <div key={p.id ?? i} className="player-form">
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
                        {/* mantén tu lista de posiciones */}
                        <option value="Undefined">Undefined</option>
                        <option value="GK">Goalkeeper (GK)</option>
                        <option value="RB">Right Back (RB)</option>
                        <option value="LB">Left Back (LB)</option>
                        <option value="FB">Full Back (FB)</option>
                        <option value="CB">Centre-Back (CB)</option>
                        <option value="DM">Defensive Midfielder (DM)</option>
                        <option value="CM">Central Midfielder (CM)</option>
                        <option value="AM">Attacking Midfielder (AM)</option>
                        <option value="RW">Right Winger (RW)</option>
                        <option value="LW">Left Winger (LW)</option>
                        <option value="W">Winger (W)</option>
                        <option value="CF">Centre Forward (CF)</option>
                        <option value="ST">Striker (ST)</option>
                        {/* ... */}
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
                    onChange={async e => {
                      const file = e.target.files?.[0] ?? null;
                      const updated = [...players];
                      updated[i].photo = file;
                      if (file) {
                        updated[i].photoPreview = await fileToDataUrl(file);
                      } else {
                        updated[i].photoPreview = null;
                      }
                      setPlayers(updated);
                    }}
                  />

                  <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input
                      type="checkbox"
                      checked={!!p.isStarter}
                      onChange={e => {
                        const updated = [...players];
                        updated[i].isStarter = e.target.checked;
                        setPlayers(updated);
                      }}
                    />
                    Starter
                  </label>

                  {p.photoPreview && (
                    <img
                      src={p.photoPreview}
                      alt={`${p.name || "Player"} photo`}
                      className="player-photo-preview"
                      style={{ width: 60, height: 60, objectFit: "cover", borderRadius: 6 }}
                    />
                  )}

                  <div className="player-actions">
                    <button type="button" className="btn btn--green" onClick={() => setExpandedIndex(null)}>
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
                  <span onClick={() => setExpandedIndex(i)} style={{ flex: 1, cursor: "pointer" }}>
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

          <div className="form-actions" style={{ display: "flex", gap: 8 }}>
            <button type="submit" className="btn btn--green">
              Save Team
            </button>

            <button type="button" className="btn btn--gray" onClick={handleCancel}>
              Cancel
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
