import type {
  Backup,
  Specimen,
  Tracker,
  Progress,
  Preferences,
} from "./domain";
import { forms, species, games } from "./catalog";
import type { CollectionDB } from "./storage";
const object = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);
const str = (v: unknown): v is string =>
  typeof v === "string" && v.length > 0 && v.length <= 5000;
function assert(ok: unknown, message: string): asserts ok {
  if (!ok) throw new Error(message);
}
export function validateBackup(input: unknown): Backup {
  assert(
    object(input) &&
      input.format === "dexarium" &&
      (input.version === 1 || input.version === 2),
    "Formato o versión de copia no compatible.",
  );
  for (const key of ["specimens", "trackers", "progress", "preferences"])
    assert(
      Array.isArray(input[key]) && input[key].length <= 100000,
      `Lista inválida: ${key}`,
    );
  const specimens = input.specimens as unknown[],
    trackers = input.trackers as unknown[],
    progress = input.progress as unknown[],
    preferences = input.preferences as unknown[];
  for (const rows of [specimens, trackers, progress, preferences]) {
    const ids = new Set();
    for (const r of rows) {
      assert(
        object(r) && str(r.id) && !ids.has(r.id),
        "Identificador inválido o duplicado.",
      );
      ids.add(r.id);
    }
  }
  for (const s of specimens) {
    assert(
      object(s) &&
        str(s.id) &&
        str(s.createdAt) &&
        Number.isFinite(Date.parse(s.createdAt)) &&
        typeof s.shiny === "boolean",
      "Ejemplar inválido.",
    );
    const f = forms.find((f) => f.id === s.formId);
    assert(f, "Forma desconocida.");
    assert(!s.shiny || f.shiny !== "locked", "Shiny bloqueado.");
    for (const k of ["nickname", "notes", "originGame"])
      assert(
        s[k] === undefined || typeof s[k] === "string",
        "Metadatos inválidos.",
      );
    assert(
      s.gender === undefined ||
        ["male", "female", "genderless"].includes(s.gender as string),
      "Género inválido.",
    );
    assert(
      s.gigantamax === undefined || typeof s.gigantamax === "boolean",
      "Capacidad inválida.",
    );
  }
  for (const t of trackers) {
    assert(
      object(t) &&
        str(t.name) &&
        typeof t.description === "string" &&
        typeof t.theme === "string",
      "Tracker inválido.",
    );
    const g = games.find((g) => g.id === t.gameId);
    assert(
      g &&
        Array.isArray(t.scopeIds) &&
        t.scopeIds.length &&
        t.scopeIds.every((id) => g.scopes.includes(id)) &&
        new Set(t.scopeIds).size === t.scopeIds.length,
      "Ámbitos no válidos.",
    );
  }
  const normalized = progress.map((p) => {
    assert(
      object(p) &&
        str(p.trackerId) &&
        str(p.speciesId) &&
        p.id === `${p.trackerId}/${p.speciesId}` &&
        trackers.some((t) => (t as Tracker).id === p.trackerId) &&
        species.some((s) => s.id === p.speciesId) &&
        ["seen", "caught"].includes(p.state as string),
      "Progreso inválido.",
    );
    const ids = p.specimenIds ?? [];
    assert(
      Array.isArray(ids) &&
        ids.every((id) =>
          specimens.some(
            (s) =>
              (s as Specimen).id === id &&
              forms.find((f) => f.id === (s as Specimen).formId)?.speciesId ===
                p.speciesId,
          ),
        ),
      "Vínculo inválido.",
    );
    return { ...p, specimenIds: ids } as unknown as Progress;
  });
  assert(preferences.length <= 1, "Preferencias duplicadas.");
  for (const p of preferences)
    assert(
      object(p) &&
        p.id === "preferences" &&
        ["dark", "light"].includes(p.theme as string) &&
        ["normal", "shiny", "automatic"].includes(p.sprite as string),
      "Preferencias inválidas.",
    );
  return {
    format: "dexarium",
    version: 2,
    exportedAt: new Date().toISOString(),
    specimens: specimens as Specimen[],
    trackers: trackers as Tracker[],
    progress: normalized,
    preferences: preferences as Preferences[],
  };
}
export async function importBackup(
  db: CollectionDB,
  backup: Backup,
  mode: "merge" | "replace",
) {
  const b = validateBackup(backup);
  await db.transaction("rw", db.tables, async () => {
    if (mode === "replace") for (const table of db.tables) await table.clear();
    // Stable IDs make merges idempotent. Conflicting records are rejected, never silently overwritten.
    for (const [table, rows] of [
      [db.specimens, b.specimens],
      [db.trackers, b.trackers],
      [db.progress, b.progress],
      [db.preferences, b.preferences],
    ] as const) {
      for (const row of rows) {
        const old = await table.get(row.id);
        if (old && JSON.stringify(old) !== JSON.stringify(row))
          throw new Error(
            `Conflicto en ${row.id}. Utiliza reemplazar con una copia previa.`,
          );
        if (!old) await (table as import("dexie").Table).add(row);
      }
    }
  });
}
