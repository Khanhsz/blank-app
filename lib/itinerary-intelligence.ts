import type {Activity, Category, Pace, Trip} from './types';
import {directDistanceMeters,hasCoordinates} from './routing';

export type ScheduleWarning={id:string;level:'warning'|'info';title:string;detail:string};
export type DayIntelligence={
 dayIndex:number;dated:string;activityCount:number;mappedCount:number;
 directMeters:number;segmentsMeasured:number;travelEstimateMinutes:number;
 totalActivityMinutes:number;firstStart:string|null;lastEnd:string|null;
 warnings:ScheduleWarning[];interestMatches:number;
};
export type RouteProposal={
 available:boolean;reason:string;beforeMeters:number;afterMeters:number;
 savedMeters:number;percentSaved:number;orderedIds:string[];
 moved:{id:string;title:string;from:number;to:number}[];
 preserved:string[];
};
// Parse activity clock times (same day only, no inferred timezones).
export function minutesOf(s:string):number|null{
 const m=/^(\d{1,2}):(\d{2})$/.exec(s);
 if(!m)return null;
 const h=Number(m[1]),min=Number(m[2]);
 return h>=0&&h<24&&min>=0&&min<60?h*60+min:null;
}
export function clock(min:number):string{
 const value=Math.max(0,Math.min(1439,Math.round(min)));
 return String(Math.floor(value/60)).padStart(2,'0')+':'+String(value%60).padStart(2,'0');
}
export function measuredDistance(activities:Activity[]):{meters:number;legs:number}{
 let meters=0,legs=0;
 // Never bridge missing coordinates silently.
 for(let i=1;i<activities.length;i++){
  if(!hasCoordinates(activities[i-1])||!hasCoordinates(activities[i]))continue;
  meters+=directDistanceMeters(activities[i-1],activities[i]);legs++;
 }
 return {meters,legs};
}
const categoryByInterest:Record<string,Category[]>={
 culture:['culture','sightseeing'],history:['culture','sightseeing'],art:['culture'],
 photography:['sightseeing','nature','culture'],food:['food'],nature:['nature'],
 relaxation:['nature','stay'],adventure:['nature','sightseeing'],shopping:['other','food']
};
function interestRelevant(a:Activity,interests:string[]):boolean{
 return interests.some(i=>(categoryByInterest[i.toLowerCase()]||[]).includes(a.category));
}
export function analyzeDay(trip:Trip,dayIndex:number):DayIntelligence{
 const day=trip.days[dayIndex];const activities=day?.activities||[];
 const warnings:ScheduleWarning[]=[];
 const measured=measuredDistance(activities);
 const totalActivityMinutes=activities.reduce((s,a)=>s+Math.max(0,Number.isFinite(a.durationMinutes)?a.durationMinutes:0),0);
 const travelEstimateMinutes=Math.round((measured.meters/1000/4.5)*60);
 const located=activities.filter(hasCoordinates);
 if(located.length<activities.length)warnings.push({
  id:'unmapped',level:'info',title:(activities.length-located.length)+' stop(s) lack map coordinates',
  detail:'Distances and route proposals exclude unknown map pins. Confirm these places before relying on routing.'
 });
 if(activities.length-1>measured.legs)warnings.push({
  id:'distance-partial',level:'info',title:'Route distance is incomplete',
  detail:'Only consecutive stops with coordinates are included. Straight-line distance is not walking or driving distance.'
 });
 const cap:Record<Pace,number>={relaxed:3,balanced:5,packed:7};
 if(activities.length>cap[trip.pace])warnings.push({
  id:'pace',level:'warning',title:'Busy day for '+trip.pace+' pace',
  detail:activities.length+' activities are planned; consider adding breaks or moving optional stops to another day.'
 });
 const first=activities[0]?minutesOf(activities[0].time):null;
 let lastEnd:number|null=null;
 let previous:Activity|null=null;
 let previousStart:number|null=null;
 for(let i=0;i<activities.length;i++){
  const a=activities[i];const t=minutesOf(a.time);
  const end=t===null?null:t+Math.max(0,Math.round(a.durationMinutes));
  if(t===null)warnings.push({id:'time-'+a.id,level:'info',title:'Unrecognized time for '+a.title,detail:'Use a 24-hour HH:MM start time to check timing.'});
  if(previous&&previousStart!==null&&t!==null){
    const previousEnd=previousStart+Math.max(0,Math.round(previous.durationMinutes));
    const gap=t-previousEnd;
    if(gap<0){
      warnings.push({id:'overlap-'+a.id,level:'warning',title:'Schedule overlap: '+previous.title+' → '+a.title,
        detail:Math.abs(gap)+' minute(s) overlap even before accounting for travel.'});
    }else if(hasCoordinates(previous)&&hasCoordinates(a)){
      const meters=directDistanceMeters(previous,a);
      const optimistic=Math.ceil((meters/1000/5.5)*60);
      if(gap<optimistic&&meters>=400){
        warnings.push({id:'transfer-'+a.id,level:'warning',title:'Potentially tight transfer to '+a.title,
          detail:'Only '+gap+' minutes of free time; even a '+(meters/1000).toFixed(1)+' km straight-line move may be difficult. No actual routing ETA is available.'});
      }
    }
  }
  if(end!==null)lastEnd=end;
  previous=a;previousStart=t;
 }
 if(lastEnd!==null&&lastEnd>24*60)warnings.push({
  id:'after-midnight',level:'warning',title:'Activities continue past midnight',
  detail:'Review your start times and durations; the planner does not automatically roll activities to the next date.'
 });
 const interestMatches=activities.filter(a=>interestRelevant(a,trip.interests)).length;
 if(trip.interests.length&&interestMatches===0&&activities.length)warnings.push({
  id:'interests',level:'info',title:'Few clear matches to selected interests',
  detail:'Your interest preferences are used as category signals; consider choosing more relevant stops from verified sources.'
 });
 if(trip.pace==='relaxed'&&totalActivityMinutes+travelEstimateMinutes>7*60)warnings.push({
  id:'long-relaxed',level:'info',title:'Long day for a relaxed trip',
  detail:'Activities and straight-line walking baseline sum to over 7 hours, excluding meals and breaks.'
 });
 return {
  dayIndex,dated:day?.date||'',activityCount:activities.length,mappedCount:located.length,
  directMeters:measured.meters,segmentsMeasured:measured.legs,
  travelEstimateMinutes,totalActivityMinutes,
  firstStart:first===null?null:clock(first),
  lastEnd:lastEnd===null?null:lastEnd>=1440?'After midnight':clock(lastEnd),
  warnings,interestMatches
 };
}
function isFlexible(a:Activity,allowMealMoves:boolean):boolean{
 // Transport, stays and meal appointments are left in their time slots.
 return hasCoordinates(a)&&(['sightseeing','culture','nature','other'].includes(a.category)||(allowMealMoves&&a.category==='food'));
}
function totalCost(order:Activity[]):number{return measuredDistance(order).meters;}
/** Deterministic 2-opt over contiguous flexible visit blocks.
 * Never repositions meals, accommodation, travel legs, or unmapped entries;
 * their time slots stay fixed. Candidate start/end inherit existing time slots
 * only when the user explicitly applies the proposal.
 */
export function optimizeDay(activities:Activity[],allowMealMoves=false):RouteProposal{
 const initial=activities.slice();let current=initial.slice();
 const fixed=initial.filter(a=>!isFlexible(a,allowMealMoves)).map(a=>a.title);
 const before=totalCost(initial);
 if(activities.length<3)return {available:false,reason:'Add at least three stops to compare an alternative route.',beforeMeters:before,afterMeters:before,savedMeters:0,percentSaved:0,orderedIds:initial.map(a=>a.id),moved:[],preserved:fixed};
 let changes=true,passes=0;
 while(changes&&passes++<7){
  changes=false;
  let best=current;
  let bestCost=totalCost(current);
  for(let start=0;start<current.length;start++){
   if(!isFlexible(current[start],allowMealMoves))continue;
   let end=start;
   while(end+1<current.length&&isFlexible(current[end+1],allowMealMoves))end++;
   if(end-start<1){start=end;continue;}
   for(let i=start;i<end;i++){
    for(let j=i+1;j<=end;j++){
     const option=[...current.slice(0,i),...current.slice(i,j+1).reverse(),...current.slice(j+1)];
     const candidateCost=totalCost(option);
     if(candidateCost<bestCost-1){best=option;bestCost=candidateCost;}
    }
   }
   start=end;
  }
  if(best!==current){current=best;changes=true;}
 }
 const after=totalCost(current);
 const savings=Math.max(0,before-after);
 const moved=current.map((a,to)=>({id:a.id,title:a.title,from:initial.findIndex(x=>x.id===a.id),to})).filter(m=>m.from!==m.to);
 const available=savings>=150&&savings>=before*.05&&moved.length>0;
 return {available,reason:available?
   allowMealMoves?'Route reordered after you opted to move meal slots. Stay and transport remain fixed.':'Only adjacent, flexible visits were reordered. Meal, stay and transport slots remain fixed.':
   allowMealMoves?'No meaningful shorter order found while preserving stay, transport and unmapped stops.':'No meaningful shorter order found without moving fixed meals, transfers or unmapped stops.',
  beforeMeters:before,afterMeters:available?after:before,savedMeters:available?savings:0,
  percentSaved:available&&before?Math.round(savings/before*100):0,
  orderedIds:available?current.map(a=>a.id):initial.map(a=>a.id),
  moved:available?moved:[],preserved:fixed};
}
export function reorderByIds(activities:Activity[],orderedIds:string[]):Activity[]|null{
 if(activities.length!==orderedIds.length||new Set(orderedIds).size!==activities.length)return null;
 const original=new Map(activities.map(a=>[a.id,a]));
 if(orderedIds.some(id=>!original.has(id)))return null;
 return orderedIds.map((id,index)=>{
   const a=original.get(id)!;
   // Each existing clock time is an appointment slot; explicitly accepting a
   // proposal assigns this slot to the moved activity.
   return {...a,time:activities[index].time};
 });
}
