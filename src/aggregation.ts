import type { Form, Progress, Specimen, Tracker } from "./domain";

export type FormCounts = { normal: number; shiny: number };
/**
 * Derived inventory. Existing specimens are counted exactly once, even when
 * linked from multiple custom trackers. Each unlinked tracker registration
 * represents one additional individual; historically unclassified captures
 * remain separate instead of inventing normal/shiny status.
 */
export function aggregateCollection(specimens: Specimen[], trackers: Tracker[], progress: Progress[], catalog: Form[]) {
  const counts = new Map<string, FormCounts>();
  const unclassified = new Map<string, number>();
  const existingIds = new Set(specimens.map(s => s.id));
  const validForms = new Map(catalog.map(f => [f.id, f]));
  const trackerIds = new Set(trackers.map(t => t.id));
  const increment = (id: string, shiny: boolean) => {
    const row = counts.get(id) ?? { normal: 0, shiny: 0 };
    row[shiny ? "shiny" : "normal"]++;
    counts.set(id, row);
  };
  for (const specimen of specimens) increment(specimen.formId, specimen.shiny);
  for (const entry of progress) {
    if (entry.state !== "caught" || !trackerIds.has(entry.trackerId)) continue;
    if ((entry.specimenIds ?? []).some(id => existingIds.has(id))) continue;
    if (entry.formId && validForms.get(entry.formId)?.speciesId === entry.speciesId && typeof entry.shiny === "boolean") {
      increment(entry.formId, entry.shiny);
    } else {
      unclassified.set(entry.speciesId, (unclassified.get(entry.speciesId) ?? 0) + 1);
    }
  }
  return { counts, unclassified, unclassifiedTotal: [...unclassified.values()].reduce((sum, n) => sum + n, 0) };
}
