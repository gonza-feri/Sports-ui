/* eslint-disable @typescript-eslint/no-explicit-any */
// src/utils/positions.ts
export function translatePositionsArray(
  positions: string[] | undefined | null,
  t: (k: string, vars?: Record<string, any>) => string
): string {
  if (!positions || positions.length === 0) return "—";

  return positions
    .map((rawPos: string) => {
      const normalized = String(rawPos).trim().toLowerCase().replace(/\s+/g, "_");

      // 1) positions.normalized
      const posKey = `positions.${normalized}`;
      const posTranslated = t(posKey);
      if (posTranslated && posTranslated !== posKey && posTranslated !== rawPos) return posTranslated;

      // 2) clave simple en root
      const simpleTranslated = t(normalized);
      if (simpleTranslated && simpleTranslated !== normalized && simpleTranslated !== rawPos) return simpleTranslated;

      // 3) intentar raw tal cual en positions
      const rawKey = `positions.${rawPos}`;
      const rawTranslated = t(rawKey);
      if (rawTranslated && rawTranslated !== rawKey && rawTranslated !== rawPos) return rawTranslated;

      // 4) fallback: devolver el texto original
      return rawPos;
    })
    .join(", ");
}
