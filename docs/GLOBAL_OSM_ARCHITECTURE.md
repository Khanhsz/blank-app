# TripMate global OpenStreetMap place data — 100M-target architecture

**State:** Architecture + executable regional ETL + optional indexed API are implemented.
**Not a claim of 100,000,000 imported records.** Import volume must be verified after each region completes.

## Deployed today
- TripMate Render Free runs without a paid database.
- Source-backed local OSM snapshot: 73,350 food/drink records in 5 Asian cities, as of its last build.
- \`POST /api/places/search\` searches nearby snapshot data when \`PLACES_DATABASE_URL\` is absent.
- Discover UI calls this endpoint and labels the backing data honestly.
- \`GET /api/places/search\` reports deployment mode, snapshot coverage, and the 100M **target** without guessing actual PostgreSQL row count.
- Existing food recommendations, maps and itineraries remain unchanged.

## Target production architecture

\`\`\`mermaid
flowchart TD
  A["OpenStreetMap Planet / Geofabrik country PBF"] --> B["Regional ingestion worker (pyosmium)"]
  B --> C["Geocoded nodes / ways, OSM source IDs, provenance"]
  C --> D["Batch COPY into staging"]
  D --> E["Postgres + PostGIS, hash partitions by ISO country"]
  E --> F["GiST geography index + trigram name index"]
  F --> G["TripMate /api/places/search"]
  G --> H["Discover and trip recommendation UX"]
  I["Existing 5-city snapshot"] --> G
\`\`\`

1. **Acquisition:** Use legally sourced OSM Planet or Geofabrik *regional* \`.osm.pbf\` extracts. Geofabrik normally refreshes extracts daily. Begin with one country; do not download the whole planet on Render Free.
2. **Filtering:** Only store actual named POIs with OSM \`node\` or \`way\` IDs and coordinates. Keep source IDs and selected OSM tags. A raw OSM point is not necessarily a restaurant or tourism POI.
3. **Storage:** \`db/global_places.sql\` creates 32 PostgreSQL HASH(country_code) partitions and GiST geography, GIN trigram-name, and category indexes. Partition pruning requires passing \`countryCode\` for indexed global lookup. Countries should be used with ISO-3166 alpha-2 codes.
4. **Search:** PostGIS \`ST_DWithin\` with a strict 100 m–10 km bounding radius, 1–40 result limit, validated categories and parameterized queries. Search switches to regional snapshot on connection errors or when no DB is configured.
5. **Refresh:** Process one Geofabrik region at a time via pyosmium, batch COPY, upsert by \`(country_code, osm_type, osm_id)\`. Log import version and status in \`global_place_import_runs\`. Full re-import can optionally delete records missing from the new extract **only for that exact source region**; do not use deletion mode for partial diffs.
6. **Capacity:** Aim for 100M *valid OSM POIs if they exist*. This is a target for architecture/scaling tests, not a confirmed count or measured SLA. Use multiple regional imports and benchmark query latency, indexing time, WAL, backups and storage before increasing.
7. **Licensing:** OpenStreetMap contributors / ODbL-1.0 attribution must remain visible. Distributed derivative databases may have share-alike obligations. Obtain expert review before commercial redistribution.

## Set up PostgreSQL (not performed on Render Free)

You must opt into suitable, durable storage before attempting a global import.
The current workspace **has no Postgres database**. Render's Free Postgres has a 1 GB cap, expires after 30 days and has no backups, so it is not an appropriate target for 100M POIs. Production DB costs money.

Initialize schema using PostgreSQL 15+ with PostGIS installed and enabled:

\`\`\`bash
psql "$PLACES_DATABASE_URL" -v ON_ERROR_STOP=1 -f db/global_places.sql
\`\`\`

For the existing Next.js backend, set \`PLACES_DATABASE_URL\` as a **server-only** environment variable on Render. Do not prefix with \`NEXT_PUBLIC_\` or commit a credential.

\`\`\`bash
pip install -r scripts/global_places_requirements.txt
curl -L --fail --output vietnam-latest.osm.pbf \
  https://download.geofabrik.de/asia/vietnam-latest.osm.pbf
python scripts/import_global_pbf.py \
  --file vietnam-latest.osm.pbf --country VN --region vietnam
\`\`\`

The importer is deliberately **not** run in the Free Render build. A regional PBF can be large; use an appropriately sized worker / database and private environment variables. Each import creates an audit record. Never copy the entire planet into a Git repository.

## Search API

\`\`\`bash
curl -s https://tripmate-ai-khanhsz.onrender.com/api/places/search
curl -X POST https://tripmate-ai-khanhsz.onrender.com/api/places/search \
  -H "Content-Type: application/json" \
  -d '{"lat":10.7725,"lng":106.698,"countryCode":"VN","radiusMeters":2500,"category":"food","query":"pho","limit":15}'
\`\`\`

Accepted categories: \`all, food, drinks, tourism, culture, historic, leisure, nature, transport, service, shopping\`. Without global DB, only \`food\`/\`drinks\` and \`all\` can return snapshot places in covered cities. Response always includes \`backend\`.

## Limits and operational risks

- **No confirmed 100M data**: OpenStreetMap POI count for these tags must be measured; data is uneven across regions.
- **No 100M benchmarks**: Partitioning is necessary but not enough. Exact throughput and latency need load tests with real imported data and adequate hardware.
- **Storage cost**: 100M records including names, metadata, GiST/GIN indexes and write-ahead logs plausibly needs **tens to hundreds of GB**, with substantial backup and index-build overhead. Not viable on Render Free.
- **RAM/workers**: \`pyosmium\` region processing builds a node-location index; imports may require several GB of RAM and disk. Processing a planet-sized PBF requires a dedicated large import pipeline, not the web container.
- **Relations and changed objects**: The first importer implements OSM nodes and ways, not multipolygon relations. A separate replication pipeline is needed for true daily diff/delete support. Full regional re-import is the supported update path here.
- **Administrative boundaries**: Country supplied to imports must match the selected PBF's geographic scope. OSM boundary overlaps and duplicated regional imports need careful deduplication before global ingestion.
- **Search**: Without an ISO countryCode, the new API currently falls back to known snapshots rather than scanning all database partitions.
- **OSM quality**: Opening hours, status and categories may be missing/outdated; never invent ratings, opening status or commercial prices.
- **Privacy**: Do not ingest OSM user/editor identifying history fields. The public Geofabrik extracts omit contributor usernames/user IDs.

## Scale-up rollout gates

| Stage | Scope | Gate |
|---|---|---|
| A | Current ~73k food places, 5 cities | Production UI + API live, no database spend |
| B | One region/country PBF + PostGIS | Import audit shows genuine rows and source IDs, geo index used |
| C | Multiple countries | Regional refresh/dedup, country pruning verified with EXPLAIN |
| D | Multi-million entries | Benchmark p95 latency, RAM, backup restore, disk and WAL |
| E | Target 100M | Only claim when \`COUNT(*)\` or consistent counts verify actual imports; provision budget and operations |

References:
- https://download.geofabrik.de/ (OSM country/continent extracts)
- https://www.geofabrik.de/en/data/download.html
- https://operations.osmfoundation.org/policies/
- https://www.openstreetmap.org/copyright
- https://render.com/docs/free
- https://render.com/docs/postgresql-extensions
- https://postgis.net/docs/ST_DWithin.html
