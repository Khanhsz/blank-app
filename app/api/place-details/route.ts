import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

// Only request Google data when a user selects a place. No response caching or persistence.
const windows = new Map<string, { count: number; until: number }>();
const WINDOW_MS = 15 * 60_000;
const LIMIT = 12;
type GooglePlace = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  rating?: number;
  userRatingCount?: number;
  primaryTypeDisplayName?: { text?: string };
  currentOpeningHours?: { openNow?: boolean; weekdayDescriptions?: string[] };
  websiteUri?: string;
  location?: { latitude?: number; longitude?: number };
  attributions?: { provider?: string; providerUri?: string }[];
};

function validString(s: unknown, max = 160): s is string {
  return typeof s === 'string' && s.trim().length >= 2 && s.trim().length <= max;
}
function safeUrl(s: unknown): string | null {
  if (typeof s !== 'string') return null;
  try { const u = new URL(s); return u.protocol === 'https:' ? u.toString() : null; } catch { return null; }
}
function distanceKm(a: {latitude: number; longitude: number}, b: {latitude: number; longitude: number}) {
  const rad = Math.PI / 180;
  const dlat = (b.latitude - a.latitude) * rad, dlng = (b.longitude - a.longitude) * rad;
  const h = Math.sin(dlat/2) ** 2 + Math.cos(a.latitude * rad) * Math.cos(b.latitude * rad) * Math.sin(dlng/2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
}
function normalize(s: string) {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
}
function nameOverlap(a: string, b: string) {
  const insignificant = new Set(['the','a','at','in','to','and','visit','explore','lunch','dinner','breakfast','experience','walking','tour','of']);
  const aa = normalize(a).split(' ').filter(t => t.length >= 3 && !insignificant.has(t));
  const bb = new Set(normalize(b).split(' '));
  return aa.length ? aa.filter(t => bb.has(t)).length / aa.length : 0;
}
export async function POST(req: NextRequest) {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) return NextResponse.json({error:'Google ratings are not configured yet. Add GOOGLE_PLACES_API_KEY in Render Environment (Google Places API New and billing required).',code:'not_configured'},{status:503,headers:{'Cache-Control':'no-store'}});
  if (Number(req.headers.get('content-length') || 0) > 3500) return NextResponse.json({error:'Request too large.'},{status:413});
  let body: Record<string,unknown>;
  try { body = await req.json(); if (!body || typeof body !== 'object' || Array.isArray(body)) throw Error(); }
  catch { return NextResponse.json({error:'Invalid request.'},{status:400}); }
  const {title,location,destination,country,lat,lng} = body;
  if (!validString(title,120) || !validString(location,140) || !validString(destination,100) || !validString(country,100)) return NextResponse.json({error:'Invalid place details.'},{status:400});
  let center: {latitude:number;longitude:number} | null = null;
  if (typeof lat === 'number' && typeof lng === 'number' && Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat)<=90 && Math.abs(lng)<=180)
    center = {latitude:lat,longitude:lng};
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const now = Date.now();
  if (windows.size > 1200) for (const [k,v] of windows) if (now >= v.until) windows.delete(k);
  const window = windows.get(ip);
  if (window && now < window.until && window.count >= LIMIT) return NextResponse.json({error:'Too many place lookups. Try again in a few minutes.'},{status:429,headers:{'Cache-Control':'no-store'}});
  windows.set(ip, window && now < window.until ? {count:window.count+1,until:window.until} : {count:1,until:now+WINDOW_MS});
  const textQuery = [title,location,destination,country].join(', ').slice(0,400);
  const reqBody: Record<string,unknown> = {textQuery,pageSize:5,languageCode:'en'};
  if (center) reqBody.locationBias = {circle:{center,radius:6500}};
  const fieldMask = 'places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.primaryTypeDisplayName,places.currentOpeningHours,places.websiteUri,places.location,places.attributions';
  try {
    const res = await fetch('https://places.googleapis.com/v1/places:searchText',{
      method:'POST',
      headers:{'Content-Type':'application/json','X-Goog-Api-Key':key,'X-Goog-FieldMask':fieldMask},
      body:JSON.stringify(reqBody),
      signal:AbortSignal.timeout(9000),
      cache:'no-store'
    });
    if (!res.ok) {
      console.error('Google Places lookup status:',res.status);
      return NextResponse.json({error:'Google Places could not return ratings. Check API access, billing, and quota.',code:'provider_unavailable'},{status:502,headers:{'Cache-Control':'no-store'}});
    }
    const json = await res.json() as {places?:GooglePlace[]};
    const places = (json.places || []).filter(p => !!p.displayName?.text);
    const ranked = places.map(p=>{
      const overlap = nameOverlap(title as string,p.displayName!.text!);
      const km = center && typeof p.location?.latitude === 'number' && typeof p.location?.longitude === 'number'
        ? distanceKm(center,{latitude:p.location.latitude,longitude:p.location.longitude}) : null;
      return {p, overlap,km,score:overlap*6-(km ?? 5)/9};
    }).sort((a,b)=>b.score-a.score);
    const found = ranked.find(x => x.overlap>=0.45 && (x.km===null || x.km<=30));
    if (!found) return NextResponse.json({place:null,message:'No reliable Google Maps match for this stop. Rating unavailable.'},{headers:{'Cache-Control':'no-store'}});
    const p = found.p;
    return NextResponse.json({
      place:{
        placeId:p.id || null,
        name:p.displayName!.text,
        address:p.formattedAddress || null,
        type:p.primaryTypeDisplayName?.text || null,
        rating:typeof p.rating === 'number' && p.rating>=1 && p.rating<=5 ? p.rating : null,
        ratingCount:typeof p.userRatingCount === 'number' ? p.userRatingCount : null,
        isOpenNow:typeof p.currentOpeningHours?.openNow === 'boolean' ? p.currentOpeningHours.openNow : null,
        openingHours:(p.currentOpeningHours?.weekdayDescriptions || []).slice(0,7),
        website:safeUrl(p.websiteUri),
        attributions:(p.attributions || []).slice(0,5).map(a=>({label:a.provider || '',url:safeUrl(a.providerUri)})).filter(a=>a.label)
      }
    },{headers:{'Cache-Control':'private, no-store, max-age=0'}});
  } catch {
    return NextResponse.json({error:'Place details temporarily unavailable. Try again later.'},{status:502,headers:{'Cache-Control':'no-store'}});
  }
}
