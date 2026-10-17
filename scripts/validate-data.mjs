import fs from "node:fs";
import assert from "node:assert/strict";
const read = (n) => JSON.parse(fs.readFileSync(`src/data/${n}.json`));
const species = read("species"),
  forms = read("forms"),
  dexes = read("dexes"),
  games = read("games");
const unique = (rows, key = "id") =>
  assert.equal(
    new Set(rows.map((r) => r[key])).size,
    rows.length,
    `Duplicate ${key}`,
  );
for (const data of [species, forms, dexes, games]) unique(data);
assert.equal(
  species.length,
  1025,
  "Update audited species baseline explicitly",
);
unique(species, "number");
for (let n = 1; n <= 1025; n++)
  assert(
    species.some((s) => s.number === n),
    `Missing species ${n}`,
  );
for (const s of species) {
  assert(
    forms.some((f) => f.speciesId === s.id && f.category === "base"),
    `Missing base ${s.id}`,
  );
  assert(s.name && s.es);
}
for (const f of forms) {
  assert(species.some((s) => s.id === f.speciesId));
  assert(["available", "locked", "unknown"].includes(f.shiny));
  assert(!/mega|gmax|totem/.test(f.label.toLowerCase()));
  for (const a of [f.art, f.shinyArt])
    if (a) {
      assert(fs.existsSync(`public/art/${a.sheet}.webp`));
      assert(
        fs.statSync(`public/art/${a.sheet}.webp`).size > 100,
        "Empty sprite atlas",
      );
      assert(a.index >= 0 && a.index < 120);
    }
}
for (const d of dexes) {
  unique(d.entries, "number");
  unique(d.entries, "speciesId");
  for (const e of d.entries) assert(species.some((s) => s.id === e.speciesId));
}
for (const g of games)
  for (const id of g.scopes) assert(dexes.some((d) => d.id === id));
const encyclopedia = read("encyclopedia"),
  supplements = read("game-supplements");
for (const f of [...forms, ...encyclopedia.extraForms]) {
  const detail = encyclopedia.details[f.id];
  assert(detail, `Missing encyclopedia detail ${f.id}`);
  if (detail.stats) {
    assert.equal(detail.stats.length, 6);
    assert(
      detail.stats.every((n) => Number.isInteger(n) && n >= 1 && n <= 255),
    );
  }
}
for (const r of supplements.evolutions) {
  assert(supplements.sources[r.source], "Missing evolution attribution");
  const parent = forms.find((f) => f.id === r.fromForm)?.speciesId;
  assert.equal(species.find((s) => s.id === r.to)?.evolvesFrom, parent);
  assert(
    r.groups.every((id) =>
      Object.values(encyclopedia.games).some((g) => g.group === id),
    ),
  );
  assert(r.conditions.length > 0);
}
for (const r of supplements.acquisitions) {
  assert(forms.some((f) => f.id === r.formId));
  assert(supplements.sources[r.source], "Missing acquisition attribution");
  assert(r.games.every((id) => games.some((g) => g.id === id)));
}
assert.equal(
  dexes
    .find((d) => d.id === "4")
    .entries.find((e) => e.speciesId === "species:252").number,
  1,
);
assert.equal(forms.find((f) => f.label === "Spiky Eared")?.shiny, "locked");
console.log(
  `Validated ${species.length} species, ${forms.length} forms, ${dexes.length} Dex scopes and ${games.length} games.`,
);
console.log(
  `Art missing: ${forms.filter((f) => !f.art).length} normal / ${forms.filter((f) => !f.shinyArt).length} shiny (explicit placeholders).`,
);
