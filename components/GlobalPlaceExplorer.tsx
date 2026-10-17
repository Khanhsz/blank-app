'use client';

import { useEffect, useState } from 'react';
import { Globe2, MapPin, Search, Compass } from 'lucide-react';
import { COUNTRIES } from '@/lib/places';
import type { Trip } from '@/lib/types';

type Place = {
 id:string;name:string;category:string;subcategory:string|null;
 countryCode:string;lat:number;lng:number;distanceMeters:number;
 address:string|null;cuisine:string|null;osmUrl:string;
};
type SearchResponse = {
 places:Place[];backend:string;coverage:string|null;message?:string;notice?:string;
};

export default function GlobalPlaceExplorer({trip}:{trip:Trip|null}){
 const [category,setCategory]=useState('all');
 const [text,setText]=useState('');
 const [radius,setRadius]=useState('2500');
 const [status,setStatus]=useState<'idle'|'loading'|'ready'|'error'>('idle');
 const [results,setResults]=useState<Place[]>([]);
 const [message,setMessage]=useState('');
 const [backend,setBackend]=useState('');

 const point=trip?.days.flatMap(day=>day.activities)
   .find(a=>typeof a.lat==='number'&&typeof a.lng==='number'&&Number.isFinite(a.lat)&&Number.isFinite(a.lng));
 const lat=point?.lat,lng=point?.lng;
 const countryCode=COUNTRIES.find(c=>c.name.toLowerCase()===trip?.country.toLowerCase())?.code
  || (trip?.country==='Viet Nam'?'VN':trip?.country==='Vietnam'?'VN':undefined);

 useEffect(()=>{setResults([]);setStatus('idle');setMessage('');},[trip?.id]);

 async function findPlaces(){
   if(typeof lat!=='number'||typeof lng!=='number'){
     setStatus('error');setMessage('Add a trip with mapped activities to search nearby places.');return;
   }
   setStatus('loading');setMessage('');
   try{
     const response=await fetch('/api/places/search',{
       method:'POST',headers:{'Content-Type':'application/json'},
       body:JSON.stringify({lat,lng,countryCode,category,query:text,radiusMeters:Number(radius),limit:20}),
       cache:'no-store'
     });
     const data=await response.json() as SearchResponse & {error?:string};
     if(!response.ok)throw Error(data.error||'Could not search places.');
     setResults(data.places||[]);setBackend(data.backend||'regional-snapshot');
     setStatus('ready');
     setMessage(data.message||data.notice||'');
   }catch(error){
     setStatus('error');setResults([]);
     setMessage(error instanceof Error?error.message:'Place search is unavailable.');
   }
 }

 return <section className="global-explorer">
   <div className="global-explorer-heading"><Globe2 size={22}/><div>
     <h3>Explore real places</h3>
     <p>Source-backed OpenStreetMap locations around your selected trip.</p>
   </div></div>
   {!trip||typeof lat!=='number'||typeof lng!=='number'?
     <div className="global-explorer-empty"><Compass size={18}/> Create a trip with mapped stops to search surrounding places.</div>:
     <>
       <p className="global-explorer-where"><MapPin size={13}/>{trip.destination}, {trip.country} · Near {point?.title}</p>
       <form className="global-explorer-form" onSubmit={event=>{event.preventDefault();void findPlaces();}}>
         <label>Place name <input value={text} onChange={event=>setText(event.target.value)} placeholder="Museum, restaurant, landmark..." maxLength={90}/></label>
         <label>Category <select value={category} onChange={event=>setCategory(event.target.value)}>
           <option value="all">All mapped places</option>
           <option value="food">Restaurants & food</option>
           <option value="drinks">Cafes & desserts</option>
           <option value="tourism">Tourist attractions & stays</option>
           <option value="culture">Culture</option>
           <option value="historic">Historic places</option>
           <option value="nature">Nature</option>
           <option value="transport">Transport</option>
           <option value="shopping">Shops</option>
         </select></label>
         <label>Within <select value={radius} onChange={event=>setRadius(event.target.value)}>
           <option value="1000">1 km</option><option value="2500">2.5 km</option>
           <option value="5000">5 km</option><option value="10000">10 km</option>
         </select></label>
         <button type="submit" disabled={status==='loading'}><Search size={15}/> {status==='loading'?'Searching…':'Find places'}</button>
       </form>
       {status==='ready' && <p className="global-explorer-status">{backend==='postgis'?'Indexed PostGIS database':'Regional OSM snapshot'} · {results.length} shown · No invented places</p>}
       {message && <p className="global-explorer-notice" role="status">{message}</p>}
       {status==='ready'&&results.length===0&&!message&&<p className="global-explorer-notice">No matching records in the available data for this area.</p>}
       <div className="global-explorer-results">{results.map(item=><article key={item.id} className="global-explorer-place">
         <div><strong>{item.name}</strong><small>{item.subcategory||item.category} · {Math.round(item.distanceMeters)} m (straight line)</small>
           {item.address&&<small>{item.address}</small>}
         </div><a href={item.osmUrl} target="_blank" rel="noopener noreferrer">OSM source ↗</a>
       </article>)}</div>
     </>
   }
   <p className="global-explorer-credit">© OpenStreetMap contributors (ODbL). A global 100M-record database is a scaling goal; only imported, verified locations are searchable.</p>
 </section>;
}
