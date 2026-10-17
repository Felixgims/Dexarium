# Foundation 0.1 acceptance status

A working vertical slice is delivered. Coverage is limited as documented; this is not an assertion that the entire master prompt is finished.

| Requirement | Status / evidence |
|---|---|
| Open through GitHub Pages | Workflow configured; deployment NOT verified. Requires merge and Pages configuration. |
| Install/cache for offline | Workbox precache and offline reload tested in Chromium. Browser/OS install prompt not tested. |
| PC boxes of 30 | Implemented; desktop 6×5, mobile 3×10. Partial boxes retain empty slots. |
| Horizontal navigation | Buttons, selector, arrows, wheel and swipe implemented. Automated arrows/buttons; wheel/swipe pending dedicated device testing. |
| Global/National views | Implemented over shared specimen records. |
| Multiple normal/shiny specimens | Persisted individual UUID records; shiny blocked for locked/unverified entries. |
| Shiny sprite preferences | Implemented; ownership and selection are separate. |
| Create game-specific Dex | Implemented, including multiple trackers per game. Emerald flow browser-tested. |
| Correct regional numbering | Source mappings bundled and validated; Emerald Treecko #001 browser-tested. Not every mapping manually audited. |
| Hide/restore expanded scopes | Implemented; retention unit-tested, scope UI browser-tested. |
| Search | Name, form and contextual/National numbers. Browser-tested. |
| Wiki | Reusable details, forms, numbers, types, species evolution relations and explicit unavailable metadata. Browser-tested. |
| Reload retains collection | IndexedDB and browser tests. |
| Export/import | Browser roundtrip, schema checks, idempotent merge and rollback tests. |
| Local production execution | Production build and preview exercised in Chromium. |
| Offline after installation | Browser context forced offline, reload and collection display verified. |

Additional limits: complete all-forms catalog, full shiny/legal-availability audit, every visual gender variation, per-game form legality, game-specific shiny legality, browser/OS install prompts, all-engine accessibility and public release verification remain outstanding. No deployment-success claim is made.
