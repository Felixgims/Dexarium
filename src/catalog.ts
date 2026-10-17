import speciesData from "./data/species.json";
import formsData from "./data/forms.json";
import dexData from "./data/dexes.json";
import gameData from "./data/games.json";
import type { Species, Form, DexDefinition, Game } from "./domain";
export const species = speciesData as Species[];
export const forms = formsData as Form[];
export const dexes = dexData as DexDefinition[];
export const games = gameData as Game[];
export const speciesById = new Map(species.map((s) => [s.id, s]));
export const formById = new Map(forms.map((f) => [f.id, f]));
export const baseForms = new Map(
  species.map((s) => [
    s.id,
    forms.find((f) => f.speciesId === s.id && f.category === "base")!,
  ]),
);
