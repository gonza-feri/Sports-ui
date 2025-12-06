// src/pages/TeamsPage.tsx
import { useI18n } from "../i18n/I18nProvider";
import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import Menu from "../components/Menu";
import FloatingButton from "../components/FloatingButton";
import "./TeamsPage.css";

type Team = {
  id: number;
  name: string;
  description?: string;
  logo?: string;
};

export default function TeamsPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [openMenu, setOpenMenu] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");

  const wrapperRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadTeams() {
      try {
        setLoading(true);
        const res = await api.get("/teams");
        if (!cancelled) setTeams(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error("Error loading teams", err);
        setError("The teams could not be loaded.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadTeams();
    return () => {
      cancelled = true;
    };
  }, []);

  // cerrar menú al click fuera o Escape
  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!wrapperRef.current) {
        setOpenMenu(null);
        return;
      }
      if (!wrapperRef.current.contains(target as Node)) {
        setOpenMenu(null);
        return;
      }
      if (!target.closest(".menu-dropdown") && !target.closest(".menu-button")) {
        setOpenMenu(null);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpenMenu(null);
    }
    document.addEventListener("mousedown", onDocMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  async function handleDelete(teamId: number) {
    const confirmDelete = window.confirm("Are you sure you want to delete this team?");
    if (!confirmDelete) return;
    try {
      await api.delete(`/teams/${teamId}`);
      setTeams((prev) => prev.filter((t) => t.id !== teamId));
      setOpenMenu((prev) => (prev === teamId ? null : prev));
    } catch (err) {
      console.error("Error deleting team", err);
      alert("The team could not be removed.");
    }
  }

  const filteredTeams = teams.filter((t) =>
    t.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <Menu />
      <section className="page-wrapper" ref={wrapperRef}>
        <h2>{t("teams")}</h2>

        {/* Buscador */}
        <div className="team-search">
          <input
            type="text"
            placeholder={t("search_for_team")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        {loading && <p>{t("loading")}</p>}
        {error && <p className="error">{error}</p>}

        <ul className="team-list" role="list">
          {filteredTeams.map((team) => (
            <li
              key={team.id}
              className={`team-card ${openMenu === team.id ? "is-open" : ""}`}
              onClick={() => navigate(`/teams/${team.id}`)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") navigate(`/teams/${team.id}`);
              }}
            >
              <div className="team-left" aria-hidden>
                <div className="team-logo-wrap">
                  <img
                    src={team.logo || ""}
                    alt={`${team.name} logo`}
                    className="team-logo"
                    loading="lazy"
                  />
                </div>
              </div>

              <div className="team-center">
                <h3 className="team-name">{team.name}</h3>
              </div>

              <div className="team-right" onClick={(e) => e.stopPropagation()}>
                <button
                  className="menu-button"
                  aria-haspopup="true"
                  aria-expanded={openMenu === team.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenMenu(openMenu === team.id ? null : team.id);
                  }}
                  title="Open menu"
                >
                  ⋮
                </button>

                {openMenu === team.id && (
                  <ul className="menu-dropdown" role="menu" aria-label={`Opciones ${team.name}`}>
                    <li
                      role="menuitem"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenu(null);
                        navigate(`/teams/${team.id}`);
                      }}
                    >
                      {t("enter")}
                    </li>
                    <li
                      role="menuitem"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenu(null);
                        navigate(`/teams/add/${team.id}`);
                      }}
                    >
                      {t("edit")}
                    </li>
                    <li
                      role="menuitem"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenu(null);
                        handleDelete(team.id);
                      }}
                    >
                      {t("remove")}
                    </li>
                  </ul>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <FloatingButton aria-label="Add team" onClick={() => navigate("/teams/add")} />
    </div>
  );
}
