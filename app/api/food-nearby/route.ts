import { NextRequest, NextResponse } from 'next/server';
import snapshot from '@/data/food-venues.json';

export const runtime = 'nodejs';

type Venue = {
 id:string;name:string;kind:'food'|'drinks';category:string;
 lat:number;lng:number;city:string;distanceMeters:number;
 cuisine:string|null;address:string|null;hours:string|null;
 website:string|null;osmUrl:string;
};
type SavedVenue = Omit<Venue,'distanceMeters'>;
type City = {slug:string;name:string;country:string;lat:number;lng:number;count:number;source:string};
const cities=snapshot.cities as City[];
const places=snapshot.places as SavedVenue[];
const RADIUS_METERS=2200;
const MAX_RESULTS=48;
const ALLOWED=new Set(['Restaurant','Cafe / tea shop','Casual dining','Ice cream / desserts','Bakery']);

function distance(lat1:number,lon1:number,lat2:number,lon2:number):number{
 const r=Math.PI/180, y=(lat2-lat1)*r, x=(lon2-lon1)*r;
 const h=Math.sin(y/2)**2+Math.cos(lat1*r)*Math.cos(lat2*r)*Math.sin(x/2)**2;
 return 12742000*Math.asin(Math.min(1,Math.sqrt(h)));
}
const unsafeName=/\b(?:pub|brewery|beer|wine|cocktail|nightclub|liquor|spirits)\b/i;
function normalize(s:string){return s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();}
function rank(item:Venue,requestText:string){
 const phrase=normalize(requestText);
 const words=phrase.split(/\W+/).filter(w=>w.length>=3&&!['lunch','breakfast','dinner','local','visit','eat','drink','restaurant','near','food','shop'].includes(w));
 const context=normalize(item.name+' '+(item.cuisine||''));
 return Math.min(3,words.filter(w=>context.includes(w)).length)*700-Math.round(item.distanceMeters);
}
function error(message:string,status=400){return NextResponse.json({error:message},{status,headers:{'Cache-Control':'no-store'}});}
export async function GET(){
 return NextResponse.json({mode:'offline-snapshot',source:snapshot.source,license:snapshot.license,
  generatedAt:snapshot.generatedAt,cityCount:cities.length,placeCount:places.length,
  cities:cities.map(c=>({name:c.name,country:c.country,count:c.count}))},
  {headers:{'Cache-Control':'public, max-age=300'}});
}
export async function POST(req:NextRequest){
 if(Number(req.headers.get('content-length')||0)>900)return error('Request too large.',413);
 let data:Record<string,unknown>;
 try{data=await req.json();if(!data||typeof data!=='object'||Array.isArray(data))throw Error();}
 catch{return error('Invalid coordinates.');}
 const {lat,lng}=data;
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
  const d=distance(lat,lng,item.lat,item.lng);
  if(d>RADIUS_METERS)continue;
  candidates.push({...item,distanceMeters:Math.round(d)});
 }
 const intent=typeof data.activityTitle==='string' ? data.activityTitle.slice(0,120) : '';
 candidates.sort((a,b)=>rank(b,intent)-rank(a,intent));
 const selected=candidates.slice(0,MAX_RESULTS);
 return NextResponse.json({places:selected,source:'OpenStreetMap',database:'offline',
   coverageCity:current.city.name,updatedAt:snapshot.generatedAt,
   radiusMeters:RADIUS_METERS,totalMatches:candidates.length,
   ...(selected.length?{}:{message:'No verified OpenStreetMap food venues found near this point within 2.2 km. Try a different stop.'})},
   {headers:{'Cache-Control':'private, max-age=120'}});
}
