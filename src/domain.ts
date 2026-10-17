export type ShinyAvailability = "available" | "locked" | "unknown";
export interface Species {
  id: string;
  number: number;
  name: string;
  es: string;
  generation: number;
  genderRate: number;
  genderDifference: boolean;
  evolvesFrom: string | null;
}
export interface Art {
  sheet: number;
  index: number;
}
export interface Form {
  id: string;
  speciesId: string;
  label: string;
  category: string;
  storage: string;
  shiny: ShinyAvailability;
  types: string[];
  order: number;
  art: Art | null;
  shinyArt: Art | null;
  gameRestrictions: string[];
}
export interface DexEntry {
  speciesId: string;
  number: number;
}
export interface DexDefinition {
  id: string;
  name: string;
  entries: DexEntry[];
}
export interface Game {
  id: string;
  name: string;
  scopes: string[];
}
export interface Specimen {
  id: string;
  formId: string;
  shiny: boolean;
  createdAt: string;
  nickname?: string;
  notes?: string;
  originGame?: string;
  gender?: "male" | "female" | "genderless";
  gigantamax?: boolean;
}
export interface Tracker {
  id: string;
  name: string;
  gameId: string;
  scopeIds: string[];
  description: string;
  theme: string;
}
export interface Progress {
  /** Explicitly identified capture, absent on legacy species-only records. */
  formId?: string;
  shiny?: boolean;
  id: string;
  trackerId: string;
  speciesId: string;
  state: "seen" | "caught";
  specimenIds: string[];
}
export interface Preferences {
  id: "preferences";
  theme: "dark" | "light";
  sprite: "normal" | "shiny" | "automatic";
}
export interface Backup {
  format: "dexarium";
  version: 2;
  exportedAt: string;
  specimens: Specimen[];
  trackers: Tracker[];
  progress: Progress[];
  preferences: Preferences[];
}
export const pageEntries = <T>(entries: T[], page: number) =>
  entries.slice(page * 30, page * 30 + 30);
export const boxLabel = (numbers: number[]) =>
  numbers.length
    ? `${String(numbers[0]).padStart(3, "0")} – ${String(numbers.at(-1)).padStart(3, "0")}`
    : "Sin resultados";
export const percent = (owned: number, total: number) =>
  total ? Math.round((owned / total) * 100) : 0;
export function completion(specimens: Specimen[], forms: Form[]) {
  const ids = new Set(specimens.map((s) => s.formId));
  const known = forms.filter((f) => ids.has(f.id));
  return {
    species: new Set(known.map((f) => f.speciesId)).size,
    forms: known.length,
    shinyForms: new Set(
      specimens
        .filter(
          (s) =>
            s.shiny &&
            forms.some((f) => f.id === s.formId && f.shiny === "available"),
        )
        .map((s) => s.formId),
    ).size,
    normal: specimens.filter((s) => !s.shiny).length,
    shiny: specimens.filter((s) => s.shiny).length,
    total: specimens.length,
  };
}
