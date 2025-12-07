/* eslint-disable @typescript-eslint/no-explicit-any */
// src/pages/AddTeamPage.tsx
import React, { JSX, useEffect, useRef, useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../services/api";
import type { Team, Player, PlayerForm } from "../types/types";
import Menu from "../components/Menu";
import "./AddTeamPage.css";
import { useI18n } from "../i18n/I18nProvider";

/* ---------------- Helpers ---------------- */
function normalizeLower(raw?: string | null): string {
  if (!raw) return "";
  return String(raw).trim().toLowerCase();
}

/**
 * DISPLAY_TO_ACRONYM: mapea variantes de texto guardadas (lowercased)
 * a la abreviatura que queremos almacenar/usar en la UI (ej "gk","rb").
 * Añade aquí variantes localizadas o legacy que puedas tener.
 */
const DISPLAY_TO_ACRONYM: Record<string, string> = {
  // goalkeeper
  "vratar (v)": "gk",
  "vratar": "gk",
  "goalkeeper (gk)": "gk",
  "goalkeeper": "gk",
  "portero (pt)": "gk",
  "portero": "gk",
  "gk": "gk",

  // right back
  "right back (rb)": "rb",
  "right_back": "rb",
  "right-back": "rb",
  "right back": "rb",
  "lateral derecho (ld)": "rb",
  "rb": "rb",
  "ld": "rb",

  // left back
  "left back (lb)": "lb",
  "left_back": "lb",
  "left-back": "lb",
  "left back": "lb",
  "lateral izquierdo (li)": "lb",
  "lb": "lb",
  "li": "lb",

  // full back
  "full back (fb)": "fb",
  "full_back": "fb",
  "full-back": "fb",
  "fb": "fb",

  // centre-back (note JSON uses "centre-back")
  "centre-back": "cb",
  "centre back": "cb",
  "centre_back": "cb",
  "cb": "cb",
  "defensa central (dfc)": "cb",

  // defensive midfielder
  "defensive midfielder (dm)": "dm",
  "defensive_midfielder": "dm",
  "dm": "dm",
  "medio centro defensivo (mcd)": "dm",

  // central midfielder
  "central midfielder (cm)": "cm",
  "central_midfielder": "cm",
  "cm": "cm",
  "medio centro (mc)": "cm",

  // attacking midfielder
  "attacking midfielder (am)": "am",
  "attacking_midfielder": "am",
  "am": "am",
  "mediocentro ofensivo (mco)": "am",

  // right winger
  "right winger (rw)": "rw",
  "right_winger": "rw",
  "rw": "rw",

  // left winger
  "left winger (lw)": "lw",
  "left_winger": "lw",
  "lw": "lw",

  // winger
  "winger (w)": "w",
  "winger": "w",
  "w": "w",

  // centre forward
  "centre_forward": "cf",
  "centre forward": "cf",
  "centre-forward": "cf",
  "cf": "cf",

  // striker
  "striker (st)": "st",
  "striker": "st",
  "st": "st",
};

/* ---------------- POS_OPTIONS ----------------
   - value: la abreviatura que guardamos en p.positions (ej "gk", "rb")
   - labelKey: la clave de traducción que muestra el texto completo (ej "goalkeeper")
   Asegúrate de que tus JSON tengan esas claves en root (ej "goalkeeper": "Goalkeeper (GK)").
*/
const POS_OPTIONS: { value: string; labelKey: string }[] = [
  { value: "gk", labelKey: "goalkeeper" },
  { value: "rb", labelKey: "right_back" },
  { value: "lb", labelKey: "left_back" },
  { value: "fb", labelKey: "full_back" },
  { value: "cb", labelKey: "centre-back" }, // tu JSON usa centre-back
  { value: "dm", labelKey: "defensive_midfielder" },
  { value: "cm", labelKey: "central_midfielder" },
  { value: "am", labelKey: "attacking_midfielder" },
  { value: "rw", labelKey: "right_winger" },
  { value: "lw", labelKey: "left_winger" },
  { value: "w", labelKey: "winger" },
  { value: "cf", labelKey: "centre_forward" },
  { value: "st", labelKey: "striker" },
];

/* ---------------- PlayerPositions component ----------------
   Muestra las abreviaturas traducidas (ej "GK", "RB") a partir de p.positions,
   que ahora contienen solo las abreviaturas.
*/
function PlayerPositions({ positions, className }: { positions?: string[] | null; className?: string }) {
  const { t, lang } = useI18n();

  const translated = useMemo(() => {
    if (!positions || positions.length === 0) return "—";

    return positions
      .map((acr) => {
        if (!acr) return "";
        const key = normalizeLower(acr); // acr expected like "gk","rb"
        // 1) Intentamos t("gk") -> en tus JSON "gk": "GK"
        const rootTry = t(key);
        if (rootTry && rootTry !== key) return rootTry;

        // 2) fallback: si no existe, intentar mapear a labelKey (ej "goalkeeper") y mostrar su texto completo
        //    (esto es raro si guardamos acrónimos, pero lo dejamos por seguridad)
        const mapToLabelKey: Record<string, string> = {
          gk: "goalkeeper",
          rb: "right_back",
          lb: "left_back",
          fb: "full_back",
          cb: "centre-back",
          dm: "defensive_midfielder",
          cm: "central_midfielder",
          am: "attacking_midfielder",
          rw: "right_winger",
          lw: "left_winger",
          w: "winger",
          cf: "centre_forward",
          st: "striker",
        };
        const labelKey = mapToLabelKey[key];
        if (labelKey) {
          const label = t(labelKey);
          if (label && label !== labelKey) {
            // si label es "Goalkeeper (GK)" devolvemos solo la parte acrónima si quieres,
            // pero aquí devolvemos la abreviatura preferida (t(key)) si existe, o la etiqueta completa.
            // Para mantener la vista contraída con solo acrónimos, intentamos extraer la abreviatura:
            const acrMatch = String(label).match(/\(([A-Za-z0-9]{1,4})\)/);
            if (acrMatch) return acrMatch[1];
            return label;
          }
        }

        // 3) fallback final: devolver la abreviatura tal cual
        return acr;
      })
      .filter(Boolean)
      .join(", ");
  }, [positions, t, lang]);

  return <span className={className}>{translated}</span>;
}

/* ----------------- AddTeamPage component ----------------- */
export default function AddTeamPage(): JSX.Element {
  const { t } = useI18n();
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
    const bannerSelector = ".top-banner";
    const updateOffset = () => {
      const banner = document.querySelector(bannerSelector) as HTMLElement | null;
      const height = banner && getComputedStyle(banner).display !== "none" ? banner.offsetHeight : 0;
      document.documentElement.style.setProperty("--top-offset", `${height}px`);
    };
    updateOffset();
    window.addEventListener("resize", updateOffset);
    const bannerEl = document.querySelector(bannerSelector);
    let mo: MutationObserver | null = null;
    if (bannerEl) {
      mo = new MutationObserver(updateOffset);
      mo.observe(bannerEl, { attributes: true, attributeFilter: ["style", "class"] });
    }
    return () => {
      window.removeEventListener("resize", updateOffset);
      if (mo) mo.disconnect();
    };
  }, []);

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
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"> <rect width="100%" height="100%" fill="${colorBg}" rx="${Math.round(size * 0.08)}" /> <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="${Math.round(size * 0.45)}" fill="${colorFg}" font-weight="700">${initials}</text> </svg>`;
    return svgToBase64DataUrl(svg);
  }

  function normalizeDataUrl(raw?: string | null): string | null {
    if (!raw) return null;
    let s = String(raw).trim();
    while (s.endsWith(";")) s = s.slice(0, -1);
    if (/^data:image\/[a-z0-9.+-]+;(base64,|utf8,|,)/i.test(s) || /^data:image\/svg\+xml;base64,/.test(s)) return s;
    if (/^[A-Za-z0-9+/=]{20,}$/.test(s)) return `data:image/png;base64,${s}`;
    if (s.includes("<svg")) {
      try {
        const encoded = btoa(unescape(encodeURIComponent(s)));
        return `data:image/svg+xml;base64,${encoded}`;
      } catch {
        return null;
      }
    }
    if (/^https?:\/\//i.test(s)) return s;
    return null;
  }

  function sanitizePhoto(raw: string): string | null {
    if (!raw) return null;
    const s = raw.trim();
    if (s.includes("<svg")) return svgToBase64DataUrl(s);
    if (/^data:image\/[a-z0-9.+-]+;/.test(s) || /^data:image\/svg\+xml,/.test(s)) return s;
    if (/^[A-Za-z0-9+/=]{20,}$/.test(s)) return `data:image/png;base64,${s}`;
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
    const header = rows.shift()!.map((h) => h.trim().toLowerCase());
    const idxNombre = header.indexOf("name");
    const idxNumero = header.indexOf("number") >= 0 ? header.indexOf("number") : header.indexOf("number");
    const idxPosiciones = header.indexOf("positions");
    const idxTitular = header.indexOf("summoned");
    const idxFoto = header.indexOf("photo");
    return rows
      .map((cols) => {
        const get = (idx: number) => (idx >= 0 && idx < cols.length ? cols[idx].trim() : "");
        return {
          nombre: get(idxNombre) ?? "",
          numero: get(idxNumero) ?? "0",
          posiciones: (get(idxPosiciones) ?? "").split(",").map((s) => s.trim()).filter(Boolean),
          titular: get(idxTitular) ?? "",
          foto: get(idxFoto) ?? "",
        };
      })
      .filter((r) => r.nombre || r.numero || r.posiciones.length || r.foto);
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
    setPlayers((prev) => [newPlayer, ...prev]);
    setExpandedIndex(0);
  };

  const removePlayer = async (idx: number): Promise<void> => {
    const playerToRemove = players[idx];
    if (!playerToRemove) {
      setExpandedIndex(null);
      return;
    }

    // 1) Actualizar state local
    let newPlayers: typeof players = [];
    setPlayers((prev) => {
      newPlayers = prev.filter((_, i) => i !== idx);
      return newPlayers;
    });
    setExpandedIndex(null);

    // 2) Sincronizar en servidor: actualizar team.players (no tocar /players)
    await syncPlayersToTeam(newPlayers);
  };

  const updatePlayerField = <K extends keyof PlayerForm>(idx: number, key: K, value: PlayerForm[K]) => {
    setPlayers((prev) => {
      const next = prev.slice();
      next[idx] = { ...next[idx], [key]: value };
      return next;
    });
  };

  const handlePlayerPhotoChange = async (idx: number, file: File | null) => {
    if (!file) return;
    const dataUrl = await fileToDataUrl(file);
    setPlayers((prev) => {
      const next = prev.slice();
      next[idx].photo = file;
      next[idx].photoPreview = dataUrl;
      return next;
    });
  };

    // helper: id corto tipo hex
  const generateId = (): number => {
  return Math.floor(Date.now() % 1_000_000_000) + Math.floor(Math.random() * 900);
};


  // helper: sincroniza players al team (PUT /teams/:id)
  const syncPlayersToTeam = async (newPlayers: PlayerForm[]) => {
    if (!id) return;
    try {
      const teamRes = await api.get(`/teams/${id}`);
      const currentTeam: any = teamRes.data;
      const teamPayload = {
        ...currentTeam,
        players: newPlayers.map((p) => ({
          id: Number(p.id ?? generateId()), // forzar number
          name: p.name,
          number: Number(p.number) || 0,
          positions: Array.isArray(p.positions) ? p.positions : [],
          photo: p.photoPreview ?? undefined,
          isStarter: !!p.isStarter,
          positionSlot: p.positionSlot ?? undefined,
        })),
      };
      await api.put(`/teams/${id}`, teamPayload);
    } catch (err) {
      console.error("PUT /teams/:id (sync players) failed:", err);
      setError("No se pudo sincronizar los jugadores en el servidor. Revisa la consola.");
    }
  };

  /* ---------- Save player (comprimir) ---------- */
  const savePlayer = async (idx: number) => {
    const p = players[idx];
    if (!p) return;
    if (!p.name || p.name.trim() === "") {
      setError("El jugador debe tener un nombre antes de guardar.");
      return;
    }
    setError(null);
    setExpandedIndex(null);

    // Construir copia tipada explícitamente
    const copy: PlayerForm[] = players.map((pl, i) =>
      i === idx
        ? {
            ...pl,
            id: pl.id ?? generateId(), // ahora id es number
            name: pl.name.trim(),
            number: Number(pl.number) || 0,
            positions: Array.isArray(pl.positions) ? pl.positions : [],
            photo: pl.photo ?? null,
            photoPreview: pl.photoPreview ?? null,
            isStarter: !!pl.isStarter,
            positionSlot: pl.positionSlot ?? null,
          }
        : pl
    );

    // Actualizar state y sincronizar
    setPlayers(copy);
    // sincronizar en background (o await si prefieres bloquear)
    syncPlayersToTeam(copy);
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
        if (!photoPreview) {
          const teamColorBg = id && id.toString().toLowerCase().includes("barca") ? "#A50044" : "#0b1220";
          const teamColorFg = id && id.toString().toLowerCase().includes("barca") ? "#FFD400" : "#ffffff";
          photoPreview = generatePlayerSvgDataUrl(row.nombre || "Player", teamColorBg, teamColorFg);
        } else {
          const normalized = normalizeDataUrl(photoPreview);
          if (normalized) photoPreview = normalized;
          else {
            photoPreview = generatePlayerSvgDataUrl(row.nombre || "Player");
          }
        }

        // Normalize posiciones: convert display variants to acronyms
        const normalizedPositions = (row.posiciones ?? []).map((pos) => {
          const lower = String(pos).trim().toLowerCase();
          const fromMap = DISPLAY_TO_ACRONYM[lower];
          if (fromMap) return fromMap;
          // try underscore/hyphen variants
          const underscored = lower.replace(/\s+/g, "_");
          const hyphened = lower.replace(/\s+/g, "-");
          if (DISPLAY_TO_ACRONYM[underscored]) return DISPLAY_TO_ACRONYM[underscored];
          if (DISPLAY_TO_ACRONYM[hyphened]) return DISPLAY_TO_ACRONYM[hyphened];
          // fallback: if pos already looks like an acronym (1-3 letters), keep it
          if (/^[a-z]{1,3}$/.test(lower)) return lower;
          // otherwise try to map common words -> acronyms (best-effort)
          if (lower.includes("goal")) return "gk";
          if (lower.includes("back") && lower.includes("right")) return "rb";
          if (lower.includes("back") && lower.includes("left")) return "lb";
          // default: return underscored (may be a canonical key)
          return underscored;
        });
        imported.push({
          id: generateId(), // number
          name: row.nombre || "",
          number: parseInt(row.numero) || 0,
          positions: normalizedPositions,
          photo: null,
          photoPreview,
          isStarter: ["si", "sí", "yes", "true", "1", "x"].includes((row.titular || "").trim().toLowerCase()),
          positionSlot: null,
        });
      }
      setPlayers((prev) => [...imported, ...prev]);
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
    const header = "name;number;positions;summoned;photo";
    const lines = players.map((p) => {
      const nombre = (p.name ?? "").replace(/"/g, '""');
      const numero = String(p.number ?? 0);
      const posiciones = (p.positions ?? []).join(",").replace(/"/g, '""');
      const titular = p.isStarter ? "si" : "";
      const foto = (p.photoPreview ?? "").replace(/"/g, '""');
      return `${nombre};${numero};${posiciones};${titular};"${foto}"`;
    });
    const csv = [header, ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "players.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  /* ---------- Submit (guardar equipo y jugadores) ---------- */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      setLoading(true);

      // Validar duplicados
      try {
        const allTeamsRes = await api.get("/teams");
        const allTeams: Team[] = allTeamsRes.data || [];
        const currentName = teamName.trim().toLowerCase();
        const isDuplicate = allTeams.some(t => t.name?.trim().toLowerCase() === currentName && String(t.id) !== String(id));
        if (isDuplicate) {
          setError("Ya existe un equipo con ese nombre. Elige otro nombre único.");
          setLoading(false);
          return;
        }
      } catch (checkErr) {
        console.warn("No se pudo validar nombres duplicados:", checkErr);
      }

      // payload base del equipo
      const teamPayload: Partial<Team> = {
        name: teamName.trim(),
        description: teamDescription.trim(),
        logo: teamLogoPreview ?? undefined,
      };

      // Crear o actualizar equipo (sin players aún)
      let savedTeam: Team | null = null;
      if (id) {
        const res = await api.put(`/teams/${id}`, { ...teamPayload });
        savedTeam = res.data;
      } else {
        const res = await api.post(`/teams`, teamPayload);
        savedTeam = res.data;
      }

      if (!savedTeam || savedTeam.id === undefined || savedTeam.id === null) {
        setError("El servidor no devolvió un id válido para el equipo.");
        setLoading(false);
        return;
      }

      // Construir players desde el state y persistirlos dentro del team
      const persistedPlayers = players.map(p => ({
        id: p.id,
        name: p.name.trim(),
        number: Number(p.number) || 0,
        positions: p.positions,
        photo: p.photoPreview ?? undefined,
        isStarter: !!p.isStarter,
        positionSlot: p.positionSlot ?? undefined,
      }));

      // Actualizar team con players embebidos
      await api.put(`/teams/${savedTeam.id}`, { ...savedTeam, players: persistedPlayers });

      setError(null);
      navigate(`/teams/${savedTeam.id}`);
    } catch (err) {
      console.error("save team failed", err);
      setError(`No se pudo guardar el equipo. ${(err as any)?.message ?? String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  /* ---------- Load team & players ---------- */
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        if (id) {
          const res = await api.get(`/teams/${id}`);
          const tteam: Team = res.data;
          setTeamName(tteam.name ?? "");
          setTeamDescription(tteam.description ?? "");
          setTeamLogoPreview(tteam.logo ?? null);

          const rawPlayers: Player[] = Array.isArray((tteam as any).players) ? (tteam as any).players : [];
          const mapped: PlayerForm[] = rawPlayers.map((p: Player) => ({
            id: p.id,
            name: p.name ?? "",
            number: p.number ?? 0,
            positions: Array.isArray(p.positions) ? p.positions : (p.positions ? [String(p.positions)] : []),
            photo: null,
            photoPreview: p.photo ?? null,
            isStarter: !!p.isStarter,
            positionSlot: (p as any).positionSlot ?? null,
          }));
          setPlayers(mapped);
        } else {
          setTeamName("");
          setTeamDescription("");
          setTeamLogoPreview(null);
          setPlayers([]);
        }
      } catch (e) {
        console.error("load team failed", e);
        setError("No se pudo cargar el equipo.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  /* ---------- Render ---------- */
  if (loading) {
    return (
      <div>
        <Menu />
        <section className="page-wrapper">
          <p>{t("loading")}</p>
        </section>
      </div>
    );
  }

  return (
    <div>
      <Menu />
      <section className="page-wrapper">
        <header className="editor-header">
          <h2>{id ? t("edit_team") : t("add_team")}</h2>
          <div className="editor-actions">
            <button className="btn" onClick={handleExportCSV}>
              {t("export_players")}
            </button>
          </div>
        </header>

        {error && <p className="error">{error}</p>}

        <div className="form-top-actions" role="toolbar" aria-label="Form actions">
          <div className="form-top-left">
            <button type="button" className="btn btn-back" onClick={() => navigate(id ? `/teams/${id}` : "/teams")}>
              {t("back")}
            </button>
          </div>

          <div className="form-top-right">
            <button
              type="button"
              className="btn btn-save"
              onClick={() => {
                const form = document.getElementById("team-form") as HTMLFormElement | null;
                if (form?.requestSubmit) form.requestSubmit();
                else form?.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
              }}
            >
              {t("save_team")}
            </button>
          </div>
        </div>

        <form id="team-form" onSubmit={handleSubmit} className="team-form">
          <div className="team-grid">
            <div className="team-block">
              <label className="label">{t("team_name")}</label>
              <input className="input" type="text" value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="Team name" required />
            </div>

            <div className="team-block">
              <label className="label">{t("description")}</label>
              <textarea className="textarea" value={teamDescription} onChange={(e) => setTeamDescription(e.target.value)} placeholder="Team description" rows={3} />
            </div>

            <div className="team-block">
              <label className="label">{t("shield")}</label>
              <div className="file-row">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) fileToDataUrl(f).then(setTeamLogoPreview);
                  }}
                />
                {teamLogoPreview && <img src={normalizeDataUrl(teamLogoPreview) ?? undefined} alt="Logo preview" className="logo-preview" />}
              </div>
            </div>
          </div>

          <div className="players-header">
            <div className="players-header-row">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <h3>{t("players")} ({players.length})</h3>
                <label
                  className="btn btn--gray"
                  style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8 }}
                >
                  {t("import_players")}
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
                <button type="button" className="btn" onClick={addPlayer}>
                  + {t("add_player")}
                </button>
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
                    {/* Muestra las abreviaturas traducidas (GK, RB, ...) */}
                    <PlayerPositions positions={p.positions} className="player-summary-positions" />
                  </div>

                  <div>
                    <span className="player-summary-starter">{p.isStarter ? t("in_matchday_squad") : ""}</span>
                  </div>
                </div>

                {expandedIndex === i && (
                  <div className="player-editor">
                    <div className="player-row">
                      <label className="label">{t("name")}</label>
                      <input className="input" type="text" value={p.name} onChange={(e) => updatePlayerField(i, "name", e.target.value)} placeholder="Full name" required />
                    </div>

                    <div className="player-row">
                      <label className="label">{t("number")}</label>
                      <input className="input" type="number" value={p.number} onChange={(e) => updatePlayerField(i, "number", Number(e.target.value))} placeholder="7" min={0} />
                    </div>

                    <div className="player-row">
                      <label className="label">{t("positions")}</label>
                      <select
                        className="input"
                        multiple
                        value={p.positions}
                        onChange={(e) => {
                          const selected = Array.from(e.target.selectedOptions).map((o) => o.value);
                          // selected son abreviaturas (ej "gk","rb")
                          updatePlayerField(i, "positions", selected);
                        }}
                        size={6}
                      >
                        {POS_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {t(opt.labelKey)}
                          </option>
                        ))}
                      </select>
                      <div className="hint">{t("select_multiple_positions")}</div>
                    </div>

                    <div className="player-row">
                      <label className="label">{t("photo")}</label>
                      <div className="file-row">
                        <input type="file" accept="image/*" onChange={(e) => handlePlayerPhotoChange(i, e.target.files?.[0] ?? null)} />
                        {(() => {
                          const normalized = normalizeDataUrl(p.photoPreview);
                          const finalSrc = normalized ?? generatePlayerSvgDataUrl(p.name || `Player ${i}`, "#0b1220", "#ffffff");
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
                        {t("in_matchday_squad")}
                      </label>
                    </div>

                    <div className="player-actions" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                      <div>
                        <button type="button" className="btn" onClick={() => savePlayer(i)}>
                          {t("save_player")}
                        </button>
                      </div>

                      <div>
                        <button type="button" className="btn btn--danger" onClick={() => removePlayer(i)}>
                          {t("remove")}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </form>
      </section>
    </div>
  );
}