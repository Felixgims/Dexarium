import type { Tracker } from "./domain";
export const canonicalTrackerName = (s: string) =>
  s.normalize("NFKC").trim().replace(/\s+/gu, " ").toLocaleLowerCase();
export const cleanTrackerName = (s: string) =>
  s.trim().replace(/\s+/gu, " ");
export function validateTrackerName(name: string, trackers: Tracker[], ownId?: string): string | null {
  if (!cleanTrackerName(name)) return "El nombre no puede estar vacío.";
  if (trackers.some(t => t.id !== ownId && canonicalTrackerName(t.name) === canonicalTrackerName(name))) {
    return "Ya existe una Pokédex con ese nombre.";
  }
  return null;
}
