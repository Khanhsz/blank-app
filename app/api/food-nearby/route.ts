import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

// Small, user-initiated searches for real named food venues. Overpass public
// servers are shared community resources; keep requests infrequent and cached.
const USER_AGENT = 'TripMateTravelPlanner/0.5 (https://tripmate-ai-khanhsz.onrender.com/privacy)';
const TTL = 45 * 60 * 1000;
const MIN_INTERVAL_MS = 3000;
const LIMIT_PER_15_MIN = 10;
// Documented free, global OSM Overpass mirrors. Public services may be unavailable.
// Respect community resource limits: one user-initiated lookup, at most one
// request per mirror, and no automatic background polling.
const MIRRORS = [
  'https://overpass.private.coffee/api/interpreter',
  'https://overpass-api.de/api/interpreter',
  'https://overpass.osm.jp/api/interpreter'
] as const;
let lastRequestTime = 0;
const cache = new Map<string, { expires: number; value: NearbyResponse }>();
const perIp = new Map<string, { until: number; count: number }>();
const inflight = new Map<string, Promise<NearbyResponse>>();

type OsmElement = {
  type: 'node' | 'way' | 'relation'; id: number;
  lat?: number; lon?: number; center?: {lat: number; lon: number};
  tags?: Record<string, string>;
};
type OverpassResponse = {elements?: OsmElement[]};
type VenueKind = 'food' | 'drinks';
type Venue = {
  id: string; name: string; kind: VenueKind; category: string;
  lat: number; lng: number; distanceMeters: number;
  cuisine: string | null; address: string | null; hours: string | null;
  website: string | null; osmUrl: string;
};
type NearbyResponse = {places: Venue[]; message?: string; source: 'OpenStreetMap'};
function kmDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const rad = Math.PI / 180, dLat = (lat2-lat1)*rad, dLon = (lon2-lon1)*rad;
  const h = Math.sin(dLat/2)**2+Math.cos(lat1*rad)*Math.cos(lat2*rad)*Math.sin(dLon/2)**2;
  return 12742000*Math.asin(Math.min(1,Math.sqrt(h)));
}
function httpUrl(value?:string):string|null {
  if(!value)return null;
  try {const url=new URL(value.startsWith('www.')?'https://'+value:value);return url.protocol==='https:'?url.toString():null;}
  catch {return null;}
}
const categoryLabels: Record<string,string> = {
  restaurant:'Restaurant',cafe:'Cafe / tea shop',fast_food:'Casual dining',
  ice_cream:'Ice cream / desserts',bakery:'Bakery'
};
function parseVenue(item:OsmElement,lat:number,lng:number):Venue|null {
  const tag=item.tags||{};
  const name=tag['name:en']||tag.name||tag['name:vi']||tag['brand'];
  if(typeof name!=='string'||name.trim().length<2||name.trim().length>120)return null;
  const amenity=tag.amenity||'', shop=tag.shop||'';
  const category=shop==='bakery'?'bakery':amenity;
  if(!Object.hasOwn(categoryLabels,category))return null;
  // Not recommending bars, pubs, wine shops or any alcohol-focused venue.
  if(tag.bar||tag.pub||tag.brewery||tag['shop']==='alcohol'||/\b(?:bar|pub|wine|beer|brewery|cocktail|nightclub|liquor)\b/i.test(name)||/\b(?:bar|pub|wine|beer|brewery|cocktail|nightclub|liquor)\b/i.test(tag.description||''))return null;
  if(typeof item.id!=='number'||!['node','way','relation'].includes(item.type))return null;
  const y=item.lat??item.center?.lat,x=item.lon??item.center?.lon;
  if(typeof x!=='number'||typeof y!=='number'||!Number.isFinite(x)||!Number.isFinite(y))return null;
  const distance=kmDistance(lat,lng,y,x);
  if(distance>1550)return null;
  const address=[tag['addr:housenumber'],tag['addr:street'],tag['addr:suburb']].filter(Boolean).join(' ')||tag['addr:full']||tag['addr:place']||null;
  const cuisine=tag.cuisine?.replaceAll(';',', ').replaceAll('_',' ')||null;
  const drinks=category==='cafe'||category==='ice_cream'||(category==='bakery');
  return {
    id:item.type+'/'+item.id,
    name:name.trim(),
    kind:drinks?'drinks':'food',
    category:categoryLabels[category],
    lat:y,lng:x,distanceMeters:Math.round(distance),
    cuisine:cuisine?.slice(0,90)||null,
    address:address?.slice(0,180)||null,
    hours:tag.opening_hours?.slice(0,140)||null,
    website:httpUrl(tag.website||tag['contact:website']),
    osmUrl:'https://www.openstreetmap.org/'+item.type+'/'+item.id
  };
}
async function queryOverpass(lat:number,lng:number):Promise<NearbyResponse>{
  // Smaller geographical search and only named venues reduce community CPU cost.
  const around='(around:900,'+lat.toFixed(5)+','+lng.toFixed(5)+')';
  const query='[out:json][timeout:10];(nwr'+around+'["amenity"~"^(restaurant|cafe|fast_food|ice_cream)$"]["name"];nwr'+around+'["shop"="bakery"]["name"];);out center 150;';
  const attempts:string[]=[];
  for(const [index,endpoint] of MIRRORS.entries()){
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),index===0?9500:8500);
    try{
      const response=await fetch(endpoint,{
        method:'POST',
        headers:{
          'Content-Type':'application/x-www-form-urlencoded',
          'Accept':'application/json',
          'User-Agent':USER_AGENT
        },
        body:new URLSearchParams({data:query}).toString(),
        signal:controller.signal,cache:'no-store'
      });
      if(!response.ok){
        attempts.push('mirror '+(index+1)+': HTTP '+response.status);
        continue;
      }
      const raw=await response.json() as OverpassResponse;
      if(!Array.isArray(raw.elements)){
        attempts.push('mirror '+(index+1)+': malformed or rejected data');
        continue;
      }
      const seen=new Set<string>();
      const places=raw.elements.map(item=>parseVenue(item,lat,lng)).filter((p):p is Venue=>!!p)
        .filter(p=>{
          const k=p.name.trim().toLocaleLowerCase()+'|'+Math.round(p.lat*5000)+'|'+Math.round(p.lng*5000);
          if(seen.has(k))return false;
          seen.add(k);
          return true;
        })
        .sort((a,b)=>a.distanceMeters-b.distanceMeters)
        .slice(0,48);
      return {places,source:'OpenStreetMap',
        ...(places.length?{}:{message:'No named restaurants or cafes in the OpenStreetMap data near this stop. Try another mapped place.'})};
    }catch(e){
      attempts.push('mirror '+(index+1)+': '+(e instanceof Error?e.name:'connection error'));
    }finally{clearTimeout(timer);}
  }
  // Never expose platform addresses, upstream response bodies or logs to the client.
  console.warn('[food-nearby] Overpass mirrors unavailable: '+attempts.join('; '));
  throw new Error('Public Overpass servers temporarily unavailable');
}
function error(message:string,status=400){
  return NextResponse.json({error:message},{status,headers:{'Cache-Control':'no-store'}});
}
export async function POST(request:NextRequest){
  if(Number(request.headers.get('content-length')||0)>700)return error('Request too large.',413);
  let input:Record<string,unknown>;
  try{input=await request.json();if(!input||Array.isArray(input)||typeof input!=='object')throw Error();}
  catch{return error('Invalid place lookup.');}
  const {lat,lng}=input;
  if(typeof lat!=='number'||typeof lng!=='number'||!Number.isFinite(lat)||!Number.isFinite(lng)||lat < -85||lat > 85||lng < -180||lng > 180)
    return error('A valid map coordinate is required. Add a mapped stop to this day.');
  const key=lat.toFixed(3)+','+lng.toFixed(3);
  const now=Date.now();
  const saved=cache.get(key);
  if(saved && saved.expires>now)return NextResponse.json(saved.value,{headers:{'Cache-Control':'private, no-store'}});
  const pending=inflight.get(key);
  if(pending)try{return NextResponse.json(await pending,{headers:{'Cache-Control':'private, no-store'}});}catch{return error('Nearby venues temporarily unavailable. Try again later.',503);}
  const ip=(request.headers.get('x-forwarded-for')||'anonymous').split(',')[0].slice(0,70);
  if(perIp.size>1000)for(const [id,v] of perIp)if(v.until<now)perIp.delete(id);
  const v=perIp.get(ip);
  if(v&&v.until>now&&v.count>=LIMIT_PER_15_MIN)return error('Too many lookups. Please try again later.',429);
  if(now-lastRequestTime<MIN_INTERVAL_MS)return error('A nearby-place search was just made. Please wait a few seconds, then retry.',429);
  perIp.set(ip,v&&v.until>now?{until:v.until,count:v.count+1}:{until:now+15*60*1000,count:1});
  lastRequestTime=now;
  const promise=queryOverpass(lat,lng);
  inflight.set(key,promise);
  try {
    const result=await promise;
    if(cache.size>=250){for(const [k,v] of cache)if(v.expires<now)cache.delete(k);if(cache.size>=250)cache.delete(cache.keys().next().value!);}
    cache.set(key,{expires:Date.now()+(result.places.length?TTL:5*60*1000),value:result});
    return NextResponse.json(result,{headers:{'Cache-Control':'private, no-store'}});
  }catch{return error('Public OpenStreetMap search servers are busy. Please retry in a minute or use another mapped stop.',503);}
  finally{inflight.delete(key);}
}
