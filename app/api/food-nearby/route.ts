import { NextRequest, NextResponse } from 'next/server';
import snapshot from '@/data/food-venues.json';

export const runtime = 'nodejs';

type Venue = {
 id:string;name:string;kind:'food'|'drinks';category:string;
 lat:number;lng:number;city:string;distanceMeters:number;
 cuisine:string|null;address:string|null;hours:string|null;
 website:string|null;osmUrl:string;
 localFood?:boolean;streetFood?:boolean;
};
type SavedVenue = Omit<Venue,'distanceMeters'>;
type City = {slug:string;name:string;country:string;lat:number;lng:number;count:number;source:string};
const cities=snapshot.cities as City[];
const places=snapshot.places as SavedVenue[];
const RADIUS_METERS=2200;
const MAX_RESULTS=48;
const ALLOWED=new Set(['Restaurant','Cafe / tea shop','Casual dining','Ice cream / desserts','Bakery','Food court','Local deli / prepared food']);

function distance(lat1:number,lon1:number,lat2:number,lon2:number):number{
 const r=Math.PI/180, y=(lat2-lat1)*r, x=(lon2-lon1)*r;
 const h=Math.sin(y/2)**2+Math.cos(lat1*r)*Math.cos(lat2*r)*Math.sin(x/2)**2;
 return 12742000*Math.asin(Math.min(1,Math.sqrt(h)));
}
const unsafeName=/\b(?:pub|brewery|beer|wine|cocktail|nightclub|liquor|spirits)\b/i;
function normalize(s:string){return s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/đ/g,'d');}
function rank(item:Venue,requestText:string){
 const phrase=normalize(requestText);
 const words=phrase.split(/[^a-z0-9]+/).filter(w=>w.length>=3&&!['lunch','breakfast','dinner','visit','eat','drink','restaurant','near','food','shop','local'].includes(w));
 const context=normalize(item.name+' '+(item.cuisine||''));
 const matches=Math.min(4,words.filter(w=>context.split(/[^a-z0-9]+/).includes(w)).length);
 const localBonus=(/\blocal\b/i.test(phrase)&&item.localFood)?550:0;
 const streetBonus=(/\bstreet\b/i.test(phrase)&&item.streetFood)?380:0;
 return matches*850+localBonus+streetBonus-Math.round(item.distanceMeters);
}
function normalizeName(s:string){return normalize(s).replace(/[^a-z0-9]+/g,' ').trim();}
function uniqueNear(items:Venue[],limit:number){
 const chosen:Venue[]=[];
 const buckets=new Map<string,Venue[]>();
 for(const item of items){
   const name=normalizeName(item.name);
   const old=buckets.get(name)||[];
   if(old.some(v=>distance(v.lat,v.lng,item.lat,item.lng)<45))continue;
   chosen.push(item);
   old.push(item);buckets.set(name,old);
   if(chosen.length>=limit)break;
 }
 return chosen;
}
function error(message:string,status=400){return NextResponse.json({error:message},{status,headers:{'Cache-Control':'no-store'}});}
export async function GET(){
 return NextResponse.json({mode:'offline-snapshot',source:snapshot.source,license:snapshot.license,
  generatedAt:snapshot.generatedAt,cityCount:cities.length,placeCount:places.length,localCount:places.filter(p=>p.localFood).length,streetCount:places.filter(p=>p.streetFood).length,
  cities:cities.map(c=>({name:c.name,country:c.country,count:c.count}))},
  {headers:{'Cache-Control':'public, max-age=300'}});
}
export async function POST(req:NextRequest){
 if(Number(req.headers.get('content-length')||0)>900)return error('Request too large.',413);
 let data:Record<string,unknown>;
 try{data=await req.json();if(!data||typeof data!=='object'||Array.isArray(data))throw Error();}
 catch{return error('Invalid coordinates.');}
 const {lat,lng}=data;
 const filter=['all','food','drinks','local','street'].includes(String(data.filter))?String(data.filter):'all';
 if(typeof lat!=='number'||typeof lng!=='number'||!Number.isFinite(lat)||!Number.isFinite(lng)||Math.abs(lat)>85||Math.abs(lng)>180)
   return error('Please choose an activity with valid map coordinates.');
 const current = cities.map(city=>({city,meters:distance(lat,lng,city.lat,city.lng)})).sort((a,b)=>a.meters-b.meters)[0];
 if(!current||current.meters>55000){
  return NextResponse.json({places:[],source:'OpenStreetMap',database:'offline',
   message:!cities.length?'The offline dining database has not been imported yet. Try again after the next verified data update.':
   'No local snapshot is available for this location yet. Covered cities: '+cities.map(c=>c.name).join(', ')+'.',
   coverageCity:null,updatedAt:snapshot.generatedAt},
   {headers:{'Cache-Control':'private, max-age=90'}});
 }
 const candidates:Venue[]=[];
 // All suggestions come from OSM objects with explicit IDs and coordinates.
 for(const item of places){
  if(item.city!==current.city.slug||!ALLOWED.has(item.category)||unsafeName.test(item.name))continue;
  if(filter==='food'&&item.kind!=='food')continue;
  if(filter==='drinks'&&item.kind!=='drinks')continue;
  if(filter==='local'&&!item.localFood)continue;
  if(filter==='street'&&!item.streetFood)continue;
  const d=distance(lat,lng,item.lat,item.lng);
  if(d>RADIUS_METERS)continue;
  candidates.push({...item,distanceMeters:Math.round(d)});
 }
 const intent=typeof data.activityTitle==='string' ? data.activityTitle.slice(0,120) : '';
 candidates.sort((a,b)=>rank(b,intent)-rank(a,intent));
 const selected=uniqueNear(candidates,MAX_RESULTS);
 return NextResponse.json({places:selected,source:'OpenStreetMap',database:'offline',
   coverageCity:current.city.name,updatedAt:snapshot.generatedAt,
   radiusMeters:RADIUS_METERS,totalMatches:candidates.length,filter,
   ...(selected.length?{}:{message:'No matching OpenStreetMap eateries with those tags were found within 2.2 km. Try another filter or a nearby activity.'})},
   {headers:{'Cache-Control':'private, max-age=120'}});
}
