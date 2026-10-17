# Dense Media City replacement — Marketing Tycoon

## Status

This branch replaces the **active** city render tree in `WorldScene.tsx`.
The former `RoadNetwork`, `DistrictManager` and `ChunkManager`
are no longer mounted when entering the city. Room/office scenes, character
controls, city entity IDs, campaign state, leasing and save data are retained.

The final GLB binary is delivered as an asset ZIP in the ChatGPT conversation,
but is **not committed to this GitHub branch**. Until it is installed the app
renders a distinct procedural Dense Media City approximation, not the exact GLB.

## Install the actual 187-building city

Copy the asset in the companion ZIP to the repository at:

```
public/assets/mt-city/dense-media-city-v1.glb
```

The source GLB is called `marketing_tycoon_dense_media_city.glb` inside
the earlier modeling project and is renamed for this runtime URL.
Binary size approximately 5.2 MB.

The runtime will load that GLB via `GLTFLoader` and suppress the
procedural approximation when it loads successfully. When absent/invalid,
the procedural alternative is displayed instead of the retired map.

The companion ZIP includes `docs/dense-city-media-inventory.json`
with 27 slot names and their transforms, plus a preview image.

## Integration boundaries / known limitations

- The old gameplay entity IDs (27 locations) remain stable, mapped to
  invisible clickable interaction volumes. Their positions are still
  based on the **previous city's gameplay coordinates**. A second pass is
  required to align all hitboxes with the exact new building entrances.
- 27 OOH/DOOH/iOOH slots are present in the GLB. Existing media campaign
  text can refresh their screen materials; booking inventory and prices
  have **not** yet been connected to a complete media-buying backend.
- Pedestrian collision currently uses only gameplay lots. Full pedestrian
  walkability/pathfinding and environmental collision require a follow-up
  QA pass against the final GLB.
- Old GLB asset-factory output is retained for rollback/testing but is not
  mounted in the active city view.
- Please test city click targets, save/load, camera bounds, screen creative
  orientation, browser draw calls, and mobile performance before promoting
  this staging branch to the production Render branch.

## Validation

The staging site was built and deployed successfully by Render:

`https://marketing-tycoon-dense-city-staging.onrender.com`

This establishes that TypeScript, tests and Vite build pass for this branch.
It does **not** establish browser-level acceptance or verify the final
binary asset in the deployed app.
