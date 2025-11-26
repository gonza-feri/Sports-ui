// src/pages/TeamDetailPage.tsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../services/api";
import type { Team, Player } from "../types/types";
import Menu from "../components/Menu";
import "./TeamDetailPage.css";

export default function TeamDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [team, setTeam] = useState<Team | null>(null);
  const [starters, setStarters] = useState<Player[]>([]);
  const [substitutes, setSubstitutes] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Formación por defecto: 4-3-3 (slots fijos)
  const defaultFormation = "4-3-3";
  const formationSlots = [
    "GK",
    "LB", "CB1", "CB2", "RB",
    "CM1", "CM2", "CM3",
    "LW", "ST", "RW"
  ];

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const res = await api.get(`/teams/${id}`);
        const t: Team = res.data;
        // asegurar formación
        if (!t.formation) t.formation = defaultFormation;
        setTeam(t);

        const players = t.players ?? [];
        // jugadores marcados como starters primero
        const markedStarters = players.filter(p => p.isStarter);
        // rellenar slots con markedStarters respetando posiciones
        const assigned: Player[] = [];
        const remaining = players.filter(p => !p.isStarter);

        // asignación simple: intentar colocar markedStarters en slots por coincidencia
        const slotsCopy = [...formationSlots];
        for (const s of slotsCopy) {
          const matchIndex = markedStarters.findIndex(p => positionMatchesSlot(p, s));
          if (matchIndex >= 0) {
            assigned.push(markedStarters[matchIndex]);
            markedStarters.splice(matchIndex, 1);
          } else {
            // buscar en remaining
            const rIndex = remaining.findIndex(p => positionMatchesSlot(p, s));
            if (rIndex >= 0) {
              assigned.push(remaining[rIndex]);
              remaining.splice(rIndex, 1);
            } else {
              assigned.push(null as unknown as Player); // placeholder
            }
          }
        }

        // Si quedan marcados no asignados, rellenar primeros slots vacíos
        for (let i = 0; i < assigned.length && markedStarters.length > 0; i++) {
          if (!assigned[i]) {
            assigned[i] = markedStarters.shift() as Player;
          }
        }

        // starters finales: los assigned que no sean null
        const finalStarters = assigned.filter(Boolean) as Player[];
        setStarters(finalStarters);

        // substitutes: el resto de players que no están en starters
        const starterIds = new Set(finalStarters.map(s => s.id));
        const subs = players.filter(p => !starterIds.has(p.id));
        setSubstitutes(subs);
      } catch (err) {
        console.error(err);
        setError("No se pudo cargar el equipo.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id]);

  // heurística simple de coincidencia de posición
  function positionMatchesSlot(player: Player, slot: string) {
    const pos = player.positions?.map(p => p.toLowerCase()) ?? [];
    if (slot === "GK") return pos.some(p => p.includes("goal") || p === "gk");
    if (slot.startsWith("CB")) return pos.some(p => p.includes("center") || p.includes("cb") || p.includes("def"));
    if (slot === "LB" || slot === "RB") return pos.some(p => p.includes("back") || p.includes("wing") || p.includes("full"));
    if (slot.startsWith("CM")) return pos.some(p => p.includes("mid") || p.includes("cm") || p.includes("dm") || p.includes("am"));
    if (slot === "LW" || slot === "RW") return pos.some(p => p.includes("wing") || p.includes("fw") || p.includes("st"));
    if (slot === "ST") return pos.some(p => p.includes("str") || p.includes("fw") || p.includes("st"));
    return false;
  }

  const toggleStarter = async (player: Player) => {
    try {
      const updated = { ...player, isStarter: !player.isStarter };
      await api.put(`/players/${player.id}`, updated);
      // actualizar UI localmente
      if (updated.isStarter) {
        setStarters(prev => [...prev, updated]);
        setSubstitutes(prev => prev.filter(p => p.id !== player.id));
      } else {
        setSubstitutes(prev => [...prev, updated]);
        setStarters(prev => prev.filter(p => p.id !== player.id));
      }
    } catch (err) {
      console.error("Error actualizando jugador:", err);
      setError("No se pudo actualizar la titularidad.");
    }
  };

  if (loading) return <div><Menu /><section className="team-detail"><p>Loading...</p></section></div>;
  if (error) return <div><Menu /><section className="team-detail"><p className="error">{error}</p></section></div>;
  if (!team) return <div><Menu /><section className="team-detail"><p>Team not found</p></section></div>;

  return (
    <div>
      <Menu />
      <section className="team-detail">
        <header className="team-header">
          <div className="team-meta">
            {team.logo && <img src={team.logo} alt={`${team.name} logo`} className="team-detail-logo" />}
            <div>
              <h2>{team.name}</h2>
              <p>{team.description}</p>
            </div>
          </div>
          <div className="team-actions">
            <button className="btn" onClick={() => navigate(`/teams/${team.id}/edit`)}>Edit team</button>
            <button className="btn btn--gray" onClick={() => navigate("/teams")}>Back</button>
          </div>
        </header>

        <div className="formation-and-squad">
          {/* dentro de TeamDetailPage.tsx, sustituye la sección .pitch */}
            {/* Pitch vertical con 4 filas: GK, Defensas (4), Centrales (3), Delanteros (3) */}
        {/* Pitch vertical que ocupa todo el área del contenedor */}
        <div className="pitch pitch-leftwide">
            <svg className="pitch-svg" viewBox="0 0 600 1200" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
                <rect x="0" y="0" width="600" height="1200" fill="#0b6b2f" />
                <rect x="20" y="20" width="560" height="1160" fill="none" stroke="#fff" strokeWidth="6" />
                <line x1="20" y1="600" x2="580" y2="600" stroke="#fff" strokeWidth="3" />
                <circle cx="300" cy="600" r="40" fill="none" stroke="#fff" strokeWidth="3" />
            </svg>

            <div className="pitch-overlay pitch-overlay-vertical">
                {[
                ["FW1", "FW2", "FW3"],         // fila 0 arriba: delanteros (cerca de portería enemiga)
                ["CM1", "CM2", "CM3"],         // fila 1: centrales en el centro del campo
                ["DF1", "DF2", "DF3", "DF4"],  // fila 2: defensas entre portero y centrales
                ["GK"]                         // fila 3 abajo: portero
                ].map((rowSlots, rowIndex) => {
                // slotOrder debe coincidir con el orden de tu array starters
                const slotOrder = [
                    "GK",
                    "DF1","DF2","DF3","DF4",
                    "CM1","CM2","CM3",
                    "FW1","FW2","FW3"
                ];
                return (
                    <div key={rowIndex} className="pitch-row pitch-row-vertical">
                    {rowSlots.map((slot) => {
                        const idx = slotOrder.indexOf(slot);
                        const player = starters[idx];
                        return (
                        <div key={slot} className={`slot slot-${slot}`}>
                            {player ? (
                            <div className="player-card">
                                <img src={player.photo ?? ""} alt={player.name} className="player-photo" />
                                <div className="player-name">{player.name}</div>
                                <div className="player-number">#{player.number}</div>
                                <button className="btn btn--small" onClick={() => toggleStarter(player)}>
                                {player.isStarter ? "Unset" : "Set"}
                                </button>
                            </div>
                            ) : (
                            <div className="player-empty">Empty</div>
                            )}
                        </div>
                        );
                    })}
                    </div>
                );
                })}
            </div>
        </div>

          <aside className="squad-list">
            <h3>Substitutes</h3>
            <ul>
              {substitutes.map(p => (
                <li key={p.id} className="sub-item">
                  <img src={p.photo ?? ""} alt={p.name} className="sub-photo" />
                  <div className="sub-info">
                    <div className="sub-name">{p.name}</div>
                    <div className="sub-pos">{p.positions?.join(" & ")}</div>
                  </div>
                  <button className="btn btn--small" onClick={() => toggleStarter(p)}>Make starter</button>
                </li>
              ))}
            </ul>
          </aside>
        </div>

        <footer className="team-footer">
          <p>Players: {(team.players ?? []).length}</p>
        </footer>
      </section>
    </div>
  );
}
