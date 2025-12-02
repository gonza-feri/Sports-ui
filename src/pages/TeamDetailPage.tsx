/* eslint-disable @typescript-eslint/no-explicit-any */
// src/pages/TeamDetailPage.tsx
import React, { JSX, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../services/api";
import type { Team, Player } from "../types/types";
import Menu from "../components/Menu";
import "./TeamDetailPage.css";

/* ---------- Tipos locales ---------- */
type LineupSlot = {
  slotId: string;
  positionHint: string;
  playerId?: number | string | null;
  left?: string;
  top?: string;
  noAutoFill?: boolean; // si true, este slot NO será auto-llenado por la rutina ensureFieldNotEmpty
};

/* Extensión local de Team para campos extra que puede devolver tu backend */
type TeamWithExtras = Team & { logo?: string; crest?: string; photo?: string; lineup?: LineupSlot[]; };

/* ---------- Plantilla de slots (4-3-3 vertical) ---------- */
const DEFAULT_SLOTS_TEMPLATE: LineupSlot[] = [
  { slotId: "GK-1", positionHint: "GK", left: "50%", top: "82%" }, // antes 92
  { slotId: "DEF-1", positionHint: "DEF", left: "12%", top: "68%" }, // antes 78
  { slotId: "DEF-2", positionHint: "DEF", left: "32%", top: "68%" },
  { slotId: "DEF-3", positionHint: "DEF", left: "68%", top: "68%" },
  { slotId: "DEF-4", positionHint: "DEF", left: "88%", top: "68%" },
  { slotId: "MID-1", positionHint: "MID", left: "22%", top: "46%" }, // antes 56
  { slotId: "MID-2", positionHint: "MID", left: "50%", top: "46%" },
  { slotId: "MID-3", positionHint: "MID", left: "78%", top: "46%" },
  { slotId: "FWD-1", positionHint: "FWD", left: "22%", top: "22%" }, // antes 32
  { slotId: "FWD-2", positionHint: "FWD", left: "50%", top: "22%" },
  { slotId: "FWD-3", positionHint: "FWD", left: "78%", top: "22%" },
];

const LINEUP_STORAGE_KEY = (teamId: string | number) => `team_lineup_${teamId}`;

/* ---------- Helpers de almacenamiento ---------- */
function saveLineupToStorage(teamId: string | number, lineup: LineupSlot[]) {
  try { localStorage.setItem(LINEUP_STORAGE_KEY(teamId), JSON.stringify(lineup)); } catch { /* ignore */ }
}
function loadLineupFromStorage(teamId: string | number): LineupSlot[] | null {
  try { const raw = localStorage.getItem(LINEUP_STORAGE_KEY(teamId)); return raw ? (JSON.parse(raw) as LineupSlot[]) : null; } catch { return null; }
}
function clearLineupStorage(teamId: string | number) { try { localStorage.removeItem(LINEUP_STORAGE_KEY(teamId)); } catch { /* ignore */ } }

/* Construye alineación inicial intentando respetar posiciones */
function posMatchesHint(pos: string, hint: string) {
  const p = String(pos || "").toLowerCase();
  const h = String(hint || "").toLowerCase();
  if (h === "gk") return p.includes("gk") || p.includes("goal");
  if (h === "def") return ["cb", "lb", "rb", "fb", "def", "dc"].some(x => p.includes(x));
  if (h === "mid") return ["cm", "dm", "am", "mid", "mc"].some(x => p.includes(x));
  if (h === "fwd") return ["st", "cf", "fw", "att"].some(x => p.includes(x));
  return p.includes(h);
}
function buildInitialLineup(slotsTemplate: LineupSlot[], players: Player[]) {
  // Solo titulares
  const starters = players.filter(p => p.isStarter);

  const lineup: LineupSlot[] = slotsTemplate.map(s => ({
    ...s,
    playerId: null as number | string | null,
    noAutoFill: false,
  }));

  const available = starters.slice();

  // Intentar asignar por posición
  for (const slot of lineup) {
    const idx = available.findIndex(p =>
      (p.positions || []).some(pos => posMatchesHint(pos, slot.positionHint))
    );
    if (idx >= 0) {
      slot.playerId = available[idx].id;
      available.splice(idx, 1);
    }
  }

  // Rellenar huecos con titulares restantes
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
  const [team, setTeam] = useState<TeamWithExtras | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [, setError] = useState<string | null>(null);
  const [fieldSlots, setFieldSlots] = useState<LineupSlot[]>([]);
  const [, setInitialLineup] = useState<LineupSlot[] | null>(null);

  /* ---------- Noticias (placeholder, si ya lo tienes puedes mantenerlo) ---------- */
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
  const [news, ] = useState<NewsArticle[] | null>(null);
  const [newsLoading, ] = useState<boolean>(false);
  const [newsError, ] = useState<string | null>(null);

  const [saving, setSaving] = useState<boolean>(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const fieldRef = useRef<HTMLDivElement | null>(null);
  const benchRef = useRef<HTMLDivElement | null>(null);
  const [benchHeightPx, setBenchHeightPx] = useState<number | null>(null);

  // Estado para la descripción expandida
  const [showFullDesc, setShowFullDesc] = useState<boolean>(false);

  /* ---------- Prevención de auto-llenado (estado + ref sincronizado) ---------- */
  const [preventAutoFill, setPreventAutoFill] = useState<boolean>(false);
  const preventAutoFillRef = useRef<boolean>(preventAutoFill);
  useEffect(() => { preventAutoFillRef.current = preventAutoFill; }, [preventAutoFill]);

  /* ---------- Carga del equipo desde backend ---------- */
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        if (!id) { setError("Team id missing"); setLoading(false); return; }
        const res = await api.get(`/teams/${id}`);
        if (cancelled) return;
        const t = res.data as TeamWithExtras;
        setTeam(t);
        const rawPlayers = Array.isArray((t as { players?: unknown }).players) ? (t.players as unknown[]) : [];
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

  /* ---------- Construcción de la alineación inicial ---------- */
  useEffect(() => {
    if (!players || players.length === 0 || !id || !team) return;
    const built = buildInitialLineup(DEFAULT_SLOTS_TEMPLATE, players);
    const backendLineupCandidate = team.lineup;
    const backendIsValid = Array.isArray(backendLineupCandidate) && backendLineupCandidate.some(s => s && s.playerId !== null && s.playerId !== undefined);
    if (backendIsValid) {
      // Si el backend trae lineup, respetamos pero aseguramos la propiedad noAutoFill
      const normalized = (backendLineupCandidate as LineupSlot[]).map(s => ({ ...s, noAutoFill: Boolean(s.noAutoFill) }));
      setFieldSlots(normalized);
      try { saveLineupToStorage(id, normalized); } catch { /* empty */ }
      setInitialLineup(built);
      return;
    }
    const saved = loadLineupFromStorage(id);
    const savedIsValid = Array.isArray(saved) && saved.some(s => s && s.playerId !== null && s.playerId !== undefined);
    if (savedIsValid) { setFieldSlots(saved as LineupSlot[]); } else { setFieldSlots(built); try { saveLineupToStorage(id, built); } catch { /* empty */ } }
    setInitialLineup(built);
  }, [players, id, team]);

  /* Persistencia local cuando cambian los fieldSlots */
  useEffect(() => { if (!id) return; saveLineupToStorage(id, fieldSlots); }, [fieldSlots, id]);

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

  /* ---------- Drag & drop helpers ---------- */
  function onDragStartFromField(e: React.DragEvent, playerId: number | string, fromSlotId: string) {
    // el usuario inicia una acción intencional: permitir auto-llenado futuro
    setPreventAutoFill(false);
    preventAutoFillRef.current = false;

    e.dataTransfer.setData("text/plain", `${playerId}|${fromSlotId}`);
    e.dataTransfer.effectAllowed = "move";
  }
  function onDragStartFromBench(e: React.DragEvent, playerId: number | string) {
    // solo permitir drag si el jugador es titular (comprobación en el JSX)
    setPreventAutoFill(false);
    preventAutoFillRef.current = false;

    e.dataTransfer.setData("text/plain", `${playerId}|`);
    e.dataTransfer.effectAllowed = "move";
  }
  function onDragOverSlot(e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    const target = e.currentTarget as HTMLElement;
    target.classList.add("drag-over");
  }

  /* ---------- Auto-llenado (respetando bloqueo por slot y ref) ---------- */
  function ensureFieldNotEmpty(nextSlots: LineupSlot[], currentPlayers: Player[]) {
    // Si la protección global está activa, no auto-llenamos
    if (preventAutoFillRef.current) return nextSlots;

    const hasStarters = currentPlayers.some(p => p.isStarter);
    if (!hasStarters) return nextSlots;

    const assignedIds = new Set(nextSlots.map(s => s.playerId).filter(Boolean));
    const bench = currentPlayers.filter(p => !assignedIds.has(p.id));
    const next = nextSlots.map(s => ({ ...s }));
    for (const slot of next) {
      if (slot.playerId) continue;
      if (slot.noAutoFill) continue;
      if (bench.length) slot.playerId = bench.shift()!.id;
    }
    return next;
  }

  // Maneja drop sobre un jugador concreto del banquillo (bench player)
  // benchPlayerId: id del jugador que está en la columna (destino del swap)
  function onDropOnBenchPlayer(e: React.DragEvent, benchPlayerId: number | string) {
    e.preventDefault();
    const raw = e.dataTransfer.getData("text/plain");
    if (!raw) return;
    const [pidRaw] = raw.split("|");
    const pid = isNaN(Number(pidRaw)) ? pidRaw : Number(pidRaw);

    // Si el payload es el mismo jugador que ya está en el bench, no hacemos nada
    if (String(pid) === String(benchPlayerId)) return;

    setFieldSlots(prev => {
      const next = prev.map(s => ({ ...s }));
      // Encontrar el slot de origen si el jugador venía del campo
      const fromSlot = next.find(s => String(s.playerId) === String(pid));
      if (!fromSlot) {
        // El jugador arrastrado no estaba en el campo (venía del bench): 
        // en ese caso no hay swap de campo, no hacemos nada.
        return prev;
      }

      // Hacemos el intercambio: el slot de origen recibe el jugador que estaba en el bench
      // (benchPlayerId). El jugador arrastrado (pid) queda fuera del campo (bench).
      fromSlot.playerId = benchPlayerId;

      // Nota: no tocamos players[] ni marcamos isStarter; bench se calcula a partir de players y fieldSlots.
      // No llamamos a ensureFieldNotEmpty para evitar auto-llenados inesperados.
      if (id) saveLineupToStorage(id, next);
      return next;
    });
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

      // ¿El jugador arrastrado ya estaba en el campo?
      const fromSlot = next.find(s => String(s.playerId) === String(pid));

      // Protección activa o slot bloqueado: solo reemplazar/colocar sin auto-llenado
      if (preventAutoFillRef.current || target.noAutoFill) {
        if (fromSlot) fromSlot.playerId = null; // si venía de otro slot, vaciar origen
        target.playerId = pid;                   // siempre sustituye al que hubiera
        if (id) saveLineupToStorage(id, next);
        return next;
      }

      // Arrastrar campo → campo (swap si distinto)
      if (fromSlot && fromSlot.slotId !== target.slotId) {
        const temp = target.playerId;
        target.playerId = fromSlot.playerId;
        fromSlot.playerId = temp;
        const ensuredSwap = ensureFieldNotEmpty(next, players);
        if (id) saveLineupToStorage(id, ensuredSwap);
        return ensuredSwap;
      }

      // Arrastrar desde bench → slot ocupado: sustituir al instante
      if (!fromSlot && target.playerId) {
        target.playerId = pid;
        const ensuredReplace = ensureFieldNotEmpty(next, players);
        if (id) saveLineupToStorage(id, ensuredReplace);
        return ensuredReplace;
      }

      // Arrastrar desde bench → slot vacío: asignar
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
    const [pidRaw] = raw.split("|");
    const pid = isNaN(Number(pidRaw)) ? pidRaw : Number(pidRaw);

    setFieldSlots(prev => {
      const next = prev.map(s => ({ ...s }));
      for (const s of next) if (String(s.playerId) === String(pid)) s.playerId = null;

      const final = preventAutoFillRef.current ? next : ensureFieldNotEmpty(next, players);
      if (id) saveLineupToStorage(id, final);
      return final;
    });
  }

  /* Reset y limpiar */
  function resetToInitial() {
    if (!players || players.length === 0) return;
    const built = buildInitialLineup(DEFAULT_SLOTS_TEMPLATE, players);
    const unlocked = built.map(s => ({ ...s, noAutoFill: false }));
    setFieldSlots(unlocked);
    setPreventAutoFill(false);
    preventAutoFillRef.current = false;
    if (id) {
      clearLineupStorage(id);
      saveLineupToStorage(id, unlocked);
    }
  }


  function clearField() {
    setFieldSlots(prev => {
      const next = prev.map(s => ({ ...s, playerId: null, noAutoFill: true }));
      if (id) saveLineupToStorage(id, next);
      return next;
    });

    // activar protección y sincronizar ref inmediatamente
    setPreventAutoFill(true);
    preventAutoFillRef.current = true;
  }

  /* Guardado en backend y sincronización local */
  async function handleSaveLineup() {
    if (!id || !team) return;
    setSaving(true);
    setSaveMessage(null);
    try {
      const payload = { ...team, lineup: fieldSlots };
      await api.put(`/teams/${id}`, payload);
      setSaveMessage("Alineación guardada correctamente.");
      try { saveLineupToStorage(id, fieldSlots); } catch { /* empty */ }
      setTeam(prev => prev ? ({ ...prev, lineup: fieldSlots } as TeamWithExtras) : prev);
    } catch (err) {
      console.error("save lineup failed", err);
      setSaveMessage("Error al guardar la alineación.");
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMessage(null), 3500);
    }
  }

  /* ---------- Render helpers ---------- */
  const playersById = useMemo(() => {
    const map = new Map<string | number, Player>();
    for (const p of players) if (p.id !== undefined && p.id !== null) map.set(String(p.id), p);
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
        <section className="page-wrapper">
          <p>Cargando...</p>
        </section>
      </div>
    );
  }

  /* crest fallback seguro */
  const crestCandidate = team ? (team.logo ?? team.crest ?? team.photo) : null;
  const crestUrl = typeof crestCandidate === "string" ? crestCandidate : null;

  const placeholderImg =
    "https://images.unsplash.com/photo-1521417532886-55d2f88f0a52?q=80&w=1200&auto=format&fit=crop";

  return (
    <div>
      <Menu />
      <section className="page-wrapper team-page">
        <header className="team-header">
          <div className="team-header-left">
            {crestUrl && <img src={crestUrl} alt={`${team?.name} crest`} className="team-crest" />}
            <div className="team-title-block">
              <h2>{team?.name ?? "Team"}</h2>

              {team?.description && (
                <div className="team-desc-wrapper">
                  <p className={`team-desc-inline ${showFullDesc ? "expanded" : "collapsed"}`}>
                    {team.description}
                  </p>
                  {typeof team.description === "string" && team.description.length > 240 && (
                    <button
                      type="button"
                      className="desc-toggle"
                      onClick={() => setShowFullDesc((s) => !s)}
                      aria-expanded={showFullDesc}
                    >
                      {showFullDesc ? "Mostrar menos" : "Mostrar más"}
                    </button>
                  )}
                </div>
              )}
            </div>

            <button className="btn btn-save header-save" onClick={handleSaveLineup} disabled={saving} aria-label="Save lineup" title="Guardar alineación">
              {saving ? "Guardando..." : "Save lineup"}
            </button>
            <button className="btn btn-edit" onClick={() => { if (!id) return; navigate(`/teams/add/${id}`); }} title="Editar equipo">Edit team</button>
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
                        >
                          <img src={player.photoPreview ?? placeholderImg} alt={player.name} className="chip-photo large" />
                          <div className="chip-info centered">
                            <div className="chip-name">{player.name}</div>
                            <div className="chip-number">#{player.number}</div>
                          </div>
                        </div>
                      ) : (
                        <div className="slot-empty">+</div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Botones fuera del campo, debajo */}
              <div className="field-actions" style={{ marginTop: 12 }}>
                <button className="btn btn-reset" onClick={resetToInitial}>Reset to initial</button>
                <button className="btn btn-clear" onClick={clearField}>Limpiar campo</button>
              </div>
            </div>

            <aside className="bench-area" aria-label="Bench and full squad" ref={benchRef} onDragOver={(e) => { e.preventDefault(); }} onDrop={onDropToBench} style={benchHeightPx ? { height: `${benchHeightPx}px`, maxHeight: `${benchHeightPx}px` } : undefined}>
              <h3>Titulares</h3>
              <div className="bench-list">
                {startersBench.map(p => (
                  <div
                    className="bench-player"
                    draggable={Boolean(p.isStarter)}           // solo titulares arrastrables
                    onDragStart={(e) => { if (!p.isStarter) return; onDragStartFromBench(e, p.id!); }}
                    onDragOver={(e) => { e.preventDefault(); }} // permitir drop (para campo→bench ya lo dejaste funcionando)
                    onDrop={(e) => onDropOnBenchPlayer(e, p.id!)} // para swaps campo→bench
                  >
                    <img src={(p as any).photoPreview ?? placeholderImg} alt={p.name} className="bench-photo" />
                    <div className="bench-info small">
                      <div className="bench-name">{p.name ?? "Unknown player"}</div>
                      <div className="bench-pos">{(p.positions || []).join(", ")}</div>
                    </div>
                    <div className="bench-meta"><span className="badge starter">Titular</span></div>
                  </div>
                ))}
              </div>

              <h3 style={{ marginTop: 12 }}>Suplentes</h3>
              <div className="bench-list">
                {substitutesBench.map(p => (
                  <div
                    className="bench-player"
                    draggable={Boolean(p.isStarter)}           // solo titulares arrastrables
                    onDragStart={(e) => { if (!p.isStarter) return; onDragStartFromBench(e, p.id!); }}
                    onDragOver={(e) => { e.preventDefault(); }} // permitir drop (para campo→bench ya lo dejaste funcionando)
                    onDrop={(e) => onDropOnBenchPlayer(e, p.id!)} // para swaps campo→bench
                  >
                    <img src={(p as any).photoPreview ?? placeholderImg} alt={p.name} className="bench-photo" />
                    <div className="bench-info small">
                      <div className="bench-name">{p.name ?? "Unknown player"}</div>
                      <div className="bench-pos">{(p.positions || []).join(", ")}</div>
                    </div>
                    <div className="bench-meta"><span className="badge">Suplente</span></div>
                  </div>
                ))}
              </div>

              <h3 style={{ marginTop: 12 }}>No titulares</h3>
              <div className="bench-list">
                {nonStartersBench.map(p => (
                  <div
                    className="bench-player"
                    draggable={Boolean(p.isStarter)}           // solo titulares arrastrables
                    onDragStart={(e) => { if (!p.isStarter) return; onDragStartFromBench(e, p.id!); }}
                    onDragOver={(e) => { e.preventDefault(); }} // permitir drop (para campo→bench ya lo dejaste funcionando)
                    onDrop={(e) => onDropOnBenchPlayer(e, p.id!)} // para swaps campo→bench
                  >
                    <img src={(p as any).photoPreview ?? placeholderImg} alt={p.name} className="bench-photo" />
                    <div className="bench-info small">
                      <div className="bench-name">{p.name ?? "Unknown player"}</div>
                      <div className="bench-pos">{(p.positions || []).join(", ")}</div>
                    </div>
                    <div className="bench-meta"><span className="badge">No titular</span></div>
                  </div>
                ))}
              </div>
            </aside>
          </div>
          {/* News section */}
          <section className="team-news">
            <h3>Últimas noticias sobre {team?.name}</h3>
            {newsLoading && <p>Cargando noticias...</p>}
            {newsError && <p className="news-error">{newsError}</p>}
            {!newsLoading && !newsError && news && news.length === 0 && (
              <p>No se han encontrado noticias recientes para "{team?.name}".</p>
            )}
            {!newsLoading && !newsError && news && news.length > 0 && (
              <div className="news-list">
                {news.map((a) => (
                <article key={a.url ?? a.publishedAt ?? crypto.randomUUID()} className="news-item">
                  {a.urlToImage && <img src={a.urlToImage} alt={a.title ?? ""} className="news-thumb" />}
                  <div className="news-body">
                    <a href={a.url ?? "#"} target="_blank" rel="noopener noreferrer" className="news-title">
                      {a.title}
                    </a>
                    <p className="news-source">
                      {a.source?.name ?? "Fuente"} · {a.publishedAt ? new Date(a.publishedAt).toLocaleString() : ""}
                    </p>
                    <p className="news-desc">{a.description}</p>
                  </div>
                </article>
              ))}
              </div>
            )}
          </section>
        </main>
      </section>
    </div>
  );
}
