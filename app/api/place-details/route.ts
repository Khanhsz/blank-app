import { NextRequest, NextResponse } from 'next/server';
import { verifyMatch, type Coord, type Verification, normalizeName } from '@/lib/place-verification';

export const runtime='nodejs';
const AGENT='TripMateTravelPlanner/0.6 (https://tripmate-ai-khanhsz.onrender.com/privacy)';
const cache=new Map<string,{until:number;result:Result}>();
const usage=new Map<string,{until:number;count:number}>();
let lastNominatim=0;
type Candidate={
 id:string;name:string;description:string|null;address:string|null;category:string|null;
 hours:string|null;website:string|null;osmId:string|null;osmUrl:string|null;
 wikipediaUrl:string|null;wikipediaTitle:string|null;lat:number|null;lng:number|null;
 source:'OpenStreetMap'|'Wikipedia';
 sourceUpdatedAt:null;checkedAt:string;verification:Verification;
};
type Result={places:Candidate[];unmatched:string[];message?:string};
type WikiSummary={title?:string;extract?:string;content_urls?:{desktop?:{page?:string}};coordinates?:{lat:number;lon:number}};
type WikiSearch={pages?:Array<{title:string;description?:string}>};
type OsmResult={osm_type?:string;osm_id?:number;display_name?:string;name?:string;
 lat?:string;lon?:string;type?:string;category?:string;namedetails?:Record<string,string>;
 extratags?:Record<string,string>};
const aliases=[
 {re:/saigon central post office|saigon post office|buu dien.*sai gon|central post office/i,title:'Saigon Central Post Office'},
 {re:/notre.?dame|nha tho duc ba|duc ba cathedral|saigon cathedral/i,title:'Notre-Dame Cathedral Basilica of Saigon'},
 {re:/independence palace|reunification palace|reunification hall|dinh doc lap|dinh thong nhat/i,title:'Independence Palace'}
];
const isSaigon=(city:string,country:string)=>/ho chi minh|sai gon|saigon|hcmc/i.test(city)&&/viet\s?nam/i.test(country);
function cityMention(value:string,city:string,country:string){
 const hay=normalizeName(value);
 const variations=isSaigon(city,country)?['ho chi minh','saigon','sai gon']: [normalizeName(city)];
 return variations.some(x=>x.length>=3&&hay.includes(x));
}
function valid(s:unknown,max:number):s is string{return typeof s==='string'&&s.trim().length>=2&&s.length<=max;}
function safeUrl(v:unknown){if(typeof v!=='string')return null;try{const u=new URL(v);return u.protocol==='https:'?u.toString():null;}catch{return null;}}
function stripActivityName(s:string){
 return s.trim().replace(/^(?:visit|explore|see|discover|enjoy|walk through|stroll through)\s+/i,'')
  .replace(/\s+(?:guided\s+visit|visit|guided\s+tour|tour|stop)$/i,'').trim();
}
function partsOf(s:string){
 const name=stripActivityName(s);
 const p=name.split(/\s+(?:and|&|\+)\s+/i).filter(x=>x.trim().split(/\s+/).length>=2);
 return p.length>=2&&p.length<=3?p.map(x=>x.trim()):[name];
}
async function json(url:string){
 try{const r=await fetch(url,{headers:{'User-Agent':AGENT,'Accept':'application/json'},signal:AbortSignal.timeout(7000),cache:'no-store'});return r.ok?await r.json():null;}catch{return null;}
}
async function wikiSummary(title:string){
 const u='https://en.wikipedia.org/api/rest_v1/page/summary/'+encodeURIComponent(title.replace(/ /g,'_'));
 const p=await json(u) as WikiSummary|null;
 if(!p?.title||!p.extract)return null;
 const article=safeUrl(p.content_urls?.desktop?.page);
 if(!article||new URL(article).hostname!=='en.wikipedia.org')return null;
 const coords=p.coordinates;
 const point:Coord|null=coords&&Number.isFinite(coords.lat)&&Number.isFinite(coords.lon)?{lat:coords.lat,lng:coords.lon}:null;
 return {name:p.title,description:p.extract.slice(0,700),wikipediaUrl:article,point};
}
async function wikiCandidates(name:string,city:string,country:string){
 const canon=isSaigon(city,country)?aliases.find(x=>x.re.test(name)):null;
 const titles:string[]=[];
 if(canon)titles.push(canon.title);
 else{
   const url=new URL('https://en.wikipedia.org/w/rest.php/v1/search/page');
   url.searchParams.set('q',name+' '+city);url.searchParams.set('limit','5');
   const result=await json(url.toString()) as WikiSearch|null;
   for(const p of result?.pages||[])if(p.title)titles.push(p.title);
 }
 const summaries=[];
 for(const title of titles.slice(0,3)){
   const sum=await wikiSummary(title);
   if(sum)summaries.push({...sum,knownAlias:!!canon&&title===canon.title});
 }
 return summaries;
}
async function osmCandidates(name:string,city:string,country:string,point:Coord|null){
 // Public Nominatim is deliberately only for an explicit place detail click.
 // Single Render instance limit: <= 1 request / 1.5 seconds, plus per-user limit.
 if(Date.now()-lastNominatim<1500)return [] as OsmResult[];
 lastNominatim=Date.now();
 const url=new URL('https://nominatim.openstreetmap.org/search');
 url.searchParams.set('q',[name,city,country].join(', ').slice(0,250));
 url.searchParams.set('format','jsonv2');url.searchParams.set('limit','5');
 url.searchParams.set('addressdetails','1');url.searchParams.set('namedetails','1');
 url.searchParams.set('extratags','1');
 if(point)url.searchParams.set('viewbox',[point.lng-.3,point.lat+.24,point.lng+.3,point.lat-.24].join(','));
 const items=await json(url.toString());
 return Array.isArray(items)?items as OsmResult[]:[];
}
function asCandidate(
 source:'Wikipedia'|'OpenStreetMap',inputName:string,city:string,country:string,
 inputPoint:Coord|null,data:{
 name:string;description?:string|null;address?:string|null;category?:string|null;
 hours?:string|null;website?:string|null;osmId?:string|null;osmUrl?:string|null;
 wikipediaUrl?:string|null;point:Coord|null;alias?:boolean
 },checkedAt:string
):Candidate{
 const context=(data.description||'')+' '+(data.address||'');
 const verify=verifyMatch({query:inputName,label:data.name,activityPoint:inputPoint,
   candidatePoint:data.point,cityInSource:cityMention(context,city,country),knownAlias:!!data.alias});
 return {id:source+':'+(data.osmId||data.wikipediaUrl||data.name),name:data.name,
  description:data.description||null,address:data.address||null,category:data.category||null,
  hours:data.hours||null,website:data.website||null,osmId:data.osmId||null,
  osmUrl:data.osmUrl||null,wikipediaUrl:data.wikipediaUrl||null,
  wikipediaTitle:source==='Wikipedia'?data.name:null,
  lat:data.point?.lat??null,lng:data.point?.lng??null,
  source,sourceUpdatedAt:null,checkedAt,verification:verify};
}
async function candidatesFor(name:string,city:string,country:string,point:Coord|null,allowOsm:boolean,checkedAt:string){
 const [wiki,osm]=await Promise.all([
   wikiCandidates(name,city,country),
   allowOsm?osmCandidates(name,city,country,point):Promise.resolve([] as OsmResult[])
 ]);
 const candidates:Candidate[]=[];
 for(const item of wiki){
   candidates.push(asCandidate('Wikipedia',name,city,country,point,{
     name:item.name,description:item.description,wikipediaUrl:item.wikipediaUrl,
     point:item.point,alias:item.knownAlias},checkedAt));
 }
 for(const item of osm){
   const label=item.name||item.namedetails?.name||item.display_name?.split(',')[0]||'';
   const lat=Number(item.lat),lng=Number(item.lon);
   const pointOsm=Number.isFinite(lat)&&Number.isFinite(lng)?{lat,lng}:null;
   const type=item.osm_type;
   const osmId=typeof item.osm_id==='number'&&type&&['node','way','relation'].includes(type)
    ? type+'/'+item.osm_id:null;
   if(!osmId||!label)continue;
   candidates.push(asCandidate('OpenStreetMap',name,city,country,point,{
     name:label,address:item.display_name?.slice(0,240),category:(item.type||item.category||'').replace(/_/g,' '),
     hours:item.extratags?.opening_hours?.slice(0,150),website:safeUrl(item.extratags?.website),
     osmId,osmUrl:'https://www.openstreetmap.org/'+osmId,
     point:pointOsm
   },checkedAt));
 }
 // No blending Wikipedia and OSM records unless independently confirmed as same POI.
 // Candidate score is a heuristic, and all low-confidence results require explicit user review.
 return candidates.filter(c=>c.verification.level!=='rejected')
   .sort((a,b)=>b.verification.score-a.verification.score).slice(0,4);
}
export async function POST(request:NextRequest){
 if(Number(request.headers.get('content-length')||0)>3500)
   return NextResponse.json({error:'Request too large.'},{status:413});
 let body:Record<string,unknown>;
 try{body=await request.json();if(!body||typeof body!=='object'||Array.isArray(body))throw Error();}
 catch{return NextResponse.json({error:'Invalid request.'},{status:400});}
 const {title,location,destination,country,lat,lng}=body;
 if(!valid(title,120)||!valid(location,140)||!valid(destination,100)||!valid(country,100))
   return NextResponse.json({error:'Invalid place details.'},{status:400});
 const inputPoint=typeof lat==='number'&&typeof lng==='number'&&
   Number.isFinite(lat)&&Number.isFinite(lng)&&Math.abs(lat)<=90&&Math.abs(lng)<=180?{lat,lng}:null;
 const names=partsOf(title);
 const cacheKey=[names.map(normalizeName).join('&'),normalizeName(destination),normalizeName(country),
   inputPoint?.lat.toFixed(3),inputPoint?.lng.toFixed(3)].join('|');
 const existing=cache.get(cacheKey);
 if(existing&&existing.until>Date.now())return NextResponse.json(existing.result,{headers:{'Cache-Control':'private, no-store'}});
 const ip=(request.headers.get('x-forwarded-for')||'anonymous').split(',')[0].slice(0,80);
 const now=Date.now();if(usage.size>1500)for(const [k,v]of usage)if(v.until<now)usage.delete(k);
 const record=usage.get(ip);
 if(record&&record.until>now&&record.count>=15)return NextResponse.json({error:'Too many lookups. Try again later.'},{status:429});
 usage.set(ip,record&&record.until>now?{until:record.until,count:record.count+1}:{until:now+900000,count:1});
 const checkedAt=new Date().toISOString();
 const results=await Promise.all(names.map((name,i)=>candidatesFor(name,destination,country,
   i===0?inputPoint:null,i===0,checkedAt)));
 const places=results.flat();
 const unmatched=names.filter((_,i)=>!results[i]?.length);
 const result:Result={places,unmatched,...(!places.length?{message:'No credible matches found. Try specifying a landmark and checking its city.'}:{})};
 if(cache.size>350)cache.delete(cache.keys().next().value!);
 cache.set(cacheKey,{result,until:now+(places.length&&unmatched.length===0?60*60*1000:3*60*1000)});
 return NextResponse.json(result,{headers:{'Cache-Control':'private, no-store'}});
}
