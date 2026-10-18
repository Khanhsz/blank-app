/**
 * Bedroom Job Board V3 — one market for ALL Startup/SME scopes.
 * Listings, NPC applicants, outcome rolls and fee bounds are deterministic;
 * Gemini is only invoked AFTER the winning offer has been accepted.
 * Client media is never freelancer income.
 */
import {CLIENT_DATABASE,CLIENT_BY_ID,type ClientSector} from "./clientDatabase";
import {FREELANCE_JOBS,getFreelanceJob,type FreelanceJobTemplate} from "./freelanceJobTemplates";
import {canOfferJob,workload,WEEKLY_CAPACITY} from "./freelanceJobs";
import {eligibleGigStaff,agencyGigGate,gigRole} from "./agencyFreelance";
import {taskFit} from "./personnel";
import type {GameState,FreelanceListing,FreelanceApplication,FreelanceBoard,FreelanceBidApproach,FreelanceBidPrice} from "./state";
import type {Fx} from "./store";

export const HIGH_BUDGET_MIN_FEE=2_000_000;
export const HIGH_BUDGET_MIN_MEDIA=5_000_000;
export const FREELANCE_APPLICATION_LIMIT=3;
export const APPLICATION_HOURS=1;
export const BOARD_LISTINGS_PER_WEEK=7;
const clamp=(n:number,a:number,b:number)=>Math.max(a,Math.min(b,n));
const random=(k:string)=>{let h=2166136261;for(let i=0;i<k.length;i++)h=Math.imul(h^k.charCodeAt(i),16777619);return (h>>>0)/4294967296;};
const NPCS=[
 {id:"pixel","name":"Pixel Tran",style:"creative",skill:73,portfolio:72,rep:61,price:.98},
 {id:"lean","name":"Lean Studio",style:"value",skill:62,portfolio:45,rep:47,price:.76},
 {id:"minh","name":"Minh Creative",style:"creative",skill:83,portfolio:79,rep:73,price:1.17},
 {id:"dat","name":"Dat Performance",style:"performance",skill:79,portfolio:68,rep:65,price:1.03},
 {id:"anh","name":"Anh Research",style:"research",skill:75,portfolio:78,rep:66,price:1.08},
 {id:"starter","name":"Local Starter",style:"value",skill:54,portfolio:34,rep:25,price:.81},
 {id:"flow","name":"Flow Freelancer",style:"performance",skill:69,portfolio:57,rep:50,price:1.0},
 {id:"nova","name":"Nova Content",style:"creative",skill:76,portfolio:69,rep:62,price:1.05},
] as const;
const SECTOR_PREF:Record<ClientSector,FreelanceBidApproach>={
 coffee:"value",beauty:"creative",fashion:"creative",education:"research",tech:"performance",fitness:"performance",food:"value"
};
export function isHighBudgetJob(t:Pick<FreelanceJobTemplate,"fee"|"mediaBudget">):boolean{
 return t.fee>=HIGH_BUDGET_MIN_FEE||t.mediaBudget>=HIGH_BUDGET_MIN_MEDIA;
}
export function jobGate(s:GameState,t:FreelanceJobTemplate){
 if(s.agencyUnlocked)return agencyGigGate(s,t.id);
 if(isHighBudgetJob(t)&&s.reputation<=30)return "Requires reputation 31 or higher";
 if(!canOfferJob(s,t))return t.tier==="campaign"?"Requires 6 gigs/projects and 2 specialist projects":
  "Requires "+t.requiredGigs+" completed gigs/projects";
 return null;
}
function newWeekListings(week:number):FreelanceListing[]{
 const companies=CLIENT_DATABASE.filter(c=>c.segment==="startup"||c.segment==="sme");
 // Guaranteed starter/medium/premium mix every week. No Big Corp in Bedroom.
 const ids=["social-pack","social-audit","content-calendar","landing-page","meta-setup",
  week%2?"audience-research":"content-sprint",week%3?"mini-launch":"audience-research"] as const;
 return ids.map((templateId,i)=>{
  const t=getFreelanceJob(templateId)!;
  const candidates=companies.filter(c=>c.sector===["coffee","fashion","food","beauty","tech","education","fitness"][(week+i)%7]);
  const client=candidates[Math.floor(random("client:"+week+":"+i)*candidates.length)];
  const id="job-"+week+"-"+i+"-"+client.id;
  const n=1+Math.floor(random(id+":rivals")*(t.tier==="gig"?3:t.tier==="project"?4:5));
  const npcIds=Array.from({length:n},(_,k)=>NPCS[Math.floor(random(id+":npc:"+k)*NPCS.length)].id);
  return {id,clientId:client.id,templateId:t.id,postedWeek:week,closeWeek:week,
   fee:t.fee,mediaBudget:t.mediaBudget,applicantIds:[...new Set(npcIds)],status:"open"};
 });
}
export function ensureFreelanceBoard(s:GameState):FreelanceBoard{
 if(!s.freelanceBoard)s.freelanceBoard={lastWeek:s.clock.week,listings:newWeekListings(s.clock.week),applications:[]};
 if(!Array.isArray(s.freelanceBoard.listings))s.freelanceBoard.listings=[];
 if(!Array.isArray(s.freelanceBoard.applications))s.freelanceBoard.applications=[];
 // Versioned, idempotent migration: only unclaimed public video listings change.
 // Awarded and active video contracts retain their original template and reward.
 if((s.freelanceBoard as FreelanceBoard & {catalogVersion?:number}).catalogVersion!==6){
  for(const l of s.freelanceBoard.listings){
   if(l.templateId!=="short-video"||s.freelanceBoard.applications.some(a=>a.listingId===l.id))continue;
   const landing=getFreelanceJob("landing-page")!;
   l.templateId=landing.id;l.fee=landing.fee;l.mediaBudget=landing.mediaBudget;
  }
  (s.freelanceBoard as FreelanceBoard & {catalogVersion?:number}).catalogVersion=6;
 }
 if(!s.freelanceBoard.listings.some(x=>x.postedWeek===s.clock.week))
  s.freelanceBoard.listings.push(...newWeekListings(s.clock.week));
 return s.freelanceBoard;
}
export function bidFee(t:FreelanceJobTemplate,price:FreelanceBidPrice){
 const mul={competitive:.85,standard:1,premium:1.15}[price];
 return Math.round(t.fee*mul/10000)*10000;
}
function bidScore(s:GameState,l:FreelanceListing,approach:FreelanceBidApproach,quote:number){
 const client=CLIENT_BY_ID[l.clientId],t=getFreelanceJob(l.templateId)!;
 const portfolio=workload(s).completedGigs+workload(s).completedProjects;
 const skill=s.agencyUnlocked?clamp(eligibleGigStaff(s,t.id).reduce((v,id)=>Math.max(v,taskFit(s,id,gigRole(t.id),t.id)),45),30,97):clamp(46+s.expertise*1.4+Math.min(14,portfolio*2.2),30,97);
 const relevant=s.history.filter(x=>!x.agency&&x.brand===client.brand).length;
 const portfolioScore=clamp(35+Math.min(40,portfolio*5)+Math.min(20,relevant*10)+(s.agencyUnlocked?Math.min(25,s.ceo?.history.length??0):0),20,95);
 const proposal=clamp(53+(SECTOR_PREF[client.sector]===approach?24:approach==="research"?7:0),20,100);
 const affordability=clamp(90-Math.abs(quote/t.fee-1)*110,35,94);
 const load=s.agencyUnlocked?(s.ceo?.agencyGigs??[]).filter(g=>g.status==="working"||g.status==="revision").length*7:workload(s).weeklyHours;
 const availability=clamp(92-load*2,25,95);
 const trust=clamp(30+s.reputation*.53+Math.min(15,relevant*6),20,94);
 return +(skill*.27+portfolioScore*.20+proposal*.20+affordability*.12+availability*.12+trust*.09).toFixed(2);
}
function rivalScore(l:FreelanceListing,id:string){
 const n=NPCS.find(n=>n.id===id)!;
 const sector=CLIENT_BY_ID[l.clientId].sector;
 const proposal=n.style===SECTOR_PREF[sector]?86:61;
 const price=clamp(90-Math.abs(n.price-1)*110,35,96);
 const available=clamp(76+(random(l.id+id+":avail")-.5)*30,45,91);
 return +(n.skill*.27+n.portfolio*.20+proposal*.20+price*.12+available*.12+n.rep*.09).toFixed(2);
}
export function winEstimate(s:GameState,l:FreelanceListing,approach:FreelanceBidApproach,price:FreelanceBidPrice){
 const t=getFreelanceJob(l.templateId)!;
 const p=bidScore(s,l,approach,bidFee(t,price));
 const npc=l.applicantIds.map(id=>rivalScore(l,id));
 const sum=1+npc.reduce((z,v)=>z+Math.exp(clamp((v-p)/12,-30,30)),0);
 return {score:p,probability:Math.round(100/sum),rivalScores:npc};
}
export function applyFreelanceJob(s:GameState,fx:Fx,id:string,approach:FreelanceBidApproach,price:FreelanceBidPrice){
 if(!s.created||(s.agencyUnlocked?!s.ceo:s.campaign.phase!=="brief"))return false;
 const b=ensureFreelanceBoard(s),l=b.listings.find(x=>x.id===id);
 if(!l||l.status!=="open"||l.closeWeek<s.clock.week)return false;
 const t=getFreelanceJob(l.templateId);
 if(!t||jobGate(s,t))return fx.toast(jobGate(s,t)??"Job unavailable"),false;
 if(b.applications.some(a=>a.listingId===id))return false;
 if(!["creative","performance","research","value"].includes(approach)||
  !["competitive","standard","premium"].includes(price))return false;
 const career=workload(s);
 if(career.weeklyWeek!==s.clock.week){career.weeklyWeek=s.clock.week;career.weeklyHours=0;}
 const used=b.applications.filter(x=>x.week===s.clock.week).length;
 if(used>=FREELANCE_APPLICATION_LIMIT)return fx.toast("Only 3 applications per game week."),false;
 if(!s.agencyUnlocked){
  if(career.weeklyHours+APPLICATION_HOURS>WEEKLY_CAPACITY)return fx.toast("Weekly freelance capacity reached."),false;
  career.weeklyHours+=APPLICATION_HOURS;
 }
 const fee=bidFee(t,price);
 const match=winEstimate(s,l,approach,price);
 b.applications.push({id:"application-"+l.id,listingId:id,clientId:l.clientId,templateId:l.templateId,
  week:s.clock.week,approach,price,proposedFee:fee,score:match.score,winChance:match.probability,
  status:"pending",feedback:"Gemini is reviewing your application against rival freelancers."});
 fx.log("Applied: "+CLIENT_BY_ID[l.clientId].brand+" · "+t.title+" · "+fee+" VND fee, reputation "+s.reputation);
 fx.toast("Application submitted · AI review pending.");
 return true;
}
/** One-click job application with a client-industry-fit pitch and the listed
 * standard service fee. The regular application validator still enforces
 * reputation, portfolio, work-hours and the 3-applications-per-week cap.
 */
export function applyDefaultFreelanceJob(s:GameState,fx:Fx,id:string){
 const listing=ensureFreelanceBoard(s).listings.find(l=>l.id===id);
 if(!listing||!CLIENT_BY_ID[listing.clientId])return false;
 const approach=SECTOR_PREF[CLIENT_BY_ID[listing.clientId].sector];
 return applyFreelanceJob(s,fx,id,approach,"standard");
}
/** Deterministic frozen lottery draw: no loading/retry can reroll an award.
 * Gemini receives the winner determined here but never owns the decision.
 */
export function assessFreelanceApplication(s:GameState,applicationId:string){
 const a=s.freelanceBoard?.applications.find(x=>x.id===applicationId);
 const listing=s.freelanceBoard?.listings.find(l=>l.id===a?.listingId);
 if(!a||!listing)return null;
 const npc=listing.applicantIds.map(id=>rivalScore(listing,id));
 const weights=npc.map(score=>Math.exp(clamp((score-a.score)/12,-30,30)));
 const probability=1/(1+weights.reduce((sum,x)=>sum+x,0));
 const win=random(listing.id+":selection")<probability;
 return {selected:win,probability:Math.round(probability*100),
  strongestRival:npc.length?Math.max(...npc):0,
  npcCount:listing.applicantIds.length,score:a.score};
}
export function completeFreelanceApplication(s:GameState,fx:Fx,applicationId:string,comment?:string,mode:"gemini"|"rules"="rules"){
 const a=s.freelanceBoard?.applications.find(x=>x.id===applicationId);
 if(!a||a.status!=="pending")return false;
 const assessment=assessFreelanceApplication(s,applicationId);
 if(!assessment)return false;
 a.status=assessment.selected?"selected":"rejected";
 const detail=typeof comment==="string"?comment.trim().slice(0,280):"";
 const fallback=assessment.selected
  ?"Your application meets the client's budget and delivery criteria. An offer is ready to accept."
  :assessment.score<assessment.strongestRival-8
   ?"Another freelancer demonstrated a stronger match in skills, portfolio or delivery reliability."
   :"Another applicant won the competitive selection. Improve your portfolio and industry fit.";
 a.feedback=(detail.length>=12?detail:fallback)+(mode==="rules"?" (Game simulation)":"");
 fx.log((assessment.selected?"Offer ready":"Not selected")+": "+CLIENT_BY_ID[a.clientId].brand+" · "+getFreelanceJob(a.templateId)?.title);
 if(assessment.selected)fx.toast("Job offer received · Open Job Board to accept.");
 else fx.toast("Application reviewed · See Job Board for feedback.");
 return true;
}
export function advanceFreelanceBoard(s:GameState,closingWeek:number,fx:Fx){
 if(!s.freelanceBoard)return;
 const b=s.freelanceBoard;
 if(b.lastWeek>closingWeek)return;
 for(const l of b.listings.filter(x=>x.status==="open"&&x.closeWeek<=closingWeek)){
  // Weekly turnover never decides applications. A separate async Gemini
  // evaluator handles this, with a deterministic fallback on API failure.
  // Closed listings remain visible in the applicant's offer history.
  l.status="closed";
 }
 b.lastWeek=Math.max(b.lastWeek,closingWeek);
 // Historic decisions are retained; only old public listings are culled.
 b.listings=b.listings.filter(l=>l.postedWeek>=s.clock.week-3||
  b.applications.some(a=>a.listingId===l.id&&["pending","selected","accepted"].includes(a.status)));
 if(!b.listings.some(l=>l.postedWeek===s.clock.week))b.listings.push(...newWeekListings(s.clock.week));
}
export function hasAcceptedOffer(s:GameState,clientId:string,templateId:string){
 return !!s.freelanceBoard?.applications.some(a=>a.clientId===clientId&&a.templateId===templateId&&a.status==="accepted");
}
export function acceptFreelanceOffer(s:GameState,fx:Fx,applicationId:string,start:(s:GameState,fx:Fx,clientId:string,jobId:string)=>boolean){
 if(s.agencyUnlocked||s.campaign.phase!=="brief"||s.campaign.catalogClientId)return false;
 const b=s.freelanceBoard,a=b?.applications.find(x=>x.id===applicationId);
 if(!a||a.status!=="selected")return false;
 const t=getFreelanceJob(a.templateId);if(!t||jobGate(s,t))return false;
 a.status="accepted";
 if(!start(s,fx,a.clientId,a.templateId)){a.status="selected";return false;}
 fx.log("Accepted job offer · "+CLIENT_BY_ID[a.clientId].brand+" · Gemini brief requested");
 return true;
}
export function declineFreelanceOffer(s:GameState,id:string){
 const a=s.freelanceBoard?.applications.find(a=>a.id===id);
 if(!a||a.status!=="selected")return false;
 a.status="declined";a.feedback="Offer declined before contract signing. No reputation penalty.";
 return true;
}
