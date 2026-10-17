# Marketing Tycoon — Whole-City Low-Poly Modernism Replacement

## Status and verifiable scope

Production-stage code migration of **all 41 current city buildings**, including every instance and stage variant found in actual source. 3D assets are actually compiled into the existing Three.js game, not a disconnected model pack.

**The visual acceptance gate remains open:** Blender MCP/native `.blend` generation and screenshots of the running game (plus browser FPS/draw calls) were **not** verified from this environment. Automated tests and a successful Render build are not substitutes for visual QA.

## Source-of-truth inventory

- `src/game/city.ts`: **27** persistent gameplay entity IDs: 8 core locations, 5 rival agency HQs, 8 purchasable offices, 6 client HQs.
- `assets/specs/arts-quarter.slice.json`: **4** existing independent decorative GLB lots.
- Old `AmbientBuildings` function in `WorldScene.tsx`: **10** dynamic-grid decorative building instances. Grid 7×6, occupied game lots 27, decorative lots 4, central plaza excluded.
- Total **41 building instances**. This includes locked/unlocked locations because the locked state stays on the game entity, not a separate mesh list.
- Reproducible combined inventory: `assets/specs/city-all.modernism.json`, regenerated from real `cityLots` by `tools/asset-factory/make-city-spec.ts`.
- Architecture selections curated per individual ID: `assets/specs/city-art-direction.json`. All 41/41 entries required; unknown IDs fail generation instead of silently falling back to a box.

**Game/save compatibility:** `cityLots[].id`, positions, footprints, office fees, rival client account mapping, campaign API and camera remain unchanged. A GLB name is never saved to the game. Existing game progression, AI client briefs, manual weekly turns and agency system are unaffected.

## Architectural grammar and city identity

| Family | Character and suitable context |
|---|---|
| Stacked modernist | Cantilevered, offset creative volumes; creative studios |
| Vertical tower | Slender glass/concrete grids, vertical fins; corporate HQ |
| Horizontal pavilion | Broad shopfront, horizontal overhang; cafés/retail |
| Courtyard complex | Two connected wings with central courtyard; research/agency |
| Terraced architecture | Recessed stepped massing and balconies; homes/offices |
| Sculptural modernism | Asymmetric bridge-connected masses; media/landmarks |
| Modular grid | Strong rhythm and structural bays; standard offices |
| Industrial modernism | Broad studio halls and stepped roof elements; TVC/media |
| Podium and tower | Commercial plinth under differentiated upper blocks |
| Connected campus | Multiple smaller pavilions connected by bridges |
| Brickhouse master | Hand-authored three-volume modernist office with integrated DOOH |

A structural uniqueness validator checks the five curated aspects (archetype, roof, facade, entrance, variant); every neighboring pair must differ in at least **three**. This is a rule-based check, not a substitute for actual view comparisons.

Each building family has geometry authored by `tools/asset-factory/city-modernism.mjs`; `office-brick` keeps `brickhouse-modernism.mjs` as a separate hero master.

Colors: warm plaster, muted clay, sage, mauve, grey concrete, charcoal and blue-tinted glass. Material palettes are shared and use simple PBR responses.

## GLB replacement paths and geometry tests

Build:
```bash
npm install
npm run assets:build   # derive city manifest and export GLBs
npm run assets:verify  # byte-for-byte reproducible binaries
npm test
npm run build
```

`public/assets/mt-city/modernist-city-v1` contains:

- 41 × 2 primary GLB files (`<id>.lod0.glb`, `<id>.lod1.glb`).
- 5 rival agency headquarters × tiers 2–4 × 2 LODs = 30 additional GLBs (`<id>.tier<N>.lod<M>.glb`).
- **112 GLB files total**.
- A versioned `manifest.json` and `qa-report.json` with IDs, coordinates, previous source, material, silhouette family, media anchors, migration and verification flags, triangle counts, per-file size and SHA256.

LODs enforce <1,800 triangles for detailed and <360 for distant geometry; tests inspect GLB header, mesh accessors, named anchors and file hashes. Both the main building and upgraded rival tiers have real geometry changes; no static asset is faked by a colored CSS layer. Decorative buildings now all use GLB via `ChunkManager` and the prior ambient cuboid function has been removed. Interaction hitboxes remain the same playable IDs.

Temporary suspense/error fallback for unloaded models remains enabled to avoid disabling gameplay on network failure. When GLBs load successfully the old legacy meshes are not mounted.

## Marketing media system

Only eligible buildings receive advertising slots, based on real role:

- Street-facing facade DOOH with standardized dynamic creative.
- Rooftop/parapet integrated OOH housings.
- iOOH interactive kiosks associated with the existing property ID.

Building slots are stored with stable IDs and named anchors `ANCHOR_DOOH_Facade`, `ANCHOR_OOH_Parapet`, `ANCHOR_Activation` (when applicable), in addition to `ANCHOR_Entrance`, `ANCHOR_Sign`, `ANCHOR_Roof`, and `COLLIDER_Footprint`.

`src/components/game/CityCampaignMedia.tsx` and `BrickhouseCampaignMedia.tsx` render editable canvas-based artwork in the actual runtime, not baked GLB graphics. **This is a presentation asset system, not an additional paid advertising inventory engine**. TVC production remains separate from physical OOH inventory.

## Native Blender editing and Blender MCP status

Blender generation sources:

- `tools/asset-factory/blender_factory.py`: batch exporter, versioned GLB and editable `.blend` masters.
- `tools/asset-factory/city_modernism.py`: native modules for ten architectural grammars, LODs, balconies, roofs, grid windows, and media anchor positions.
- `tools/asset-factory/brickhouse_modernism.py`: independent hero master.

Run from repository root with Blender 4.x:

```bash
blender -b --factory-startup --python tools/asset-factory/blender_factory.py -- \
  --spec assets/specs/city-all.modernism.json \
  --count 41 \
  --masters assets/source/marketing-city \
  --out assets/exports/blender/modernist-city-v1
```

This also generates editable `rival-*.tier2/3/4.blend` sources.

**Important provenance**: Blender MCP and the Blender executable were not available to this session. The deployed GLBs are reproducible Node procedural geometry, not actual Blender renders or exports. Blender script is authored but requires execution and review. Do not overwrite the current deployment folder with unvalidated Blender exports. Treat native Blender GLBs as an approval candidate and promote them only after asset/runtime QA passes.

## Live performance measurement and screenshots

Open the game, enter **Marketing City**, and append `?perf=1` to the URL:
```
https://marketing-tycoon-bedroom-play.onrender.com/?perf=1
```
An opt-in performance HUD reads the actual WebGL renderer every ~2 seconds. Data is available in the browser console through `window.__MT_CITY_PERF__`:

- Observed frames per second and lowest sample FPS
- Actual rendered draw calls and triangle count
- WebGL geometry and texture object counts
- Chrome JavaScript heap when exposed

Browser scores should be measured on a representative device with consistent camera zoom and graphics quality; stage changes and offscreen chunk unloading should be tested. This implementation **does not claim measured browser FPS** in CI.

Screenshot acceptance checklist (not completed in this environment):
1. Full-city and each district overview after GLBs finish loading.
2. At least one front/side/top angle per architecture family.
3. Before/after matching camera shots for Brickhouse and important corporate HQs.
4. Locked/unlocked lots and purchased office upgrades.
5. Rival agency stage 1 vs stage 4 visual difference.
6. DOOH/iOOH media examples with actual campaign content.
7. FPS/draw-call snapshot at default and high quality.

## Remaining release gates

- [x] Inventory all 41 real building instances and persistent IDs
- [x] Assign custom architectural families and nearby uniqueness constraints
- [x] Generate and integrate primary GLB with LOD for all 41
- [x] Replace legacy ambient procedural building meshes
- [x] Generate tier-specific visual GLBs for all rival HQs
- [x] Preserve save/game identity and existing campaign / weekly / CEO regression tests
- [x] Implement optional renderer performance instrumentation
- [ ] Execute Blender/MCP export and preserve native editable `.blend` sources
- [ ] Capture comparable in-game screenshots and confirm no visible placeholder
- [ ] Verify all 41 buildings visually for clipping, facade layering, interactions and performance
- [ ] Record verified browser FPS/draw-call/memory results and optimize if needed

**Do not label the end-to-end art delivery as fully approved until the unchecked gates are satisfied.**
