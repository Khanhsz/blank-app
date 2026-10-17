# Marketing Tycoon Asset Factory — Compatibility Audit (2026-10-17)

## Existing implementation

- 3D: React 19, @react-three/fiber 9, three 0.181, @react-three/drei 10.
- Scenes: bedroom, Marketing City, agency office and boardroom in `src/components/game/WorldScene.tsx`; orthographic-like elevated-perspective view via Drei `CameraControls`, currently a perspective camera (42° FOV). Preserve scene/camera controls.
- City gameplay: `src/game/city.ts` defines **27 persistent lot IDs**, positions, dimensions and category: core, client, rival, office. `src/components/game/Panels.tsx` resolves selection via those IDs, not geometry labels.
- Rendering: primitive box meshes, instance-batched windows, procedural roads/traffic/ambient buildings. No model registry or binary GLB asset pipeline existed before this change.
- Save: `src/game/state.ts` stores game entities, `officeId`, CEO state, campaign decisions and weekly summaries via local storage. **Do not mutate schema or replace city lot IDs.**
- Backend: existing Gemini AI brief microservice is unrelated; **must remain untouched**.

## Compatibility / rollout policy

1. Add optional visual asset registry keyed by `cityLots[].id`. GLB filenames are *presentation*, never source-of-truth for identity.
2. Vertical slice: **Arts Quarter**, 6 game entity buildings (creative, influencer, rival-muse, client-bloom, office-loft, office-brick) + 4 nearby decorative prototypes.
3. Preserve the existing `Building` component as an error/loading fallback (mesh, building HTML label and click handler retained). GLB scenes render only for approved and validated manifest entries.
4. GLB units = meters; Y-up, X/Z centered; bottom at y=0; +Z entrance. The R3F wrapper sets scaling based on `CityLot` dimensions, including dynamic rival height. Anchors `ANCHOR_Entrance`, `ANCHOR_Sign`, `ANCHOR_Roof`, and `COLLIDER_Footprint` are exported and validated.
5. Asset rendering is client-only, with GLTFLoader caching via React Three Fiber/Drei and lazy visibility / LOD on repeat instances. Camera, movement, city labels, game interactions and office rent continue using existing ID handlers.
6. Deterministic, JSON-driven generation with a Blender `bpy` master exporter as canonical path and a tiny GLB fallback generator to validate web integration when Blender/MCP is unavailable. File source outputs are reproducible; don't claim native `.blend` masters before Blender has actually run.
7. No launch of 70 masters / 268 variants until vertical-slice validation, in-browser interaction checks and browser FPS/memory measurements.

## Quality gates

- Validate unique IDs, world bounds, anchors, transforms, GLB header/structure, poly budget and LOD triangle counts.
- TypeScript, game regression tests, Render production build.
- Visual angles, browser FPS/draw calls, GPU memory and raycast/animation checks are manual browser/Blender QA gates, and **must not be represented as passed** by build/test success alone.

## Performance goals (targets, not measurements)

- LOD0 <= 1,800 triangles/building, LOD1 <= 360.
- <= 12 glTF material primitives per master; no embedded textures, meshes packed by material.
- District GLBs lazy-loaded, error fallback per building; decorator instances use shared geometry where suitable.
- Target 30+ FPS on integrated graphics, benchmark before scaling. 
