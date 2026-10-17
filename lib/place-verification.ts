/** Conservative and explainable evidence-based place matching.
 * The score is an application heuristic, NOT an objective probability of truth.
 */
export type Coord={lat:number;lng:number};
export type MatchLevel='high'|'review'|'rejected';
export type Verification={score:number;level:MatchLevel;reasons:string[];nameSimilarity:number;distanceKm:number|null};
const stops=new Set(['visit','visiting','guided','explore','tour','trip','the','of','at','to','a','an','see','walk','through','and','in','for','near','stop','morning','afternoon','evening']);
export function normalizeName(s:string){
 return s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').toLowerCase().replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
}
function tokens(s:string){return normalizeName(s).split(' ').filter(w=>w.length>1&&!stops.has(w));}
export function nameSimilarity(query:string,label:string){
 const a=new Set(tokens(query)),b=new Set(tokens(label));
 if(!a.size||!b.size)return 0;
 const overlap=[...a].filter(t=>b.has(t)).length;
 const union=new Set([...a,...b]).size;
 return Math.max(0,Math.min(1,(overlap/Math.max(a.size,b.size)+overlap/union)/2));
}
export function kmBetween(a:Coord,b:Coord){
 const r=Math.PI/180,dy=(b.lat-a.lat)*r,dx=(b.lng-a.lng)*r;
 const h=Math.sin(dy/2)**2+Math.cos(a.lat*r)*Math.cos(b.lat*r)*Math.sin(dx/2)**2;
 return 12742*Math.asin(Math.min(1,Math.sqrt(h)));
}
export function verifyMatch(input:{
  query:string;label:string;activityPoint:Coord|null;candidatePoint:Coord|null;
  cityInSource:boolean;knownAlias?:boolean;
}):Verification{
 const similarity=input.knownAlias?1:nameSimilarity(input.query,input.label);
 const distance=input.activityPoint&&input.candidatePoint?kmBetween(input.activityPoint,input.candidatePoint):null;
 const reasons:string[]=[];
 if(similarity<.6)reasons.push('Name mismatch: insufficient shared landmark words.');
 else if(similarity<.85)reasons.push('Name is similar but not identical.');
 if(distance!==null&&distance>5)reasons.push('Location differs by '+distance.toFixed(1)+' km from the itinerary pin.');
 if(distance===null)reasons.push('No two coordinates available for direct comparison.');
 if(!input.cityInSource&&distance===null)reasons.push('City could not be confirmed from the source.');
 const locationPoints=distance===null?0:distance<=.8?35:distance<=3?30:distance<=5?18:distance<=15?3:0;
 const score=Math.max(0,Math.min(100,Math.round(similarity*55+locationPoints+(input.cityInSource?10:0))));
 let level:MatchLevel='review';
 // Wrong city or incomplete name is never silently shown as verified.
 if(similarity<.45||(distance!==null&&distance>30))level='rejected';
 else if(similarity>=.75&&distance!==null&&distance<=3&&score>=76)level='high';
 return {score,level,reasons,nameSimilarity:Number(similarity.toFixed(2)),distanceKm:distance===null?null:Number(distance.toFixed(2))};
}