# Marketing City renderer optimization — 2026-10-18

Scope: a focused performance and positioning patch on top of `deploy/marketing-tycoon-lovable-world`. No gameplay systems, persistent game IDs, agency economy, campaign stages, or saved-game format were changed.

## What changed

1. **Instanced road paint:** the previous 360 standalone road-marking boxes (120 street stripes, 120 avenue stripes, 120 intersection strokes) are now **one** `THREE.InstancedMesh`. Each instance retains its original position, size and color. The roads, kerbs and central plaza are unchanged. This removes up to 359 draw calls from these road-marking objects, not from the entire city.
2. **LOD hysteresis:** detailed GLB activates inside 64 units and remains until 76 units; the existing high/low graphics preference and selection override remain. Checks run every 0.35s via a persistent ref, avoiding LOD ping-pong near the camera boundary.
3. **Scale-correct marketing media:** DOOH, OOH and iOOH overlays now share the model's GLB-to-game scale, including rival headquarters whose `h` increases on office upgrades. City media uses the exported slot dimensions already provided by the latest base branch; Brickhouse dimensions remain authored in master asset space. Persisted IDs and click handlers are unchanged.
4. **Cleaner production labels:** the diagnostic GLB version indicator is only visible in development mode; normal player building labels are retained.
5. **Regression checks and GitHub Actions:** added tests for all 360 markings, LOD thresholds, model/media scale, and a CI workflow that runs TypeScript, existing game regressions, deterministic GLB generation and verification.

## Verification

Automated checks are set up in `.github/workflows/marketing-city-ci.yml` and `tests/render-optimizations.test.ts`. Running the workflow and inspecting its results are necessary; authoring CI code is not equivalent to a verified passing build.

### Manual acceptance before merging/deploying

- Open the actual city and compare roads, plaza and intersections with the base branch.
- Check nearby billboard positions on the Media Hub, the Brickhouse Studios building, and an upgraded rival HQ (tiers 2–4).
- Fly the camera across the 64–76 unit LOD region and confirm no flashing legacy box/flicker.
- Check marker click/hover, office interaction, camera follow and locked locations.
- Use `?perf=1` and record FPS, draw calls and geometries with matching views and quality settings, before and after. A reduction of 359 potential stripe draw calls is an implementation change, **not a measured browser performance uplift**.
- Verify existing save import/export and campaign/weekly transitions in the running deployment.

The remaining Blender/MCP editable-master and full 41-building visual review gates from `docs/full-city-modernism.md` are still open. This patch does not claim to solve those unrelated art approval requirements.
