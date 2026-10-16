'use client';

import { useEffect, useState } from 'react';
import { BookOpen, CircleAlert, Clock3, ExternalLink, Globe2, Info, MapPin } from 'lucide-react';
import type { Activity } from '@/lib/types';

type Place = {
  name:string;
  address:string|null;
  category:string|null;
  description:string|null;
  hours:string|null;
  website:string|null;
  osmUrl:string|null;
  wikipediaUrl:string|null;
  sources:string[];
};

export default function PlaceDetails({activity,destination,country}: {activity:Activity;destination:string;country:string}) {
  const [status,setStatus]=useState<'loading'|'ready'|'unavailable'|'error'>('loading');
  const [place,setPlace]=useState<Place|null>(null);
  const [message,setMessage]=useState('');

  useEffect(()=>{
    const controller=new AbortController();
    setStatus('loading');
    setPlace(null);
    setMessage('');
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
      const data=await res.json();
      if(!res.ok)throw new Error(data.error||'Place information is unavailable.');
      if(!data.place){setStatus('unavailable');setMessage(data.message||'No reliable source match found.');return;}
      setPlace(data.place as Place);setStatus('ready');
    }).catch((error:unknown)=>{
      if(controller.signal.aborted)return;
      setStatus('error');
      setMessage(error instanceof Error?error.message:'Unable to load place details.');
    });
    return ()=>controller.abort();
  },[activity.id,activity.title,activity.location,activity.lat,activity.lng,destination,country]);

  return <section className="place-card" aria-label={'Information for '+activity.title}>
    <div className="place-top">
      <div><span className="place-kicker">OPEN-SOURCE PLACE DETAILS</span><h4>{status==='ready'&&place?place.name:activity.title}</h4></div>
      <span className="place-source" title="No payment API required">OSM + Wikipedia</span>
    </div>
    {status==='loading' && <div className="place-status" role="status"><span className="spinner"/> Looking up available sources…</div>}
    {(status==='error'||status==='unavailable')&&<div className="place-status" role="status"><CircleAlert size={16}/><span>{message}</span></div>}
    {status==='ready'&&place&&<>
      <div className="place-verified"><Info size={15}/><span>Information found from {place.sources.join(' & ')}. No rating is generated or estimated.</span></div>
      {place.description && <p className="place-summary">{place.description}</p>}
      {place.category && <p className="place-type">{place.category}</p>}
      {place.address && <p className="place-detail"><MapPin size={15}/><span>{place.address}</span></p>}
      {place.hours && <p className="place-detail"><Clock3 size={15}/><span>Listed hours: {place.hours} <small>(verify before visiting)</small></span></p>}
      {place.website && <p className="place-detail"><Globe2 size={15}/><a href={place.website} target="_blank" rel="noopener noreferrer">Official website <ExternalLink size={12}/></a></p>}
      <div className="place-source-links">
        {place.wikipediaUrl && <a href={place.wikipediaUrl} target="_blank" rel="noopener noreferrer"><BookOpen size={14}/> Wikipedia article <ExternalLink size={12}/></a>}
        {place.osmUrl && <a href={place.osmUrl} target="_blank" rel="noopener noreferrer"><MapPin size={14}/> OpenStreetMap record <ExternalLink size={12}/></a>}
      </div>
    </>}
    <p className="place-source-note">No Google ratings or fabricated scores. © OpenStreetMap contributors (<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">ODbL</a>); Wikipedia text by contributors (<a href="https://en.wikipedia.org/wiki/Wikipedia:Copyrights" target="_blank" rel="noopener noreferrer">CC BY-SA</a>). <a href="/privacy">Privacy</a> · <a href="/terms">Terms</a>.</p>
  </section>;
}
