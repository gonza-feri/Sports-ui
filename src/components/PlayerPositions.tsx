import React, { useMemo } from "react";
import { useI18n } from "../i18n/I18nProvider";

type Props = { positions?: string[] | null; className?: string };

export default function PlayerPositions({ positions, className }: Props) {
  const { t, lang } = useI18n();

  const translated = useMemo(() => {
    if (!positions || positions.length === 0) return "—";
    return positions
      .map((rawPos) => {
        const normalized = String(rawPos).trim().toLowerCase().replace(/\s+/g, "_");
        const key = `positions.${normalized}`;
        const translated = t(key);
        return translated === key ? rawPos : translated;
      })
      .join(", ");
  }, [positions, t, lang]);

  return <span className={className}>{translated}</span>;
}
