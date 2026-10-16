import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
// Human-initiated place lookups only; public OpenStreetMap Nominatim is throttled.
const AGENT='TripMateTravelPlanner/0.4 (https://tripmate-ai-khanhsz.onrender.com/privacy)';
const cache=new Map<string,{until:number;value:LookupResponse}>();
const usage=new Map<string,{until:number;count:number}>();
let lastOsm=0;
const TTL=12*60*60*1000;
type Point={lat:number;lon:number};
type Place={name:string;address:string|null;category:string|null;description:string|null;hours:string|null;website:string|null;osmUrl:string|null;wikipediaUrl:string|null;sources:string[]};
type LookupResponse={places:Place[];unmatched:string[];message?:string};
type WikiSearch={pages?:Array<{title:string;description?:string}>};
type WikiSummary={title?:string;extract?:string;content_urls?:{desktop?:{page?:string}};coordinates?:{lat:number;lon:number}};

const known=[
  {match:/saigon central post office|saigon post office|buu dien.*sai gon|central post office/i,
   title:'Saigon Central Post Office',
   extract:'Historic post office in central Ho Chi Minh City, built in the late nineteenth century and known for its French-influenced architecture.',
   url:'https://en.wikipedia.org/wiki/Saigon_Central_Post_Office'},
  {match:/notre.?dame|nha tho duc ba|duc ba cathedral|saigon cathedral/i,
   title:'Notre-Dame Cathedral Basilica of Saigon',
   extract:'Cathedral in central Ho Chi Minh City, constructed in the nineteenth century and recognizable for its twin bell towers.',
   url:'https://en.wikipedia.org/wiki/Notre-Dame_Cathedral_Basilica_of_Saigon'}
];
const valid=(s:unknown,max=160):s is string=>typeof s==='string'&&s.trim().length>=2&&s.trim().length<=max;
function norm(s:string){return s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();}
const stop=new Set(['the','and','for','with','from','visit','explore','at','in','of','morning','afternoon','evening','walk','walking','tour','lunch','dinner','breakfast','see','discover','enjoy','near','to','on','or']);
function terms(s:string){return norm(s).split(' ').filter(w=>w.length>=3&&!stop.has(w));}
function score(a:string,b:string){const tokens=terms(a),other=new Set(terms(b));return tokens.length?tokens.filter(w=>other.has(w)).length/tokens.length:0;}
function dist(a:Point,b:Point){const r=Math.PI/180,x=(b.lat-a.lat)*r,y=(b.lon-a.lon)*r,h=Math.sin(x/2)**2+Math.cos(a.lat*r)*Math.cos(b.lat*r)*Math.sin(y/2)**2;return 12742*Math.asin(Math.sqrt(h));}
function httpsUrl(s:unknown){if(typeof s!=='string')return null;try{const u=new URL(s);return u.protocol==='https:'?u.toString():null;}catch{return null;}}
function isSaigon(destination:string,country:string){return /ho chi minh|sai gon|saigon|hcmc/i.test(destination)&&/viet\s?nam/i.test(country);}
function stripVerb(name:string){return name.trim().replace(/^(?:visit|explore|see|discover|enjoy|lunch at|dinner at|breakfast at|morning at|walk through|stroll through)\s+/i,'').trim();}
function splitNames(raw:string){
  const name=stripVerb(raw);
  // A real landmark name can contain "and"; split only if both sides look like full landmarks.
  const parts=name.split(/\s+(?:and|&|\+)\s+/i).map(s=>s.trim()).filter(Boolean);
  if(parts.length>=2&&parts.length<=3&&parts.every(p=>terms(p).length>=3))return parts;
  return [name];
}
const generic=/^(explore the historic center|taste local specialties|visit a museum or gallery|find a scenic green space|discover a neighborhood|enjoy a memorable dinner)$/i;
async function fetchJson(url:string):Promise<unknown|null>{
  try{const res=await fetch(url,{headers:{'User-Agent':AGENT,'Accept':'application/json'},cache:'no-store',signal:AbortSignal.timeout(7000)});return res.ok?await res.json():null;}catch{return null;}
}
async function wikiSummary(title:string){
  const url='https://en.wikipedia.org/api/rest_v1/page/summary/'+encodeURIComponent(title.replace(/ /g,'_'));
  const doc=await fetchJson(url) as WikiSummary|null;
  if(!doc?.title||!doc.extract)return null;
  const article=httpsUrl(doc.content_urls?.desktop?.page);
  if(!article||new URL(article).hostname!=='en.wikipedia.org')return null;
  return {name:doc.title,description:doc.extract.slice(0,650),wikipediaUrl:article};
}
async function wikiLookup(name:string,destination:string,country:string,point:Point|null){
  // Prefer explicit canonical Wikipedia titles for common ambiguous Saigon landmarks.
  const canonical=isSaigon(destination,country)?known.find(k=>k.match.test(name)):undefined;
  if(canonical){
    const live=await wikiSummary(canonical.title);
    return live||{name:canonical.title,description:canonical.extract,wikipediaUrl:canonical.url};
  }
  const query=new URL('https://en.wikipedia.org/w/rest.php/v1/search/page');
  query.searchParams.set('q',name);
  query.searchParams.set('limit','6');
  const data=await fetchJson(query.toString()) as WikiSearch|null;
  const pages=data?.pages||[];
  const ranked=pages.map(page=>{
    const relevance=score(name,page.title);
    const context=/saigon|ho chi minh/i.test(destination)&&/saigon|ho chi minh/i.test(page.title+' '+(page.description||'')) ? 0.15 : 0;
    return {title:page.title,relevance,weight:relevance+context};
  }).filter(p=>p.relevance>=.5).sort((a,b)=>b.weight-a.weight);
  for(const candidate of ranked.slice(0,2)){
    const summary=await wikiSummary(candidate.title);
    if(!summary)continue;
    // Never use a Paris cathedral as a match for Ho Chi Minh City.
    if(isSaigon(destination,country)&&/notre.?dame/i.test(name)&&!/saigon|ho chi minh/i.test(summary.name+' '+summary.description))continue;
    return summary;
  }
  return null;
}
type OsmResult={osm_type?:string;osm_id?:number;name?:string;display_name?:string;lat?:string;lon?:string;type?:string;category?:string;namedetails?:Record<string,string>;extratags?:Record<string,string>};
async function osmLookup(name:string,destination:string,country:string,point:Point|null){
  // Max one Nominatim public request across the single Render instance per 1.5 sec.
  if(Date.now()-lastOsm<1500)return null;
  lastOsm=Date.now();
  const url=new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('q',[name,destination,country].join(', ').slice(0,260));
  url.searchParams.set('format','jsonv2');
  url.searchParams.set('addressdetails','1');
  url.searchParams.set('namedetails','1');
  url.searchParams.set('extratags','1');
  url.searchParams.set('limit','5');
  if(point){url.searchParams.set('viewbox',[point.lon-.35,point.lat+.26,point.lon+.35,point.lat-.26].join(','));}
  const raw=await fetchJson(url.toString());
  if(!Array.isArray(raw))return null;
  const ranked=(raw as OsmResult[]).map(p=>{
    const label=p.name||p.namedetails?.name||p.display_name?.split(',')[0]||'';
    const relevance=score(name,label);
    const coords=p.lat&&p.lon?{lat:Number(p.lat),lon:Number(p.lon)}:null;
    const distance=point&&coords&&Number.isFinite(coords.lat)&&Number.isFinite(coords.lon)?dist(point,coords):null;
    return {p,label,relevance,distance};
  }).filter(c=>c.relevance>=.5&&(c.distance===null||c.distance<=18))
    .sort((a,b)=>b.relevance-a.relevance+(a.distance??0)/-100+(b.distance??0)/100);
  const match=ranked[0];
  if(!match)return null;
  const p=match.p;
  const osmType=p.osm_type&&['node','way','relation'].includes(p.osm_type)?p.osm_type:null;
  const osmUrl=osmType&&typeof p.osm_id==='number'&&p.osm_id>0?'https://www.openstreetmap.org/'+osmType+'/'+p.osm_id:null;
  return {name:match.label,address:p.display_name?.slice(0,240)||null,
    category:p.type?.replace(/_/g,' ')||p.category?.replace(/_/g,' ')||null,
    hours:p.extratags?.opening_hours?.slice(0,160)||null,
    website:httpsUrl(p.extratags?.website)||httpsUrl(p.extratags?.['contact:website']),osmUrl};
}
async function lookup(name:string,destination:string,country:string,point:Point|null,canUseOsm:boolean):Promise<Place|null>{
  const [wiki,osm]=await Promise.all([wikiLookup(name,destination,country,point),canUseOsm?osmLookup(name,destination,country,point):Promise.resolve(null)]);
  if(!wiki&&!osm)return null;
  // A compound activity might have one coordinate corresponding only to the first venue.
  return {
    name:wiki?.name||osm?.name||name,
    address:osm?.address||null,
    category:osm?.category||null,
    description:wiki?.description||null,
    hours:osm?.hours||null,
    website:osm?.website||null,
    osmUrl:osm?.osmUrl||null,
    wikipediaUrl:wiki?.wikipediaUrl||null,
    sources:[...(osm?['OpenStreetMap']:[]),...(wiki?['Wikipedia']:[])]
  };
}
export async function POST(req:NextRequest){
  if(Number(req.headers.get('content-length')||0)>3500)return NextResponse.json({error:'Request too large.'},{status:413});
  let body:Record<string,unknown>;
  try{body=await req.json();if(!body||Array.isArray(body)||typeof body!=='object')throw Error();}
  catch{return NextResponse.json({error:'Invalid request.'},{status:400});}
  const {title,location,destination,country,lat,lng}=body;
  if(!valid(title,120)||!valid(location,140)||!valid(destination,100)||!valid(country,100))return NextResponse.json({error:'Invalid place details.'},{status:400});
  if(generic.test(title.trim()))return NextResponse.json({places:[],unmatched:[title],message:'This is a suggested activity, not a confirmed venue. Rename it to a specific landmark to see sourced information.'},{headers:{'Cache-Control':'no-store'}});
  const point:Point|null=typeof lat==='number'&&typeof lng==='number'&&Number.isFinite(lat)&&Number.isFinite(lng)&&Math.abs(lat)<=90&&Math.abs(lng)<=180?{lat,lon:lng}:null;
  const names=splitNames(title);
  const key=[names.map(norm).join('&'),norm(destination),norm(country),point?.lat.toFixed(3)||'',point?.lon.toFixed(3)||''].join('|');
  const stored=cache.get(key);
  if(stored&&stored.until>Date.now())return NextResponse.json(stored.value,{headers:{'Cache-Control':'private, no-store'}});
  const ip=(req.headers.get('x-forwarded-for')||'anonymous').split(',')[0].trim().slice(0,75);
  const now=Date.now();
  if(usage.size>1000)for(const [k,v]of usage)if(v.until<now)usage.delete(k);
  const current=usage.get(ip);
  if(current&&current.until>now&&current.count>=18)return NextResponse.json({error:'Too many place lookups. Please wait 15 minutes.'},{status:429});
  usage.set(ip,current&&current.until>now?{until:current.until,count:current.count+1}:{until:now+15*60*1000,count:1});
  // At most one public Nominatim query per user action, even for compound stops.
  const results=await Promise.all(names.map((name,i)=>lookup(name,destination,country,i===0?point:null,i===0)));
  const places=results.filter((v):v is Place=>!!v);
  const unmatched=names.filter((_,i)=>!results[i]);
  const value:LookupResponse={places,unmatched,
    ...(!places.length?{message:names.length>1?'No confirmed sources found for the places in this activity.':'No reliable matching record found in Wikipedia or OpenStreetMap.'}:{})};
  if(cache.size>300)for(const [k,v] of cache)if(v.until<now)cache.delete(k);
  if(cache.size>350)cache.delete(cache.keys().next().value!);
  // Only successful full matches stay cached for a long time; unavailable results expire quickly.
  cache.set(key,{value,until:now+(places.length===names.length?TTL:2*60*1000)});
  return NextResponse.json(value,{headers:{'Cache-Control':'private, no-store'}});
}
