'use client';

import {useMemo,useState,useEffect} from 'react';
import {AlertTriangle,ArrowRight,Check,ChevronDown,ChevronUp,Clock3,Compass,MapPin,RotateCcw,Route,Search,ShieldCheck,Sparkles,Utensils,Wallet} from 'lucide-react';
import type {Trip} from '@/lib/types';
import {money,tripTotal} from '@/lib/types';
import {analyzeDay,optimizeDay,reorderByIds} from '@/lib/itinerary-intelligence';
import {hasCoordinates,readableDistance} from '@/lib/routing';
import type {FoodVenue} from '@/components/FoodRecommendations';

type FoodFilter='local'|'street'|'drinks'|'all';
type FoodResponse={places?:FoodVenue[];message?:string;error?:string;coverageCity?:string;updatedAt?:string};

function MealsForYou({trip,dayIndex,onPickVenue}:{
 trip:Trip;dayIndex:number;onPickVenue:(activityId:string,venue:FoodVenue)=>void;
}){
 const day=trip.days[dayIndex];
 const foodStop=day.activities.find(a=>a.category==='food');
 const anchor=(foodStop&&hasCoordinates(foodStop)?foodStop:day.activities.find(hasCoordinates));
 const [filter,setFilter]=useState<FoodFilter>(()=>trip.interests.some(i=>i.toLowerCase()==='food')?'local':'all');
 const [status,setStatus]=useState<'idle'|'loading'|'ready'|'error'>('idle');
 const [items,setItems]=useState<FoodVenue[]>([]);
 const [message,setMessage]=useState('');
 const [coverage,setCoverage]=useState('');
 useEffect(()=>{setStatus('idle');setItems([]);setMessage('');},[trip.id,dayIndex,filter]);
 async function load(){
  if(!anchor){setMessage('No mapped activity on this day to search around.');setStatus('error');return;}
  const controller=new AbortController();
  setStatus('loading');setMessage('');
  try{
   const response=await fetch('/api/food-nearby',{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({lat:anchor.lat,lng:anchor.lng,activityTitle:foodStop?.title||'Local food',filter}),
    signal:controller.signal,cache:'no-store'});
   const data=await response.json() as FoodResponse;
   if(!response.ok)throw Error(data.error||'Could not load nearby venues.');
   setItems((data.places||[]).slice(0,6));
   setMessage(data.message||'');
   setCoverage(data.coverageCity||'');
   setStatus('ready');
  }catch(e){
   if(controller.signal.aborted)return;
   setStatus('error');setItems([]);
   setMessage(e instanceof Error?e.message:'Could not load verified venue records.');
  }
 }
 return <div className="smart-personal">
   <div className="smart-personal-head"><Utensils size={18}/><div><strong>Nearby picks for your tastes</strong>
    <p>{trip.interests.length?'Your preferences: '+trip.interests.join(', '):'Suggestions based on the current itinerary and local OSM records'}</p></div></div>
   <p className="smart-small">Discover source-backed restaurants and cafes near {anchor?.title||'a mapped stop'}. Preference indicators use mapped cuisine and category tags, not customer ratings or confirmed dietary suitability.</p>
   <div className="smart-taste-controls">
    {([
     {id:'local',label:'Local cuisine'},
     {id:'street',label:'Street food'},
     {id:'drinks',label:'Coffee & tea'},
     {id:'all',label:'All food spots'}
    ] as {id:FoodFilter;label:string}[]).map(f=>
     <button type="button" key={f.id} className={filter===f.id?'active':''} aria-pressed={filter===f.id}
      onClick={()=>setFilter(f.id)}>{f.label}</button>)}
    <button type="button" className="smart-taste-search" disabled={!anchor||status==='loading'} onClick={()=>void load()}><Search size={14}/> {status==='loading'?'Finding…':'Find nearby'}</button>
   </div>
   {status==='error'&&<p className="smart-message" role="alert">{message}</p>}
   {status==='ready'&&<p className="smart-small" role="status">{coverage?'Source coverage: '+coverage+'. ':''}{items.length} OSM records shown. {message}</p>}
   {status==='ready'&&items.length>0&&<div className="smart-venue-grid">
    {items.map(venue=><article key={venue.id} className="smart-venue">
     <div><strong>{venue.name}</strong><small>{venue.category}{venue.cuisine?' · '+venue.cuisine:''}</small>
      <small>{readableDistance(venue.distanceMeters)} straight line · OSM {venue.id}</small></div>
     <div className="smart-venue-actions">
      {foodStop&&<button type="button" onClick={()=>onPickVenue(foodStop.id,venue)}><Check size={13}/> Use for {foodStop.title.length>20?'meal':foodStop.title}</button>}
      <a href={venue.osmUrl} target="_blank" rel="noopener noreferrer">OSM source ↗</a>
     </div>
    </article>)}
   </div>}
   {!foodStop&&status==='ready'&&items.length>0&&<p className="smart-small">Add a Food & drink activity to this day to replace its venue directly, or open the OSM source above.</p>}
   <p className="smart-small">No live opening-hour checks, booking availability, dietary verification or actual menu prices are available.</p>
 </div>;
}

export default function SmartTripAssistant({trip,dayIndex,onReorder,onPickVenue}:{
 trip:Trip;dayIndex:number;onReorder:(order:string[])=>void;
 onPickVenue:(activityId:string,venue:FoodVenue)=>void;
}){
 const day=trip.days[dayIndex];
 const [open,setOpen]=useState(false);
 const [tab,setTab]=useState<'route'|'taste'>('route');
 const [allowMealMoves,setAllowMealMoves]=useState(false);
 const [preview,setPreview]=useState(false);
 const [undo,setUndo]=useState<{before:string[];after:string[]}|null>(null);
 const insight=useMemo(()=>analyzeDay(trip,dayIndex),[trip,dayIndex]);
 const proposal=useMemo(()=>optimizeDay(day.activities,allowMealMoves),[day.activities,allowMealMoves]);
 const orderedIds=day.activities.map(a=>a.id);
 const canUndo=!!undo&&undo.after.join('|')===orderedIds.join('|');
 const projected=useMemo(()=>{
  if(!proposal.available)return null;
  const activities=reorderByIds(day.activities,proposal.orderedIds);
  if(!activities)return null;
  const simulation={...trip,days:trip.days.map((d,i)=>i===dayIndex?{...d,activities}:d)};
  return analyzeDay(simulation,dayIndex);
 },[proposal,day.activities,dayIndex,trip]);
 const booked=tripTotal(trip),balance=trip.budget-booked;
 const issueCount=insight.warnings.filter(w=>w.level==='warning').length;
 useEffect(()=>{setPreview(false);setUndo(null);setAllowMealMoves(false);},[trip.id,dayIndex]);
 const apply=()=>{
  if(!proposal.available)return;
  const before=[...orderedIds];
  onReorder(proposal.orderedIds);
  setUndo({before,after:[...proposal.orderedIds]});
  setPreview(false);
 };
 const restore=()=>{
  if(!undo||!canUndo)return;
  onReorder(undo.before);
  setUndo(null);
 };
 return <section className="smart-planner" aria-label="Smart itinerary assistant">
  <div className="smart-planner-head">
   <div className="smart-head-icon"><Sparkles size={19}/></div>
   <div className="smart-head-copy"><span>PHASE 2 · INTELLIGENT PLANNING</span><h3>Smart Trip Assistant</h3>
    <p>Route optimization, schedule checks and personalized nearby ideas</p></div>
   <button type="button" className="smart-collapse" onClick={()=>setOpen(o=>!o)} aria-expanded={open}>
    {open?'Hide insights':'Analyze my day'} {open?<ChevronUp size={15}/>:<ChevronDown size={15}/>}
   </button>
  </div>
  <div className="smart-stats">
   <div><Route size={14}/><strong>{readableDistance(insight.directMeters)}</strong><span>straight-line route*</span></div>
   <div><Clock3 size={14}/><strong>{insight.totalActivityMinutes} min</strong><span>scheduled activities</span></div>
   <div><AlertTriangle size={14}/><strong>{issueCount}</strong><span>timing / pace alerts</span></div>
   <div><Wallet size={14}/><strong className={balance<0?'smart-negative':''}>{balance>=0?money(balance,trip.currency):'-'+money(Math.abs(balance),trip.currency)}</strong><span>unallocated estimate</span></div>
  </div>
  {open&&<div className="smart-content">
   <div className="smart-tabbar" role="tablist" aria-label="Smart assistant modes">
    <button type="button" role="tab" aria-selected={tab==='route'} className={tab==='route'?'active':''} onClick={()=>setTab('route')}><Route size={15}/> Route & schedule</button>
    <button type="button" role="tab" aria-selected={tab==='taste'} className={tab==='taste'?'active':''} onClick={()=>setTab('taste')}><Utensils size={15}/> Nearby picks</button>
   </div>
   {tab==='route'?<>
    <div className="smart-insight-row">
     <div><strong>Current day</strong><p>{insight.activityCount} stops · {insight.mappedCount} mapped · {insight.segmentsMeasured} measurable legs</p></div>
     <div><strong>Interest coverage</strong><p>{insight.interestMatches} / {insight.activityCount} activities match at least one of your selected interest categories</p></div>
    </div>
    {insight.warnings.length>0?<div className="smart-warnings">{insight.warnings.slice(0,7).map(w=>
     <div key={w.id} className={'smart-warning '+w.level}><AlertTriangle size={14}/><div><strong>{w.title}</strong><p>{w.detail}</p></div></div>)}</div>
     : <div className="smart-clear"><ShieldCheck size={15}/> No obvious schedule overlaps or missing map pins found in this day.</div>}
    <div className="smart-optimizer">
     <div><strong>Optimized visit order</strong><p>Compare shorter straight-line routes. Leave meals, stays and transport at their current time slots by default.</p></div>
     <label className="smart-opt-toggle"><input type="checkbox" checked={allowMealMoves} onChange={e=>{setAllowMealMoves(e.target.checked);setPreview(false);}}/> Also allow moving food stops and their clock slots</label>
     {!proposal.available?<p className="smart-small">{proposal.reason}</p>:<>
      <div className="smart-saving"><Compass size={16}/><span>Potentially <b>{readableDistance(proposal.savedMeters)}</b> shorter ({proposal.percentSaved}%) in straight-line connections.</span></div>
      <button className="smart-outline" type="button" onClick={()=>setPreview(p=>!p)}>{preview?'Hide proposal':'Preview new order'} <ArrowRight size={14}/></button>
      {preview&&<div className="smart-preview">
       <p><b>Before</b> · {day.activities.map(a=>a.title).join(' → ')}</p>
       <p><b>Proposed</b> · {proposal.orderedIds.map(id=>day.activities.find(a=>a.id===id)?.title).join(' → ')}</p>
       <p><b>Timing after proposal:</b> {projected?.warnings.filter(w=>w.level==='warning').length??0} possible timing/pace alert(s), compared with {issueCount} now.</p>
       <p className="smart-small">Applying moves the selected activity into the existing time slot; activity durations, costs and verified source IDs stay attached to the activity. Recheck tickets and opening hours.</p>
       <button type="button" className="smart-apply" onClick={apply}><Check size={14}/> Apply suggested order</button>
      </div>}
     </>}
     {canUndo&&<button type="button" className="smart-outline" onClick={restore}><RotateCcw size={14}/> Undo last smart reorder</button>}
     <p className="smart-small">*Travel distances are straight lines, not actual roads or walking routes. We cannot confirm opening hours, tickets, traffic or travel times. Budget figures are existing itinerary estimates plus recorded expenses, not live prices.</p>
    </div>
   </>:<MealsForYou trip={trip} dayIndex={dayIndex} onPickVenue={onPickVenue}/>}
  </div>}
 </section>;
}
