import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

// This is a human-triggered lookup for a specific itinerary stop, NOT geocoding autocomplete.
// Public Nominatim rules: max 1 request/second across the app; identify app; cache; attribute OSM.
// https://operations.osmfoundation.org/policies/nominatim/
const AGENT = 'TripMateTravelPlanner/0.3 (https://tripmate-ai-khanhsz.onrender.com/privacy)';
const CACHE_TTL = 12 * 60 * 60 * 1000;
const responses = new Map<string,{expiry:number;body:PlaceResponse}>();
const usage = new Map<string,{until:number;count:number}>();
const LIMIT = 18;
const WINDOW = 15 * 60 * 1000;
let lastNominatimRequest = 0;
type Coords = {lat:number;lon:number};
type OsmResult = {
  osm_type?:string; osm_id?:number; name?:string; display_name?:string;
  lat?:string; lon?:string; category?:string; type?:string;
  extratags?:Record<string,string>;
  namedetails?:Record<string,string>;
};
type WikiPage = {title?:string;extract?:string;fullurl?:string;coordinates?:Array<{lat:number;lon:number}>;};
type PlaceResponse = {
  place: {name:string;address:string|null;category:string|null;description:string|null;
    hours:string|null;website:string|null;osmUrl:string|null;wikipediaUrl:string|null;
    sources:string[];}|null;
  message?:string;
};
function valid(s:unknown,max=160):s is string {return typeof s==='string'&&s.trim().length>=2&&s.length<=max;}
function norm(s:string){return s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();}
const stopWords = new Set(['the','and','for','with','from','visit','explore','at','in','of','morning','afternoon','evening','walk','walking','tour','lunch','dinner','breakfast','see','discover','enjoy','near','to']);
function core(s:string){const words=norm(s).split(' ').filter(w=>w.length>=3&&!stopWords.has(w));return words;}
function overlap(a:string,b:string){const aa=core(a);const bb=new Set(core(b));return aa.length ? aa.filter(t=>bb.has(t)).length/aa.length : 0;}
function km(a:Coords,b:Coords){const rad=Math.PI/180,dlat=(b.lat-a.lat)*rad,dlon=(b.lon-a.lon)*rad;const h=Math.sin(dlat/2)**2+Math.cos(a.lat*rad)*Math.cos(b.lat*rad)*Math.sin(dlon/2)**2;return 12742*Math.asin(Math.sqrt(h));}
function httpsUrl(u:unknown){if(typeof u!=='string')return null;try{const url=new URL(u);return url.protocol==='https:'?url.toString():null;}catch{return null;}}
function clientError(msg:string,status=400){return NextResponse.json({error:msg},{status,headers:{'Cache-Control':'no-store'}});}
async function wikipediaLookup(name:string,destination:string,point:Coords|null) {
  try{
    // Wikimedia requires a descriptive User-Agent with an application contact URL.
    const q=new URL('https://en.wikipedia.org/w/api.php');
    q.searchParams.set('action','query');
    q.searchParams.set('generator','search');
    q.searchParams.set('gsrsearch',name+' '+destination);
    q.searchParams.set('gsrlimit','5');
    q.searchParams.set('prop','extracts|coordinates|info');
    q.searchParams.set('exintro','1');
    q.searchParams.set('explaintext','1');
    q.searchParams.set('exchars','650');
    q.searchParams.set('inprop','url');
    q.searchParams.set('format','json');
    q.searchParams.set('formatversion','2');
    const r=await fetch(q.toString(),{headers:{'User-Agent':AGENT,'Accept':'application/json'},signal:AbortSignal.timeout(6500),cache:'no-store'});
    if(!r.ok)return null;
    const payload=await r.json() as {query?:{pages?:WikiPage[]}};
    const pages=(payload.query?.pages||[]).filter(p=>p.title&&p.extract&&p.fullurl);
    const ranked=pages.map(page=>{
      const strength=overlap(name,page.title!);
      const coordinates=page.coordinates?.[0];
      const distance=point&&coordinates?km(point,{lat:coordinates.lat,lon:coordinates.lon}):null;
      return {page,strength,distance};
    }).filter(x=>x.strength>=0.60&&(x.distance===null||x.distance<=28))
      .sort((a,b)=>(b.strength-a.strength)+((a.distance??0)-(b.distance??0))/100);
    const best=ranked[0]?.page;
    if(!best)return null;
    const url=httpsUrl(best.fullurl);
    if(!url||new URL(url).hostname!=='en.wikipedia.org')return null;
    return {name:best.title!,description:best.extract!.slice(0,650),url};
  }catch{return null;}
}
async function osmLookup(name:string,destination:string,country:string,point:Coords|null) {
  // One global request per >=1.3 seconds for this single-instance Render MVP.
  // On a busy service, skip OSM and return Wikipedia-only rather than violating Nominatim limits.
  const now=Date.now();
  if(now-lastNominatimRequest<1300)return null;
  lastNominatimRequest=now;
  try{
    const q=new URL('https://nominatim.openstreetmap.org/search');
    q.searchParams.set('q',[name,destination,country].join(', ').slice(0,260));
    q.searchParams.set('format','jsonv2');
    q.searchParams.set('addressdetails','1');
    q.searchParams.set('namedetails','1');
    q.searchParams.set('extratags','1');
    q.searchParams.set('limit','5');
    if(point){
      const latExtent=0.26,lonExtent=0.35;
      q.searchParams.set('viewbox',[point.lon-lonExtent,point.lat+latExtent,point.lon+lonExtent,point.lat-latExtent].join(','));
      q.searchParams.set('bounded','0');
    }
    const r=await fetch(q.toString(),{headers:{'User-Agent':AGENT,'Accept':'application/json','Accept-Language':'en'},signal:AbortSignal.timeout(6500),cache:'no-store'});
    if(!r.ok)return null;
    const raw=await r.json() as OsmResult[];
    if(!Array.isArray(raw))return null;
    const ranked=raw.map(p=>{
      const label=p.name||p.namedetails?.name||p.display_name?.split(',')[0]||'';
      const strength=overlap(name,label);
      const coords=p.lat&&p.lon?{lat:Number(p.lat),lon:Number(p.lon)}:null;
      const distance=point&&coords&&Number.isFinite(coords.lat)&&Number.isFinite(coords.lon)?km(point,coords):null;
      return {p,label,strength,distance};
    }).filter(x=>x.strength>=0.50&&(x.distance===null||x.distance<=18))
      .sort((a,b)=>(b.strength-a.strength)+((a.distance??0)-(b.distance??0))/100);
    const best=ranked[0];
    if(!best)return null;
    const p=best.p;
    const typeMap:Record<string,string>={node:'node',way:'way',relation:'relation'};
    const osmUrl=typeof p.osm_id==='number'&&p.osm_id>0&&p.osm_type&&typeMap[p.osm_type]
      ? 'https://www.openstreetmap.org/'+typeMap[p.osm_type]+'/'+p.osm_id : null;
    return {name:best.label,address:p.display_name?.slice(0,240)||null,
      category:p.type?.replace(/_/g,' ')||p.category?.replace(/_/g,' ')||null,
      hours:p.extratags?.opening_hours?.slice(0,150)||null,
      website:httpsUrl(p.extratags?.website)||httpsUrl(p.extratags?.['contact:website']),
      osmUrl};
  }catch{return null;}
}
export async function POST(req:NextRequest) {
  if(Number(req.headers.get('content-length')||0)>3500)return clientError('Request too large.',413);
  let body:Record<string,unknown>;
  try{body=await req.json();if(!body||Array.isArray(body)||typeof body!=='object')throw Error();}
  catch{return clientError('Invalid request.');}
  const {title,location,destination,country,lat,lng}=body;
  if(!valid(title,120)||!valid(location,140)||!valid(destination,100)||!valid(country,100))return clientError('Invalid place details.');
  const point:Coords|null=typeof lat==='number'&&typeof lng==='number'&&Number.isFinite(lat)&&Number.isFinite(lng)&&Math.abs(lat)<=90&&Math.abs(lng)<=180?{lat,lon:lng}:null;
  // Generic template activities do not describe a verifiable venue.
  if(/^(explore the historic center|taste local specialties|visit a museum or gallery|find a scenic green space|discover a neighborhood|enjoy a memorable dinner)$/i.test(title.trim())){
    return NextResponse.json({place:null,message:'This is a suggested activity, not a confirmed place. Add a named attraction to look up sourced details.'},{headers:{'Cache-Control':'no-store'}});
  }
  const name=title.trim().replace(/^(?:visit|explore|see|discover|enjoy|lunch at|dinner at|breakfast at|morning at|walk through|stroll through)\s+/i,'').trim();
  const key=[norm(name),norm(destination),norm(country),point?.lat.toFixed(3),point?.lon.toFixed(3)].join('|');
  const cached=responses.get(key);
  if(cached&&cached.expiry>Date.now())return NextResponse.json(cached.body,{headers:{'Cache-Control':'private, max-age=0'}});
  const ip=(req.headers.get('x-forwarded-for')||'anonymous').split(',')[0].trim().slice(0,75);
  const now=Date.now();
  if(usage.size>1000)for(const [k,v] of usage)if(v.until<now)usage.delete(k);
  const u=usage.get(ip);
  if(u&&now<u.until&&u.count>=LIMIT)return clientError('Too many lookups. Please wait 15 minutes.',429);
  usage.set(ip,u&&now<u.until?{until:u.until,count:u.count+1}:{until:now+WINDOW,count:1});
  const [wiki,osm]=await Promise.all([wikipediaLookup(name,destination,point),osmLookup(name,destination,country,point)]);
  const place:PlaceResponse['place']=wiki||osm?{
    name:osm?.name||wiki?.name||name,
    address:osm?.address||null,
    category:osm?.category||null,
    description:wiki?.description||null,
    hours:osm?.hours||null,
    website:osm?.website||null,
    osmUrl:osm?.osmUrl||null,
    wikipediaUrl:wiki?.url||null,
    sources:[...(osm?['OpenStreetMap']:[]),...(wiki?['Wikipedia']:[])]
  }:null;
  const result:PlaceResponse={place,...(!place?{message:'No reliable matching record found in Wikipedia or OpenStreetMap. Check the attraction name and map coordinates.'}:{})};
  if(responses.size>250)for(const [k,v] of responses)if(v.expiry<now)responses.delete(k);
  if(responses.size>300)responses.delete(responses.keys().next().value!);
  responses.set(key,{expiry:now+CACHE_TTL,body:result});
  return NextResponse.json(result,{headers:{'Cache-Control':'private, no-store'}});
}
