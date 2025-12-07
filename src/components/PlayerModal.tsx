// src/components/PlayerModal.tsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import type { Player } from "../types/types";
import { useI18n } from "../i18n/I18nProvider";
import { langToAcronym } from "../utils/langAcronym";

type Props = {
  player: Player | null;
  onClose: () => void;
  /** Si true, intentará traer el extracto completo de Wikipedia (más largo). */
  preferFullWiki?: boolean;
};

export default function PlayerModal({ player, onClose, preferFullWiki = true }: Props) {
  const { t, lang } = useI18n();
  const langAcronym = langToAcronym(lang);
  const [wikiShort, setWikiShort] = useState<string | null>(null);
  const [wikiFull, setWikiFull] = useState<string | null>(null);
  const [wikiLoading, setWikiLoading] = useState(false);
  const [wikiError, setWikiError] = useState<string | null>(null);

  useEffect(() => {
    if (!player) return;
    let cancelled = false;
    const title = (player.name || "").trim();
    if (!title) return;

    async function fetchWiki() {
      setWikiLoading(true);
      setWikiError(null);
      setWikiShort(null);
      setWikiFull(null);

      try {
        console.log(langAcronym);
        // 1) Intentamos el endpoint REST summary (rápido y CORS-friendly)
        const summaryUrl = `https://${langAcronym}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
        try {
          const res = await axios.get(summaryUrl, { timeout: 6000 });
          if (!cancelled && res?.data?.extract) {
            setWikiShort(String(res.data.extract));
          }
        } catch {
          // no pasa nada si falla; seguimos intentando con query
        }

        // 2) Si preferimos el extracto completo, pedimos via action=query (texto plano)
        if (preferFullWiki) {
          // action=query supports CORS with origin=*
          const queryUrl = `https://${langAcronym}.wikipedia.org/w/api.php?action=query&prop=extracts&explaintext=1&format=json&titles=${encodeURIComponent(
            title
          )}&origin=*`;
          try {
            const res2 = await axios.get(queryUrl, { timeout: 8000 });
            if (cancelled) return;
            const pages = res2?.data?.query?.pages;
            if (pages && typeof pages === "object") {
              const pageKey = Object.keys(pages)[0];
              const page = pages[pageKey];
              if (page && page.extract) {
                // page.extract puede ser muy largo; lo guardamos como wikiFull
                setWikiFull(String(page.extract));
                return;
              }
            }
          } catch {
            // fallback silencioso
          }
        }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (err) {
        if (!cancelled) setWikiError("No external information could be obtained.");
      } finally {
        if (!cancelled) setWikiLoading(false);
      }
    }

    fetchWiki();
    return () => {
      cancelled = true;
    };
  }, [player, preferFullWiki]);

  if (!player) return null;

  return (
    <div className="player-modal__backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="player-modal" onClick={(e) => e.stopPropagation()}>
        <button className="player-modal__close" onClick={onClose} aria-label="Close">×</button>

        <div className="player-modal__header">
          <img
            src={player.photoPreview ?? player.photo ?? "/placeholder-player.png"}
            alt={player.name}
            style={{ width: 96, height: 96, objectFit: "cover", borderRadius: 8 }}
          />
          <div style={{ marginLeft: 12 }}>
            <h2 style={{ margin: 0 }}>{player.name}</h2>
            {player.number !== undefined && <p style={{ margin: "6px 0 0", color: "#cfe7ff" }}>#{player.number}</p>}
            {player.positions && player.positions.length > 0 && (
              <p style={{ margin: "6px 0 0", color: "#9fb6d8" }}>
                {player.positions.map((pos) => t(pos.toLowerCase())).join(" • ")}
              </p>
            )}
          </div>
        </div>

        <div className="player-modal__body">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <div>
              <strong>{t("in_matchday_squad")}</strong>
              <div style={{ color: "#dbefff" }}>{player.isStarter ? t("yes") : t("no")}</div>
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
            </div>
          </div>

          <h3 style={{ marginTop: 12 }}>{t("external_info")}</h3>

          {wikiLoading && <p>{t("loading")}</p>}

          {!wikiLoading && wikiFull && (
            <div style={{ whiteSpace: "pre-wrap", color: "#e6eef8", lineHeight: 1.45 }}>{wikiFull}</div>
          )}

          {!wikiLoading && !wikiFull && wikiShort && (
            <div style={{ whiteSpace: "pre-wrap", color: "#e6eef8", lineHeight: 1.45 }}>{wikiShort}</div>
          )}

          {!wikiLoading && !wikiFull && !wikiShort && (
            <div style={{ color: "#9aa7b8", fontStyle: "italic" }}>
              {t("no_external_info")}
            </div>
          )}

          {wikiError && <div style={{ color: "#ffb4a6" }}>{wikiError}</div>}
        </div>
      </div>
    </div>
  );
}
