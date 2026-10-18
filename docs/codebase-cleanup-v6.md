# Marketing Tycoon — V6 codebase cleanup audit

**Branch:** `deploy/marketing-tycoon-lovable-world` · **Scope:** modern app entrypoints, game modules, outdated standalone demo, and save compatibility.

## Removal — verified retired

| Removed | Why safe to remove | Replacement |
| --- | --- | --- |
| `src/game/world.ts` | Deprecated phase-based navigation helpers: zero runtime imports and zero test imports in the current app. | `src/components/game/WorldScene.tsx`, `src/game/city.ts`, current player progression |
| `src/game/functions.ts` | Old eight-department metrics layer no longer rendered. The only runtime consumer was a **type-only** identifier in `personnel.ts`; two tests asserted obsolete dashboard metrics. | Four ACC/STR/CRE/MED talent capabilities in `personnel.ts`; `resourcePlanning.ts` |
| `public/simulation/index.html` | Disconnected proof-of-concept standalone stochastic Simulation Lab; no routes, application links, source imports or documentation entrypoints. | Integrated campaign/business simulation and V6 resource what-if forecasting |

The last item previously lived at `/simulation/` and is intentionally no longer published. It was not used as the agency's actual campaign engine.

## Refactor — preserve behavior

- `src/components/game/Panels.tsx`: removed obsolete personnel-dashboard imports, fake `locked=false` gate and unreachable reputation copy from the Networking panel.
- `src/game/personnel.ts`: declared the still-needed role-specific team-lead ID type locally rather than importing an entire unused eight-department module.
- Updated old tests to assert the four active talent functions and specialist counts without referencing the retired dashboard.

## Deliberately retained

- `src/game/state.ts`: the v1 localStorage key, save migration, old campaign phase compatibility and synthetic-client cleanup. Old saves and current player economies must not be wiped.
- `src/game/campaign.ts` and the active freelancer journey: bedroom jobs and campaign progress still depend on these modules.
- `src/game/ceo.ts`, `src/game/clientTeams.ts`, `src/game/recruitment.ts`, `src/game/resourcePlanning.ts`: authoritative active agency engine.
- `src/components/game/AssetDistrict.tsx`, `WorldScene.tsx`, asset factory scripts and GLB specs: these are active 3D assets even if some identifiers mention “legacy” or “fallback”.
- V2/V3 documentation retained for history; outdated specifications now carry an explicit historical note.

## Guardrails

- Do not delete code merely because a filename contains `v2`, `v3`, `legacy`, or `fallback`.
- Always check references from **app, game modules, tests, scripts and explicit routes** before removing a source file.
- Run `npm run build` (full typecheck, full gameplay suite, and production Vite build) after cleanup.
- Check Render deploy commit against GitHub branch HEAD; do not assume auto-deploy happened.
