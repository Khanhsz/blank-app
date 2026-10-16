'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Bookmark, CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, CircleAlert, Clock3, Compass, Download, ExternalLink, Heart, Landmark, LayoutDashboard, Leaf, MapPin, Menu, MoreHorizontal, Navigation, Pencil, Plus, Search, Settings2, Sparkles, Info, Trash2, Users, UtensilsCrossed, Wallet, WandSparkles, X, TrainFront, BedDouble, Sunrise, Globe2 } from 'lucide-react';
import RouteExplorer from '@/components/RouteExplorer';
import PlaceDetails from '@/components/PlaceDetails';
import LocationPicker from '@/components/LocationPicker';
import { createDemoTrip, demoCities, daysBetween, sampleInput } from '@/lib/demo';
import { Activity, CATEGORIES, CATEGORY_LABEL, Category, Currency, dateLabel, dateLong, money, Pace, Trip, TripInput, tripTotal, uuid } from '@/lib/types';

type View = 'overview' | 'itinerary' | 'budget' | 'saved' | 'discover';
const INTERESTS = ['Culture','Food','Nature','Adventure','Art','Shopping','Photography','History','Relaxation'];
const imageKyoto = 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1200&q=85';
const styleIcon: Record<Category, typeof Landmark> = { sightseeing: MapPin, food: UtensilsCrossed, culture: Landmark, nature: Leaf, transport: TrainFront, stay: BedDouble, other: Sparkles };
const categoryClass: Record<Category, string> = {sightseeing:'orange',food:'rose',culture:'purple',nature:'green',transport:'blue',stay:'yellow',other:'slate'};
const sidebarItems: {key: View; label: string; Icon: typeof Compass}[] = [
 {key:'overview',label:'Overview',Icon:LayoutDashboard}, {key:'itinerary',label:'My itinerary',Icon:CalendarDays},
 {key:'budget',label:'Trip budget',Icon:Wallet},
 {key:'saved',label:'Saved trips',Icon:Bookmark}, {key:'discover',label:'Discover',Icon:Compass}
];
const asNumber = (value: string) => {const n = Number(value);return Number.isFinite(n)?n:0;};

function Mark() { return <div className="brand-mark"><Compass size={22} strokeWidth={2.4}/></div>; }
function Logo() {return <div className="brand"><Mark/><span>tripmate<span className="brand-dot">.</span></span></div>}
function CategoryIcon({category}: {category:Category}) { const Icon = styleIcon[category]; return <div className={`category-icon ${categoryClass[category]}`}><Icon size={19}/></div>; }
function WelcomeBanner({onCreate}:{onCreate:()=>void}) {
 return <div className="welcome-banner"><div className="welcome-content"><div className="eyebrow"><Sparkles size={13}/> YOUR NEXT ADVENTURE STARTS HERE</div><h1>Go somewhere<br/><em>extraordinary.</em></h1><p>Dream it, plan it, live it. Let your AI travel companion turn ideas into your next unforgettable journey.</p><button className="btn btn-white" onClick={onCreate}>Plan a new trip <ArrowRight size={17}/></button></div><div className="banner-orbit orbit-one"/><div className="banner-orbit orbit-two"/><div className="banner-sun"><Sunrise size={40}/></div><div className="banner-ellipse"/></div>
}
function EmptyTrips({onCreate}:{onCreate:()=>void}) {return <div className="empty-state"><div className="empty-icon"><Compass size={31}/></div><h3>No trips yet</h3><p>Start planning something wonderful. Your trips will appear right here.</p><button className="btn btn-primary" onClick={onCreate}><Plus size={17}/> Create your first trip</button></div>}
function Overview({trips,trip,onCreate,onChoose,onView}:{trips:Trip[];trip?:Trip;onCreate:()=>void;onChoose:(id:string)=>void;onView:(v:View)=>void}) {
 return <div className="screen-fade">
  <div className="section-top"><div><p className="kicker">YOUR TRAVEL SPACE</p><h2>Good to see you, explorer <span className="wave">✳</span></h2><p className="subheading">The world is waiting. Where will you wander next?</p></div><span className="current-date">✦ Made for curious travelers</span></div>
  <WelcomeBanner onCreate={onCreate}/>
  <div className="section-heading"><div><h3>Your adventures <span className="count-badge">{trips.length}</span></h3><p>Everything you're dreaming and planning</p></div><button className="text-button" onClick={()=>onView('saved')}>View all trips <ArrowRight size={16}/></button></div>
  {!trips.length ? <EmptyTrips onCreate={onCreate}/> : <div className="trips-grid">
   {trips.slice(0,3).map(t=><button className="trip-card" key={t.id} onClick={()=>{onChoose(t.id);onView('itinerary')}}><div className={`trip-card-media ${t.destination.toLowerCase()==='kyoto'?'photo-kyoto':'abstract-destination'}`} style={t.destination.toLowerCase()==='kyoto'?{backgroundImage:`linear-gradient(180deg,transparent 36%,rgba(0,0,0,.48)),url('${imageKyoto}')`}:undefined}><div className="trip-media-pill">{t.mode==='demo'?'DEMO PLAN':'AI PLAN'}</div><div className="trip-image-label">{t.destination}</div></div><div className="trip-card-body"><div className="trip-card-title"><strong>{t.destination}, {t.country}</strong><ArrowRight size={17}/></div><p><CalendarDays size={14}/> {dateLabel(t.startDate)} – {dateLabel(t.endDate)} <span>·</span> {t.days.length} days</p><div className="trip-card-bottom"><span><Users size={14}/> {t.travelers} traveler{t.travelers===1?'':'s'}</span><strong>{money(t.budget,t.currency)} budget</strong></div></div></button>)}
   <button className="trip-card new-card" onClick={onCreate}><div className="new-card-content"><span className="new-trip-icon"><Plus size={27}/></span><strong>Another adventure?</strong><small>Create your next journey with AI</small><span className="new-card-link">Plan new trip <ArrowRight size={15}/></span></div></button>
  </div>}
  <div className="section-heading popular-head"><div><h3>A little inspiration</h3><p>Great places to start your next story</p></div><button className="text-button" onClick={()=>onView('discover')}>Explore destinations <ArrowRight size={16}/></button></div>
  <DestinationCards onCreate={onCreate}/>
 </div>;
}
function DestinationCards({onCreate}:{onCreate:()=>void}) {return <div className="destination-grid">{demoCities.map(c=><button onClick={onCreate} key={c.name} className={`destination-card dest-${c.tint}`}><span className="destination-symbol">{c.symbol}</span><div><small>{c.country}</small><strong>{c.name}</strong><span>{c.caption}</span></div><span className="destination-arrow"><ArrowRight size={17}/></span></button>)}</div>}

function CreateTrip({onClose,onCreated}:{onClose:()=>void;onCreated:(trip:Trip)=>void}) {
 const [form,setForm] = useState<TripInput>({...sampleInput,country:'',destination:'',interests:[...sampleInput.interests]});
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const patch=<K extends keyof TripInput>(key:K,value:TripInput[K])=>setForm(prev=>({...prev,[key]:value}));
 const duration=daysBetween(form.startDate,form.endDate);
 function validate() {if(!form.country.trim()) return 'Choose a country from the suggestions first.';if(form.destination.trim().length<2) return 'Enter a destination with at least 2 characters.';if(!form.startDate||!form.endDate||form.endDate<form.startDate) return 'Check your travel dates.';if(duration>14) return 'The MVP supports journeys up to 14 days.';if(form.budget<=0||!Number.isFinite(form.budget)) return 'Enter a positive trip budget.';return '';}
 async function generate(ai:boolean) {
   const problem=validate(); if(problem){setError(problem);return;}setError('');
   if (!ai){onCreated(createDemoTrip(form));return;}
   setBusy(true);
   try {const res=await fetch('/api/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(form)});
     const data=await res.json(); if(!res.ok||!data.trip) throw new Error(data.error || 'Could not generate this itinerary.');
     onCreated(data.trip as Trip);
   } catch (e) {setError(e instanceof Error?e.message:'Something went wrong.');}
   finally {setBusy(false);}
 }
 return <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget&&!busy)onClose()}}><div className="create-modal" role="dialog" aria-modal="true" aria-label="Create a trip"><div className="modal-header"><div><div className="modal-overline"><Sparkles size={14}/> YOUR PERSONAL TRAVEL DESIGNER</div><h2>Where to next?</h2><p>Tell us what you love. We’ll take care of the first draft.</p></div><button aria-label="Close" className="icon-button" onClick={onClose} disabled={busy}><X size={20}/></button></div>
 <div className="modal-content"><LocationPicker country={form.country} destination={form.destination} onCountrySelect={name=>setForm(prev=>({...prev,country:name,destination:''}))} onDestinationChange={name=>patch('destination',name)}/>
  <div className="form-grid-2"><label className="field-label">Start date <span>*</span><input type="date" value={form.startDate} onChange={e=>patch('startDate',e.target.value)}/></label><label className="field-label">End date <span>*</span><input type="date" min={form.startDate} value={form.endDate} onChange={e=>patch('endDate',e.target.value)}/></label></div>
  <div className="form-grid-2"><label className="field-label">Total trip budget <span>*</span><div className="split-input"><select value={form.currency} onChange={e=>patch('currency',e.target.value as Currency)}><option>USD</option><option>VND</option><option>EUR</option><option>JPY</option></select><input type="number" min="1" max="1000000000" value={form.budget} onChange={e=>patch('budget',asNumber(e.target.value))}/></div></label><label className="field-label">Travelers <span>*</span><div className="stepper"><button onClick={()=>patch('travelers',Math.max(1,form.travelers-1))}>−</button><strong>{form.travelers}</strong><button onClick={()=>patch('travelers',Math.min(20,form.travelers+1))}>+</button></div></label></div>
  <div className="field-label">Your travel pace<div className="choice-row">{(['relaxed','balanced','packed'] as Pace[]).map(p=><button key={p} className={`choice ${form.pace===p?'active':''}`} onClick={()=>patch('pace',p)}>{p==='relaxed'?'🌿':p==='balanced'?'☀️':'⚡'} {p[0].toUpperCase()+p.slice(1)}</button>)}</div></div>
  <div className="field-label">What are you into? <small>(choose any)</small><div className="interest-list">{INTERESTS.map(v=><button className={`interest-chip ${form.interests.includes(v)?'selected':''}`} key={v} onClick={()=>patch('interests',form.interests.includes(v)?form.interests.filter(x=>x!==v):[...form.interests,v].slice(0,8))}>{form.interests.includes(v)&&<Check size={12}/>} {v}</button>)}</div></div>
  <label className="field-label">Anything else? <small>(optional)</small><textarea rows={2} value={form.notes} maxLength={500} placeholder="Accessibility needs, dietary preferences, must-see spots…" onChange={e=>patch('notes',e.target.value)}/></label>
  {error && <div className="form-error"><CircleAlert size={16}/>{error}</div>}
  <p className="generation-note"><CircleAlert size={15}/> AI suggestions and prices are estimates. Verify details before booking.</p>
 </div><div className="modal-footer"><button className="btn btn-outline" onClick={()=>generate(false)} disabled={busy}>Try demo instead</button><button className="btn btn-primary" onClick={()=>generate(true)} disabled={busy}>{busy?<><span className="spinner"/> Building your trip…</>:<><Sparkles size={17}/> Generate with AI <ArrowRight size={16}/></>}</button></div></div></div>
}

function ActivityForm({activity,currency,onClose,onSave}:{activity?:Activity;currency:Currency;onClose:()=>void;onSave:(v:Activity)=>void}) {
 const [value,setValue]=useState<Activity>(activity || {id:uuid(),title:'',location:'',description:'',time:'10:00',category:'sightseeing',durationMinutes:90,cost:0});
 const [problem,setProblem]=useState('');
 const edit=<K extends keyof Activity>(key:K,v:Activity[K])=>setValue(prev=>({...prev,[key]:v}));
 return <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><div className="activity-modal" role="dialog" aria-modal="true" aria-label="Edit an activity"><div className="modal-header"><div><p className="modal-overline">MAKE IT YOURS</p><h2>{activity?'Edit activity':'Add an activity'}</h2></div><button className="icon-button" aria-label="Close" onClick={onClose}><X size={20}/></button></div><div className="modal-content">
 <label className="field-label">Activity name <span>*</span><input value={value.title} maxLength={100} onChange={e=>edit('title',e.target.value)} placeholder="e.g. Visit the art museum"/></label>
 <label className="field-label">Location <span>*</span><input value={value.location} maxLength={140} onChange={e=>edit('location',e.target.value)} placeholder="Venue or neighborhood"/></label>
 <div className="form-grid-2"><label className="field-label">Time<input type="time" value={value.time} onChange={e=>edit('time',e.target.value)}/></label><label className="field-label">Category<select value={value.category} onChange={e=>edit('category',e.target.value as Category)}>{CATEGORIES.map(c=><option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}</select></label></div>
 <div className="form-grid-2"><label className="field-label">Estimated cost ({currency})<input type="number" min="0" value={value.cost} onChange={e=>edit('cost',Math.max(0,asNumber(e.target.value)))}/></label><label className="field-label">Duration (minutes)<input type="number" min="15" value={value.durationMinutes} onChange={e=>edit('durationMinutes',Math.max(15,asNumber(e.target.value)))}/></label></div>
 <label className="field-label">Description<textarea rows={3} maxLength={350} value={value.description} onChange={e=>edit('description',e.target.value)}/></label>
 <p className="generation-note"><MapPin size={14}/> Editing the place or name clears any old map pin to avoid incorrect locations.</p>
 {problem&&<div className="form-error">{problem}</div>}
 </div><div className="modal-footer"><button className="btn btn-outline" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={()=>{if(!value.title.trim()||!value.location.trim()){setProblem('Activity and location are required.');return;}onSave({...value,title:value.title.trim(),location:value.location.trim(),...(activity && activity.title === value.title && activity.location === value.location ? {} : {lat:undefined,lng:undefined})});}}><Check size={16}/> Save activity</button></div></div></div>;
}

function DayNav({trip,dayIndex,setDayIndex}:{trip:Trip;dayIndex:number;setDayIndex:(n:number)=>void}) {
 return <div className="day-selector"><div className="day-selector-scroll">{trip.days.map((day,i)=><button key={day.date} className={`day-button ${dayIndex===i?'active':''}`} onClick={()=>setDayIndex(i)}><strong>Day {i+1}</strong><small>{dateLabel(day.date)}</small></button>)}</div><div className="day-arrows"><button aria-label="Previous day" disabled={dayIndex===0} onClick={()=>setDayIndex(dayIndex-1)}><ChevronLeft size={17}/></button><button aria-label="Next day" disabled={dayIndex===trip.days.length-1} onClick={()=>setDayIndex(dayIndex+1)}><ChevronRight size={17}/></button></div></div>;
}
function Itinerary({trip,dayIndex,setDayIndex,onActivity,onRemove,onMove,onExport}:{trip:Trip;dayIndex:number;setDayIndex:(n:number)=>void;onActivity:(activity?:Activity)=>void;onRemove:(id:string)=>void;onMove:(id:string,dir:number)=>void;onExport:()=>void}) {
 const [detailTab,setDetailTab]=useState<'schedule'|'map'>('schedule');
 const [openPlaceId,setOpenPlaceId]=useState<string|null>(null);
 useEffect(()=>{setDetailTab('schedule');setOpenPlaceId(null);},[trip.id]);
 const day=trip.days[dayIndex];
 const dayCost=day.activities.reduce((s,a)=>s+a.cost,0);
 return <div className="screen-fade"><div className="section-top"><div><p className="kicker">YOUR PERSONALIZED ITINERARY</p><h2>{trip.destination} <span className="title-spark">✳</span></h2><p className="subheading"><CalendarDays size={15}/> {dateLabel(trip.startDate)} – {dateLabel(trip.endDate)} <span>·</span> {trip.days.length} days <span>·</span> {trip.travelers} travelers</p></div><button className="btn btn-outline top-action" onClick={onExport}><Download size={16}/> Export JSON</button></div>
 <div className="trip-intro"><div><span className="small-pill"><Sparkles size={13}/> {trip.mode==='ai'?'AI GENERATED':'DEMO PLAN'}</span><h3>Every great trip starts<br/>with a little wonder.</h3><p>{trip.summary}</p><div className="trip-intro-meta"><span><CalendarDays size={15}/>{trip.days.length} days</span><span><Users size={15}/>{trip.travelers} people</span><span><Wallet size={15}/>{money(trip.budget,trip.currency)} total budget</span></div></div><div className="trip-intro-visual"><span>✈</span></div></div>
 <div className="section-heading itinerary-heading"><div><h3>Your day-by-day adventure</h3><p>Activities, map and transport in one place</p></div></div>
 <div className="itinerary-view-tabs" role="tablist" aria-label="Itinerary views">
  <button type="button" role="tab" aria-selected={detailTab==='schedule'} className={detailTab==='schedule'?'active':''} onClick={()=>setDetailTab('schedule')}><CalendarDays size={17}/> Daily itinerary</button>
  <button type="button" role="tab" aria-selected={detailTab==='map'} className={detailTab==='map'?'active':''} onClick={()=>setDetailTab('map')}><MapPin size={17}/> Map & transport</button>
 </div>
 <DayNav trip={trip} dayIndex={dayIndex} setDayIndex={setDayIndex}/>
 <div className="day-title-row"><div><p className="kicker">{dateLong(day.date).toUpperCase()}</p><h3>{day.theme}</h3></div><div className="day-cost"><span>Day estimate</span><strong>{money(dayCost,trip.currency)}</strong></div></div>
 {detailTab==='map'?<RouteExplorer trip={trip} dayIndex={dayIndex} setDayIndex={setDayIndex} embedded/>:<>
 <div className="activities-list">{day.activities.map((a,i)=><div key={a.id} className="activity-row"><div className="timeline-time"><strong>{a.time}</strong><div className="timeline-stem"><span/></div></div><CategoryIcon category={a.category}/><div className="activity-details"><div className="activity-head"><div><p className="activity-type">{CATEGORY_LABEL[a.category]}</p><h4>{a.title}</h4></div><span className="activity-price">{money(a.cost,trip.currency)}</span></div><p className="activity-description">{a.description}</p><div className="activity-meta"><span><MapPin size={13}/>{a.location}</span><span><Clock3 size={13}/>{a.durationMinutes} min</span></div><div className="activity-actions"><button onClick={()=>onActivity(a)}><Pencil size={13}/> Edit</button><button onClick={()=>onMove(a.id,-1)} disabled={i===0}><ArrowUp size={13}/> Earlier</button><button onClick={()=>onMove(a.id,1)} disabled={i===day.activities.length-1}><ArrowDown size={13}/> Later</button><button className="action-danger" onClick={()=>onRemove(a.id)}><Trash2 size={13}/> Remove</button><button type="button" className="place-details-action" aria-expanded={openPlaceId===a.id} onClick={()=>setOpenPlaceId(openPlaceId===a.id?null:a.id)}><Info size={13}/> Place details & sources</button></div>{openPlaceId===a.id && <PlaceDetails key={a.id} activity={a} destination={trip.destination} country={trip.country}/>}</div></div>)}
 <button className="add-activity" onClick={()=>onActivity()}><span><Plus size={20}/></span><div><strong>Add another activity</strong><small>Make this day uniquely yours</small></div><ArrowRight size={19}/></button></div>
 {trip.tips.length>0&&<div className="tips-card"><div className="tips-icon">✳</div><div><h4>A few friendly reminders</h4>{trip.tips.slice(0,3).map((t,i)=><p key={i}>· {t}</p>)}</div></div>}
 </>}
 </div>;
}
function Budget({trip,onAddExpense,onRemoveExpense}:{trip:Trip;onAddExpense:(e:{title:string;amount:number;category:Category})=>void;onRemoveExpense:(id:string)=>void}) {
 const [showAdd,setShowAdd]=useState(false),[title,setTitle]=useState(''),[amount,setAmount]=useState(''),[cat,setCat]=useState<Category>('stay');
 const total=tripTotal(trip),remaining=trip.budget-total,pct=trip.budget>0?Math.min(100,Math.round(total/trip.budget*100)):0;
 const rows=CATEGORIES.map(category=>({category,amount:trip.days.reduce((s,d)=>s+d.activities.reduce((p,a)=>p+(a.category===category?a.cost:0),0),0)+trip.expenses.reduce((s,e)=>s+(e.category===category?e.amount:0),0)})).filter(x=>x.amount>0).sort((a,b)=>b.amount-a.amount);
 const action=()=>{if(!title.trim()||!Number.isFinite(Number(amount))||Number(amount)<0||amount==='')return;onAddExpense({title:title.trim(),amount:Number(amount),category:cat});setTitle('');setAmount('');setShowAdd(false)};
 return <div className="screen-fade"><div className="section-top"><div><p className="kicker">TRAVEL SMARTER</p><h2>Your trip budget</h2><p className="subheading">Enjoy more of the moments that matter, without the surprises.</p></div><button className="btn btn-primary top-action" onClick={()=>setShowAdd(v=>!v)}><Plus size={17}/> Add expense</button></div>
 <div className="budget-summary-grid"><div className="budget-main-card"><div className="budget-icon"><Wallet size={23}/></div><span>Total trip budget</span><strong>{money(trip.budget,trip.currency)}</strong><p>For {trip.travelers} travelers · {trip.days.length} days</p></div><div className="budget-stat-card"><span>Estimated planned</span><strong>{money(total,trip.currency)}</strong><p>Activities + extra expenses</p><div className="budget-progress"><div className={pct>=100?'over':''} style={{width:`${pct}%`}}/></div><small>{pct}% of total budget planned</small></div><div className="budget-stat-card"><span>{remaining>=0?'Unallocated budget':'Over planned budget'}</span><strong className={remaining<0?'negative':'positive'}>{money(Math.abs(remaining),trip.currency)}</strong><p>{remaining>=0?'Available for other trip costs':'Review the current estimates'}</p><span className="budget-small-decoration">✦</span></div></div>
 {showAdd&&<div className="expense-form"><div><h4>Add an expense</h4><p>Track flights, hotel costs, or anything not already counted in your plan.</p></div><div className="expense-inputs"><input aria-label="Expense title" placeholder="e.g. Hotel for 3 nights" value={title} onChange={e=>setTitle(e.target.value)} maxLength={80}/><select aria-label="Category" value={cat} onChange={e=>setCat(e.target.value as Category)}>{CATEGORIES.map(c=><option value={c} key={c}>{CATEGORY_LABEL[c]}</option>)}</select><input aria-label="Amount" type="number" min="0" placeholder={`Cost in ${trip.currency}`} value={amount} onChange={e=>setAmount(e.target.value)}/><button className="btn btn-primary" onClick={action}>Save</button></div></div>}
 <div className="budget-lower"><div className="white-panel"><div className="panel-heading"><div><h3>Spending breakdown</h3><p>How your planned costs add up</p></div></div><div className="budget-breakdown">{rows.length?rows.map(r=><div className="budget-breakdown-row" key={r.category}><CategoryIcon category={r.category}/><div><strong>{CATEGORY_LABEL[r.category]}</strong><div className="thin-bar"><div className={`bar-${categoryClass[r.category]}`} style={{width:`${total?Math.max(2,100*r.amount/total):0}%`}}/></div></div><strong>{money(r.amount,trip.currency)}</strong></div>):<p>No estimated costs yet. Add activities or expenses to begin.</p>}</div></div><div className="white-panel extra-expenses"><div className="panel-heading"><div><h3>Extra expenses</h3><p>Costs outside your daily activities</p></div></div>{trip.expenses.length?trip.expenses.map(e=><div className="extra-row" key={e.id}><CategoryIcon category={e.category}/><div><strong>{e.title}</strong><small>{CATEGORY_LABEL[e.category]}</small></div><strong>{money(e.amount,trip.currency)}</strong><button aria-label={`Remove ${e.title}`} onClick={()=>onRemoveExpense(e.id)}><Trash2 size={16}/></button></div>):<div className="expense-empty"><span>✧</span><strong>Nothing extra just yet</strong><p>Remember: your activity estimates do not automatically include flights or hotels.</p></div>}</div></div>
 <div className="budget-caution"><CircleAlert size={17}/><span>Budget figures are estimates, not verified prices. Your planner currently totals scheduled activities and expenses that you manually add; food, flights, hotels, and transfers may still be missing.</span></div>
 </div>;
}
function SavedTrips({trips,onChoose,onView,onRemove,onCreate}:{trips:Trip[];onChoose:(id:string)=>void;onView:(v:View)=>void;onRemove:(id:string)=>void;onCreate:()=>void}) {
 return <div className="screen-fade"><div className="section-top"><div><p className="kicker">ALL YOUR JOURNEYS</p><h2>Saved adventures</h2><p className="subheading">Beautiful memories start with a great plan.</p></div><button className="btn btn-primary top-action" onClick={onCreate}><Plus size={17}/> New trip</button></div>{!trips.length?<EmptyTrips onCreate={onCreate}/>:<div className="saved-list">{trips.map(t=><div className="saved-item" key={t.id}><div className="saved-icon">🌏</div><div className="saved-info"><strong>{t.destination}, {t.country}</strong><p>{dateLabel(t.startDate)} – {dateLabel(t.endDate)} · {t.days.length} days · {money(t.budget,t.currency)}</p><span className={`mode-label ${t.mode}`}>{t.mode==='ai'?'AI itinerary':'Demo itinerary'}</span></div><button className="btn btn-outline compact" onClick={()=>{onChoose(t.id);onView('itinerary')}}>Open trip <ArrowRight size={15}/></button><button className="icon-button danger" aria-label={`Delete ${t.destination} trip`} title="Delete trip" onClick={()=>{if(window.confirm(`Delete your ${t.destination} trip? This cannot be undone.`))onRemove(t.id)}}><Trash2 size={18}/></button></div>)}</div>}</div>;
}
function Discover({onCreate}:{onCreate:()=>void}) {return <div className="screen-fade"><div className="section-top"><div><p className="kicker">EXPLORE THE POSSIBILITIES</p><h2>Where could you go?</h2><p className="subheading">A little inspiration goes a long way.</p></div></div><WelcomeBanner onCreate={onCreate}/><div className="section-heading"><div><h3>Get inspired</h3><p>Destination ideas to help you start planning</p></div></div><DestinationCards onCreate={onCreate}/><div className="tips-card discover-tip"><div className="tips-icon">✳</div><div><h4>Turn any place into a plan</h4><p>Type a city or destination in the new trip form. AI will propose a customized itinerary; the demo offers prewritten sample stops for selected destinations.</p></div></div></div>}

export default function Page() {
 const [trips,setTrips]=useState<Trip[]>([]), [selectedId,setSelectedId]=useState('');
 const [ready,setReady]=useState(false),[view,setView]=useState<View>('overview'),[dayIndex,setDayIndex]=useState(0);
 const [showCreate,setShowCreate]=useState(false),[editing,setEditing]=useState<Activity | 'new' | null>(null),[mobileNav,setMobileNav]=useState(false);
 useEffect(()=>{
   try {const saved=window.localStorage.getItem('tripmate.trips.v1');const list=saved?JSON.parse(saved) as Trip[]:[createDemoTrip(sampleInput)];const data=Array.isArray(list)?list:[createDemoTrip(sampleInput)];setTrips(data);setSelectedId(window.localStorage.getItem('tripmate.selected.v1')||data[0]?.id||'');}
   catch {const t=createDemoTrip(sampleInput);setTrips([t]);setSelectedId(t.id)}
   setReady(true);
 },[]);
 useEffect(()=>{if(ready){try{window.localStorage.setItem('tripmate.trips.v1',JSON.stringify(trips));window.localStorage.setItem('tripmate.selected.v1',selectedId)}catch{}}},[trips,selectedId,ready]);
 const selected=trips.find(t=>t.id===selectedId)||trips[0];
 const activeIndex=selected?Math.min(dayIndex,selected.days.length-1):0;
 const updateTrip=(transform:(t:Trip)=>Trip)=>{if(!selected)return;setTrips(prev=>prev.map(t=>t.id===selected.id?transform(t):t));};
 const create=(trip:Trip)=>{setTrips(prev=>[trip,...prev]);setSelectedId(trip.id);setDayIndex(0);setView('itinerary');setShowCreate(false)};
 const choose=(id:string)=>{setSelectedId(id);setDayIndex(0)};
 const nav=(newView:View)=>{setView(newView);setMobileNav(false)};
 const saveActivity=(a:Activity)=>{updateTrip(t=>({...t,days:t.days.map((d,i)=>i===activeIndex?{...d,activities:editing==='new'?[...d.activities,a].sort((x,y)=>x.time.localeCompare(y.time)):d.activities.map(v=>v.id===a.id?a:v)}:d)}));setEditing(null)};
 const removeActivity=(id:string)=>updateTrip(t=>({...t,days:t.days.map((d,i)=>i===activeIndex?{...d,activities:d.activities.filter(a=>a.id!==id)}:d)}));
 const moveActivity=(id:string,dir:number)=>updateTrip(t=>({...t,days:t.days.map((d,i)=>{
   if(i!==activeIndex)return d;
   const activities=[...d.activities],index=activities.findIndex(a=>a.id===id),to=index+dir;
   if(index<0||to<0||to>=activities.length)return d;
   [activities[index],activities[to]]=[activities[to],activities[index]];
   // Swap their schedule slots so the displayed timeline stays chronological.
   const time=activities[index].time;activities[index]={...activities[index],time:activities[to].time};activities[to]={...activities[to],time};
   return {...d,activities};
 })}));
 const exportTrip=()=>{if(!selected)return;const blob=new Blob([JSON.stringify(selected,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`tripmate-${selected.destination.toLowerCase().replace(/[^a-z0-9]+/g,'-')}.json`;a.click();URL.revokeObjectURL(url)};
 const deleteTrip=(id:string)=>{setTrips(prev=>prev.filter(t=>t.id!==id));if(selectedId===id){const next=trips.find(t=>t.id!==id);setSelectedId(next?.id||'');setDayIndex(0)}};
 return <div className="app-shell"><aside className={`sidebar ${mobileNav?'mobile-open':''}`}><div className="sidebar-top"><Logo/><button className="mobile-close icon-button" aria-label="Close navigation" onClick={()=>setMobileNav(false)}><X size={20}/></button></div><div className="sidebar-nav"><div className="nav-caption">WORKSPACE</div>{sidebarItems.map(({key,label,Icon})=><button key={key} className={`nav-item ${view===key?'active':''}`} onClick={()=>nav(key)}><Icon size={19}/><span>{label}</span>{view===key&&<span className="active-dot"/>}</button>)}</div><div className="sidebar-bottom"><div className="sidebar-inspiration"><div className="inspiration-top">✦ <span>YOUR TRAVEL COMPANION</span></div><strong>Collect moments,<br/>not things.</strong><p>The world is yours to discover.</p><button onClick={()=>setShowCreate(true)}>Plan a trip <ArrowRight size={14}/></button></div><div className="sidebar-profile"><div className="avatar">✳</div><div><strong>Travel explorer</strong><small>Free workspace</small></div><span>✦</span></div></div></aside>
 {mobileNav&&<button className="mobile-scrim" aria-label="Close navigation" onClick={()=>setMobileNav(false)}/>}
 <div className="main-shell"><header className="topbar"><div className="topbar-left"><button className="icon-button hamburger" aria-label="Open navigation" onClick={()=>setMobileNav(true)}><Menu size={22}/></button><span className="topbar-breadcrumb">My workspace</span><ChevronRight size={15}/><strong>{sidebarItems.find(x=>x.key===view)?.label}</strong></div><div className="topbar-actions"><span className="topbar-greeting">Every journey begins somewhere <span>✳</span></span><button className="btn btn-primary topbar-plan" onClick={()=>setShowCreate(true)}><Plus size={17}/> New trip</button><div className="top-avatar">✳</div></div></header>
 <main className="content">
 {!ready?<div className="page-loading"><span className="spinner"/> Opening your travel space…</div>:view==='overview'?<Overview trips={trips} trip={selected} onCreate={()=>setShowCreate(true)} onChoose={choose} onView={nav}/>:view==='saved'?<SavedTrips trips={trips} onChoose={choose} onView={nav} onCreate={()=>setShowCreate(true)} onRemove={deleteTrip}/>:view==='discover'?<Discover onCreate={()=>setShowCreate(true)}/>:!selected?<EmptyTrips onCreate={()=>setShowCreate(true)}/>:view==='itinerary'?<Itinerary trip={selected} dayIndex={activeIndex} setDayIndex={setDayIndex} onActivity={a=>setEditing(a||'new')} onRemove={removeActivity} onMove={moveActivity} onExport={exportTrip}/>:<Budget trip={selected} onAddExpense={e=>updateTrip(t=>({...t,expenses:[...t.expenses,{...e,id:uuid()}]}))} onRemoveExpense={id=>updateTrip(t=>({...t,expenses:t.expenses.filter(e=>e.id!==id)}))}/>}
 </main><footer className="site-footer">Made for the curious. <span>✳</span> TripMate MVP · Plans and estimates need independent verification. <a href="/privacy">Privacy</a> · <a href="/terms">Terms</a></footer></div>
 {showCreate&&<CreateTrip onClose={()=>setShowCreate(false)} onCreated={create}/>} {editing&&selected&&<ActivityForm activity={editing==='new'?undefined:editing} currency={selected.currency} onClose={()=>setEditing(null)} onSave={saveActivity}/>}</div>;
}