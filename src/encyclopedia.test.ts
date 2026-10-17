import { describe, it, expect } from "vitest";
import { baseForms, dexes, forms, games } from "./catalog";
import {
  baseStats,
  contextualForms,
  encyclopedia,
  evolutionFamily,
  evolutionRules,
  trackerDexes,
  loadEncounters,
  formTypes,
} from "./encyclopedia";
describe("encyclopedia and regional invariants", () => {
  it("keeps regional order and game definitions distinct", () => {
    const ruby = games.find((g) => g.id === "ruby")!;
    const oras = games.find((g) => g.id === "omega-ruby")!;
    expect(ruby.scopes[0]).not.toBe(oras.scopes[0]);
    const hoenn = dexes.find((d) => d.id === ruby.scopes[0])!;
    expect(hoenn.entries[0]).toEqual({ speciesId: "species:252", number: 1 });
    expect(hoenn.entries).toHaveLength(202);
    expect(dexes.find((d) => d.id === oras.scopes[0])!.entries).toHaveLength(
      211,
    );
    expect(new Set(hoenn.entries.map((e) => e.number)).size).toBe(202);
  });
  it("rejects incompatible scopes without rewriting saved trackers", () => {
    const tracker = {
      id: "test",
      name: "Test",
      gameId: "red",
      scopeIds: ["2", "4"],
      description: "",
      theme: "#fff",
    };
    expect(trackerDexes(tracker).map((d) => d.id)).toEqual(["2"]);
    expect(tracker.scopeIds).toEqual(["2", "4"]);
  });
  it("uses actual form stats, historical changes and a common six-stat scale", () => {
    expect(baseStats(baseForms.get("species:1")!.id, "")).toEqual([
      45, 49, 49, 65, 65, 45,
    ]);
    const normal = baseForms.get("species:386")!;
    const attack = forms.find(
      (f) => f.speciesId === "species:386" && f.label.includes("Attack"),
    )!;
    expect(baseStats(attack.id, "")![1]).toBe(180);
    expect(baseStats(normal.id, "")![1]).toBe(150);
    expect(baseStats(baseForms.get("species:25")!.id, "red")).toBeNull();
    expect(baseStats(baseForms.get("species:25")!.id, "ruby")![2]).toBe(30);
    expect(baseStats(baseForms.get("species:25")!.id, "x")![2]).toBe(40);
  });
  it("retains Eevee branches and excludes later evolutions in Red", () => {
    expect(evolutionFamily("species:133", "").map((s) => s.id)).toContain(
      "species:700",
    );
    expect(evolutionFamily("species:133", "red").map((s) => s.id)).toEqual([
      "species:133",
      "species:134",
      "species:135",
      "species:136",
    ]);
    expect(
      evolutionRules("species:5", "red", "form:4")[0].conditions,
    ).toContain("Nivel mínimo: 16");
    expect(
      evolutionRules("species:134", "red", "form:133")[0].conditions.join(" "),
    ).toContain("Piedra Agua");
    expect(
      evolutionRules("species:94", "red", "form:93")[0].conditions,
    ).toContain("Intercambio");
    expect(evolutionRules("species:94", "legends-arceus", "form:93")).toEqual(
      [],
    );
  });
  it("keeps battle transformations out of the existing collection and game-unverified forms hidden", () => {
    expect(encyclopedia.extraForms.some((f) => f.label.includes("Mega"))).toBe(
      true,
    );
    expect(forms.some((f) => f.storage === "battle-only")).toBe(false);
    expect(
      contextualForms("species:6", "red").every((f) => f.category === "base"),
    ).toBe(true);
  });
  it("loads version-specific local encounters and explicit missing data", async () => {
    const bulbasaur = encyclopedia.details[baseForms.get("species:1")!.id];
    expect((await loadEncounters("red", bulbasaur.pokemon))[0].method).toMatch(
      /gift/i,
    );
    const pikachu = encyclopedia.details[baseForms.get("species:25")!.id];
    const records = await loadEncounters("red", pikachu.pokemon);
    expect(records.some((e) => e.area.toLowerCase().includes("viridian"))).toBe(
      true,
    );
    expect(records.every((e) => e.min <= e.max)).toBe(true);
    expect(await loadEncounters("scarlet", pikachu.pokemon)).toEqual([]);
  });
});

it("uses historical types instead of leaking modern Fairy typing into Red", () => {
  expect(formTypes(baseForms.get("species:35")!.id, "red")).toEqual(["Normal"]);
  expect(formTypes(baseForms.get("species:35")!.id, "x")).toEqual(["Hada"]);
});
