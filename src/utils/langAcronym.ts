export function langToAcronym(langCode?: string | null): string {
  if (!langCode) return "gb";
  const parts = String(langCode).toLowerCase().split(/[-_]/);
  const base = parts[0];
  const region = parts[1];

  const MAP: Record<string, string> = {
    en: "en",
    es: "es",
    sl: "sl",
    si: "sl",
    gb: "en",
    uk: "en",
  };

  if (region && MAP[region]) return MAP[region];
  if (MAP[base]) return MAP[base];
  return base;
}
