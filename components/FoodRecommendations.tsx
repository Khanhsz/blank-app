'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, ChefHat, Coffee, ExternalLink, MapPin, RefreshCw, Utensils, Soup } from 'lucide-react';
import type { Activity } from '@/lib/types';

export type FoodVenue = {
  id:string;name:string;kind:'food'|'drinks';category:string;lat:number;lng:number;
  distanceMeters:number;cuisine:string|null;address:string|null;hours:string|null;
  website:string|null;osmUrl:string;
  localFood?:boolean;streetFood?:boolean;
};
type Filter = 'all'|'food'|'drinks'|'local'|'street';
type Position = {lat:number;lng:number;source:'activity'|'day'};
type Props = {
  activity:Activity; anchor:Position|null;
  onChoose?:(activityId:string,venue:FoodVenue)=>void;
};
const iconText=(meters:number)=>meters<1000?Math.round(meters)+' m':(meters/1000).toFixed(1)+' km';
const looksLikeDrinks=(a:Activity)=>/\b(cafe|coffee|tea|juice|smoothie|bubble tea|dessert|ice cream|milk tea|drink)\b/i.test(a.title+' '+a.description);

export default function FoodRecommendations({activity,anchor,onChoose}:Props){
  const [filter,setFilter]=useState<Filter>(()=>looksLikeDrinks(activity)?'drinks':'all');
  const [venues,setVenues]=useState<FoodVenue[]>([]);
  const [state,setState]=useState<'idle'|'loading'|'ready'|'error'>('idle');
  const [message,setMessage]=useState('');
  const [coverage,setCoverage]=useState('');
  const [limit,setLimit]=useState(8);
  const [retry,setRetry]=useState(0);
  const key=anchor?anchor.lat.toFixed(5)+':'+anchor.lng.toFixed(5):'none';
  useEffect(()=>{
    setFilter(looksLikeDrinks(activity)?'drinks':'all');
  },[activity.id]);
  useEffect(()=>{
    setLimit(8);setCoverage('');
    if(!anchor){setVenues([]);setState('idle');setMessage('No mapped location is available for this day. Add coordinates to a nearby itinerary stop to find local venues.');return;}
    const controller=new AbortController();
    setState('loading');setMessage('');
    fetch('/api/food-nearby',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({lat:anchor.lat,lng:anchor.lng,activityTitle:activity.title,filter}),
      signal:controller.signal,
      cache:'no-store'
    }).then(async response=>{
      const data=await response.json();
      if(!response.ok)throw Error(data.error||'Could not load nearby venues.');
      setVenues(Array.isArray(data.places)?data.places:[]);
      setCoverage(data.coverageCity ? 'Offline database · '+data.coverageCity : 'Offline database');
      setMessage(data.message||'');
      setState('ready');
    }).catch((error:unknown)=>{
      if(controller.signal.aborted)return;
      setVenues([]);
      setMessage(error instanceof Error?error.message:'Unable to look up venues.');
      setState('error');
    });
    return ()=>controller.abort();
  },[key,retry,filter,activity.title]);
  const shown=useMemo(()=>venues.slice(0,limit),[venues,limit]);
  const available=venues.length;
  return <section className="food-recommendations" aria-label="Nearby restaurants and cafes">
    <div className="food-panel-head">
      <div className="food-panel-icon"><Utensils size={18}/></div>
      <div><span className="place-kicker">REAL PLACES FROM OPENSTREETMAP</span><h4>Where to eat & drink nearby</h4></div>
    </div>
    <p className="food-panel-help">Verified OpenStreetMap restaurants and cafes from a local snapshot. No API key, invented ratings, prices or availability.</p>
    {coverage && <p className="food-anchor">{coverage} · No live lookup required</p>}
    {anchor && <p className="food-anchor"><MapPin size={13}/>{anchor.source==='day'?'Searching around another mapped stop on this day':'Searching around this activity’s map pin'} · up to 2.2 km radius</p>}
    <div className="food-filters" role="group" aria-label="Food and drink categories">
      <button type="button" className={filter==='all'?'active':''} aria-pressed={filter==='all'} onClick={()=>{setFilter('all');setLimit(8);}}>All places</button>
      <button type="button" className={filter==='local'?'active':''} aria-pressed={filter==='local'} onClick={()=>{setFilter('local');setLimit(8);}}><Soup size={14}/> Local eats</button>
      <button type="button" className={filter==='street'?'active':''} aria-pressed={filter==='street'} onClick={()=>{setFilter('street');setLimit(8);}}>Street food</button>
      <button type="button" className={filter==='food'?'active':''} aria-pressed={filter==='food'} onClick={()=>{setFilter('food');setLimit(8);}}><ChefHat size={14}/> Restaurants</button>
      <button type="button" className={filter==='drinks'?'active':''} aria-pressed={filter==='drinks'} onClick={()=>{setFilter('drinks');setLimit(8);}}><Coffee size={14}/> Coffee & drinks</button>
    </div>
    {state==='loading'&&<div className="food-status" role="status"><span className="spinner"/> Searching local food database…</div>}
    {(state==='idle'||state==='error')&&<div className="food-status" role="status">{message}{state==='error'&&anchor&&<button type="button" onClick={()=>setRetry(n=>n+1)}><RefreshCw size={13}/> Retry</button>}</div>}
    {state==='ready'&&available===0&&<div className="food-status" role="status">{message||'No venues of this type are mapped near this stop. Try another filter or activity.'}</div>}
    {state==='ready'&&available>0&&<>
      <p className="food-count">{available} mapped place{available===1?'':'s'} · sorted using meal relevance and distance</p>
      <div className="food-venue-list">{shown.map(venue=><article className="food-venue" key={venue.id}>
        <div className="food-venue-main">
          <div className="food-venue-name"><strong>{venue.name}</strong><span>{iconText(venue.distanceMeters)} away</span></div>
          <p>{venue.category}{venue.cuisine?' · '+venue.cuisine:''}</p>
          {(venue.localFood||venue.streetFood)&&<div className="food-tags">{venue.localFood&&<span>Local-style food*</span>}{venue.streetFood&&<span>Street-food tag*</span>}</div>}
          {venue.address&&<p className="food-venue-detail"><MapPin size={12}/>{venue.address}</p>}
          {venue.hours&&<p className="food-venue-detail">Listed hours: {venue.hours} (verify before visiting)</p>}
        </div>
        <div className="food-venue-actions">
          {onChoose&&<button className="food-use" type="button" onClick={()=>onChoose(activity.id,venue)}><Check size={14}/> Use this place</button>}
          <a href={venue.osmUrl} target="_blank" rel="noopener noreferrer" aria-label={'OpenStreetMap source for '+venue.name}>OSM source <ExternalLink size={12}/></a>
          {venue.website&&<a href={venue.website} target="_blank" rel="noopener noreferrer">Website <ExternalLink size={12}/></a>}
        </div>
      </article>)}</div>
      {available>limit&&<button className="food-show-more" type="button" onClick={()=>setLimit(n=>n+8)}>Show more nearby places</button>}
    </>}
    <p className="place-source-note">© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a> (ODbL). Nearby distance is straight-line, not walking time. Listings, cuisine and opening hours may be incomplete. Local/street labels are indicators inferred from OSM cuisine, venue names or tags—not independently verified recommendations. Coverage and accuracy depend on the last OpenStreetMap import.</p>
  </section>;
}
