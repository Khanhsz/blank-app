# Brickhouse Studios — Low-Poly Modernism vertical slice

**Scope:** one actual existing Marketing Tycoon building, `office-brick` (Brickhouse Studios), not a new scene or game. Original city/gameplay ID `office-brick`, coordinates and lease mechanics are unchanged.

## 1. Compatibility and baseline

- Existing scene: `WorldScene.tsx` renders City via `DistrictManager` and `SafeAssetBuilding`, GLTFLoader through Drei `useGLTF`, and preserves `LegacyBuilding` fallback. Camera remains `CameraControls`.
- Master spec: `assets/specs/arts-quarter.slice.json`, id `office-brick`.
- Renderer registry: `src/components/game/AssetRegistry.ts` reads master version `slice-3`, so cached `slice-2` geometry cannot be substituted accidentally.
- Gameplay: office lease is handled by `src/game/city.ts`, current HQ `s.officeId`, employee capacity/overhead/CEO logic, not by GLB mesh names. No schema changes, no altered persistent IDs.
- Prior geometry: cuboid main body with disconnected window boxes and two generic overlay billboards. In old implementation, the board's content was repeated on roof and facade without meaningful architectural housing.

## 2. New architectural design

**Design language:** Modernist stylized diorama / Bauhaus / International Style without photorealism.

**Building composition** (X horizontal, Y up, +Z faces street):

1. **Left production studio**, 7.3 m high, large glazed gallery.
2. **Main central office tower**, 12 m high, clean matte plaster, coordinated window bays and a subtle roof parapet.
3. **Right stepped wing**, about 9.2 m high, simplified glazed ribbons and vertical fins.

All three volumes are offset in plan and height. They sit within the 10×10-m original building plot. A street-facing recessed entrance, colored canopy, integrated business sign, restrained concrete/glass geometry, rooftop service unit and minimal planter break up the generic box silhouette.

**Materials:** existing muted clay, warm plaster, matte charcoal, lightly blue-tinted glass and terracotta accents. Lighting/fog/camera architecture unchanged.

## 3. Billboard and media inventory

Three named, version-independent IDs:

| Slot ID | Type | GLB anchor | Content |
|---|---|---|---|
| `brickhouse-dooh-main` | digital OOH | `ANCHOR_DOOH_Facade` | runtime CanvasTexture |
| `brickhouse-ooh-parapet` | rooftop OOH | `ANCHOR_OOH_Parapet` | runtime creative surface |
| `brickhouse-activation` | interactive iOOH kiosk | `ANCHOR_Activation` | click routes to persistent `office-brick` |

Four foundational anchors (`ANCHOR_Entrance`, `ANCHOR_Sign`, `ANCHOR_Roof`, `COLLIDER_Footprint`) remain. The GLB has permanent architecture and frames only: campaign text/media **are not baked** into GLB. `BrickhouseCampaignMedia.tsx` fetches anchor coordinates from the loaded model and draws current game brand/weekly content on media planes. It does **not** modify client/lead data or charge a marketing budget. TVC is a separate inventory category and is not conflated with physical billboards.

## 4. Procedural sources

- Browser-compatible reproducible GLB factory: `tools/asset-factory/brickhouse-modernism.mjs`, used by `tools/asset-factory/build-fallback.mjs`.
- Editable Blender-native counterpart: `tools/asset-factory/brickhouse_modernism.py`, integrated into `tools/asset-factory/blender_factory.py`.
- Source specification `assets/specs/arts-quarter.slice.json` (uses `slice-3` to avoid stale browser caches).
- GLB artifacts + report when built: `public/assets/mt-city/slice-3/office-brick.lod0.glb`, `office-brick.lod1.glb`, `manifest.json`, `qa-report.json`.

Reproduce Node artifacts with `npm run assets:build` and validate with `npm run assets:verify`. Render production build regenerates these in its output.

To generate **native, editable** Blender `.blend` and Blender-exported GLBs, execute in an environment with Blender:

```bash
blender -b --factory-startup --python tools/asset-factory/blender_factory.py -- \
  --spec assets/specs/arts-quarter.slice.json --count 6 \
  --masters assets/source/arts-quarter \
  --out assets/exports/blender/slice-3
```

The example processes the first six interactive specs, including `office-brick`. **Blender/MCP was not accessible during this implementation**, so no native `.blend` export or genuine Blender screenshots are claimed. Blender output is kept separate from the web fallback directory to prevent an unintentional overwrite.

## 5. Quality gates

**Automated gates:**
- All pre-existing gameplay and save tests pass.
- `office-brick` remains a registered interactive office and retains collision anchor.
- 7 required named anchor nodes survive in both LOD0/LOD1.
- Three distinct media slots exist in manifest and GLB metadata.
- LOD0 ≤1,800 triangles; LOD1 ≤360 triangles. Caching, versioning and stable IDs.
- Validate asset reproducibility by SHA-256 and GLB JSON/header parsing.

**Outstanding visual and runtime QA** (not implied by successful deploy):
- Render same camera view from *old GLB*, *Blender native model*, and *running Three.js*.
- Confirm window rhythm, depth, OOH layering and kiosk usability, raycasting from all common camera angles.
- Test whether geometry meets 30+ FPS goal on realistic integrated graphics, track draw calls, GPU memory, VRAM and loading/unloading.
- Check building choice, office lease and loading/legacy fallback in a real browser.

**Rollout policy:** Do not regenerate all 27 city buildings or scale to 70 masters/268 variants before visually accepting this building. Existing other building models remain unchanged.
