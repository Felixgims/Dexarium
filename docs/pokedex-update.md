# Compact storage and Pokédex update

## Behavior

The landscape collection workspace uses the actual browser viewport at widths of at least 1000px. The existing six-column, five-row catalogue boxes, specimen counters, shiny controls, box selector and keyboard navigation remain available. Filters open in a scrollable secondary surface. Detail dialogs scroll independently. Smaller/portrait layouts retain the existing fallback.

`#/pokedex` is the encyclopedia route. Existing `#/wiki` links still open the same section. The collection and National completion tracker remain separate from encyclopedia browsing and game trackers.

The detail view contains overview, form-specific base stats on a shared 0–255 scale, a full branching species family, game-specific acquisition records, and alternate forms. Pokémon data is prepared at build time; the browser makes no Pokémon API requests. Encounters are loaded in separate version chunks, all included in the service-worker precache for offline use even if that version was not opened online.

Tracker views only use saved scopes that belong to the selected game. This validation does not modify saved trackers or progress. Regional membership and numbering still come from the existing source tables; neither generation nor National ordering is substituted for a regional definition. Progress denominators use the complete active definition, independently of search results and global inventory.

## Source and reproducibility

Run `python scripts/prepare_encyclopedia.py` to regenerate the committed datasets. It downloads and caches the licensed PokéAPI CSV snapshot `5ee47a9a9c1229632ec4b473a9c1c53026e005dd`. The existing PokéAPI license applies; see `pokeapi-license.txt` and `data-sources.md`. Regeneration does not rewrite species/form collection identifiers, sprite atlases, regional definitions or user records.

The snapshot imports details for 1,284 catalogue/encyclopedia forms, 676 evolution rules and 60,378 encounter groups. Encounter groups retain version, Pokémon identity, area, method, conditions and min/max level. Their range combines the observed slots for the same area/method/conditions; it does not claim every intermediate level occurs. Appearance rates and version exclusivity are not inferred. Region names come from the source version-group/region mapping.

The collection's existing selected-form catalogue remains unchanged. Additional battle transformations live only in the encyclopedia, so adding Mega/Gigantamax records cannot alter a collection completion denominator or make battle transformations storable. Missing artwork is explicit. Regional forms are admitted into a game context only with an explicit existing restriction or a form-specific encounter record.

## Accuracy boundaries

- Some versions, including Scarlet/Violet, BDSP and Legends titles, have no encounter rows in this snapshot. The UI explicitly reports missing data rather than claiming a Pokémon is unobtainable. The source includes some gifts, fossils and special methods but does not exhaustively cover acquisition, breeding, internal trades, events or transfers.
- Evolution rules use exact source version-group records. A conservative allowlist reuses stable Generation I level/item/trade methods in conventional games. It excludes Legends and does not extrapolate later special conditions. Other missing version rules remain unavailable. Historical friendship thresholds are not inferred from a modern source threshold.
- The family view filters out later-generation species. For generation VIII onward, it additionally requires documented Pokédex membership; Pokémon compatible with a game but absent from its recorded definitions can therefore be omitted. Pokédex membership is never presented as proof of encounter availability or complete game compatibility.
- Statistics and types use the source historical corrections. Generation I's single Special stat is explicitly unsupported rather than fabricated as six modern stats. Historical abilities are not supplied: game contexts show an unavailable state (or no abilities before generation III). Current abilities, including hidden abilities, are shown in general encyclopedia context.
- Game form compatibility remains incomplete. Alternate forms without explicit compatibility evidence are hidden in a selected game. Battle transformation sprites and some special conditions remain incomplete. No Pokémon GO costume variants are added.
- The data is a pinned snapshot, not a live promise of current event or transfer availability. Some location and method names fall back to the source's English labels.

## Validation and deployment

Commands: `npm ci`, `npm run data:validate`, `npm test`, `npm run build`, `npm run test:e2e`. There is no configured lint script; TypeScript checks run during the build. The browser suite covers all five requested viewports (1280×720 through 2560×1440), the full 30-slot geometry and controls, filters, regional independence, persistence/backup, historical route compatibility, statistics, Eevee branches, versioned encounters and offline loading of an unopened data chunk. Existing sprite decoding, theme and mobile fallback checks remain in place.

The Pages workflow builds on pushes to `main` with `BASE_PATH=/Dexarium/` and publishes `dist`. In repository Settings → Pages, select GitHub Actions. Open `https://felixgims.github.io/Dexarium/`; if a previous install is active, use the application's update prompt and wait for offline-ready status. Required precached assets total approximately 12 MiB before network compression. Vite reports a non-fatal large-chunk warning for the encyclopedia/catalogue and the Sword/Shield encounter chunks; each remains below the service worker's 6 MB per-file limit.

For local use: `npm ci`, `npm run build`, `npm run preview`. Use `BASE_PATH=/ npm run build` when hosting at the domain root, including future static Docker hosting. No server API or database service is required. There are no IndexedDB schema or backup-format changes.
