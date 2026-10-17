import Dexie, { type Table } from "dexie";
import type {
  Specimen,
  Tracker,
  Progress,
  Preferences,
  Backup,
  Form,
} from "./domain";
export class CollectionDB extends Dexie {
  specimens!: Table<Specimen, string>;
  trackers!: Table<Tracker, string>;
  progress!: Table<Progress, string>;
  preferences!: Table<Preferences, string>;
  constructor(name = "dexarium") {
    super(name);
    this.version(1).stores({
      specimens: "id,formId,createdAt",
      trackers: "id,gameId",
      progress: "id,trackerId,speciesId",
      preferences: "id",
    });
    this.version(2)
      .stores({
        specimens: "id,formId,createdAt",
        trackers: "id,gameId",
        progress: "id,trackerId,speciesId",
        preferences: "id",
      })
      .upgrade((tx) =>
        tx
          .table("progress")
          .toCollection()
          .modify((p) => {
            p.specimenIds ??= [];
          }),
      );
  }
}
export const db = new CollectionDB();
export async function changeCount(
  database: CollectionDB,
  form: Form,
  shiny: boolean,
  delta: 1 | -1,
) {
  if (shiny && form.shiny !== "available" && delta === 1)
    throw new Error("Disponibilidad shiny no confirmada.");
  await database.transaction(
    "rw",
    database.specimens,
    database.progress,
    async () => {
      if (delta === 1) {
        await database.specimens.add({
          id: crypto.randomUUID(),
          formId: form.id,
          shiny,
          createdAt: new Date().toISOString(),
        });
        return;
      }
      const record = await database.specimens
        .where("formId")
        .equals(form.id)
        .filter((s) => s.shiny === shiny)
        .last();
      if (record) {
        await database.specimens.delete(record.id);
        await database.progress.toCollection().modify((p) => {
          p.specimenIds = p.specimenIds.filter((id) => id !== record.id);
        });
      }
    },
  );
}
export async function setCaught(
  database: CollectionDB,
  trackerId: string,
  speciesId: string,
  caught: boolean,
) {
  const id = `${trackerId}/${speciesId}`;
  if (caught)
    await database.progress.put({
      id,
      trackerId,
      speciesId,
      state: "caught",
      specimenIds: [],
    });
  else await database.progress.delete(id);
}
export async function deleteTracker(database: CollectionDB, id: string) {
  await database.transaction(
    "rw",
    database.trackers,
    database.progress,
    async () => {
      await database.trackers.delete(id);
      await database.progress.where("trackerId").equals(id).delete();
    },
  );
}
export async function exportBackup(database: CollectionDB): Promise<Backup> {
  return database.transaction("r", database.tables, async () => ({
    format: "dexarium",
    version: 2,
    exportedAt: new Date().toISOString(),
    specimens: await database.specimens.toArray(),
    trackers: await database.trackers.toArray(),
    progress: await database.progress.toArray(),
    preferences: await database.preferences.toArray(),
  }));
}
