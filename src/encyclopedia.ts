import raw from "./data/encyclopedia.json";
import supplements from "./data/game-supplements.json";
import { species, forms, dexes, games, speciesById } from "./catalog";
import type { Form, Tracker } from "./domain";
export interface FormDetail {
  pokemon: string;
  height: number;
  weight: number;
  stats: number[] | null;
  pastStats: number[][];
  types: string[];
  pastTypes: Record<string, string[]>;
  abilities: { name: string; hidden: boolean }[];
  genus?: string;
  introducedGeneration: number | null;
}
export interface EvolutionRule {
  to: string;
  group: string;
  fromForm: string | null;
  toForm: string | null;
  conditions: string[];
}
export const encyclopedia = raw as unknown as {
  source: string;
  games: Record<
    string,
    { version: string; group: string; generation: number; regions: string[] }
  >;
  details: Record<string, FormDetail>;
  extraForms: Form[];
  formGames: Record<string, string[]>;
  flavor: Record<string, Record<string, string>>;
  evolutions: EvolutionRule[];
};
export const encyclopediaForms = [...forms, ...encyclopedia.extraForms];
/** Existence is separate from regional membership or obtainability. */
export function formExistsInGeneration(formId: string, gameId = "") {
  if (!gameId) return true;
  const game = encyclopedia.games[gameId];
  const form = encyclopediaForms.find((f) => f.id === formId);
  const s = form && speciesById.get(form.speciesId);
  const introduced = encyclopedia.details[formId]?.introducedGeneration;
  return (
    !!game &&
    !!s &&
    s.generation <= game.generation &&
    (introduced == null || introduced <= game.generation)
  );
}
export function trackerDexes(tracker: Tracker) {
  const game = games.find((g) => g.id === tracker.gameId);
  return dexes.filter(
    (d) => tracker.scopeIds.includes(d.id) && game?.scopes.includes(d.id),
  );
}
export function gameSpecies(gameId: string, speciesId: string) {
  const game = games.find((g) => g.id === gameId);
  return dexes.some(
    (d) =>
      game?.scopes.includes(d.id) &&
      d.entries.some((e) => e.speciesId === speciesId),
  );
}
export function contextualForms(speciesId: string, gameId: string) {
  return encyclopediaForms.filter((f) => {
    if (f.speciesId !== speciesId) return false;
    if (!gameId) return true;
    if (!formExistsInGeneration(f.id, gameId)) return false;
    if (f.category === "base") return true;
    // Only explicit game restrictions are strong enough evidence for alternate forms.
    return (
      f.gameRestrictions.includes(gameId) ||
      encyclopedia.formGames[f.id]?.includes(gameId)
    );
  });
}
export function evolutionFamily(speciesId: string, gameId: string) {
  let root = speciesById.get(speciesId)!;
  while (root.evolvesFrom) root = speciesById.get(root.evolvesFrom)!;
  const family = new Set([root.id]);
  for (let i = 0; i < species.length; i++) {
    let added = false;
    for (const s of species)
      if (s.evolvesFrom && family.has(s.evolvesFrom) && !family.has(s.id)) {
        family.add(s.id);
        added = true;
      }
    if (!added) break;
  }
  return species.filter(
    (s) =>
      family.has(s.id) &&
      (!gameId ||
        (s.generation <= encyclopedia.games[gameId].generation &&
          (encyclopedia.games[gameId].generation < 8 ||
            gameSpecies(gameId, s.id)))),
  );
}
export function evolutionRules(
  to: string,
  gameId: string,
  fromForm?: string,
  toForm?: string,
) {
  if (
    fromForm &&
    encyclopediaForms.find((f) => f.id === fromForm)?.speciesId !==
      speciesById.get(to)?.evolvesFrom
  )
    return [];
  if (
    gameId &&
    (!encyclopedia.games[gameId] ||
      !speciesById.has(to) ||
      speciesById.get(to)!.generation > encyclopedia.games[gameId].generation ||
      (fromForm && !formExistsInGeneration(fromForm, gameId)) ||
      (toForm && !formExistsInGeneration(toForm, gameId)))
  )
    return [];
  const all = encyclopedia.evolutions.filter(
    (r) =>
      r.to === to &&
      (!r.fromForm || !fromForm || r.fromForm === fromForm) &&
      (toForm ? r.toForm === toForm : !r.toForm),
  );
  if (!gameId) return all;
  const group = encyclopedia.games[gameId].group;
  // Audited version-specific additions. Never propagate special mechanics to other games.
  const additions = supplements.evolutions.filter(
    (r) =>
      r.to === to &&
      !toForm &&
      r.groups.includes(group) &&
      (!fromForm || r.fromForm === fromForm),
  );
  const exact = all.filter((r) => r.group === group);
  if (!exact.length && additions.length)
    return additions.map((r) => ({
      to: r.to,
      group,
      fromForm: r.fromForm,
      toForm: null,
      conditions: r.conditions,
    }));
  if (exact.length)
    return exact.map((r) => ({
      ...r,
      conditions: r.conditions.map((c) =>
        encyclopedia.games[gameId].generation < 8 &&
        c.startsWith("Amistad mínima:")
          ? "Amistad alta (umbral de esta versión no verificado)"
          : c,
      ),
    }));
  // Verified invariant Generation I methods only. Other games require an exact source record.
  const stable = new Set([
    2, 3, 5, 6, 8, 9, 11, 12, 14, 15, 17, 18, 20, 22, 24, 26, 28, 30, 31, 33,
    34, 36, 38, 40, 42, 45, 47, 49, 51, 53, 55, 57, 59, 61, 62, 64, 65, 67, 68,
    70, 71, 73, 75, 76, 78, 80, 82, 85, 87, 89, 91, 93, 94, 97, 99, 101, 103,
    105, 110, 112, 117, 119, 121, 130, 134, 135, 136, 139, 141, 148, 149,
  ]);
  if (
    stable.has(speciesById.get(to)!.number) &&
    !toForm &&
    (!fromForm ||
      encyclopediaForms.find((f) => f.id === fromForm)?.category === "base") &&
    !["legends-arceus", "legends-za"].includes(gameId)
  ) {
    return all.filter(
      (r) =>
        r.group === "1" &&
        !r.toForm &&
        !r.conditions.some((c) => c.startsWith("Región")) &&
        !(gameId.startsWith("lets-go") && r.conditions.includes("Intercambio")),
    );
  }
  return [];
}
export function baseStats(formId: string, gameId: string) {
  if (!formExistsInGeneration(formId, gameId)) return null;
  const d = encyclopedia.details[formId];
  if (!d?.stats) return null;
  if (!gameId) return d.stats;
  const generation = encyclopedia.games[gameId].generation;
  if (generation === 1) return null; // Gen I uses a single Special stat.
  const stats = [...d.stats];
  for (let stat = 0; stat < 6; stat++) {
    const historical = d.pastStats
      .filter((r) => r[0] >= generation && r[1] === stat)
      .sort((a, b) => a[0] - b[0])[0];
    if (historical) stats[stat] = historical[2];
  }
  return stats;
}
export interface Encounter {
  area: string;
  method: string;
  conditions: string;
  min: number;
  max: number;
}
const encounterFiles = import.meta.glob<{
  default: Record<string, Encounter[]>;
}>("./data/encounters/*.json");
export async function loadEncounters(
  gameId: string,
  pokemonId: string,
): Promise<Encounter[]> {
  const load = encounterFiles[`./data/encounters/${gameId}.json`];
  return load ? ((await load()).default[pokemonId] ?? []) : [];
}

export function formTypes(formId: string, gameId = "") {
  if (!formExistsInGeneration(formId, gameId)) return [];
  const d = encyclopedia.details[formId];
  if (!d) return [];
  if (!gameId) return d.types;
  const generation = encyclopedia.games[gameId].generation;
  const historical = Object.keys(d.pastTypes)
    .map(Number)
    .filter((g) => g >= generation)
    .sort((a, b) => a - b)[0];
  return historical ? d.pastTypes[String(historical)] : d.types;
}

export function acquisitionMethods(formId: string, gameId: string) {
  if (!formExistsInGeneration(formId, gameId)) return [];
  return supplements.acquisitions.filter(
    (r) => r.formId === formId && r.games.includes(gameId),
  );
}
