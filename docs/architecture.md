# ADR 001 — Static, offline-first Dexarium

Status: accepted for foundation 0.1.

## Stack
React + strict TypeScript, Vite, Tailwind v4 plus design-token CSS, React Router hash routes, Dexie/IndexedDB, vite-plugin-pwa/Workbox, Vitest + fake-indexeddb, Playwright. No backend, accounts, runtime API, remote fonts or CDN scripts. The production build includes normalized data and sprite atlases. Dependencies are pinned by package-lock.json.

## Domain boundaries
- Species IDs `species:<upstream species id>` are independent from displayed numbers. English/Spanish names come from localized source rows, with English fallback.
- Form IDs `form:<upstream form id>` never depend on array indices, names or numbering. Static source refreshes cannot erase specimens.
- Collectible variant identity is `(formId, shiny)` in this foundation. Gender and special variation can be introduced using explicit fields without changing specimen IDs. A shiny sprite is not evidence of availability.
- A specimen has a UUID, form identity, shiny flag and creation date. Optional metadata, gender and Gigantamax capability are attributes, not duplicate species. Every counter increment creates one record.
- Global inventory is authoritative. National completion counts distinct species with any owned form. Form completion counts forms with at least one normal OR shiny specimen. Shiny completion has its own denominator of confirmed available forms. Counts of specimens are never completion counts.
- A tracker is a named save/challenge associated with a game and visible Dex scope IDs. Progress is keyed by `(trackerId,speciesId)` and is independent of inventory. Different trackers for the same game never share progress.
- Explicit linking attaches existing specimen IDs to a tracker registration. It does not copy specimens. Removing an owned specimen removes its links transactionally; historical tracker registration remains. Unregistering a tracker entry removes that entry's links, never the specimen.
- Scope visibility only updates the tracker. It never deletes progress. When scopes overlap, their shared species progress is intentionally shared within that tracker. Statistics deduplicate visible species; the box browser selects one scope at a time to preserve contextual numbers.
- The game catalog is data driven. Membership in a game Dex is NOT a complete availability or encounter model. Regional forms currently cannot be individually registered in trackers; species-level progress is deliberate.

## Storage and compatibility
Version 1 stores specimens, trackers, progress and preferences; version 2 adds `specimenIds` to legacy progress records. The migration is tested against a real v1 database using fake IndexedDB. Future migrations must be additive and tested with old backups. Import accepts v1/v2, normalizes links, checks identity, references, metadata, scope validity and known shiny locks before opening one transaction. Merge is idempotent for identical IDs and rejects conflicts transactionally. Replace requires explicit UI confirmation. Export is a consistent read transaction; unknown metadata on specimen objects is preserved.

Unknown source form IDs in backups are rejected with a visible error; do not discard them. A future data update must preserve old reference records or add an alias migration. Updating the app never clears user tables. Browser eviction or clearing site data can still remove collections: export JSON and request persistent storage in settings.

The repository functions in `storage.ts` are the persistence boundary. A future optional backend can sync UUID records via a repository/outbox layer, with explicit conflict resolution and optional authentication; do not replace local storage with a mandatory server. No speculative server infrastructure is included now.

## Navigation and offline
Hash routing supports refreshing a nested route on GitHub Pages. Vite `BASE_PATH` defaults to `/Dexarium/`; assets, manifest and worker scope follow that setting. Workbox precaches all local reference data (compiled into JS), sprite sheets and application assets. Updates require user acceptance and do not touch IndexedDB. Cache readiness means successful worker installation, not just a connectivity guess. Service workers require HTTPS or localhost. First visit/installation requires connectivity; subsequent use does not. `file://` is not supported.

Thirty entries occupy six columns × five rows on desktop. Mobile reflows the same thirty entries into three columns for usable controls. Filtering keeps original numbers and uses a clearly labeled filtered box mode. Canonical ordering never mutates. Wheel events are throttled and consumed in the PC viewport; arrow keys work when that viewport is focused. Buttons and form controls retain their own keyboard semantics. Dialogs use native modal focus handling.

## Future Docker
Build with `BASE_PATH=/ npm run build`, then serve `dist/` with Nginx, Caddy or another static HTTP server. Use immutable cache headers for hashed assets, revalidation for index/manifest/service worker, and HTTPS for non-local PWA use. Collections remain browser-local; placing static files in a container does not create server persistence. A future backend and data volumes belong in an optional separate service.

## Follow-up decisions
A complete Master Dex requires an audited, versioned variant registry including visual gender differences, Alcremie decorations, Vivillon patterns, historical form transfer restrictions, cosmetic transformations and event distribution provenance. Do not derive this solely from `is_battle_only`. Add game/form/shiny eligibility matrices before claiming game-specific inventory legality. Support unknown historical specimens without silently deleting data when rules change.
