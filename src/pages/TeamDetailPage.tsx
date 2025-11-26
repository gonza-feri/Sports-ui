import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../services/api";
import type { Team, Player } from "../types/types";
import Menu from "../components/Menu";
import "./TeamDetailPage.css";

export default function TeamDetailPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [team, setTeam] = useState<Team | null>(null);
  const [starters, setStarters] = useState<(Player | null)[]>([]);
  const [substitutes, setSubstitutes] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const slotOrder = [
    "GK", "DF1", "DF2", "DF3", "DF4",
    "CM1", "CM2", "CM3",
    "FW1", "FW2", "FW3"
  ];

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const res = await api.get(`/teams/${id}`);
        const t: Team = res.data;
        setTeam(t);

        const players = (t.players ?? []).slice();
        const marked = players.filter(p => p.isStarter);
        const remaining = players.filter(p => !p.isStarter);

        const assigned: (Player | null)[] = new Array(slotOrder.length).fill(null);

        for (const m of marked) {
          const idx = slotOrder.findIndex(s => positionMatchesSlot(m, s) && !assigned[slotOrder.indexOf(s)]);
          if (idx >= 0) assigned[idx] = m;
        }

        for (let i = 0; i < assigned.length; i++) {
          if (!assigned[i]) {
            const slot = slotOrder[i];
            const rIndex = remaining.findIndex(p => positionMatchesSlot(p, slot));
            if (rIndex >= 0) assigned[i] = remaining.splice(rIndex, 1)[0];
          }
        }

        for (let i = 0; i < assigned.length; i++) {
          if (!assigned[i] && remaining.length > 0) assigned[i] = remaining.shift() ?? null;
        }

        setStarters(assigned);
        const starterIds = new Set(assigned.filter(Boolean).map(p => (p as Player).id));
        setSubstitutes((t.players ?? []).filter(p => !starterIds.has(p.id)));
      } catch (err) {
        console.error(err);
        setError("No se pudo cargar el equipo.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id]);

  function positionMatchesSlot(player: Player, slot: string) {
    const pos = (player.positions ?? []).map(p => p.toLowerCase());
    if (slot === "GK") return pos.some(p => p.includes("goal") || p === "gk");
    if (slot.startsWith("DF")) return pos.some(p => p.includes("def") || p.includes("back") || p.includes("cb") || p.includes("lb") || p.includes("rb"));
    if (slot.startsWith("CM")) return pos.some(p => p.includes("mid") || p.includes("cm") || p.includes("dm") || p.includes("am"));
    if (slot.startsWith("FW")) return pos.some(p => p.includes("for") || p.includes("st") || p.includes("fw") || p.includes("wing"));
    return false;
  }

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
              <p className="team-description">{team.description}</p>
            </div>
          </div>
          <div className="team-actions">
            <button className="btn" onClick={() => navigate(`/teams/add/${team.id}`)}>Edit team</button>
            <button className="btn btn--gray" onClick={() => navigate("/teams")}>Back</button>
          </div>
        </header>

        <div className="formation-and-squad">
          <div className="pitch-vertical">
            {/* Tu SVG ya está bien hecho, mantenlo */}
            <svg className="pitch-svg" viewBox="0 0 480 880" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
                <rect x="0" y="0" width="480" height="880" fill="#0b6b2f" />

                <rect x="16" y="16" width="448" height="848" fill="none" stroke="#fff" strokeWidth="4" rx="12" ry="12" />

                <rect x="56" y="16" width="368" height="120" fill="none" stroke="#fff" strokeWidth="3" />
                <rect x="56" y="743" width="368" height="120" fill="none" stroke="#fff" strokeWidth="3" />

                <circle cx="240" cy="440" r="44" fill="none" stroke="#fff" strokeWidth="3" />
                <circle cx="240" cy="440" r="3" fill="#fff" />

                <line x1="16" y1="440" x2="465" y2="440" stroke="#fff" strokeWidth="2" />

                <path d="M16 16 L36 16" stroke="#fff" strokeWidth="2" />
                <path d="M464 16 L444 16" stroke="#fff" strokeWidth="2" />
                <path d="M16 864 L36 864" stroke="#fff" strokeWidth="2" />
                <path d="M464 864 L444 864" stroke="#fff" strokeWidth="2" />

                <rect x="200" y="0" width="80" height="16" fill="none" stroke="#fff" strokeWidth="2" />
                <rect x="200" y="864" width="80" height="16" fill="none" stroke="#fff" strokeWidth="2" />
            </svg>

            <div className="pitch-overlay-absolute">
              {slotOrder.map((slot, idx) => {
                const player = starters[idx];
                return (
                  <div key={slot} className={`slot-abs slot-${slot}`}>
                    {player ? (
                      <div className="player-min" title={`${player.name} #${player.number}`}>
                        <img src={player.photo ?? ""} alt={player.name} className="player-min-photo" />
                        <div className="player-min-name">{player.name}</div>
                        <div className="player-min-number">#{player.number}</div>
                      </div>
                    ) : (
                      <div className="player-empty-min">Empty</div>
                    )}
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
