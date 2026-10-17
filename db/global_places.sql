-- TripMate: global OSM points-of-interest storage (capacity-oriented schema).
-- Requires PostgreSQL 15+ with the PostGIS and pg_trgm extensions.
-- This is infrastructure, not a claim that 100 million features are ingested.
-- Run via: psql "$PLACES_DATABASE_URL" -v ON_ERROR_STOP=1 -f db/global_places.sql
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS global_places (
  country_code VARCHAR(2) NOT NULL CHECK (country_code ~ '^[A-Z]{2}$'),
  osm_type CHAR(1) NOT NULL CHECK (osm_type IN ('n','w','r')),
  osm_id BIGINT NOT NULL CHECK (osm_id > 0),
  source_region TEXT NOT NULL,
  import_version UUID NOT NULL,
  name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 250),
  category TEXT NOT NULL,
  subcategory TEXT,
  cuisine TEXT,
  address TEXT,
  opening_hours TEXT,
  website TEXT,
  local_food BOOLEAN NOT NULL DEFAULT FALSE,
  street_food BOOLEAN NOT NULL DEFAULT FALSE,
  tags JSONB NOT NULL DEFAULT '{}'::jsonb,
  lat DOUBLE PRECISION NOT NULL CHECK (lat BETWEEN -90 AND 90),
  lon DOUBLE PRECISION NOT NULL CHECK (lon BETWEEN -180 AND 180),
  geog geography(Point,4326) GENERATED ALWAYS AS
    (ST_SetSRID(ST_MakePoint(lon,lat),4326)::geography) STORED,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (country_code,osm_type,osm_id)
) PARTITION BY HASH (country_code);

-- Country-level partition pruning, 32 physical partitions.
-- Increase shard count in a future migration when real capacity benchmarks demand it.
DO $$
DECLARE n INTEGER;
BEGIN
  FOR n IN 0..31 LOOP
    EXECUTE format(
      'CREATE TABLE IF NOT EXISTS global_places_p%s PARTITION OF global_places FOR VALUES WITH (MODULUS 32, REMAINDER %s)',
      n,n);
  END LOOP;
END $$;

-- Indexes are propagated to every partition.
CREATE INDEX IF NOT EXISTS global_places_geo_idx ON global_places USING GIST (geog);
CREATE INDEX IF NOT EXISTS global_places_name_trgm_idx ON global_places USING GIN (lower(name) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS global_places_category_idx ON global_places (country_code, category);
CREATE INDEX IF NOT EXISTS global_places_region_idx ON global_places (source_region, import_version);

CREATE TABLE IF NOT EXISTS global_place_import_runs (
  id UUID PRIMARY KEY,
  source_region TEXT NOT NULL,
  country_code VARCHAR(2) NOT NULL,
  source_file TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  rows_processed BIGINT NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('running','completed','failed')),
  notes TEXT
);

-- Example indexed, geographically bounded query (replace placeholders).
-- SELECT osm_type, osm_id, name, category, lat, lon,
--        ST_Distance(geog,ST_SetSRID(ST_MakePoint(:lon,:lat),4326)::geography) AS distance_meters
-- FROM global_places
-- WHERE country_code=:country_code
--   AND ST_DWithin(geog,ST_SetSRID(ST_MakePoint(:lon,:lat),4326)::geography,:radius_meters)
-- ORDER BY distance_meters LIMIT 25;
