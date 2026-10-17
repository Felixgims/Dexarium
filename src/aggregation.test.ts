import "fake-indexeddb/auto";
import { describe, it, expect } from "vitest";
import { aggregateCollection } from "./aggregation";
import { validateTrackerName } from "./tracker-names";
import { forms } from "./catalog";
import type { Tracker, Progress, Specimen } from "./domain";
const tracker = (id: string): Tracker => ({ id, name: id, gameId: "emerald", scopeIds: ["4"], theme: "#ffffff", description: "" });
const treecko = forms.find(f => f.speciesId === "species:252" && f.category === "base")!;
const specimen = (id: string, shiny = false): Specimen => ({ id, formId: treecko.id, shiny, createdAt: "2026-01-01" });
const caught = (id: string, classified = true): Progress => ({ id: `${id}/species:252`, trackerId: id, speciesId: "species:252", state: "caught", specimenIds: [], ...(classified ? { formId: treecko.id, shiny: false } : {}) });
describe("PokéBank aggregation", () => {
  it("sums multiple custom captures plus manual specimens independently of scope", () => {
    const a = tracker("a"), b = tracker("b");
    const total = aggregateCollection([specimen("1"), specimen("2"), specimen("3")], [a,b], [caught("a"), caught("b")], forms);
    expect(total.counts.get(treecko.id)).toEqual({ normal: 5, shiny: 0 });
    a.scopeIds = [];
    expect(aggregateCollection([], [a,b], [caught("a"), caught("b")], forms).counts.get(treecko.id)?.normal).toBe(2);
  });
  it("separates shiny, prevents re-counting linked specimens and retains unknown legacy", () => {
    const a = tracker("a"), b = tracker("b");
    const linked = { ...caught("a"), specimenIds: ["s1"] };
    const shiny = { ...caught("b"), shiny: true };
    const x = aggregateCollection([specimen("s1")], [a,b], [linked, shiny], forms);
    expect(x.counts.get(treecko.id)).toEqual({ normal: 1, shiny: 1 });
    const legacy = aggregateCollection([], [a], [caught("a",false)], forms);
    expect(legacy.unclassifiedTotal).toBe(1);
    expect(legacy.counts.size).toBe(0);
  });
});
describe("custom Pokédex name validation", () => {
  it("ignores case, whitespace and unicode compatibility differences", () => {
    const a = tracker("a"); a.name = "Aventure  One";
    expect(validateTrackerName(" aventure one ", [a], "b")).toMatch(/existe/);
    expect(validateTrackerName("  ", [a])).toMatch(/vacío/);
    expect(validateTrackerName("AVENTURE ONE", [a], "a")).toBeNull();
  });
});
