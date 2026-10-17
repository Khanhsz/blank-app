import { Pool } from 'pg';

type Category = 'all' | 'food' | 'drinks' | 'tourism' | 'culture' |
  'historic' | 'leisure' | 'nature' | 'transport' | 'service' | 'shopping';

export type PlaceSearchArgs = {
  lat: number;
  lng: number;
  countryCode: string;
  radiusMeters: number;
  limit: number;
  category: Category;
  query: string;
};

export type GlobalPlace = {
  id: string;
  name: string;
  category: string;
  subcategory: string | null;
  countryCode: string;
  lat: number;
  lng: number;
  distanceMeters: number;
  cuisine: string | null;
  address: string | null;
  hours: string | null;
  website: string | null;
  localFood: boolean;
  streetFood: boolean;
  osmUrl: string;
};

const pgGlobal = globalThis as typeof globalThis & { __tripmatePlacesPool?: Pool };
function pool(): Pool {
  if (!process.env.PLACES_DATABASE_URL) throw new Error('Global DB is not configured.');
  if (!pgGlobal.__tripmatePlacesPool) {
    pgGlobal.__tripmatePlacesPool = new Pool({
      connectionString: process.env.PLACES_DATABASE_URL,
      max: 3, connectionTimeoutMillis: 3800, idleTimeoutMillis: 20000,
      statement_timeout: 6000
    });
  }
  return pgGlobal.__tripmatePlacesPool;
}

const querySQL = `
WITH center AS (
 SELECT ST_SetSRID(ST_MakePoint($2::float8,$3::float8),4326)::geography AS geo
)
SELECT
 p.osm_type, p.osm_id, p.name, p.category, p.subcategory,
 p.country_code, p.lat, p.lon, p.cuisine, p.address, p.opening_hours,
 p.website, p.local_food, p.street_food,
 ST_Distance(p.geog, center.geo) AS meters
FROM global_places AS p CROSS JOIN center
WHERE p.country_code = $1
  AND ST_DWithin(p.geog,center.geo,$4::float8)
  AND ($5::text = 'all' OR p.category = $5::text)
  AND ($6::text = '' OR lower(p.name) LIKE '%' || lower($6::text) || '%')
ORDER BY meters ASC
LIMIT $7
`;

export async function searchPostgis(args: PlaceSearchArgs): Promise<GlobalPlace[]> {
  const { rows } = await pool().query(querySQL, [
    args.countryCode, args.lng, args.lat, args.radiusMeters,
    args.category, args.query.replaceAll('%', '').replaceAll('_', ''), args.limit
  ]);
  return rows.map(row => {
    const osmType = row.osm_type === 'n' ? 'node' : row.osm_type === 'w' ? 'way' : 'relation';
    return {
      id: osmType + '/' + String(row.osm_id),
      name: String(row.name),
      category: String(row.category),
      subcategory: row.subcategory ?? null,
      countryCode: String(row.country_code),
      lat: Number(row.lat), lng: Number(row.lon),
      distanceMeters: Math.round(Number(row.meters)),
      cuisine: row.cuisine ?? null, address: row.address ?? null,
      hours: row.opening_hours ?? null, website: row.website ?? null,
      localFood: Boolean(row.local_food), streetFood: Boolean(row.street_food),
      osmUrl: 'https://www.openstreetmap.org/' + osmType + '/' + String(row.osm_id)
    } satisfies GlobalPlace;
  });
}

export function globalPlacesConfigured(): boolean {
  return Boolean(process.env.PLACES_DATABASE_URL);
}
