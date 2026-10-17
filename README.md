# Dexarium

Pokemon Pokedex tracker. Track, flag, register and check what you have, and where to get the next.

Dexarium is an offline-first Pokémon collection terminal: a global specimen inventory, a conventional National Dex, independent game trackers and a shared encyclopedia. Foundation release **0.1** provides working local persistence and a bundled dataset; it is **not yet a complete all-forms Master Dex**.

## Run locally

Requires Node.js 24 and npm. Install dependencies once with internet access:

```sh
npm ci
npm run dev
```

Open the address printed by Vite, normally `http://localhost:5173/Dexarium/`.

For production/offline testing:

```sh
npm run build
npm run preview -- --host 127.0.0.1
```

Open `http://127.0.0.1:4173/Dexarium/`, wait for the offline-ready indicator, then reload once so the service worker controls the page. Subsequent use works without internet. All application code, reference data and 2,256 normal/shiny sprite images (packed into 19 atlases) are local. Use an HTTP server, not `file://`. Building offline is possible after npm dependencies are installed; data regeneration is never part of the normal build.

To deploy at a domain root, use `BASE_PATH=/ npm run build`. A future Docker image only needs to serve `dist/` through a static server; see [architecture](docs/architecture.md).

## What works

- Global inventory with individual specimen UUIDs, normal/shiny counters and immediate IndexedDB persistence.
- National species completion derived from all owned forms; form and specimen metrics remain separate.
- Desktop PC boxes of 30 slots (6×5), horizontal box transitions, throttled wheel, swipe, focused arrow keys and direct box selection. Mobile uses the same 30-entry pages in a 3-column layout.
- Light/dark appearance, normal/shiny/selected sprite preferences, accessible native dialogs and reduced-motion support.
- Search and filters retain canonical numbers. Global slot numbers use stable snapshot ordering, National uses National numbers, and game trackers use source regional numbers.
- Multiple independent trackers per game, description and accent color, actual regional/area/DLC scopes and explicit historical National caps. Hiding a scope never deletes progress.
- Explicit linking of existing inventory specimens to a tracker; capturing in a tracker does not add inventory.
- Shared Wiki with forms, types, localized names, generation, gender metadata, species-level evolutionary relationships, contextual numbers and explicit shiny status.
- Transactional JSON import/export, duplicate/conflict detection, confirmation before replace/delete, and schema v1→v2 migration.

## Coverage and deliberate limits

The snapshot includes **1,025 species, 1,128 selected forms, 44 Dex definitions and 41 main-release versions**. All included normal/shiny image references resolve locally. The data validation suite checks IDs, references, National coverage, regional numbering, scopes and atlas bounds.

Full cosmetic/gender coverage, many event forms and a complete game/form eligibility matrix remain unfinished. Shiny availability is confirmed only for the explicitly scoped first-generation-through-fourth-generation forms; other entries are visibly marked unverified and cannot receive new shiny counts. Spiky-eared Pichu is explicitly locked. The existence of shiny art never unlocks ownership. Exact encounters, locations, learnsets and detailed evolution methods are omitted rather than invented.

Game membership means membership in a game's Pokédex, not proof of capture or transfer legality. Trackers currently register species, not game-specific form variants. See [data sources and limitations](docs/data-sources.md) and [acceptance status](docs/acceptance.md).

## Data safety

Collections live in this browser profile and origin; no account or server is involved. Clearing site data can erase them. Regularly export JSON in Settings, especially before changing browsers/devices. App updates and changing visible scopes preserve data. Imported backups are validated before a transaction. Merging matching IDs is idempotent; conflicting records reject the entire import. Replacing asks for explicit confirmation.

## Tests and validation

```sh
npm run data:validate
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

Tests cover numbering, partial boxes, stable identities, shiny restrictions, atomic counters, species/form completion, tracker independence, scope visibility, import/export integrity, conflict rollback, persistence and migrations. Browser tests cover actual UI interactions, backup, offline reload, sprite decoding, search, Wiki, theme and mobile layout. `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` optionally selects an already-installed Chromium.

To regenerate the reference snapshot, install Python + Pillow and run `npm run data:prepare`. This is the only step that downloads Pokémon data/assets. Review generated differences and source licensing before committing. Normal builds use committed files and do not call APIs.

## GitHub Pages

1. Review and merge the development PR into `main`.
2. In repository **Settings → Pages → Build and deployment**, select **GitHub Actions**. Pages availability for private repositories depends on the GitHub plan; this repo is currently private. Do not change repository visibility merely to enable deployment without the owner's decision.
3. The Pages workflow validates data, runs unit/browser tests, builds with `/Dexarium/`, then publishes `dist/` using the Pages environment.
4. Inspect the workflow's deployment URL and test a refresh on `/#/national`, sprite loading and offline reload.

Expected address after a successful Pages deployment: `https://felixgims.github.io/Dexarium/`. **This address is not a claim that deployment has happened.** PR CI does not publish. No default-branch commit or merge is performed by this implementation.

Hash routes work without server rewrite rules. The application base path, sprite paths, PWA start URL and service-worker scope follow the Vite base. The workflow uses a static build; GitHub Pages does not host a backend or database.

## Structure

- `src/domain.ts`: typed species, forms, specimens, tracker definitions and pure metrics.
- `src/catalog.ts` / `src/data/`: normalized static reference catalog.
- `src/storage.ts` / `src/backup.ts`: IndexedDB, migrations, transactional operations and backup validation.
- `src/components.tsx`: shared sprites, dialogs, tracker editor and species details.
- `src/main.tsx` / `src/style.css`: routed application, box browsing and visual system.
- `scripts/`: pinned data preparation and validation.
- `docs/`: architecture decisions, provenance, attribution, known limitations and acceptance status.

## Next milestones

1. Audit complete permanent/cosmetic/gender variants and shiny availability with per-rule provenance.
2. Add game/form compatibility and historical transfer rules; extend tracker progress to optional forms.
3. Expand metadata editors, richer Wiki datasets and language preferences.
4. Add cross-browser/accessibility validation, confirmed Pages deployment and release tagging after review.

Pokémon and its characters belong to their respective rights holders. Unofficial project. PokéAPI's source license and sprite attribution are preserved in `docs/` and shipped in `public/`. No ownership of Pokémon artwork is claimed.
