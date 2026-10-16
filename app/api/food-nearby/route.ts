import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

// Small, user-initiated searches for real named food venues. Overpass public
// servers are shared community resources; keep requests infrequent and cached.
const USER_AGENT = 'TripMateTravelPlanner/0.5 (https://tripmate-ai-khanhsz.onrender.com/privacy)';
const TTL = 45 * 60 * 1000;
const MIN_INTERVAL_MS = 3000;
const LIMIT_PER_15_MIN = 10;
const API = 'https://overpass-api.de/api/interpreter';
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
  if(tag.bar||tag.pub||tag.brewery||tag['shop']==='alcohol')return null;
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
  const around='(around:1400,'+lat.toFixed(5)+','+lng.toFixed(5)+')';
  const query='[out:json][timeout:12];(nwr'+around+'["amenity"~"^(restaurant|cafe|fast_food|ice_cream)$"];nwr'+around+'["shop"="bakery"];);out center 350;';
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),14500);
  try {
    const result=await fetch(API,{
      method:'POST',
      headers:{'Content-Type':'application/x-www-form-urlencoded','Accept':'application/json','User-Agent':USER_AGENT},
      body:new URLSearchParams({data:query}).toString(),
      signal:controller.signal,cache:'no-store'
    });
    if(!result.ok)throw Error('Upstream service error: '+result.status);
    const json=await result.json() as OverpassResponse;
    if(!Array.isArray(json.elements))throw Error('Unexpected response');
    const seen=new Set<string>();
    const places=json.elements.map(item=>parseVenue(item,lat,lng)).filter((p):p is Venue=>!!p)
      .filter(p=>{const k=p.name.trim().toLocaleLowerCase()+'|'+Math.round(p.lat*5000)+'|'+Math.round(p.lng*5000);if(seen.has(k))return false;seen.add(k);return true;})
      .sort((a,b)=>a.distanceMeters-b.distanceMeters)
      .slice(0,48);
    return {places,source:'OpenStreetMap',
      ...(places.length?{}:{message:'No named food or drink venues were found in OpenStreetMap within about 1.4 km. Try a different stop.'})};
  } finally {clearTimeout(timer);}
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
  if(now-lastRequestTime<MIN_INTERVAL_MS)return error('The community map service is busy. Please retry in a few seconds.',429);
  perIp.set(ip,v&&v.until>now?{until:v.until,count:v.count+1}:{until:now+15*60*1000,count:1});
  lastRequestTime=now;
  const promise=queryOverpass(lat,lng);
  inflight.set(key,promise);
  try {
    const result=await promise;
    if(cache.size>=250){for(const [k,v] of cache)if(v.expires<now)cache.delete(k);if(cache.size>=250)cache.delete(cache.keys().next().value!);}
    cache.set(key,{expires:Date.now()+(result.places.length?TTL:5*60*1000),value:result});
    return NextResponse.json(result,{headers:{'Cache-Control':'private, no-store'}});
  }catch{return error('OpenStreetMap place discovery is temporarily unavailable. Please retry later.',503);}
  finally{inflight.delete(key);}
}
