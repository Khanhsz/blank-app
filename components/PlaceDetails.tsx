'use client';

import { useEffect, useState } from 'react';
import { CircleAlert, Clock3, Globe2, MapPin, Star } from 'lucide-react';
import type { Activity } from '@/lib/types';

type Place = {
  placeId:string|null;
  name:string;
  address:string|null;
  type:string|null;
  rating:number|null;
  ratingCount:number|null;
  isOpenNow:boolean|null;
  openingHours:string[];
  website:string|null;
  attributions:{label:string;url:string|null}[];
};

export default function PlaceDetails({activity,destination,country}: {activity:Activity;destination:string;country:string}) {
  const [status,setStatus]=useState<'loading'|'ready'|'unavailable'|'error'>('loading');
  const [place,setPlace]=useState<Place|null>(null);
  const [message,setMessage]=useState('');
  const [showHours,setShowHours]=useState(false);

  useEffect(()=>{
    const controller = new AbortController();
    setStatus('loading');
    setPlace(null);
    setMessage('');
    setShowHours(false);
    fetch('/api/place-details',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      cache:'no-store',
      body:JSON.stringify({
        title:activity.title,location:activity.location,
        destination,country,lat:activity.lat,lng:activity.lng
      }),
      signal:controller.signal
    }).then(async res=>{
      const result=await res.json();
      if(!res.ok) throw new Error(result.error || 'Place data is unavailable.');
      if(!result.place){setStatus('unavailable');setMessage(result.message || 'No verified match found.');return;}
      setPlace(result.place as Place);setStatus('ready');
    }).catch((error:unknown)=>{
      if(controller.signal.aborted)return;
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Place information is unavailable.');
    });
    return ()=>controller.abort();
  },[activity.id,activity.title,activity.location,activity.lat,activity.lng,destination,country]);

  return <section className="google-place-card" aria-label={"Place details for "+activity.title}>
    <div className="google-place-top">
      <div><span className="google-place-kicker">PLACE INFORMATION</span><h4>{status==='ready'&&place ? place.name : activity.title}</h4></div>
      <span className="google-source" aria-label="Source: Google Maps">Google Maps</span>
    </div>
    {status==='loading' && <div className="google-place-status" role="status"><span className="spinner"/> Loading reviews and details…</div>}
    {(status==='error'||status==='unavailable') && <div className="google-place-status" role="status"><CircleAlert size={16}/><span>{message}</span></div>}
    {status==='ready' && place && <>
      <div className="google-place-rating">
        {place.rating!==null ? <>
          <span className="google-rating-number"><Star size={19} fill="currentColor"/> {place.rating.toFixed(1)} <small>/ 5</small></span>
          <span className="google-rating-count">{place.ratingCount!==null ? new Intl.NumberFormat('en-US').format(place.ratingCount)+' Google Maps ratings' : 'Google Maps rating'}</span>
        </> : <span className="google-rating-count">No Google Maps rating available for this place.</span>}
      </div>
      {place.type && <p className="google-place-type">{place.type}</p>}
      {place.address && <p className="google-place-detail"><MapPin size={15}/><span>{place.address}</span></p>}
      {place.isOpenNow!==null && <p className="google-place-detail"><Clock3 size={15}/><span>{place.isOpenNow?'Open now':'Closed now'} <small>(check local hours)</small></span></p>}
      {place.openingHours.length>0 && <>
        <button type="button" className="google-hours-toggle" onClick={()=>setShowHours(v=>!v)} aria-expanded={showHours}>{showHours?'Hide opening hours':'Show opening hours'}</button>
        {showHours && <ul className="google-hours-list">{place.openingHours.map(h=><li key={h}>{h}</li>)}</ul>}
      </>}
      {place.website && <p className="google-place-detail"><Globe2 size={15}/><a href={place.website} target="_blank" rel="noopener noreferrer">Official website ↗</a></p>}
      {place.attributions.map((a,i)=><p className="google-place-attribution" key={i}>{a.url?<a href={a.url} target="_blank" rel="noopener noreferrer">{a.label}</a>:a.label}</p>)}
    </>}
    <p className="google-place-source-note">Google Maps data is shown separately from the OpenStreetMap map. Ratings and hours may change. <a href="/privacy">Privacy</a> · <a href="/terms">Terms</a></p>
  </section>;
}
