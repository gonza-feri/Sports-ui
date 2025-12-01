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
  { v: "W", t: "Winger (W)" },
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

  /* ---------- Helpers: file/image ---------- */
  async function fileToDataUrl(file: File): Promise<string> {
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function svgToBase64DataUrl(svg: string) {
    const encoded = btoa(unescape(encodeURIComponent(svg)));
    return `data:image/svg+xml;base64,${encoded}`;
  }

  function makeInitials(name: string) {
    if (!name) return "P";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + (parts[1][0] ?? "")).toUpperCase();
  }

  function generatePlayerSvgDataUrl(name: string, colorBg = "#0b1220", colorFg = "#ffffff", size = 128) {
    const initials = makeInitials(name);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <rect width="100%" height="100%" fill="${colorBg}" rx="${Math.round(size * 0.08)}" />
      <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="${Math.round(size * 0.45)}" fill="${colorFg}" font-weight="700">${initials}</text>
    </svg>`;
    return svgToBase64DataUrl(svg);
  }

  function normalizeDataUrl(raw?: string | null): string | null {
    if (!raw) return null;
    let s = String(raw).trim();

    if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
      s = s.slice(1, -1);
    }

    while (s.endsWith(";")) s = s.slice(0, -1);

    // remove whitespace/newlines that can break the URL
    s = s.replace(/\s+/g, "");

    // if already valid data URL with comma or base64 marker
    if (/^data:image\/[a-z0-9.+-]+;(base64,|utf8,|,)/i.test(s) || /^data:image\/svg\+xml;base64,/.test(s)) {
      return s;
    }

    // if missing comma after ;base64
    const m = s.match(/^(data:image\/[a-z0-9.+-]+;base64)(.+)$/i);
    if (m) {
      return `${m[1]},${m[2]}`;
    }

    // if looks like raw base64
    if (/^[A-Za-z0-9+/=]{20,}$/.test(s)) {
      return `data:image/png;base64,${s}`;
    }

    // if raw svg content
    if (s.includes("<svg")) {
      try {
        const encoded = btoa(unescape(encodeURIComponent(s)));
        return `data:image/svg+xml;base64,${encoded}`;
      } catch {
        return null;
      }
    }

    // http(s) url
    if (/^https?:\/\//i.test(s)) return s;

    return null;
  }

  function sanitizePhoto(raw: string): string | null {
    if (!raw) return null;
    let s = raw.trim();
    if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) s = s.slice(1, -1);
    while (s.endsWith(";")) s = s.slice(0, -1);
    // if contains raw svg tags, return encoded svg
    if (s.includes("<svg")) return svgToBase64DataUrl(s);
    // if already data:image with comma or ;base64, return as-is (normalize later)
    if (/^data:image\/[a-z0-9.+-]+;/.test(s) || /^data:image\/svg\+xml,/.test(s)) return s;
    // if looks like base64 raw
    if (/^[A-Za-z0-9+/=]{20,}$/.test(s)) return `data:image/png;base64,${s}`;
    // if http(s)
    if (/^https?:\/\//.test(s)) return s;
    return null;
  }

  /* ---------- CSV parser (supports quoted fields with ;) ---------- */
  function parseCSV(text: string) {
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

  /* ---------- Import CSV (robusto) ---------- */
  const handleImportCSV = async (file: File) => {
    try {
      const text = await file.text();
      const rows = parseCSV(text);
      if (!rows.length) return;

      const imported: PlayerForm[] = [];
      for (const row of rows) {
        let photoPreview = sanitizePhoto(row.foto);

        // If it's an http(s) URL, try to fetch and convert to dataURL (fallback to generated SVG)
        if (photoPreview && /^https?:\/\//.test(photoPreview)) {
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
              photoPreview = null;
            }
          } catch (err) {
            console.warn("fetch->dataURL failed:", err);
            photoPreview = null;
          }
        }

        // If still no valid photo, generate a unique SVG data URL per player
        if (!photoPreview) {
          // choose team color by team id or default
          const teamColorBg = id && id.toString().toLowerCase().includes("barca") ? "#A50044" : "#0b1220";
          const teamColorFg = id && id.toString().toLowerCase().includes("barca") ? "#FFD400" : "#ffffff";
          photoPreview = generatePlayerSvgDataUrl(row.nombre || "Player", teamColorBg, teamColorFg);
        } else {
          // normalize if it's a data URL or raw svg
          const normalized = normalizeDataUrl(photoPreview);
          if (normalized) photoPreview = normalized;
          else {
            // fallback to generated svg if normalization fails
            photoPreview = generatePlayerSvgDataUrl(row.nombre || "Player");
          }
        }

        // Debug log to inspect values during import
        // eslint-disable-next-line no-console
        console.log("Import row:", { nombre: row.nombre, rawFoto: row.foto, photoPreview: photoPreview?.slice(0, 120) });

        imported.push({
          id: undefined,
          name: row.nombre || "",
          number: parseInt(row.numero) || 0,
          positions: row.posiciones ?? [],
          photo: null,
          photoPreview,
          isStarter: ["si", "sí", "yes", "true", "1", "x"].includes((row.titular || "").trim().toLowerCase()),
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
      const nombre = (p.name ?? "").replace(/"/g, '""'); // escapar comillas
      const numero = String(p.number ?? 0);
      const posiciones = (p.positions ?? []).join(",").replace(/"/g, '""');
      const titular = p.isStarter ? "si" : "";
      const foto = (p.photoPreview ?? "").replace(/"/g, '""'); // escapar comillas
      // ponemos la foto entre comillas para que el parser no la rompa
      return `${nombre};${numero};${posiciones};${titular};"${foto}"`;
    });
    const csv = [header, ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "jugadores.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
                <input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) fileToDataUrl(f).then(setTeamLogoPreview); }} />
                {teamLogoPreview && <img src={normalizeDataUrl(teamLogoPreview) ?? undefined} alt="Logo preview" className="logo-preview" />}
              </div>
            </div>
          </div>

          <div className="players-header">
            <div className="players-header-row">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <h3>Players ({players.length})</h3>

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
                        {(() => {
                          // Aseguramos una data URL final única por jugador
                          const normalized = normalizeDataUrl(p.photoPreview);
                          const finalSrc = normalized ?? generatePlayerSvgDataUrl(p.name || `Player ${i}`, "#0b1220", "#ffffff");

                          // Debug temporal (borra después de probar)
                          // eslint-disable-next-line no-console
                          console.log("IMG FINAL:", {
                            idx: i,
                            name: p.name,
                            finalStartsWith: finalSrc ? finalSrc.slice(0, 30) : null,
                            length: finalSrc ? finalSrc.length : 0
                          });

                          // Forzamos atributos width/height y objectFit para evitar placeholders CSS
                          return (
                            <img
                              key={`player-img-${i}-${p.name?.replace(/\s+/g, "-")}`}
                              src={finalSrc}
                              alt={p.name || "Player photo"}
                              className="photo-preview"
                              width={56}
                              height={56}
                              style={{ objectFit: "cover", display: "inline-block" }}
                              onError={(e) => {
                                // Si falla, sustituimos por un SVG generado (no deja la misma imagen vacía)
                                const target = e.currentTarget as HTMLImageElement;
                                target.onerror = null;
                                target.src = generatePlayerSvgDataUrl(p.name || `Player ${i}`, "#0b1220", "#ffffff");
                              }}
                            />
                          );
                        })()}
                      </div>
                    </div>

                    <div className="player-row-inline">
                      <label className="checkbox">
                        <input type="checkbox" checked={!!p.isStarter} onChange={(e) => updatePlayerField(i, "isStarter", e.target.checked)} />
                        Titular
                      </label>
                    </div>

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
