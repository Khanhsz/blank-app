# Marketing Tycoon V5.3 — Procedural PBR Materials

**Scope:** retrofit the existing production Marketing Tycoon game on branch `deploy/marketing-tycoon-lovable-world`. All 27 interactive buildings, 14 decorative buildings and 30 rival upgrade GLB variants remain attached to their original gameplay entities. Game saving, manual week turns, agency Rival AI, campaigns and camera controls are not changed by this material patch. The game still draws **LOD0 only**.

## Compatibility audit

- Previously `build-fallback.mjs` defined seven uniform, flat color materials, roughness roughly `0.92` for everything except tinted panes. This made concrete, glass and metal behave almost identically in direct lighting.
- GLB meshes are batched into at most one primitive per material role; glTF 2.0 linear color conversion was already in place.
- `city-modernism.mjs` creates ten low-poly archetypes; `city-facades.mjs` creates mounted windows; `brickhouse-modernism.mjs` remains a bespoke 11th archetype.
- `AssetDistrict.tsx` caches GLTFLoader assets via `useGLTF`, clones scenes without disposing shared resources, and uses a single GLB for visual architecture. The hitbox and label are separate and use the persistent city entity ID.
- Previous architecture defects (attached windows, clipping, sparse facades) have their own geometric audit; this update is additive to geometry, not a replacement renderer.
- Blender Python was using old uniform material inputs. It now imports the same PBR role/palette values from the shared JSON data file.

## Canonical material design system

- `assets/specs/pbr-materials.json` is the **single source of truth** for palettes, role indexes and PBR parameters.
- `tools/asset-factory/material-system.mjs` builds validated glTF `pbrMetallicRoughness` materials using sRGB hex → linear RGB conversion.
- `tools/asset-factory/blender_factory.py` loads the same JSON and configures Blender Principled BSDF `Base Color`, `Metallic` and `Roughness` accordingly.

| Role | Index | Roughness | Metallic |
|---|---:|---:|---:|
| Structural concrete | 0 | 0.88 | 0.00 |
| Architectural plaster | 1 | 0.89 | 0.00 |
| Roof concrete | 2 | 0.91 | 0.00 |
| Blue-grey window glass | 3 | 0.26 | 0.035 |
| Architectural accent | 4 | 0.80 | 0.00 |
| Stone podium | 5 | 0.80 | 0.00 |
| Graphite metal | 6 | 0.46 | 0.74 |
| Teal curtain wall glass | 7 | 0.30 | 0.045 |
| Brushed aluminium | 8 | 0.41 | 0.76 |
| Precast concrete panel | 9 | 0.91 | 0.00 |
| OOH graphite housing | 10 | 0.45 | 0.72 |

**Materials use opaque glTF metallic-roughness shading.** They do not use glass refraction/transmission or high-resolution texture maps, intentionally avoiding transparency sorting and texture memory overhead. Color/roughness, panel joints, window reveals and mullion geometry provide the stylized material texture.

Six distinct muted color palettes remain in use. Corporate clients get glass/concrete variants; rival agencies use a darker glass tone; residential and office facades emphasize concrete/plaster.

## Surface improvements

- `city-facades.mjs` now adds architectural curtain-wall portions for suitable HQs, concrete panel joints, aluminium fins, graphite window frames and light material variation.
- Details are mounted on the **face of each actual structural mass**, with overlap checks for other masses/DOOH slots.
- Geometry is deterministic and role-based. Window counts are capped on complex HQs to stay under the existing detailed LOD0 maximum of 1,800 triangles.
- Brickhouse retains its bespoke three-volume 3D architecture and its OOH/iOOH anchors. Materials are improved via the same shared palette and PBR settings.

## Quality gates and deployment

```bash
npm run assets:material-preflight  # geometry QA, 6 representative GLBs, 18 QA projections
npm run assets:build               # preflight then regenerate all city GLBs
npm run assets:verify              # byte-for-byte GLB rebuild verification
npm run build                      # TypeScript + gameplay/material tests + Vite
```

Representative assets: `office-brick`, `client-bloom`, `rival-muse`, `creative`, `arts-residence-a`, `office-tower`.

Each has front, right-side and elevated-isometric reproducible SVG projections, from exactly the procedural cuboid coordinates that feed the GLB generator:

[**View QA gallery**](https://marketing-tycoon-bedroom-play.onrender.com/assets/mt-city/modernist-city-v3-pbr/qa/index.html)

**Important:** these are **geometry QA projections**, not screenshot captures from a Blender session or from a browser rendering the Three.js game. Browser visual sign-off remains outstanding.

The production outputs under `public/assets/mt-city/modernist-city-v3-pbr/` include all 112 GLBs, versioned `manifest.json`, `qa-report.json`, and the six-building QA gallery. The version bump prevents re-use of `modernist-city-v2` browser GLB cache.

Automated checks validate:
- PBR material role names and ordering; 11 material declarations per GLB and at most 11 mesh primitives;
- Correct linear base colors, metallic/roughness and absence of embedded texture bitmaps;
- Existing building gameplay IDs, anchors, non-overlapping plots, mass support and facade attachment;
- 27 interactive/14 decorative city buildings and all 5 rival HQ expansion tier sequences;
- Save/CEO/campaign/weekly regression tests and LOD0-only runtime.

## Before/after metrics — actual Render build outputs

| Build statistic | Before (modernist-city-v2) | V5.3 (modernist-city-v3-pbr) | Difference |
|---|---:|---:|---:|
| GLB files | 112 | 112 | unchanged |
| Detailed base city triangles | 31,236 | 35,052 | +3,816 (+12.2%) |
| Total uncompressed GLB bytes | 4,000,620 | 4,648,888 | +648,268 (+16.2%) |
| High-resolution bitmap maps | none | none | unchanged |
| Explicit glTF materials per GLB | 7 | 11 | +4 |

**Not benchmarked:** browser FPS, GPU memory, WebGL draw calls, realistic glass reflection, browser screenshots and visual appearance on actual client devices. No runtime performance numbers are asserted based on build geometry alone.

To monitor measured WebGL rendering performance, visit:
`https://marketing-tycoon-bedroom-play.onrender.com/?perf=1`.

## Remaining manual QA

1. Open the live game and QA gallery side-by-side. Inspect material appearance for six representatives from matching camera angles.
2. Confirm facade PBR glass does not look excessively opaque and that all DOOH dynamic creatives remain readable above their metal housings.
3. Check current rival tier 1/4 office variants and actual GPU draw calls on a low-power laptop.
4. Native Blender execution for editable `.blend` masters is still required; the generator source has been updated but Blender MCP/executable was unavailable in this session.
5. If needed, tune individual color palettes and screen brightness based on real Three.js screenshots, then run preflight + full tests again before redeploy.

**Do not confuse successful GLB/TypeScript tests with manual art-direction approval.**
