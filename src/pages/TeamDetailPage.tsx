/* eslint-disable @typescript-eslint/no-explicit-any */
// src/pages/TeamDetailPage.tsx
import React, { JSX, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../services/api";
import type { Team, Player } from "../types/types";
import Menu from "../components/Menu";
import Info from "../components/Info";
import Warning from "../components/Warning";
import PlayerCard from "../components/PlayerCard";
import PlayerModal from "../components/PlayerModal";
import { useI18n } from "../i18n/I18nProvider";
import "./TeamDetailPage.css";
import { langToAcronym } from "../utils/langAcronym";

/* ---------- Tipos locales ---------- */
type LineupSlot = {
  slotId: string;
  positionHint: string;
  playerId?: number | string | null;
  left?: string;
  top?: string;
  noAutoFill?: boolean;
};

type TeamWithExtras = Team & { logo?: string; crest?: string; photo?: string; lineup?: LineupSlot[] };

/* ---------- Plantilla de slots ---------- */
const DEFAULT_SLOTS_TEMPLATE: LineupSlot[] = [
  { slotId: "GK-1", positionHint: "GK", left: "50%", top: "82%" },
  { slotId: "DEF-1", positionHint: "DEF", left: "12%", top: "68%" },
  { slotId: "DEF-2", positionHint: "DEF", left: "32%", top: "68%" },
  { slotId: "DEF-3", positionHint: "DEF", left: "68%", top: "68%" },
  { slotId: "DEF-4", positionHint: "DEF", left: "88%", top: "68%" },
  { slotId: "MID-1", positionHint: "MID", left: "22%", top: "46%" },
  { slotId: "MID-2", positionHint: "MID", left: "50%", top: "46%" },
  { slotId: "MID-3", positionHint: "MID", left: "78%", top: "46%" },
  { slotId: "FWD-1", positionHint: "FWD", left: "22%", top: "22%" },
  { slotId: "FWD-2", positionHint: "FWD", left: "50%", top: "22%" },
  { slotId: "FWD-3", positionHint: "FWD", left: "78%", top: "22%" },
];

const LINEUP_STORAGE_KEY = (teamId: string | number) => `team_lineup_${teamId}`;

/* ---------- Helpers de almacenamiento ---------- */
function saveLineupToStorage(teamId: string | number, lineup: LineupSlot[]) {
  try {
    localStorage.setItem(LINEUP_STORAGE_KEY(teamId), JSON.stringify(lineup));
  } catch {
    /* ignore */
  }
}
function loadLineupFromStorage(teamId: string | number): LineupSlot[] | null {
  try {
    const raw = localStorage.getItem(LINEUP_STORAGE_KEY(teamId));
    return raw ? (JSON.parse(raw) as LineupSlot[]) : null;
  } catch {
    return null;
  }
}
function clearLineupStorage(teamId: string | number) {
  try {
    localStorage.removeItem(LINEUP_STORAGE_KEY(teamId));
  } catch {
    /* ignore */
  }
}

/* ---------- Matching de posiciones ---------- */
function posMatchesHint(pos: string, hint: string) {
  const p = String(pos || "").toLowerCase();
  const h = String(hint || "").toLowerCase();
  if (h === "gk") return p.includes("gk") || p.includes("goal");
  if (h === "def")
    return ["cb", "lb", "rb", "fb", "def", "dc"].some((x) => p.includes(x));
  if (h === "mid")
    return ["cm", "dm", "am", "mid", "mc"].some((x) => p.includes(x));
  if (h === "fwd") return ["st", "cf", "fw", "att"].some((x) => p.includes(x));
  return p.includes(h);
}

/* ---------- Construye alineación inicial SOLO con titulares ---------- */
function buildInitialLineup(slotsTemplate: LineupSlot[], players: Player[]) {
  const starters = players.filter((p) => p.isStarter);
  const lineup: LineupSlot[] = slotsTemplate.map((s) => ({
    ...s,
    playerId: null as number | string | null,
    noAutoFill: false,
  }));
  const available = starters.slice();
  for (const slot of lineup) {
    const idx = available.findIndex((p) =>
      (p.positions || []).some((pos) => posMatchesHint(pos, slot.positionHint))
    );
    if (idx >= 0) {
      slot.playerId = available[idx].id;
      available.splice(idx, 1);
    }
  }
  for (const slot of lineup) {
    if (!slot.playerId && available.length) {
      slot.playerId = available.shift()!.id;
    }
  }
  return lineup;
}

/* ---------- Componente ---------- */
export default function TeamDetailPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useI18n();
  const { lang } = useI18n();
  let langAcronym = langToAcronym(lang);

  /* ---------- Estado y refs (todos los hooks al inicio) ---------- */
  const [team, setTeam] = useState<TeamWithExtras | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [, setError] = useState<string | null>(null);

  const [fieldSlots, setFieldSlots] = useState<LineupSlot[]>([]);
  const [, setInitialLineup] = useState<LineupSlot[] | null>(null);

  const [news, setNews] = useState<any[] | null>(null);
  const [newsLoading, setNewsLoading] = useState<boolean>(false);
  const [newsError, setNewsError] = useState<string | null>(null);

  const [saving, setSaving] = useState<boolean>(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const fieldRef = useRef<HTMLDivElement | null>(null);
  const benchRef = useRef<HTMLDivElement | null>(null);
  const [benchHeightPx, setBenchHeightPx] = useState<number | null>(null);
  const [showFullDesc, setShowFullDesc] = useState<boolean>(false);

  const [preventAutoFill, setPreventAutoFill] = useState<boolean>(false);
  const preventAutoFillRef = useRef<boolean>(preventAutoFill);
  useEffect(() => {
    preventAutoFillRef.current = preventAutoFill;
  }, [preventAutoFill]);

  /* Tabs / Players UI state */
  const [activeTab, setActiveTab] = useState<"lineup" | "players">("lineup");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);

  /* Placeholder image used when player/team has no photo */
  const placeholderImg =
    "https://images.unsplash.com/photo-1521417532886-55d2f88f0a52?q=80&w=1200&auto=format&fit=crop";

  /* ---------- Carga del equipo y jugadores desde API ---------- */
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        if (!id) {
          setError("Team id missing");
          setLoading(false);
          return;
        }
        const [teamRes, playersRes] = await Promise.all([
          api.get(`/teams/${id}`),
          api.get(`/players`, { params: { teamId: id } }),
        ]);
        if (cancelled) return;
        const tTeam = teamRes.data as TeamWithExtras;
        setTeam(tTeam);
        const plsRaw: unknown[] = Array.isArray(playersRes.data) ? playersRes.data : [];
        const pls: Player[] = plsRaw.map((pRaw) => {
          const p = pRaw as Record<string, unknown>;
          return {
            id: (p.id as number) ?? (p.id as string) ?? Math.random().toString(36).slice(2),
            name: typeof p.name === "string" ? p.name : "",
            number:
              typeof p.number === "number"
                ? p.number
                : typeof p.number === "string" && !Number.isNaN(Number(p.number))
                ? Number(p.number)
                : 0,
            positions: Array.isArray(p.positions) ? (p.positions as string[]) : typeof p.positions === "string" ? [p.positions as string] : [],
            photo: typeof p.photo === "string" ? p.photo : null,
            photoPreview: typeof p.photo === "string" ? (p.photo as string) : placeholderImg,
            isStarter: Boolean(p.isStarter),
          } as Player;
        });
        setPlayers(pls);
      } catch (err) {
        console.error(err);
        setError("No se pudo cargar el equipo o sus jugadores.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  /* ---------- Construcción de alineación inicial ---------- */
  useEffect(() => {
    if (!players || players.length === 0 || !id || !team) return;
    const built = buildInitialLineup(DEFAULT_SLOTS_TEMPLATE, players);
    setInitialLineup(built);
    const backendLineupCandidate = team.lineup;
    const backendIsValid = Array.isArray(backendLineupCandidate) && backendLineupCandidate.some((s) => s && s.playerId !== null && s.playerId !== undefined);
    if (backendIsValid) {
      const normalized = (backendLineupCandidate as LineupSlot[]).map((s) => ({ ...s, noAutoFill: Boolean(s.noAutoFill) }));
      setFieldSlots(normalized);
      saveLineupToStorage(id, normalized);
      return;
    }
    const saved = loadLineupFromStorage(id);
    const savedIsValid = Array.isArray(saved) && saved.some((s) => s && s.playerId !== null && s.playerId !== undefined);
    if (savedIsValid) {
      setFieldSlots(saved as LineupSlot[]);
    } else {
      setFieldSlots(built);
      saveLineupToStorage(id, built);
    }
  }, [players, id, team]);

  /* Persistencia local */
  useEffect(() => {
    if (!id) return;
    saveLineupToStorage(id, fieldSlots);
  }, [fieldSlots, id]);

  /* Bench height sync */
  useLayoutEffect(() => {
    function updateBenchHeight() {
      const fieldEl = fieldRef.current;
      if (!fieldEl) return;
      const rect = fieldEl.getBoundingClientRect();
      setBenchHeightPx(Math.round(rect.height));
    }
    updateBenchHeight();
    window.addEventListener("resize", updateBenchHeight);
    return () => window.removeEventListener("resize", updateBenchHeight);
  }, [fieldSlots.length]);

  /* ---------- Noticias del equipo (opcional) ---------- */
  const NEWSAPI_KEY = "6866d2f9cd2b482da43ecda2e5fdf898";
  const teamAliases = useMemo(() => {
    const name = team?.name?.trim() || "";
    if (!name) return [] as string[];
    const base = new Set<string>([
      name,
      `${name} CF`,
      `${name} FC`,
      `${name} C.F.`,
      `${name} F.C.`,
      `${name} Club de Fútbol`,
    ]);
    return Array.from(base);
  }, [team?.name]);

  useEffect(() => {
    const name = team?.name?.trim();
    if (!name) return;
    let cancelled = false;
    async function loadNews() {
      try {
        setNewsLoading(true);
        setNewsError(null);
        const apiKey = NEWSAPI_KEY?.trim();
        if (!apiKey) {
          setNewsError("No hay API key configurada para noticias.");
          setNews([]);
          return;
        }
        const q = `(${teamAliases.map((a) => `"${a}"`).join(" OR ")}) AND (fútbol OR soccer OR LaLiga) NOT (baloncesto OR basket)`;
        const domains = [
          "marca.com",
          "as.com",
          "mundodeportivo.com",
          "sport.es",
          "besoccer.com",
          "goal.com",
          "eurosport.com",
          "espn.com",
          "bbc.com",
        ].join(",");

        if(langAcronym!="es"){
          langAcronym = "en";
        }

        const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(q)}&language=${langAcronym}&sortBy=publishedAt&pageSize=20&domains=${encodeURIComponent(
          domains
        )}&searchIn=title,description&apiKey=${apiKey}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`News fetch failed: ${res.status} ${res.statusText}`);
        const data = await res.json();
        if (cancelled) return;
        const articles: any[] = Array.isArray(data.articles) ? data.articles : [];
        const seen = new Set<string>();
        const deduped = articles.filter((a) => {
          const key = (a.url ?? `${a.title}-${a.publishedAt}`) as string;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        const filtered = deduped.filter((a) => {
          const text = `${a.title ?? ""} ${a.description ?? ""}`.toLowerCase();
          return teamAliases.some((alias) => text.includes(alias.toLowerCase()));
        });
        setNews(filtered);
      } catch (err) {
        console.error("load news failed", err);
        setNewsError("No se pudieron cargar noticias.");
        setNews([]);
      } finally {
        if (!cancelled) setNewsLoading(false);
      }
    }
    loadNews();
    return () => {
      cancelled = true;
    };
  }, [team?.name, NEWSAPI_KEY, teamAliases]);

  /* ---------- Render helpers (hooks still here) ---------- */
  const playersById = useMemo(() => {
    const map = new Map<string, Player>();
    for (const p of players) if (p.id !== undefined && p.id !== null) map.set(String(p.id), p);
    return map;
  }, [players]);

  const starters = players.filter((p) => p.isStarter);
  const substitutes = players.filter((p) => !p.isStarter && p.positions && p.positions.length > 0);
  const assignedIds = new Set(fieldSlots.map((s) => s.playerId).filter(Boolean));
  const startersBench = starters.filter((p) => !assignedIds.has(p.id));
  const substitutesBench = substitutes.filter((p) => !assignedIds.has(p.id));

  /* ---------- Player helpers ---------- */
  function normalizePlayer(p: Partial<Player> & Record<string, any>): Player {
    return {
      id: p.id ?? Math.random().toString(36).slice(2),
      name: typeof p.name === "string" ? p.name : "",
      number: typeof p.number === "number" ? p.number : typeof p.number === "string" && !Number.isNaN(Number(p.number)) ? Number(p.number) : 0,
      positions: Array.isArray(p.positions) ? (p.positions as string[]) : typeof p.positions === "string" ? [p.positions as string] : [],
      photo: typeof p.photo === "string" ? p.photo : null,
      photoPreview: typeof p.photo === "string" ? p.photo : placeholderImg,
      isStarter: Boolean(p.isStarter),
    } as Player;
  }

  function openPlayer(p: Player | null) {
    if (!p) {
      setSelectedPlayer(null);
      return;
    }
    setSelectedPlayer(normalizePlayer(p));
  }

  /* ---------- Drag & drop helpers ---------- */
  function onDragStartFromField(e: React.DragEvent, playerId: number | string, fromSlotId: string) {
    setPreventAutoFill(false);
    preventAutoFillRef.current = false;
    e.dataTransfer.setData("text/plain", `${playerId}|${fromSlotId}`);
    e.dataTransfer.effectAllowed = "move";
  }
  function onDragStartFromBench(e: React.DragEvent, playerId: number | string) {
    const dragged = playersById.get(String(playerId));
    if (!dragged || !dragged.isStarter) {
      e.preventDefault();
      return;
    }
    setPreventAutoFill(false);
    preventAutoFillRef.current = false;
    e.dataTransfer.setData("text/plain", `${playerId}|`);
    e.dataTransfer.effectAllowed = "move";
  }
  function onDragOverSlot(e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    (e.currentTarget as HTMLElement).classList.add("drag-over");
  }

  function ensureFieldNotEmpty(nextSlots: LineupSlot[], currentPlayers: Player[]) {
    if (preventAutoFillRef.current) return nextSlots;
    const hasStarters = currentPlayers.some((p) => p.isStarter);
    if (!hasStarters) return nextSlots;
    const assignedIdsLocal = new Set(nextSlots.map((s) => s.playerId).filter(Boolean));
    const bench = currentPlayers.filter((p) => !assignedIdsLocal.has(p.id));
    const next = nextSlots.map((s) => ({ ...s }));
    for (const slot of next) {
      if (slot.playerId) continue;
      if (slot.noAutoFill) continue;
      if (bench.length) slot.playerId = bench.shift()!.id;
    }
    return next;
  }

  function onDropToSlot(e: React.DragEvent, targetSlotId: string) {
    e.preventDefault();
    const raw = e.dataTransfer.getData("text/plain");
    if (!raw) return;
    const [pidRaw, fromSlotIdRaw] = raw.split("|");
    const pid = isNaN(Number(pidRaw)) ? pidRaw : Number(pidRaw);
    const isBenchDrag = typeof fromSlotIdRaw === "string" && fromSlotIdRaw.trim() === "";
    const draggedPlayer = playersById.get(String(pid));
    if (isBenchDrag && draggedPlayer && !draggedPlayer.isStarter) {
      return;
    }
    setFieldSlots((prev) => {
      const next = prev.map((s) => ({ ...s }));
      const target = next.find((s) => s.slotId === targetSlotId);
      if (!target) return prev;
      const fromSlot = next.find((s) => String(s.playerId) === String(pid));
      if (preventAutoFillRef.current || target.noAutoFill) {
        if (fromSlot) fromSlot.playerId = null;
        target.playerId = pid;
        if (id) saveLineupToStorage(id, next);
        return next;
      }
      if (fromSlot && fromSlot.slotId !== target.slotId) {
        const temp = target.playerId;
        target.playerId = fromSlot.playerId;
        fromSlot.playerId = temp;
        const ensuredSwap = ensureFieldNotEmpty(next, players);
        if (id) saveLineupToStorage(id, ensuredSwap);
        return ensuredSwap;
      }
      if (!fromSlot && target.playerId) {
        target.playerId = pid;
        const ensuredReplace = ensureFieldNotEmpty(next, players);
        if (id) saveLineupToStorage(id, ensuredReplace);
        return ensuredReplace;
      }
      target.playerId = pid;
      const ensured = ensureFieldNotEmpty(next, players);
      if (id) saveLineupToStorage(id, ensured);
      return ensured;
    });
  }

  function onDropToBench(e: React.DragEvent) {
    e.preventDefault();
    const raw = e.dataTransfer.getData("text/plain");
    if (!raw) return;
    const [pidRaw, fromSlotIdRaw] = raw.split("|");
    const pid = isNaN(Number(pidRaw)) ? pidRaw : Number(pidRaw);
    const isBenchDrag = typeof fromSlotIdRaw === "string" && fromSlotIdRaw.trim() === "";
    const draggedPlayer = playersById.get(String(pid));
    if (isBenchDrag && draggedPlayer && !draggedPlayer.isStarter) {
      return;
    }
    setFieldSlots((prev) => {
      const next = prev.map((s) => ({ ...s }));
      for (const s of next) if (String(s.playerId) === String(pid)) s.playerId = null;
      const final = preventAutoFillRef.current ? next : ensureFieldNotEmpty(next, players);
      if (id) saveLineupToStorage(id, final);
      return final;
    });
  }

  function onDropOnBenchPlayer(e: React.DragEvent, benchPlayerId: number | string) {
    e.preventDefault();
    const raw = e.dataTransfer.getData("text/plain");
    if (!raw) return;
    const [pidRaw, fromSlotIdRaw] = raw.split("|");
    const pid = isNaN(Number(pidRaw)) ? pidRaw : Number(pidRaw);
    if (String(pid) === String(benchPlayerId)) return;
    const benchPlayer = playersById.get(String(benchPlayerId));
    if (!benchPlayer || !benchPlayer.isStarter) {
      return;
    }
    const isBenchDrag = typeof fromSlotIdRaw === "string" && fromSlotIdRaw.trim() === "";
    const draggedPlayer = playersById.get(String(pid));
    if (isBenchDrag && draggedPlayer && !draggedPlayer.isStarter) {
      return;
    }
    setFieldSlots((prev) => {
      const next = prev.map((s) => ({ ...s }));
      const fromSlot = next.find((s) => String(s.playerId) === String(pid));
      if (!fromSlot) return prev;
      fromSlot.playerId = benchPlayerId;
      if (id) saveLineupToStorage(id, next);
      return next;
    });
  }

  /* ---------- Reset y limpiar ---------- */
  function resetToInitial() {
    if (!players || players.length === 0) return;
    const built = buildInitialLineup(DEFAULT_SLOTS_TEMPLATE, players);
    const unlocked = built.map((s) => ({ ...s, noAutoFill: false }));
    setFieldSlots(unlocked);
    setPreventAutoFill(false);
    preventAutoFillRef.current = false;
    if (id) {
      clearLineupStorage(id);
      saveLineupToStorage(id, unlocked);
    }
  }
  function clearField() {
    setFieldSlots((prev) => {
      const next = prev.map((s) => ({ ...s, playerId: null, noAutoFill: true }));
      if (id) saveLineupToStorage(id, next);
      return next;
    });
    setPreventAutoFill(true);
    preventAutoFillRef.current = true;
  }

  /* ---------- Guardar en backend ---------- */
  async function handleSaveLineup() {
    if (!id || !team) return;
    setSaving(true);
    setSaveMessage(null);
    try {
      const payload = { ...team, lineup: fieldSlots };
      await api.put(`/teams/${id}`, payload);
      setSaveMessage(t("save_lineup_success") ?? "Alineación guardada correctamente.");
      saveLineupToStorage(id, fieldSlots);
      setTeam((prev) => (prev ? ({ ...prev, lineup: fieldSlots } as TeamWithExtras) : prev));
    } catch (err) {
      console.error("save lineup failed", err);
      setSaveMessage(t("save_lineup_error") ?? "Error al guardar la alineación.");
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMessage(null), 3500);
    }
  }

  /* ---------- Derived values ---------- */
  const playerCount = Array.isArray(players) ? players.length : 0;
  const crestCandidate = team ? team.logo ?? team.crest ?? team.photo : null;
  const crestUrl = typeof crestCandidate === "string" ? crestCandidate : null;

  /* ---------- Players tab helpers ---------- */
  const playersForTeam = useMemo(() => {
    if (!Array.isArray(players)) return [];
    return players.filter((p) => {
      if ((p as any).teamId !== undefined && (p as any).teamId !== null) {
        return String((p as any).teamId) === String(team?.id);
      }
      return true;
    });
  }, [players, team?.id]);

  const filteredPlayers = useMemo(() => {
    if (!searchTerm) return playersForTeam;
    const q = searchTerm.toLowerCase();
    return playersForTeam.filter((p) => (p.name || "").toLowerCase().includes(q) || String(p.number || "").includes(q));
  }, [playersForTeam, searchTerm]);

  /* ---------- Render ---------- */
  return (
    <div>
      <Menu />
      <section className="page-wrapper team-page">
        {loading ? (
          <div style={{ padding: 24 }}>
            <p>{t("loading")}</p>
          </div>
        ) : (
          <>
            {playerCount < 11 ? <Warning /> : <Info />}

            <header className="team-header">
              <div className="team-header-left">
                {crestUrl && <img src={crestUrl} alt={`${team?.name} crest`} className="team-crest" />}
                <div className="team-title-block">
                  <h2>{team?.name ?? t("team") ?? "Team"}</h2>
                  {team?.description && (
                    <div className="team-desc-wrapper">
                      <p className={`team-desc-inline ${showFullDesc ? "expanded" : "collapsed"}`}> {team.description} </p>
                      {typeof team.description === "string" && team.description.length > 240 && (
                        <button type="button" className="desc-toggle" onClick={() => setShowFullDesc((s) => !s)} aria-expanded={showFullDesc}>
                          {showFullDesc ? (t("show_less") ?? "Mostrar menos") : (t("show_more") ?? "Mostrar más")}
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <button
                  className="btn btn-save header-save"
                  onClick={handleSaveLineup}
                  disabled={saving}
                  aria-label={t("save_lineup")}
                  title={t("save_lineup")}
                >
                  {saving ? (t("saving") ?? "Guardando...") : t("save_lineup")}
                </button>
                <button
                  className="btn btn-edit"
                  onClick={() => {
                    if (!id) return;
                    navigate(`/teams/add/${id}`);
                  }}
                  title={t("edit_team")}
                >
                  {t("edit_team")}
                </button>
                {saveMessage && <div className="save-message" role="status">{saveMessage}</div>}
              </div>

              <div className="team-header-actions">
                <button className="btn btn-back" onClick={() => navigate("/teams")}>{t("back")}</button>
              </div>
            </header>

            <main className="team-main">
              {/* Tabs: Lineup / Players */}
              <div className="tabs" style={{ marginTop: 8 }}>
                <div className={`tab ${activeTab === "lineup" ? "tab--active" : ""}`} onClick={() => setActiveTab("lineup")}>{t("lineup")}</div>
                <div className={`tab ${activeTab === "players" ? "tab--active" : ""}`} onClick={() => setActiveTab("players")}>{t("players")}</div>
              </div>

              {/* Conditional content */}
              {activeTab === "lineup" ? (
                <div className="team-layout">
                  <div className="field-area" aria-label={t("field_aria") ?? "Field"}>
                    <div className="football-field" role="img" aria-label={t("football_field_aria") ?? "Football field"} ref={fieldRef}>
                      <div className="half-line-horizontal" />
                      <div className="center-circle" />
                      <div className="penalty-top" />
                      <div className="penalty-bottom" />
                      <div className="goal-top" />
                      <div className="goal-bottom" />
                      {fieldSlots.map((slot) => {
                        const player = playersById.get(String(slot.playerId ?? ""));
                        return (
                          <div
                            key={slot.slotId}
                            className="field-slot-absolute"
                            style={{ left: slot.left ?? "50%", top: slot.top ?? "50%" }}
                            onDragOver={onDragOverSlot}
                            onDragLeave={(e) => (e.currentTarget as HTMLElement).classList.remove("drag-over")}
                            onDrop={(e) => {
                              (e.currentTarget as HTMLElement).classList.remove("drag-over");
                              onDropToSlot(e, slot.slotId);
                            }}
                          >
                            {player ? (
                              <div
                                className="player-chip vertical"
                                draggable={Boolean(player.isStarter)}
                                onDragStart={(e) => {
                                  if (!player.isStarter) return;
                                  onDragStartFromField(e, player.id!, slot.slotId);
                                }}
                                title={`${player.name} ${(player.positions || []).join(", ")}`}
                                onDoubleClick={() => openPlayer(player)}
                                onClick={() => openPlayer(player)}
                              >
                                <img src={(player as any).photoPreview ?? placeholderImg} alt={player.name} className="chip-photo large" />
                                <div className="chip-info centered">
                                  <div className="chip-name">{player.name ?? (t("unknown_player") ?? "Unknown player")}</div>
                                  <div className="chip-number">#{player.number}</div>
                                </div>
                              </div>
                            ) : (
                              <div className="slot-empty" aria-hidden>+</div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <div className="field-actions" style={{ marginTop: 12 }}>
                      <button className="btn btn-reset" onClick={resetToInitial}>{t("reset_to_initial")}</button>
                      <button className="btn btn-clear" onClick={clearField}>{t("clean_soccer_field") ?? "Clean soccer field"}</button>
                    </div>
                  </div>

                  <aside
                    className="bench-area"
                    aria-label={t("bench_aria") ?? "Bench and full squad"}
                    ref={benchRef}
                    onDragOver={(e) => { e.preventDefault(); }}
                    onDrop={onDropToBench}
                    style={benchHeightPx ? { height: `${benchHeightPx}px`, maxHeight: `${benchHeightPx}px` } : undefined}
                  >
                    <h3>{t("matchday_squad_bench")}</h3>
                    <div className="bench-list">
                      {startersBench.map((p) => (
                        <div
                          key={p.id}
                          className={`bench-player${p.isStarter ? "" : " bench-not-allowed"}`}
                          draggable={Boolean(p.isStarter)}
                          onDragStart={(e) => { if (!p.isStarter) return; onDragStartFromBench(e, p.id!); }}
                          onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = p.isStarter ? "move" : "none"; }}
                          onDrop={(e) => { if (!p.isStarter) return; onDropOnBenchPlayer(e, p.id!); }}
                          title={p.name}
                          onClick={() => openPlayer(p)}
                        >
                          <img src={(p as any).photoPreview ?? placeholderImg} alt={p.name} className="bench-photo" />
                          <div className="bench-info small">
                            <div className="bench-name">{p.name ?? (t("unknown_player") ?? "Unknown player")}</div>
                            <div className="bench-pos">{(p.positions || []).join(", ")}</div>
                          </div>
                          <div className="bench-meta"><span className="badge starter">{t("in_matchday_squad") ?? "In the matchday squad"}</span></div>
                        </div>
                      ))}
                    </div>

                    <h3 style={{ marginTop: 12 }}>{t("not_in_matchday_squad")}</h3>
                    <div className="bench-list">
                      {substitutesBench.map((p) => (
                        <div
                          key={p.id}
                          className="bench-player bench-not-allowed"
                          draggable={false}
                          onDragStart={(e) => { e.preventDefault(); }}
                          onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "none"; }}
                          title={p.name}
                          onClick={() => openPlayer(p)}
                        >
                          <img src={(p as any).photoPreview ?? placeholderImg} alt={p.name} className="bench-photo" />
                          <div className="bench-info small">
                            <div className="bench-name">{p.name ?? (t("unknown_player") ?? "Unknown player")}</div>
                            <div className="bench-pos">{(p.positions || []).join(", ")}</div>
                          </div>
                          <div className="bench-meta"><span className="badge">{t("not_in_matchday") ?? "Not in the Matchday Squad"}</span></div>
                        </div>
                      ))}
                    </div>
                  </aside>
                </div>
              ) : (
                /* Players tab content */
                <div className="players-tab" style={{ marginTop: 12 }}>
                  <div style={{ marginBottom: 12, display: "flex", gap: 8, alignItems: "center" }}>
                    <input
                      type="search"
                      placeholder={t("search_players")}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="teams-search-input"
                      style={{ width: "100%", maxWidth: 420, padding: "8px 12px", borderRadius: 8 }}
                    />
                    <div style={{ color: "#c0c7d0", fontSize: 14 }}>
                      {filteredPlayers.length} {t("players")}
                    </div>
                  </div>

                  <div className="players-grid">
                    {filteredPlayers.length === 0 ? (
                      <div style={{ marginTop: 12, color: "#c0c7d0" }}>{t("no_players_found")}</div>
                    ) : (
                      filteredPlayers.map((p) => (
                        <PlayerCard
                          key={p.id}
                          player={p}
                          onClick={(pl: any) => {
                            openPlayer(normalizePlayer(pl));
                          }}
                        />
                      ))
                    )}
                  </div>
                </div>
              )}

              <section className="team-news">
                <h3>{t("latest_news_about") ?? "Latest news about"} {team?.name}</h3>
                {newsLoading && <p>{t("loading")}</p>}
                {newsError && <p className="news-error">{newsError}</p>}
                {!newsLoading && !newsError && news && news.length === 0 && (
                  <p>{t("no_recent_news_found")} {team?.name}</p>
                )}
                {!newsLoading && !newsError && news && news.length > 0 && (
                  <div className="news-list">
                    {news.map((article) => (
                      <a
                        key={article.url}
                        href={article.url ?? ""}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="news-article"
                        aria-label={article.title ?? `News about ${team?.name}`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {article.urlToImage && <img src={article.urlToImage} alt={article.title ?? team?.name ?? "News"} loading="lazy" />}
                        {article.title && <h4 className="news-heading">{article.title}</h4>}
                        {article.description && <p>{article.description}</p>}
                      </a>
                    ))}
                  </div>
                )}
              </section>
            </main>
          </>
        )}
      </section>

      {/* Player modal */}
      {selectedPlayer && <PlayerModal player={selectedPlayer} onClose={() => setSelectedPlayer(null)} />}
    </div>
  );
}
