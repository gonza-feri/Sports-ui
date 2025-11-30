// src/pages/AddTeamPage.tsx
import React, { JSX, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../services/api";
import type { Team, Player, PlayerForm } from "../types/types";
import Menu from "../components/Menu";
import "./AddTeamPage.css";

const POS_OPTIONS = [
  { v: "GK", t: "Goalkeeper (GK)" },
  { v: "RB", t: "Right Back (RB)" },
  { v: "LB", t: "Left Back (LB)" },
  { v: "FB", t: "Full Back (FB)" },
  { v: "CB", t: "Centre-Back (CB)" },
  { v: "DM", t: "Defensive Midfielder (DM)" },
  { v: "CM", t: "Central Midfielder (CM)" },
  { v: "AM", t: "Attacking Midfielder (AM)" },
  { v: "RW", t: "Right Winger (RW)" },
  { v: "LW", t: "Left Winger (LW)" },
  { v: "W",  t: "Winger (W)" },
  { v: "CF", t: "Centre Forward (CF)" },
  { v: "ST", t: "Striker (ST)" },
];

export default function AddTeamPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [teamName, setTeamName] = useState<string>("");
  const [teamDescription, setTeamDescription] = useState<string>("");
  const [teamLogoPreview, setTeamLogoPreview] = useState<string | null>(null);

  const [players, setPlayers] = useState<PlayerForm[]>([]);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        if (id) {
          const res = await api.get(`/teams/${id}`);
          const t: Team = res.data;
          setTeamName(t.name ?? "");
          setTeamDescription(t.description ?? "");
          setTeamLogoPreview(t.logo ?? null);

          const mapped: PlayerForm[] = (t.players ?? []).map((p: Player) => ({
            id: p.id,
            name: p.name ?? "",
            number: p.number ?? 0,
            positions: Array.isArray(p.positions) ? p.positions : [],
            photo: null,
            photoPreview: p.photo ?? null,
            isStarter: !!p.isStarter,
            positionSlot: p.positionSlot ?? null,
          }));
          setPlayers(mapped);
        } else {
          setTeamName("");
          setTeamDescription("");
          setTeamLogoPreview(null);
          setPlayers([]);
        }
      } catch (e) {
        console.error(e);
        setError("No se pudo cargar el equipo.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  /* ---------- Helpers de archivos/imagenes ---------- */
  function isDataUrl(str: string) {
    return /^data:image\/(png|jpg|jpeg|webp);base64,/.test(str);
  }

  async function fileToDataUrl(file: File): Promise<string> {
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function urlToDataUrl(imageUrl: string): Promise<string> {
    try {
      const res = await fetch(imageUrl, { mode: "cors" });
      const blob = await res.blob();
      return await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
    } catch {
      return imageUrl;
    }
  }

  /* ---------- CSV parsing / util ---------- */
  function parseCSV(text: string) {
    // Parseador simple que soporta:
    // - separador ';'
    // - campos entre comillas dobles que pueden contener ';' y comas
    // - escape de comillas con doble comilla ""
    const rows: string[][] = [];
    const lines = text.split(/\r?\n/);

    for (const rawLine of lines) {
      if (!rawLine.trim()) continue;
      const cols: string[] = [];
      let cur = "";
      let inQuotes = false;
      for (let i = 0; i < rawLine.length; i++) {
        const ch = rawLine[i];
        if (ch === '"') {
          if (inQuotes && rawLine[i + 1] === '"') {
            cur += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (ch === ";" && !inQuotes) {
          cols.push(cur);
          cur = "";
        } else {
          cur += ch;
        }
      }
      cols.push(cur);
      rows.push(cols);
    }

    if (rows.length === 0) return [];

    const header = rows.shift()!.map(h => h.trim().toLowerCase());
    const idxNombre = header.indexOf("nombre");
    const idxNumero = header.indexOf("número") >= 0 ? header.indexOf("número") : header.indexOf("numero");
    const idxPosiciones = header.indexOf("posiciones");
    const idxTitular = header.indexOf("titular");
    const idxFoto = header.indexOf("foto");

    return rows.map(cols => {
      const get = (idx: number) => (idx >= 0 && idx < cols.length ? cols[idx].trim() : "");
      return {
        nombre: get(idxNombre) ?? "",
        numero: get(idxNumero) ?? "0",
        posiciones: (get(idxPosiciones) ?? "").split(",").map(s => s.trim()).filter(Boolean),
        titular: get(idxTitular) ?? "",
        foto: get(idxFoto) ?? "",
      };
    }).filter(r => r.nombre || r.numero || r.posiciones.length || r.foto);
  }

  function sanitizePhoto(raw: string): string | null {
    if (!raw) return null;

    // 1) Trim y quitar comillas envolventes si existen
    let s = raw.trim();
    if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
      s = s.slice(1, -1);
    }

    // 2) Quitar ; finales accidentales
    while (s.endsWith(";")) s = s.slice(0, -1);

    // 3) Si es ya una data URL válida, devolverla
    if (/^data:image\/(png|jpg|jpeg|webp|svg\+xml);/.test(s) || /^data:image\/svg\+xml,/.test(s)) {
      return s;
    }

    // 4) Si parece base64 sin prefijo (p.e. empieza por iVBORw0...), añadir prefijo PNG
    if (/^[A-Za-z0-9+/=]{20,}$/.test(s)) {
      return `data:image/png;base64,${s}`;
    }

    // 5) Si es una URL http(s) la devolvemos tal cual (la importación posterior intentará convertirla a base64)
    if (/^https?:\/\//.test(s)) {
      return s;
    }

    // 6) Si contiene 'data:image' pero con caracteres raros (p.e. espacios), encodeURIComponent la parte SVG
    if (s.startsWith("data:image/svg+xml")) {
      // normalizar: si contiene '<' '>' etc, encodeURI la parte después de la coma
      const idx = s.indexOf(",");
      if (idx > 0) {
        const head = s.slice(0, idx + 1);
        const body = s.slice(idx + 1);
        // si body contiene '<' o '>' o espacios, encodeURIComponent
        if (/[<>\s]/.test(body)) {
          return head + encodeURIComponent(body);
        }
        return s;
      }
    }

    // 7) Si no sabemos qué es, devolver null para no romper el src
    return null;
  }

  // Genera un SVG con iniciales y lo devuelve como data:image/svg+xml;base64,...
  function svgToBase64DataUrl(svg: string) {
    // encodeURIComponent + unescape para soportar caracteres UTF-8 antes de btoa
    const encoded = btoa(unescape(encodeURIComponent(svg)));
    return `data:image/svg+xml;base64,${encoded}`;
  }

  function makeInitials(name: string) {
    if (!name) return "";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + (parts[1][0] ?? "")).toUpperCase();
  }

  /**
   * Genera un placeholder SVG con iniciales.
   * colorBg: color de fondo (ej. '#A50044' o '#000000')
   * colorFg: color del texto (ej. '#FFFFFF')
   */
  function generatePlayerSvgDataUrl(name: string, colorBg = "#0b1220", colorFg = "#ffffff", size = 128) {
    const initials = makeInitials(name) || "P";
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <rect width="100%" height="100%" fill="${colorBg}" rx="${Math.round(size * 0.08)}" />
      <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="${Math.round(size * 0.45)}" fill="${colorFg}" font-weight="700">${initials}</text>
    </svg>`;
    return svgToBase64DataUrl(svg);
  }

  function parseBooleanYes(value: string) {
    if (!value) return false;
    const v = value.trim().toLowerCase();
    return ["si", "sí", "yes", "true", "1", "x"].includes(v);
  }

  function downloadTextFile(text: string, filename: string, mime = "text/csv;charset=utf-8;") {
    const blob = new Blob([text], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /* ---------- Team logo ---------- */
  const handleTeamLogoChange = async (file: File | null) => {
    if (!file) return;
    const dataUrl = await fileToDataUrl(file);
    setTeamLogoPreview(dataUrl);
  };

  /* ---------- Players CRUD ---------- */
  const addPlayer = () => {
    const newPlayer: PlayerForm = {
      id: undefined,
      name: "",
      number: 0,
      positions: [],
      photo: null,
      photoPreview: null,
      isStarter: false,
      positionSlot: null,
    };
    setPlayers(prev => [newPlayer, ...prev]);
    setExpandedIndex(0);
  };

  const removePlayer = (idx: number) => {
    setPlayers(prev => prev.filter((_, i) => i !== idx));
    setExpandedIndex(null);
  };

  const updatePlayerField = <K extends keyof PlayerForm>(idx: number, key: K, value: PlayerForm[K]) => {
    setPlayers(prev => {
      const next = prev.slice();
      next[idx] = { ...next[idx], [key]: value };
      return next;
    });
  };

  const handlePlayerPhotoChange = async (idx: number, file: File | null) => {
    if (!file) return;
    const dataUrl = await fileToDataUrl(file);
    setPlayers(prev => {
      const next = prev.slice();
      next[idx].photo = file;
      next[idx].photoPreview = dataUrl;
      return next;
    });
  };

  /* ---------- Save player (comprimir) ---------- */
  const savePlayer = (idx: number) => {
    const p = players[idx];
    if (!p) return;
    if (!p.name || p.name.trim() === "") {
      setError("El jugador debe tener un nombre antes de guardar.");
      return;
    }
    setError(null);
    setExpandedIndex(null);
  };

  /* ---------- Import CSV (botón debajo de Players) ---------- */
  const handleImportCSV = async (file: File) => {
    try {
      const text = await file.text();
      const rows = parseCSV(text);
      if (!rows.length) return;

      const imported: PlayerForm[] = [];
      for (const row of rows) {
        // intenta sanear la foto si viene en CSV
        let photoPreview = sanitizePhoto ? sanitizePhoto(row.foto) : (row.foto ?? "");

        // Si photoPreview es null/empty o inválida, generamos un SVG único por jugador
        if (!photoPreview) {
          // elige color por equipo (ejemplo: Real Madrid -> blanco/negro; Barça -> azul/grana)
          // aquí puedes decidir el color según un parámetro o por defecto
          const teamColorBg = id && id.toString().toLowerCase().includes("barca") ? "#A50044" : "#000000";
          const teamColorFg = id && id.toString().toLowerCase().includes("barca") ? "#FFD400" : "#ffffff";
          photoPreview = generatePlayerSvgDataUrl(row.nombre || "Player", teamColorBg, teamColorFg);
        } else {
          // si es URL http(s) intentamos convertir a dataURL (mantén tu lógica actual)
          if (/^https?:\/\//.test(photoPreview)) {
            try {
              const res = await fetch(photoPreview, { mode: "cors" });
              if (res.ok) {
                const blob = await res.blob();
                photoPreview = await new Promise<string>((resolve) => {
                  const reader = new FileReader();
                  reader.onloadend = () => resolve(reader.result as string);
                  reader.readAsDataURL(blob);
                });
              } else {
                // si falla, generamos SVG en su lugar
                photoPreview = generatePlayerSvgDataUrl(row.nombre || "Player");
              }
            } catch (err) {
              // CORS u otro error: generamos SVG en su lugar
              console.warn("No se pudo convertir URL a dataURL:", photoPreview, err);
              photoPreview = generatePlayerSvgDataUrl(row.nombre || "Player");
            }
          } else {
            // si es data:image/... pero no contiene 'base64,' o está mal, intenta normalizar
            if (!/^data:image\/(png|jpg|jpeg|webp|svg\+xml);/.test(photoPreview) && !/^data:image\/svg\+xml;base64,/.test(photoPreview)) {
              // si parece ser un SVG sin codificar (contiene '<'), lo codificamos
              if (photoPreview.includes("<") || photoPreview.includes(">")) {
                photoPreview = svgToBase64DataUrl(photoPreview);
              } else {
                // si no sabemos, generamos SVG
                photoPreview = generatePlayerSvgDataUrl(row.nombre || "Player");
              }
            }
          }
        }

        imported.push({
          id: undefined,
          name: row.nombre || "",
          number: parseInt(row.numero) || 0,
          positions: row.posiciones ?? [],
          photo: null,
          photoPreview, // cada jugador recibe su propia cadena
          isStarter: parseBooleanYes(row.titular),
          positionSlot: null,
        });
      }

      setPlayers(prev => [...imported, ...prev]);
      setExpandedIndex(imported.length ? 0 : null);
    } catch (err) {
      console.error(err);
      setError("Error importando CSV. Revisa el formato.");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  /* ---------- Export CSV ---------- */
  const handleExportCSV = () => {
    const header = "nombre;número;posiciones;titular;foto";
    const lines = players.map(p => {
      const nombre = (p.name ?? "").replace(/;/g, ",");
      const numero = String(p.number ?? 0);
      const posiciones = (p.positions ?? []).join(",").replace(/;/g, ",");
      const titular = p.isStarter ? "si" : "";
      const foto = (p.photoPreview ?? "").replace(/;/g, ",");
      return `${nombre};${numero};${posiciones};${titular};${foto}`;
    });
    const csv = [header, ...lines].join("\n");
    downloadTextFile(csv, "jugadores.csv");
  };

  /* ---------- Submit (guardar equipo y jugadores) ---------- */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);

      const teamPayload: Partial<Team> = {
        name: teamName.trim(),
        description: teamDescription.trim(),
        logo: teamLogoPreview ?? undefined,
      };

      let savedTeam: Team;
      if (id) {
        const res = await api.put(`/teams/${id}`, { id: Number(id), ...teamPayload });
        savedTeam = res.data;
      } else {
        const res = await api.post(`/teams`, teamPayload);
        savedTeam = res.data;
      }

      const persistedPlayers: Player[] = [];
      for (const p of players) {
        const payload = {
          name: p.name.trim(),
          number: Number(p.number) || 0,
          positions: p.positions,
          photo: p.photoPreview ?? undefined,
          teamId: savedTeam.id,
          isStarter: !!p.isStarter,
          positionSlot: p.positionSlot ?? undefined,
        };

        if (p.id) {
          const res = await api.put(`/players/${p.id}`, { id: p.id, ...payload });
          persistedPlayers.push(res.data);
        } else {
          const res = await api.post(`/players`, payload);
          persistedPlayers.push(res.data);
        }
      }

      await api.put(`/teams/${savedTeam.id}`, {
        ...savedTeam,
        players: persistedPlayers,
      });

      navigate(`/teams/${savedTeam.id}`);
    } catch (err) {
      console.error(err);
      setError("No se pudo guardar el equipo.");
    } finally {
      setLoading(false);
    }
  };

  /* ---------- Render ---------- */
  if (loading) {
    return (
      <div>
        <Menu />
        <section className="page-wrapper"><p>Loading...</p></section>
      </div>
    );
  }

  return (
    <div>
      <Menu />
      <section className="page-wrapper">
        <header className="editor-header">
          <h2>{id ? "Edit team" : "Add team"}</h2>
          <div className="editor-actions">
            <button className="btn" onClick={handleExportCSV}>Export CSV</button>
            <button className="btn btn--ghost" onClick={() => navigate(id ? `/teams/${id}` : "/teams")}>Cancel</button>
          </div>
        </header>

        {error && <p className="error">{error}</p>}

        <form onSubmit={handleSubmit} className="team-form">
          <div className="team-grid">
            <div className="team-block">
              <label className="label">Team name</label>
              <input className="input" type="text" value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="Team name" required />
            </div>

            <div className="team-block">
              <label className="label">Description</label>
              <textarea className="textarea" value={teamDescription} onChange={(e) => setTeamDescription(e.target.value)} placeholder="Team description" rows={3} />
            </div>

            <div className="team-block">
              <label className="label">Logo</label>
              <div className="file-row">
                <input type="file" accept="image/*" onChange={(e) => handleTeamLogoChange(e.target.files?.[0] ?? null)} />
                {teamLogoPreview && <img src={teamLogoPreview} alt="Logo preview" className="logo-preview" />}
              </div>
            </div>
          </div>

          <div className="players-header">
            <div className="players-header-row">
              {/* Left: título + Add players file */}
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <h3>Players ({players.length})</h3>

                {/* Add players file pegado al título */}
                <label className="btn btn--gray" style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8 }}>
                  Add players file
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,text/csv"
                    style={{ display: "none" }}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleImportCSV(f);
                    }}
                  />
                </label>
              </div>

              {/* Right: + Add Player */}
              <div>
                <button type="button" className="btn" onClick={addPlayer}>+ Add Player</button>
              </div>
            </div>
          </div>

          <div className="players-list">
            {players.map((p, i) => (
              <div key={p.id ?? i} className="player-card" data-player-index={i}>
                <div className="player-summary" onClick={() => setExpandedIndex(expandedIndex === i ? null : i)} role="button" tabIndex={0}>
                  <div className="player-summary-left">
                    <span className="player-summary-name">{p.name || "New player"}</span>
                    <span className="player-summary-number">{p.number ? `#${p.number}` : ""}</span>
                    <span className="player-summary-positions">{p.positions && p.positions.length ? p.positions.join(", ") : "—"}</span>
                  </div>
                  <div>
                    <span className="player-summary-starter">{p.isStarter ? "Titular" : ""}</span>
                  </div>
                </div>

                {expandedIndex === i && (
                  <div className="player-editor">
                    <div className="player-row">
                      <label className="label">Name</label>
                      <input className="input" type="text" value={p.name} onChange={(e) => updatePlayerField(i, "name", e.target.value)} placeholder="Full name" required />
                    </div>

                    <div className="player-row">
                      <label className="label">Number</label>
                      <input className="input" type="number" value={p.number} onChange={(e) => updatePlayerField(i, "number", Number(e.target.value))} placeholder="7" min={0} />
                    </div>

                    {/* Positions selector */}
                    <div className="player-row">
                      <label className="label">Positions</label>
                      <select
                        className="input"
                        multiple
                        value={p.positions}
                        onChange={(e) => {
                          const selected = Array.from(e.target.selectedOptions).map(o => o.value);
                          updatePlayerField(i, "positions", selected);
                        }}
                        size={4}
                      >
                        {POS_OPTIONS.map(opt => (
                          <option key={opt.v} value={opt.v}>{opt.t}</option>
                        ))}
                      </select>
                      <div className="hint">Hold Ctrl (Cmd on Mac) to select multiple</div>
                    </div>

                    <div className="player-row">
                      <label className="label">Photo</label>
                      <div className="file-row">
                        <input type="file" accept="image/*" onChange={(e) => handlePlayerPhotoChange(i, e.target.files?.[0] ?? null)} />
                        {p.photoPreview && <img src={p.photoPreview} alt="Preview" className="photo-preview" />}
                      </div>
                    </div>

                    <div className="player-row-inline">
                      <label className="checkbox">
                        <input type="checkbox" checked={!!p.isStarter} onChange={(e) => updatePlayerField(i, "isStarter", e.target.checked)} />
                        Titular
                      </label>
                    </div>

                    {/* Player actions: Save a la izquierda, Delete a la derecha */}
                    <div
                      className="player-actions"
                      style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}
                    >
                      <div>
                        <button type="button" className="btn" onClick={() => savePlayer(i)}>Save player</button>
                      </div>

                      <div>
                        <button type="button" className="btn btn--danger" onClick={() => removePlayer(i)}>Delete</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="form-actions">
            <button type="submit" className="btn">Save team</button>
            <button type="button" className="btn btn--gray" onClick={() => navigate(id ? `/teams/${id}` : "/teams")}>Back</button>
          </div>
        </form>
      </section>
    </div>
  );
}
