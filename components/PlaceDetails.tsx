'use client';

import {useEffect,useState} from 'react';
import {AlertTriangle,BookOpen,CheckCircle2,Clock3,ExternalLink,Globe2,ImageIcon,MapPin,ShieldCheck} from 'lucide-react';
import type {Activity} from '@/lib/types';
import type {Verification} from '@/lib/place-verification';

export type PlaceCandidate={
 id:string;name:string;description:string|null;address:string|null;category:string|null;
 hours:string|null;website:string|null;osmId:string|null;osmUrl:string|null;
 wikipediaTitle:string|null;wikipediaUrl:string|null;lat:number|null;lng:number|null;
 source:'Wikipedia'|'OpenStreetMap';checkedAt:string;sourceUpdatedAt:string|null;
 verification:Verification;
};
export type PlaceSelection={
 name:string;source:'Wikipedia'|'OpenStreetMap';sourceId:string|null;sourceUrl:string;
 lat:number|null;lng:number|null;score:number;confirmedAt:string;
};
type PlaceResponse={places:PlaceCandidate[];unmatched:string[];message?:string;error?:string};
type CommonsPhoto={url:string;filePage:string;artist:string;license:string;licenseUrl:string|null;fileUpdatedAt:string|null};

function Photo({title}:{title:string}){
 const [photo,setPhoto]=useState<CommonsPhoto|null>(null);
 const [busy,setBusy]=useState(true);
 useEffect(()=>{
  const ctrl=new AbortController();setBusy(true);setPhoto(null);
  fetch('/api/place-photo?title='+encodeURIComponent(title),{signal:ctrl.signal})
   .then(r=>r.ok?r.json():null)
   .then(data=>{if(!ctrl.signal.aborted)setPhoto(data?.photo||null);})
   .catch(()=>{})
   .finally(()=>{if(!ctrl.signal.aborted)setBusy(false);});
  return ()=>ctrl.abort();
 },[title]);
 if(busy)return <p className="verified-photo-note"><ImageIcon size={13}/> Checking Commons photo license…</p>;
 if(!photo)return null;
 return <figure className="verified-photo">
  {/* Wikimedia Commons free-license thumbnail from a checked source file. */}
  {/* eslint-disable-next-line @next/next/no-img-element */}
  <img src={photo.url} alt={title} loading="lazy" referrerPolicy="no-referrer"/>
  <figcaption>
   Image: <a href={photo.filePage} target="_blank" rel="noopener noreferrer">{photo.artist}</a>
   {' · '}<a href={photo.licenseUrl||photo.filePage} target="_blank" rel="noopener noreferrer">{photo.license}</a>
   {photo.fileUpdatedAt&&' · File updated '+new Date(photo.fileUpdatedAt).toLocaleDateString()}
   {' · Wikimedia Commons'}
  </figcaption>
 </figure>;
}
export default function PlaceDetails({activity,destination,country,onConfirm}:{
 activity:Activity;destination:string;country:string;
 onConfirm?:(activityId:string,place:PlaceSelection)=>void;
}){
 const [status,setStatus]=useState<'loading'|'ready'|'error'>('loading');
 const [places,setPlaces]=useState<PlaceCandidate[]>([]);
 const [unmatched,setUnmatched]=useState<string[]>([]);
 const [message,setMessage]=useState('');
 const [approved,setApproved]=useState<string[]>([]);
 const [dismissed,setDismissed]=useState<string[]>([]);
 useEffect(()=>{
  const controller=new AbortController();setStatus('loading');setPlaces([]);setUnmatched([]);
  setMessage('');setApproved([]);setDismissed([]);
  fetch('/api/place-details',{method:'POST',headers:{'Content-Type':'application/json'},cache:'no-store',
   body:JSON.stringify({title:activity.title,location:activity.location,destination,country,lat:activity.lat,lng:activity.lng}),
   signal:controller.signal})
   .then(async res=>{const data=await res.json() as PlaceResponse;if(!res.ok)throw Error(data.error||'Source check failed.');
    setPlaces(data.places||[]);setUnmatched(data.unmatched||[]);setMessage(data.message||'');setStatus('ready');})
   .catch(e=>{if(!controller.signal.aborted){setStatus('error');setMessage(e instanceof Error?e.message:'Unable to check place.');}});
  return ()=>controller.abort();
 },[activity.id,activity.title,activity.location,activity.lat,activity.lng,destination,country]);
 function confirm(place:PlaceCandidate){
  setApproved(v=>[...v,place.id]);
  if(onConfirm){
   const sourceUrl=place.osmUrl||place.wikipediaUrl;
   if(sourceUrl)onConfirm(activity.id,{name:place.name,source:place.source,
    sourceId:place.osmId||null,sourceUrl,lat:place.lat,lng:place.lng,
    score:place.verification.score,confirmedAt:new Date().toISOString()});
  }
 }
 const seen=places.filter(p=>!dismissed.includes(p.id));
 return <section className="verified-panel" aria-label={'Verified place information for '+activity.title}>
  <header className="verified-panel-header"><ShieldCheck size={21}/><div><h4>Verified Place Intelligence</h4>
   <p>Names, locations, sources and explicit match confidence — not star ratings.</p></div></header>
  {activity.verifiedPlace&&<p className="verified-current"><CheckCircle2 size={15}/> You selected {activity.verifiedPlace.name}
   {' · '}Source: {activity.verifiedPlace.source}
   {activity.verifiedPlace.sourceId?' · OSM ID: '+activity.verifiedPlace.sourceId:''}
   {' · '}Confirmed {new Date(activity.verifiedPlace.confirmedAt).toLocaleDateString()}.</p>}
  {status==='loading'&&<p className="verified-status" role="status"><span className="spinner"/> Checking place identity and coordinates…</p>}
  {status==='error'&&<p className="verified-status" role="alert"><AlertTriangle size={16}/>{message}</p>}
  {status==='ready'&&!seen.length&&<p className="verified-status"><AlertTriangle size={16}/>{message||'No trustworthy match identified; edit the venue name or map pin.'}</p>}
  {status==='ready'&&seen.map(place=>{
    const high=place.verification.level==='high';
    const isApproved=approved.includes(place.id)||
     (activity.verifiedPlace?.sourceUrl&&(activity.verifiedPlace.sourceUrl===place.osmUrl||activity.verifiedPlace.sourceUrl===place.wikipediaUrl));
    const showDetails=high||isApproved;
    return <article key={place.id} className={'verified-candidate '+(!showDetails?'needs-confirm':'')} >
      <div className="verified-candidate-top"><div><h5>{place.name}</h5><small>{place.source}</small></div>
       <span className={high?'verified-strong':'verified-review'}>{high?'Strong match':'Needs confirmation'}</span>
      </div>
      <div className="verified-evidence">
       <span><b>Match score:</b> {place.verification.score}/100 <small>(heuristic)</small></span>
       <span><b>OSM ID:</b> {place.osmId||'Not available from this source'}</span>
       <span><b>Coordinates:</b> {place.lat!==null&&place.lng!==null?place.lat.toFixed(5)+', '+place.lng.toFixed(5):'Not available'}</span>
       <span><b>Distance from planned pin:</b> {place.verification.distanceKm===null?'Unverified':place.verification.distanceKm.toFixed(2)+' km'}</span>
       <span><b>Checked:</b> {new Date(place.checkedAt).toLocaleString()}</span>
       <span><b>Source last modified:</b> {place.sourceUpdatedAt?new Date(place.sourceUpdatedAt).toLocaleDateString():'Not supplied by API'}</span>
      </div>
      {place.verification.reasons.length>0&&<div className="verified-warnings">
       {place.verification.reasons.map(r=><p key={r}><AlertTriangle size={13}/>{r}</p>)}
      </div>}
      {!showDetails&&<div className="verified-confirm-actions"><p>We cannot establish that this is your intended stop. Details and photos stay hidden until you confirm this candidate.</p>
       <button type="button" className="verified-confirm-btn" onClick={()=>confirm(place)}>Confirm this place</button>
       <button type="button" className="verified-reject-btn" onClick={()=>setDismissed(v=>[...v,place.id])}>Not this place</button>
      </div>}
      {showDetails&&<>
       {high&&!isApproved&&onConfirm&&<button type="button" className="verified-confirm-btn verified-save-btn" onClick={()=>confirm(place)}>Use this matched place in itinerary</button>}
       {place.description&&<p className="verified-description">{place.description}</p>}
       {place.category&&<p className="verified-attr">Type: {place.category}</p>}
       {place.address&&<p className="verified-attr"><MapPin size={14}/>{place.address}</p>}
       {place.hours&&<p className="verified-attr"><Clock3 size={14}/>Listed hours: {place.hours} (verify before visiting)</p>}
       {place.website&&<p className="verified-attr"><Globe2 size={14}/><a href={place.website} target="_blank" rel="noopener noreferrer">Website</a></p>}
       {place.wikipediaTitle&&<Photo title={place.wikipediaTitle}/>}
      </>}
      <div className="verified-source-links">
       {place.wikipediaUrl&&<a href={place.wikipediaUrl} target="_blank" rel="noopener noreferrer"><BookOpen size={14}/> Wikipedia source <ExternalLink size={12}/></a>}
       {place.osmUrl&&<a href={place.osmUrl} target="_blank" rel="noopener noreferrer"><MapPin size={14}/> OSM source <ExternalLink size={12}/></a>}
      </div>
    </article>;
  })}
  {unmatched.length>0&&<p className="verified-status">No confident candidate for: {unmatched.join('; ')}</p>}
  <p className="place-source-note">Match scores measure agreement with your itinerary, not the true quality of a venue. User confirmation records your choice; it is not an independent fact-check. © OpenStreetMap contributors (ODbL). Wikipedia and Wikimedia Commons content retains original source and license attribution. <a href="/privacy">Privacy</a>.</p>
 </section>;
}
