import { NextRequest, NextResponse } from 'next/server';
import { COUNTRIES } from '@/lib/places';

export const runtime = 'nodejs';

type OpenMeteoPlace = {id: number; name: string; country_code?: string; admin1?: string; population?: number};

// Open-Meteo's geocoding API uses GeoNames data, filtered by ISO-3166-1 country codes.
// The free API is designed for non-commercial use; review licensing before commercial release.
export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q')?.trim() ?? '';
  const country = request.nextUrl.searchParams.get('country')?.toUpperCase() ?? '';
  if (!/^[A-Z]{2}$/.test(country) || !COUNTRIES.some(c => c.code === country) || query.length < 2 || query.length > 80) {
    return NextResponse.json({error:'Choose a valid country and enter at least two characters.'}, {status:400});
  }
  const params = new URLSearchParams({name:query,countryCode:country,count:'12',language:'en',format:'json'});
  try {
    const upstream = await fetch(`https://geocoding-api.open-meteo.com/v1/search?${params}`, {signal:AbortSignal.timeout(4500),next:{revalidate:3600}});
    if (!upstream.ok) throw new Error(`Geocoding unavailable: ${upstream.status}`);
    const json = await upstream.json() as {results?: OpenMeteoPlace[]};
    const places = (json.results || []).filter(item=>item.country_code?.toUpperCase() === country && item.name && Number.isFinite(item.id))
      .sort((a,b)=>(b.population||0)-(a.population||0))
      .slice(0,10).map(({id,name,admin1})=>({id,name,region:admin1||undefined}));
    return NextResponse.json({places}, {headers:{'Cache-Control':'public, max-age=120, stale-while-revalidate=3600'}});
  } catch {
    return NextResponse.json({places:[],unavailable:true},{status:503});
  }
}