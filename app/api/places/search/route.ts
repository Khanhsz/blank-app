import { NextRequest, NextResponse } from 'next/server';
import snapshot from '@/data/food-venues.json';
import { searchPostgis, globalPlacesConfigured } from '@/lib/global-places-db';

export const runtime='nodejs';

const FILTERS=new Set(['all','food','drinks','tourism','culture','historic','leisure','nature','transport','service','shopping']);
const REGIONAL_CODE:Record<string,string>={Saigon:'VN',Bangkok:'TH',Singapore:'SG',Seoul:'KR',PhnomPenh:'KH'};
const MAX_LIMIT=40;
const MAX_RADIUS=10000;
type LocalCity={slug:string;name:string;country:string;lat:number;lng:number};
type LocalRecord={id:string;name:string;category:string;kind:string;city:string;lat:number;lng:number;
  cuisine?:string|null;address?:string|null;hours?:string|null;website?:string|null;osmUrl:string;
  localFood?:boolean;streetFood?:boolean};
const cities=snapshot.cities as LocalCity[];
const rows=snapshot.places as LocalRecord[];

function distance(lat1:number,lng1:number,lat2:number,lng2:number){
 const rad=Math.PI/180;
 const y=(lat2-lat1)*rad, x=(lng2-lng1)*rad;
 const h=Math.sin(y/2)**2+Math.cos(lat1*rad)*Math.cos(lat2*rad)*Math.sin(x/2)**2;
 return Math.round(12742000*Math.asin(Math.min(1,Math.sqrt(h))));
}
function findInSnapshot(lat:number,lng:number,country:string,radius:number,category:string,q:string,limit:number){
 const nearest=cities.map(city=>({city,meters:distance(lat,lng,city.lat,city.lng)})).sort((a,b)=>a.meters-b.meters)[0];
 const eligible=nearest&&nearest.meters<55000&&(!country||country===REGIONAL_CODE[nearest.city.slug]);
 if(!eligible)return {coverage:null,places:[]};
 const places=rows.filter(p=>
   p.city===nearest.city.slug &&
   (category==='all'||category==='food'&&p.kind==='food'||category==='drinks'&&p.kind==='drinks') &&
   (!q||p.name.toLowerCase().includes(q.toLowerCase())) &&
   distance(lat,lng,p.lat,p.lng)<=radius
 ).map(p=>({
   id:p.id,name:p.name,category:p.kind,subcategory:p.category,
   countryCode:REGIONAL_CODE[p.city]||'',
   lat:p.lat,lng:p.lng,distanceMeters:distance(lat,lng,p.lat,p.lng),
   cuisine:p.cuisine||null,address:p.address||null,hours:p.hours||null,website:p.website||null,
   localFood:!!p.localFood,streetFood:!!p.streetFood,osmUrl:p.osmUrl
 })).sort((a,b)=>a.distanceMeters-b.distanceMeters).slice(0,limit);
 return {coverage:nearest.city.name,places};
}
const send=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'no-store'}});
export async function GET(){
 return send({
   goal:{targetRecords:100000000,actualRecordsImportedToGlobalPostgis:null,capacityNotYetVerified:true},
   mode:globalPlacesConfigured()?'postgis-enabled':'regional-snapshot',
   globalDatabaseConnected:globalPlacesConfigured(),
   regionalSnapshot:{records:(snapshot.places as unknown[]).length,cities:cities.map(x=>x.name),
     updatedAt:snapshot.generatedAt,license:'ODbL-1.0'},
   attribution:'© OpenStreetMap contributors'
 });
}
export async function POST(req:NextRequest){
 if(Number(req.headers.get('content-length')||0)>2000)return send({error:'Request too large.'},413);
 let input:Record<string,unknown>;
 try {input=await req.json();if(!input||typeof input!=='object'||Array.isArray(input))throw Error();}
 catch{return send({error:'Invalid request body.'},400);}
 const lat=input.lat,lng=input.lng;
 if(typeof lat!=='number'||typeof lng!=='number'||!Number.isFinite(lat)||!Number.isFinite(lng)||
    Math.abs(lat)>85||Math.abs(lng)>180)return send({error:'Valid coordinates are required.'},400);
 const country=typeof input.countryCode==='string'&&/^[A-Za-z]{2}$/.test(input.countryCode)?input.countryCode.toUpperCase():'';
 const category=typeof input.category==='string'&&FILTERS.has(input.category)?input.category:'all';
 const q=typeof input.query==='string'?input.query.trim().slice(0,90):'';
 const radius=typeof input.radiusMeters==='number'&&Number.isFinite(input.radiusMeters)?
   Math.min(MAX_RADIUS,Math.max(100,Math.floor(input.radiusMeters))):2500;
 const limit=typeof input.limit==='number'&&Number.isFinite(input.limit)?
   Math.min(MAX_LIMIT,Math.max(1,Math.floor(input.limit))):20;
 let reason='';
 if(globalPlacesConfigured()&&country){
   try{
     const result=await searchPostgis({lat,lng,countryCode:country,radiusMeters:radius,limit,
       category:category as 'all'|'food'|'drinks'|'tourism'|'culture'|'historic'|'leisure'|'nature'|'transport'|'service'|'shopping',query:q});
     return send({places:result,backend:'postgis',coverage:'country '+country,
       radiusMeters:radius,source:'OpenStreetMap',verifiedSourceIds:true});
   }catch(e){
     console.error('[global-places] indexed lookup failed',e instanceof Error?e.name:'unexpected error');
     reason='Geographic database temporarily unavailable, showing regional snapshot if covered.';
   }
 }else if(globalPlacesConfigured()){
   reason='Country code required for the global indexed database; showing any nearby regional snapshot.';
 }
 const fallback=findInSnapshot(lat,lng,country,radius,category,q,limit);
 return send({places:fallback.places,backend:'regional-snapshot',coverage:fallback.coverage,
   radiusMeters:radius,source:'OpenStreetMap',verifiedSourceIds:true,
   ...(!fallback.coverage?{message:reason||'No indexed global database configured and no regional snapshot covers this location.'}:reason?{message:reason}:{}),
   ...((category!=='all'&&category!=='food'&&category!=='drinks')?{notice:'This regional snapshot currently contains food and drink places only.'}:{})
 });
}
