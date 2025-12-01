import React, { JSX, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../services/api";
import type { Team, Player } from "../types/types";
import Menu from "../components/Menu";
import "./TeamDetailPage.css";

type LineupSlot = {
  slotId: string;
  positionHint: string;
  playerId?: number | string | null;
  left?: string;
  top?: string;
};

type NewsArticle = {
  source?: { id?: string | null; name?: string | null };
  author?: string | null;
  title?: string | null;
  description?: string | null;
  url?: string | null;
  urlToImage?: string | null;
  publishedAt?: string | null;
  content?: string | null;
};

const DEFAULT_SLOTS_TEMPLATE: LineupSlot[] = [
  { slotId: "GK-1", positionHint: "GK", left: "50%", top: "92%" },

  { slotId: "DEF-1", positionHint: "DEF", left: "12%", top: "78%" },
  { slotId: "DEF-2", positionHint: "DEF", left: "32%", top: "78%" },
  { slotId: "DEF-3", positionHint: "DEF", left: "68%", top: "78%" },
  { slotId: "DEF-4", positionHint: "DEF", left: "88%", top: "78%" },

  { slotId: "MID-1", positionHint: "MID", left: "22%", top: "56%" },
  { slotId: "MID-2", positionHint: "MID", left: "50%", top: "56%" },
  { slotId: "MID-3", positionHint: "MID", left: "78%", top: "56%" },

  { slotId: "FWD-1", positionHint: "FWD", left: "22%", top: "32%" },
  { slotId: "FWD-2", positionHint: "FWD", left: "50%", top: "32%" },
  { slotId: "FWD-3", positionHint: "FWD", left: "78%", top: "32%" },
];

const LINEUP_STORAGE_KEY = (teamId: string | number) => `team_lineup_${teamId}`;

function posMatchesHint(pos: string, hint: string) {
  const p = String(pos || "").toLowerCase();
  const h = String(hint || "").toLowerCase();
  if (h === "gk") return p.includes("gk") || p.includes("goal");
  if (h === "def") return ["cb", "lb", "rb", "fb", "def", "dc"].some(x => p.includes(x));
  if (h === "mid") return ["cm", "dm", "am", "mid", "mc"].some(x => p.includes(x));
  if (h === "fwd") return ["st", "cf", "fw", "att"].some(x => p.includes(x));
  return p.includes(h);
}

function saveLineupToStorage(teamId: string | number, lineup: LineupSlot[]) {
  try { localStorage.setItem(LINEUP_STORAGE_KEY(teamId), JSON.stringify(lineup)); } catch { /* empty */ }
}
function loadLineupFromStorage(teamId: string | number): LineupSlot[] | null {
  try { const raw = localStorage.getItem(LINEUP_STORAGE_KEY(teamId)); return raw ? (JSON.parse(raw) as LineupSlot[]) : null; } catch { return null; }
}
function clearLineupStorage(teamId: string | number) {
  try { localStorage.removeItem(LINEUP_STORAGE_KEY(teamId)); } catch { /* empty */ }
}

function buildInitialLineup(slotsTemplate: LineupSlot[], players: Player[]) {
  const lineup: LineupSlot[] = slotsTemplate.map(s => ({ ...s, playerId: null as number | string | null }));
  const available = players.slice();

  for (const slot of lineup) {
    const idx = available.findIndex(p => (p.positions || []).some(pos => posMatchesHint(pos, slot.positionHint)));
    if (idx >= 0) { slot.playerId = available[idx].id; available.splice(idx, 1); }
  }

  for (const slot of lineup) {
    if (!slot.playerId && available.length) slot.playerId = available.shift()!.id;
  }

  return lineup;
}

export default function TeamDetailPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [team, setTeam] = useState<Team | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [, setError] = useState<string | null>(null);

  const [fieldSlots, setFieldSlots] = useState<LineupSlot[]>([]);
  const [initialLineup, setInitialLineup] = useState<LineupSlot[] | null>(null);
  const [news, setNews] = useState<NewsArticle[] | null>(null);

  const [saving, setSaving] = useState<boolean>(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const fieldRef = useRef<HTMLDivElement | null>(null);
  const benchRef = useRef<HTMLDivElement | null>(null);
  const [benchHeightPx, setBenchHeightPx] = useState<number | null>(null);

  /* Load team and players */
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
        const res = await api.get(`/teams/${id}`);
        if (cancelled) return;
        const t = res.data as Team;
        setTeam(t);

        const rawPlayers = Array.isArray((t as unknown as { players?: unknown }).players)
          ? ((t as unknown as { players?: unknown }).players as unknown[])
          : [];
        const pls: Player[] = rawPlayers.map((pRaw) => {
          const p = pRaw as Record<string, unknown>;
          return {
            id: (p.id as number) ?? (p.id as string) ?? Math.random().toString(36).slice(2),
            name: typeof p.name === "string" ? p.name : "",
            number: typeof p.number === "number" ? p.number : (typeof p.number === "string" && !Number.isNaN(Number(p.number)) ? Number(p.number) : 0),
            positions: Array.isArray(p.positions) ? (p.positions as string[]) : (typeof p.positions === "string" ? [p.positions as string] : []),
            photo: typeof p.photo === "string" ? p.photo : null,
            photoPreview: typeof p.photo === "string" ? p.photo : null,
            isStarter: Boolean(p.isStarter),
          } as Player;
        });

        setPlayers(pls);
      } catch (err) {
        console.error(err);
        setError("No se pudo cargar el equipo.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [id]);

  /* Build lineup and initial state; if no saved lineup, apply initial and persist it */
  useEffect(() => {
    if (!players || players.length === 0 || !id || !team) return;

    const built = buildInitialLineup(DEFAULT_SLOTS_TEMPLATE, players);

    // Type guard: comprueba que el valor es un array de LineupSlot con al menos un playerId válido
    function isLineupArray(value: unknown): value is LineupSlot[] {
      if (!Array.isArray(value)) return false;
      return value.some(item => item && typeof item === "object" && ("playerId" in item));
    }

    // 1) Prioriza la alineación que venga del backend (team.lineup) si es válida
    const backendLineup = (team as unknown as { lineup?: unknown }).lineup;
    const backendIsValid = isLineupArray(backendLineup) && backendLineup.some(s => s.playerId !== null && s.playerId !== undefined);

    if (backendIsValid) {
      setFieldSlots(backendLineup as LineupSlot[]);
      try { saveLineupToStorage(id, backendLineup as LineupSlot[]); } catch { /* empty */ }
      setInitialLineup(built);
      return;
    }

    // 2) Si no hay backend válido, mira localStorage
    const saved = loadLineupFromStorage(id);
    const savedIsValid = Array.isArray(saved) && saved.some(s => s && s.playerId !== null && s.playerId !== undefined);

    if (savedIsValid) {
      setFieldSlots(saved as LineupSlot[]);
    } else {
      // 3) Si no hay nada válido, aplica la inicial y persistela localmente
      setFieldSlots(built);
      try { saveLineupToStorage(id, built); } catch { /* empty */ }
    }

    setInitialLineup(built);
  }, [players, id, team]);


  /* Persist fieldSlots on change (localStorage) */
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
  }, [fieldRef.current, fieldSlots.length]);

  /* Drag & drop helpers */
  function onDragStartFromField(e: React.DragEvent, playerId: number | string, fromSlotId: string) {
    e.dataTransfer.setData("text/plain", `${playerId}|${fromSlotId}`);
    e.dataTransfer.effectAllowed = "move";
  }
  function onDragStartFromBench(e: React.DragEvent, playerId: number | string) {
    e.dataTransfer.setData("text/plain", `${playerId}|`);
    e.dataTransfer.effectAllowed = "move";
  }
  function onDragOverSlot(e: React.DragEvent) { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }

  function ensureFieldNotEmpty(nextSlots: LineupSlot[], currentPlayers: Player[]) {
    const hasStarters = currentPlayers.some(p => p.isStarter);
    if (!hasStarters) return nextSlots;

    const assignedIds = new Set(nextSlots.map(s => s.playerId).filter(Boolean));
    const bench = currentPlayers.filter(p => !assignedIds.has(p.id));
    const next = nextSlots.map(s => ({ ...s }));
    for (const slot of next) {
      if (!slot.playerId && bench.length) slot.playerId = bench.shift()!.id;
    }
    return next;
  }

  function onDropToSlot(e: React.DragEvent, targetSlotId: string) {
    e.preventDefault();
    const raw = e.dataTransfer.getData("text/plain");
    if (!raw) return;
    const [pidRaw] = raw.split("|");
    const pid = isNaN(Number(pidRaw)) ? pidRaw : Number(pidRaw);

    setFieldSlots(prev => {
      const next = prev.map(s => ({ ...s }));
      const target = next.find(s => s.slotId === targetSlotId);
      if (!target) return prev;
      const fromSlot = next.find(s => String(s.playerId) === String(pid));
      if (fromSlot && fromSlot.slotId === target.slotId) return prev;

      if (fromSlot) {
        const temp = target.playerId;
        target.playerId = fromSlot.playerId;
        fromSlot.playerId = temp;
      } else {
        target.playerId = pid;
      }

      const ensured = ensureFieldNotEmpty(next, players);
      if (id) saveLineupToStorage(id, ensured);
      return ensured;
    });
  }

  function onDropToBench(e: React.DragEvent) {
    e.preventDefault();
    const raw = e.dataTransfer.getData("text/plain");
    if (!raw) return;
    const [pidRaw] = raw.split("|");
    const pid = isNaN(Number(pidRaw)) ? pidRaw : Number(pidRaw);

    setFieldSlots(prev => {
      const next = prev.map(s => ({ ...s }));
      for (const s of next) if (String(s.playerId) === String(pid)) s.playerId = null;
      const ensured = ensureFieldNotEmpty(next, players);
      if (id) saveLineupToStorage(id, ensured);
      return ensured;
    });
  }

  /* Reset to initial (kept only in field actions) */
  function resetToInitial() {
    if (!initialLineup) return;
    setFieldSlots(initialLineup);
    if (id) {
      clearLineupStorage(id);
      saveLineupToStorage(id, initialLineup);
    }
  }

  /* Clear field: remove all players from field (explicitly allow empty field) */
  function clearField() {
    setFieldSlots(prev => {
      const next = prev.map(s => ({ ...s, playerId: null }));
      if (id) saveLineupToStorage(id, next);
      return next;
    });
  }

  /* Save lineup to backend */
  async function handleSaveLineup() {
    if (!id || !team) return;
    setSaving(true);
    setSaveMessage(null);
    try {
      // enviar al backend
      const payload = { ...team, lineup: fieldSlots };
      await api.put(`/teams/${id}`, payload);

      // sincronizar estado local: actualizar team en memoria y localStorage
      setSaveMessage("Alineación guardada correctamente.");
      try {
        saveLineupToStorage(id, fieldSlots);
      } catch { /* ignore */ }

      // actualizar el objeto team en memoria para que al recargar use team.lineup
      setTeam(prev => prev ? ({ ...prev, lineup: fieldSlots } as Team) : prev);
    } catch (err) {
      console.error("save lineup failed", err);
      setSaveMessage("Error al guardar la alineación.");
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMessage(null), 3500);
    }
  }

  /* Optional news fetch (unchanged) */
  useEffect(() => {
    async function fetchNewsIfKey() {
      if (!team?.name) return;
      const win = window as unknown as Record<string, unknown>;
      const maybeKey = typeof win.REACT_APP_NEWSAPI_KEY === "string" ? win.REACT_APP_NEWSAPI_KEY : "";
      if (!maybeKey) return;
      try {
        const q = encodeURIComponent(team.name);
        const url = `https://newsapi.org/v2/everything?q=${q}&language=es&sortBy=publishedAt&pageSize=6&apiKey=${maybeKey}`;
        const res = await fetch(url);
        if (!res.ok) { setNews([]); return; }
        const data = (await res.json()) as { articles?: unknown };
        if (!data || !Array.isArray(data.articles)) { setNews([]); return; }
        const articles: NewsArticle[] = data.articles.map((aRaw) => {
          const a = aRaw as Record<string, unknown>;
          return {
            source: typeof a.source === "object" && a.source !== null ? {
              id: typeof (a.source as Record<string, unknown>).id === "string" ? (a.source as Record<string, unknown>).id as string : null,
              name: typeof (a.source as Record<string, unknown>).name === "string" ? (a.source as Record<string, unknown>).name as string : null,
            } : undefined,
            author: typeof a.author === "string" ? a.author : null,
            title: typeof a.title === "string" ? a.title : null,
            description: typeof a.description === "string" ? a.description : null,
            url: typeof a.url === "string" ? a.url : null,
            urlToImage: typeof a.urlToImage === "string" ? a.urlToImage : null,
            publishedAt: typeof a.publishedAt === "string" ? a.publishedAt : null,
            content: typeof a.content === "string" ? a.content : null,
          };
        });
        setNews(articles.length ? articles : []);
      } catch (err) {
        console.warn("news fetch failed", err);
        setNews([]);
      }
    }
    fetchNewsIfKey();
  }, [team?.name]);

  /* Rendering helpers */
  const playersById = useMemo(() => {
    const map = new Map<string | number, Player>();
    for (const p of players) if (p.id !== undefined && p.id !== null) map.set(p.id, p);
    return map;
  }, [players]);

  const starters = players.filter(p => p.isStarter);
  const substitutes = players.filter(p => !p.isStarter && p.positions && p.positions.length > 0);
  const nonStarters = players.filter(p => !p.isStarter && (!p.positions || p.positions.length === 0));

  const assignedIds = new Set(fieldSlots.map(s => s.playerId).filter(Boolean));
  const startersBench = starters.filter(p => !assignedIds.has(p.id));
  const substitutesBench = substitutes.filter(p => !assignedIds.has(p.id));
  const nonStartersBench = nonStarters.filter(p => !assignedIds.has(p.id));

  if (loading) {
    return (
      <div>
        <Menu />
        <section className="page-wrapper"><p>Cargando...</p></section>
      </div>
    );
  }

  return (
    <div>
      <Menu />
      <section className="page-wrapper team-page">
        <header className="team-header">
          <div className="team-header-left">
            <h2>{team?.name ?? "Team"}</h2>

            <button
              className="btn btn-save header-save"
              onClick={handleSaveLineup}
              disabled={saving}
              aria-label="Save lineup"
              title="Guardar alineación"
            >
              {saving ? "Guardando..." : "Save lineup"}
            </button>

            {saveMessage && <div className="save-message" role="status">{saveMessage}</div>}
          </div>

          <div className="team-header-actions">
            <button className="btn btn-back" onClick={() => navigate("/teams")}>Back</button>
          </div>
        </header>

        <main className="team-main">
          <div className="team-layout">
            <div className="field-area" aria-label="Field">
              <div className="football-field" role="img" aria-label="Football field" ref={fieldRef}>
                <div className="half-line-horizontal" />
                <div className="center-circle" />
                <div className="penalty-top" />
                <div className="penalty-bottom" />
                <div className="goal-top" />
                <div className="goal-bottom" />

                {fieldSlots.map(slot => {
                  const player = playersById.get(slot.playerId ?? "");
                  return (
                    <div
                      key={slot.slotId}
                      className="field-slot-absolute"
                      style={{ left: slot.left ?? "50%", top: slot.top ?? "50%" }}
                      onDragOver={onDragOverSlot}
                      onDrop={(e) => onDropToSlot(e, slot.slotId)}
                    >
                      {player ? (
                        <div
                          className="player-chip vertical"
                          draggable={Boolean(player.isStarter)}
                          onDragStart={(e) => onDragStartFromField(e, player.id!, slot.slotId)}
                          title={`${player.name} ${(player.positions || []).join(", ")}`}
                        >
                          <img src={player.photoPreview ?? ""} alt={player.name} className="chip-photo large" />
                          <div className="chip-info centered">
                            <div className="chip-name">{player.name}</div>
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

              <div className="field-actions">
                <button className="btn btn-reset" onClick={resetToInitial}>Reset to initial</button>
                <button className="btn btn-clear" onClick={clearField}>Limpiar campo</button>
              </div>
            </div>

            <aside
              className="bench-area"
              aria-label="Bench and full squad"
              ref={benchRef}
              onDragOver={(e) => { e.preventDefault(); }}
              onDrop={onDropToBench}
              style={benchHeightPx ? { height: `${benchHeightPx}px`, maxHeight: `${benchHeightPx}px` } : undefined}
            >
              <h3>Titulares</h3>
              <div className="bench-list">
                {startersBench.map(p => (
                  <div key={p.id} className="bench-player" draggable={true} onDragStart={(e) => onDragStartFromBench(e, p.id!)} title={p.name}>
                    <img src={p.photoPreview ?? ""} alt={p.name} className="bench-photo" />
                    <div className="bench-info small">
                      <div className="bench-name">{p.name}</div>
                      <div className="bench-pos">{(p.positions || []).join(", ")}</div>
                    </div>
                    <div className="bench-meta"><span className="badge starter">Titular</span></div>
                  </div>
                ))}
              </div>

              <h3 style={{ marginTop: 12 }}>No titulares</h3>
              <div className="bench-list">
                {nonStartersBench.map(p => (
                  <div key={p.id} className="bench-player" draggable={true} onDragStart={(e) => onDragStartFromBench(e, p.id!)} title={p.name}>
                    <img src={p.photoPreview ?? ""} alt={p.name} className="bench-photo" />
                    <div className="bench-info small">
                      <div className="bench-name">{p.name}</div>
                      <div className="bench-pos">{(p.positions || []).join(", ")}</div>
                    </div>
                    <div className="bench-meta"><span className="badge">No titular</span></div>
                  </div>
                ))}
              </div>
            </aside>
          </div>

          {news && news.length > 0 && (
            <section className="team-news">
              <h3>Últimas noticias sobre {team?.name}</h3>
              <div className="news-list">
                {news.map((a, idx) => (
                  <article key={idx} className="news-item">
                    {a.urlToImage && <img src={a.urlToImage ?? ""} alt={a.title ?? ""} className="news-thumb" />}
                    <div className="news-body">
                      <a href={a.url ?? "#"} target="_blank" rel="noopener noreferrer" className="news-title">{a.title}</a>
                      <p className="news-source">{a.source?.name ?? "Fuente"} · {a.publishedAt ? new Date(a.publishedAt).toLocaleString() : ""}</p>
                      <p className="news-desc">{a.description}</p>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}
        </main>
      </section>
    </div>
  );
}
