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
 * DISPLAY_TO_ACRONYM: Maps saved text variants (lowercased)
* to the abbreviation we want to store/use in the UI (e.g., “gk,” “rb”).
* Add localized variants that may occur here.
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

  // centre-back
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
   - value: the abbreviation we save in p.positions (e.g., “gk,” “rb”)
   - labelKey: the translation key that displays the full text (e.g., “goalkeeper”)
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
 * Displays the translated abbreviations (e.g., “GK,” “RB”) from p.positions, 
 * which now contain only the abbreviations.
*/
function PlayerPositions({ positions, className }: { positions?: string[] | null; className?: string }) {
  const { t, lang } = useI18n();

  const translated = useMemo(() => {
    if (!positions || positions.length === 0) return "—";

    return positions
      .map((acr) => {
        if (!acr) return "";
        const key = normalizeLower(acr); 
        // 1) We try t("gk") 
        const rootTry = t(key);
        if (rootTry && rootTry !== key) return rootTry;

        // 2) fallback: if it doesn't exist, try to map to labelKey (e.g., “goalkeeper”) and display its full text
        //    (this is rare if we store acronyms, but we leave it in for safety)
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
            // If label is “Goalkeeper (GK),” we return only the acronym,
            // but here we return the preferred abbreviation (t(key)) if it exists, or the full label.
            // To keep the view collapsed with only acronyms, we try to extract the abbreviation:
            const acrMatch = String(label).match(/\(([A-Za-z0-9]{1,4})\)/);
            if (acrMatch) return acrMatch[1];
            return label;
          }
        }

        // 3) final fallback: return the abbreviation as is
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

  /**
   * Ensure the height of the top banner (.top-banner) at all times and save it in a CSS variable --top-offset.
   */
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

  /**
   * Convert a file into a base64 data URL. 
   * This is useful for previewing images in the browser without having to upload them to the server.
   * @param file 
   * @returns Base64 URL
   */
  async function fileToDataUrl(file: File): Promise<string> {
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /**
   * Converts an SVG string (example: “<svg>...</svg>”) into a Base64 Data URL. 
   * Like the previous function, this allows you to view it without having to save it at that moment.
   * @param svg 
   * @returns Base64 URL
   */
  function svgToBase64DataUrl(svg: string) {
    const encoded = btoa(unescape(encodeURIComponent(svg)));
    return `data:image/svg+xml;base64,${encoded}`;
  }

  /**
   * Convert text into its acronym. This is to replace the photo of a player who does not have their acronyms.
   * @param name 
   * @returns Acronym for name
   */
  function makeInitials(name: string) {
    if (!name) return "P";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + (parts[1][0] ?? "")).toUpperCase();
  }

  /**
   * It creates an SVG with the player's initials on a colored background, converts it to Base64, and returns it as a Data URL. 
   * This combines two of the functions mentioned above.
   * @param name 
   * @param colorBg 
   * @param colorFg 
   * @param size 
   * @returns Base64 URL
   */
  function generatePlayerSvgDataUrl(name: string, colorBg = "#0b1220", colorFg = "#ffffff", size = 128) {
    const initials = makeInitials(name);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"> <rect width="100%" height="100%" fill="${colorBg}" rx="${Math.round(size * 0.08)}" /> <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="${Math.round(size * 0.45)}" fill="${colorFg}" font-weight="700">${initials}</text> </svg>`;
    return svgToBase64DataUrl(svg);
  }

  /**
   * Image validator and normalizer.
   * @param raw Any input that can represent an image (base64, SVG, URL, etc.).
   * @returns Valid URL format or HTTP/HTTPS URL if hosted on the web, or null if invalid.
   */
  function normalizeDataUrl(raw?: string | null): string | null {
    if (!raw) return null;
    let s = String(raw).trim();
    while (s.endsWith(";")) s = s.slice(0, -1);
    if (/^data:image\/[a-z0-9.+-]+;(base64,|utf8,|,)/i.test(s) || /^data:image\/svg\+xml;base64,/.test(s)) return s;
    if (/^[A-Za-z0-9+/=]{20,}$/.test(s)) return `data:image/png;base64,${s}`;
    if (s.includes("<svg")) {
      try {
        return svgToBase64DataUrl(s)
      } catch {
        return null;
      }
    }
    if (/^https?:\/\//i.test(s)) return s;
    return null;
  }

  /**
   * Image validator and normalizer.
   * @param raw Image
   * @returns Valid URL format or HTTP/HTTPS URL if hosted on the web, or null if invalid..
   */
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
  
  /**
   * Read a CSV text (with separator ; and headers such as name;number;positions;summoned;photo) and convert it into an array of objects 
   * with normalized fields: name, number, positions, titular, photo (which are the same words but in Spanish).
   * @param text Full CSV
   * @returns JavaScript object array with the CSV information.
   */
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

  /**
   * Asynchronous function that receives the index of the player to be removed from the players array.
   * @param idx id of the player.
   */
  const removePlayer = async (idx: number): Promise<void> => {
    const playerToRemove = players[idx];
    if (!playerToRemove) {
      setExpandedIndex(null);
      return;
    }

    // 1) Update local state
    let newPlayers: typeof players = [];
    setPlayers((prev) => {
      newPlayers = prev.filter((_, i) => i !== idx);
      return newPlayers;
    });
    setExpandedIndex(null);

    // 2) Synchronize on server
    await syncPlayersToTeam(newPlayers);
  };

  /**
   * Update player fields
   * @param idx player id
   * @param key fields name
   * @param value changed value
   */
  const updatePlayerField = <K extends keyof PlayerForm>(idx: number, key: K, value: PlayerForm[K]) => {
    setPlayers((prev) => {
      const next = prev.slice();
      next[idx] = { ...next[idx], [key]: value };
      return next;
    });
  };

  /**
   * Update a player's photo when the user selects a file in the input. 
   * Both the actual file and a preview (dataUrl) are saved so that it can be displayed immediately in the UI.
   * @param idx player id
   * @param file player new photo
   */
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


  /**
   * Create a ID by combining: the current time (last 9 digits), and a random number between 0 and 899. 
   * It is used as a temporary identifier in the frontend for players/teams before synchronizing with the backend.
   * @returns Unique numeric ID
   */
  const generateId = (): number => {
  return Math.floor(Date.now() % 1_000_000_000) + Math.floor(Math.random() * 900);
};


  /**
   * Keeps team players synchronized with the server. Every time players are added, edited, 
   * or deleted in the frontend, this function updates the team object in the backend (PUT /teams/:id).
   * @param newPlayers 
   * @returns 
   */
  const syncPlayersToTeam = async (newPlayers: PlayerForm[]) => {
    if (!id) return;
    try {
      const teamRes = await api.get(`/teams/${id}`);
      const currentTeam: any = teamRes.data;
      const teamPayload = {
        ...currentTeam,
        players: newPlayers.map((p) => ({
          id: Number(p.id ?? generateId()), 
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
      setError(t("players_not_synchronized"));
    }
  };

  /* ---------- Save player (compress) ---------- */

  /**
   * Save a player's changes to the local state and synchronize them with the server. 
   * This action is performed when the user clicks the “Save player” button.
   * @param idx Player id
   */
  const savePlayer = async (idx: number) => {
    const p = players[idx];
    if (!p) return;
    if (!p.name || p.name.trim() === "") {
      setError(t("player_must_have_name"));
      return;
    }
    setError(null);
    setExpandedIndex(null);

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

    setPlayers(copy);
    syncPlayersToTeam(copy);
  };

  /* ---------- Import CSV ---------- */

  /**
   * Import a CSV file of players and convert it into ready-to-use PlayerForm objects, 
   * with photos and normalized positions.
   * @param file 
   */
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
          photoPreview = generatePlayerSvgDataUrl(row.nombre || "Player", "#0b1220", "#ffffff");
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
      setError(t("csv_import_error"));
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  /* ---------- Export CSV ---------- */

  /**
   * Generate a CSV file with all current players and force the download in the browser.
   */
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

  /* ---------- Submit ---------- */

  /**
   * Manage the submission of the equipment form. Save the complete equipment.
   * @param e 
   * @returns 
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      setLoading(true);

      // Validate duplicates
      try {
        const allTeamsRes = await api.get("/teams");
        const allTeams: Team[] = allTeamsRes.data || [];
        const currentName = teamName.trim().toLowerCase();
        const isDuplicate = allTeams.some(t => t.name?.trim().toLowerCase() === currentName && String(t.id) !== String(id));
        if (isDuplicate) {
          setError(t("players_name_exist"));
          setLoading(false);
          return;
        }
      } catch (checkErr) {
        console.warn(t("error_validating_names"), checkErr);
      }

      // base payload of the equipment
      const teamPayload: Partial<Team> = {
        name: teamName.trim(),
        description: teamDescription.trim(),
        logo: teamLogoPreview ?? undefined,
      };

      // Create or update team (no players yet)
      let savedTeam: Team | null = null;
      if (id) {
        const res = await api.put(`/teams/${id}`, { ...teamPayload });
        savedTeam = res.data;
      } else {
        const res = await api.post(`/teams`, teamPayload);
        savedTeam = res.data;
      }

      if (!savedTeam || savedTeam.id === undefined || savedTeam.id === null) {
        setError(t("no_team_id"));
        setLoading(false);
        return;
      }

      // Build players from the state and persist them within the team
      const persistedPlayers = players.map(p => ({
        id: p.id,
        name: p.name.trim(),
        number: Number(p.number) || 0,
        positions: p.positions,
        photo: p.photoPreview ?? undefined,
        isStarter: !!p.isStarter,
        positionSlot: p.positionSlot ?? undefined,
      }));

      // Update team with embedded players
      await api.put(`/teams/${savedTeam.id}`, { ...savedTeam, players: persistedPlayers });

      setError(null);
      navigate(`/teams/${savedTeam.id}`);
    } catch (err) {
      console.error(t("save_team_failed"), err);
      setError(`${t("could_not_save_team")} ${(err as any)?.message ?? String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  /* ---------- Load team & players ---------- */

  /**
   * If there is an ID, load the equipment from the backend and fill in the form with its details. 
   * If there is no ID, initialize the empty form to create new equipment.
   */
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
        console.error(t("load_team_failed"), e);
        setError(t("could_not_load_team"));
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