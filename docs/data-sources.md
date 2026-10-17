# Data sources, provenance and limits

Snapshot date: 2026-10-17. See `data-manifest.json` for generated counts.

## Selection
PokéAPI's CSV dataset provides stable species/form IDs, localized names, types, evolutionary parent relationships, game/version groups and explicit contextual Pokédex numbering. The generator uses commit `5ee47a9a9c1229632ec4b473a9c1c53026e005dd`. PokéAPI's BSD-3-Clause source license is reproduced in `pokeapi-license.txt`. Pokémon names, characters and graphics remain subject to their respective rights; the software license is not an independent grant of Pokémon artwork rights.

Sprite assets come from PokeAPI/sprites at commit `289e842364648ec0495ae4ba12f48d5cbfbf670b`. Attribution from its README is reproduced in `sprite-attribution.md`. The preparation script caches original PNGs locally and assembles lossless WebP atlases. Normal/shiny art is loaded locally at runtime. No artwork ownership is claimed. This is an unofficial fan project; redistribution permissions should be reviewed before a wider/commercial release.

Pokémon Showdown is useful for battle mechanics but its battle-centric form taxonomy is insufficient for a collectible inventory, and it does not replace regional numbering. It is not bundled. PokéAPI is also insufficient alone for full historical legality, exact cosmetic variants and shiny availability; those require a separately audited rules dataset. The generator intentionally does not claim to resolve those fields from sprite existence.

## Current coverage
- All 1,025 species in the pinned source, with names, generation, gender metadata and evolutionary parent relations.
- 1,128 selected form records: base, regional, Unown, Deoxys, Burmy/Wormadam, Rotom, Deerling/Sawsbuck and historical Spiky-eared Pichu. Battle-only and Mega entries are excluded.
- All 41 main-release versions represented in the selected source catalog from Game Boy through Switch, including Japanese Gen I editions and Legends: Z-A. Colosseum, XD and Champions are excluded. DLC releases become scopes rather than standalone save trackers.
- Source regional/area/DLC scopes are copied verbatim. Historical National Dex caps are explicit: 386 for Gen III, 493 for Gen IV/BDSP, 649 for Gen V, 721 for Gen VI. The conventional National view spans all species but is not presented as an in-game National Dex in games without one. Gen II's alternate old Pokédex ordering is not exposed as a separate scope in this release.
- Form game restrictions are not exhaustively populated. The event Pichu is explicitly restricted to HeartGold/SoulSilver. Game filters mean source Dex membership, not availability, encounters or transfer compatibility.
- Shiny availability is explicitly curated: included non-regional forms of species 1–493 are available except Spiky-eared Pichu, which is locked. Other entries are marked UNKNOWN and their add-shiny controls are disabled pending audit. This conservative boundary is not a statement that those Pokémon are shiny locked. Backups may preserve unknown-status shiny specimens, but never an explicitly locked form.

## Known omissions
Full visual gender variants, Vivillon patterns, Furfrou trims, Alcremie decoration combinations, many alternate legendary/event forms, form-change methods, transfer constraints and post-Gen-IV shiny availability audit remain incomplete. Types are derived from upstream Pokémon rows; evolutionary relationships are species-level and methods are omitted. Encounter locations and exact game appearances are deliberately not invented. Existing sprites can include community artwork.

## Rebuilding
`pip install Pillow`, then `npm run data:prepare` (requires network only here). Cached source downloads are ignored by git; normalized JSON and generated atlases are committed. Review all changes, update audited baselines explicitly, and run `npm run data:validate`. Validate source completeness independently before increasing coverage claims. Current validation checks duplicate species/form/Dex/game IDs, all National numbers in the snapshot, base-form coverage, references, atlas bounds, regional order, game scopes and the explicit shiny lock. It does not prove complete form coverage or legal obtainability.

References:
- https://pokeapi.co/docs/v2
- https://github.com/PokeAPI/pokeapi
- https://github.com/PokeAPI/sprites
- https://github.com/smogon/pokemon-showdown
- https://legends.pokemon.com/es-mx/news/release-date (Z-A main-release inclusion)

Shiny-lock provenance: https://projectpokemon.org/home/files/file/2604-ilex-forest-spiky-eared-pichu/ and https://bulbapedia.bulbagarden.net/wiki/Spiky-eared_Pichu — historical event cannot be shiny or leave HGSS.

### Encyclopedia expansion

`prepare_encyclopedia.py` adds pinned local form statistics, historical stat/type corrections, species descriptions, abilities, evolution conditions, region mappings and versioned encounter groups. See [pokedex-update.md](pokedex-update.md) for import coverage, explicit missing-data behavior, form compatibility and accuracy limits. These records do not replace or renumber the existing collection catalogue.
