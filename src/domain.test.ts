import "fake-indexeddb/auto";
import { describe, it, expect, afterEach } from "vitest";
import Dexie from "dexie";
import { pageEntries, boxLabel, completion, percent } from "./domain";
import { forms, dexes, species } from "./catalog";
import {
  CollectionDB,
  changeCount,
  exportBackup,
  setCaught,
  deleteTracker,
} from "./storage";
import { validateBackup, importBackup } from "./backup";
const databases: CollectionDB[] = [];
const make = () => {
  const db = new CollectionDB(crypto.randomUUID());
  databases.push(db);
  return db;
};
afterEach(async () => {
  for (const db of databases.splice(0)) await db.delete();
});
describe("canonical identity and numbering", () => {
  it("keeps every species and form identity unique", () => {
    expect(new Set(species.map((s) => s.id)).size).toBe(1025);
    expect(new Set(forms.map((f) => f.id)).size).toBe(forms.length);
  });
  it("uses regional numbers, not National numbers", () => {
    const hoenn = dexes.find((d) => d.id === "4")!;
    expect(hoenn.entries[0]).toEqual({ speciesId: "species:252", number: 1 });
  });
  it("handles final boxes, gaps and empty results", () => {
    const entries = Array.from({ length: 61 }, (_, i) => i + 1);
    expect(pageEntries(entries, 0)).toHaveLength(30);
    expect(pageEntries(entries, 1)[0]).toBe(31);
    expect(pageEntries(entries, 2)).toEqual([61]);
    expect(boxLabel([4, 17, 60])).toBe("004 – 060");
    expect(boxLabel([])).toBe("Sin resultados");
    expect(percent(0, 0)).toBe(0);
  });
});
describe("specimens and completion", () => {
  it("persists multiple individuals without inflating completion", async () => {
    const db = make();
    await Promise.all([
      changeCount(db, forms[0], false, 1),
      changeCount(db, forms[0], false, 1),
      changeCount(db, forms[0], true, 1),
    ]);
    db.close();
    await db.open();
    const stats = completion(await db.specimens.toArray(), forms);
    expect(stats).toMatchObject({
      species: 1,
      forms: 1,
      total: 3,
      normal: 2,
      shiny: 1,
    });
  });
  it("never decrements below zero under concurrent writes", async () => {
    const db = make();
    await changeCount(db, forms[0], false, 1);
    await Promise.all(
      Array.from({ length: 4 }, () => changeCount(db, forms[0], false, -1)),
    );
    expect(await db.specimens.count()).toBe(0);
  });
  it("rejects locked and unverified shiny additions", async () => {
    const db = make();
    for (const state of ["locked", "unknown"])
      await expect(
        changeCount(
          db,
          forms.find((f) => f.shiny === state)!,
          true,
          1,
        ),
      ).rejects.toThrow();
    expect(await db.specimens.count()).toBe(0);
  });
  it("keeps tracker progress independent; hidden scopes preserve data", async () => {
    const db = make();
    const tracker = {
      id: "a",
      name: "Emerald",
      gameId: "emerald",
      scopeIds: ["4", "national-6"],
      description: "",
      theme: "#ffffff",
    };
    await db.trackers.add(tracker);
    await setCaught(db, "a", "species:1", true);
    await db.trackers.update("a", { scopeIds: ["4"] });
    expect(await db.progress.count()).toBe(1);
    expect(await db.specimens.count()).toBe(0);
    await db.trackers.update("a", { scopeIds: tracker.scopeIds });
    expect((await db.progress.toArray())[0].speciesId).toBe("species:1");
    await changeCount(db, forms[0], false, 1);
    await deleteTracker(db, "a");
    expect(await db.progress.count()).toBe(0);
    expect(await db.specimens.count()).toBe(1);
  });
});
describe("backup safety and migration", () => {
  it("roundtrips and merges idempotently", async () => {
    const a = make(),
      b = make();
    await changeCount(a, forms[0], true, 1);
    const backup = validateBackup(
      JSON.parse(JSON.stringify(await exportBackup(a))),
    );
    await importBackup(b, backup, "merge");
    await importBackup(b, backup, "merge");
    expect(await b.specimens.toArray()).toEqual(await a.specimens.toArray());
  });
  it("rejects duplicates, unknown forms, invalid scope and orphaned links", async () => {
    const db = make();
    await changeCount(db, forms[0], false, 1);
    const b = await exportBackup(db);
    expect(() =>
      validateBackup({ ...b, specimens: [...b.specimens, ...b.specimens] }),
    ).toThrow();
    expect(() =>
      validateBackup({
        ...b,
        specimens: [{ ...b.specimens[0], formId: "fake" }],
      }),
    ).toThrow();
    expect(() =>
      validateBackup({
        ...b,
        trackers: [
          {
            id: "x",
            name: "x",
            gameId: "emerald",
            scopeIds: ["fake"],
            description: "",
            theme: "",
          },
        ],
      }),
    ).toThrow();
    expect(() =>
      validateBackup({
        ...b,
        progress: [
          {
            id: "x/species:1",
            trackerId: "x",
            speciesId: "species:1",
            state: "caught",
            specimenIds: [],
          },
        ],
      }),
    ).toThrow();
  });
  it("rolls back the whole merge on conflicting IDs", async () => {
    const db = make();
    await changeCount(db, forms[0], false, 1);
    const b = await exportBackup(db),
      old = b.specimens[0];
    b.specimens = [
      { ...old, id: "new" },
      { ...old, shiny: true },
    ];
    await expect(importBackup(db, b, "merge")).rejects.toThrow();
    expect(await db.specimens.count()).toBe(1);
    expect((await db.specimens.get(old.id))?.shiny).toBe(false);
  });
  it("migrates v1 progress to specimen links without losing records", async () => {
    const name = crypto.randomUUID();
    const old = new Dexie(name);
    old.version(1).stores({
      specimens: "id,formId,createdAt",
      trackers: "id,gameId",
      progress: "id,trackerId,speciesId",
      preferences: "id",
    });
    await old.table("progress").put({
      id: "a/species:1",
      trackerId: "a",
      speciesId: "species:1",
      state: "caught",
    });
    old.close();
    const db = new CollectionDB(name);
    databases.push(db);
    expect(await db.progress.get("a/species:1")).toMatchObject({
      state: "caught",
      specimenIds: [],
    });
  });
});

it("keeps imported unverified shiny specimens out of the confirmed-completion numerator", () => {
  const form = forms.find((f) => f.shiny === "unknown")!;
  const metrics = completion(
    [
      {
        id: "historical",
        formId: form.id,
        shiny: true,
        createdAt: "2026-01-01T00:00:00Z",
      },
    ],
    forms,
  );
  expect(metrics.shiny).toBe(1);
  expect(metrics.shinyForms).toBe(0);
});
