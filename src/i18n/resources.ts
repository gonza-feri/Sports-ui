// solo datos y utilidades (NO componentes)
import en from "./locales/en.json";
import es from "./locales/es.json";
import sl from "./locales/sl.json";

export const RES: Record<string, Record<string,string>> = { en, es, sl };
export const STORAGE_KEY = "appLanguage";
