/** Client Acquisition V2: discovery, multi-deal CRM, scenario-backed proposals,
 * capacity-aware forecasts and relationship loop. Never advances the global clock.
 * Bid submission, signed contracts and financial posting remain in ceo.ts.
 */
import {ceoTaskDefs,clamp,employeeById,money} from "./data";
import {CLIENT_DATABASE,getClient,agencyLeadForClient} from "./clientDatabase";
import {talentPool} from "./clientTeams";
import {eligibleForRole,employeeReadiness,primaryRole} from "./personnel";
import {currentOffice} from "./city";
import {qualificationQuote} from "./pricingAdvisor";
import type {GameState,Lead,CEO,DiscoveryKey,ProposalPlan,Pitch,Negotiation,ClientRelationship,Project,PriceTier} from "./state";
import type {Fx} from "./store";

export const DISCOVERY_QUESTIONS:{id:DiscoveryKey;label:string;why:string}[]=[
 {id:"need",label:"What business outcome is the priority?",why:"Distinguish campaign objective from the root business problem"},
 {id:"budget",label:"What funding is available?",why:"Validate the campaign and procurement budget before designing the solution"},
 {id:"authority",label:"Who approves the contract?",why:"Understand stakeholders and procurement conditions"},
 {id:"timing",label:"When does the result matter?",why:"Surface deadlines, launch dates and approval lead time"},
];
export const PROPOSAL_APPROACHES=["performance","creative","cost","strategy"] as const;
export const PROPOSAL_CONCEPTS=["proof","story","conversion"] as const;
export const PROPOSAL_DELIVERY=["lean","balanced","specialist"] as const;
export const OUTREACH=["personal","network","insight"] as const;
export type OutreachStyle=(typeof OUTREACH)[number];
const hash=(x:string)=>{let n=2166136261;for(const c of x)n=Math.imul(n^c.charCodeAt(0),16777619);return (n>>>0)%10000/10000;};
const prospectable=(l:Lead)=>["new","prospecting","discovery","nurturing","renewal"].includes(l.status);
const relKey=(l:Lead)=>l.clientMasterId??l.brand.trim().toLowerCase();

export function relationship(c:CEO,l:Lead):ClientRelationship {
 const key=relKey(l),saved=c.clientRelationships?.[key];
 return saved??{trust:clamp(l.relationship,10,99),lastContactDay:c.day,wins:0,losses:0,referrals:0,notes:[]};
}
function adjustRelationship(c:CEO,l:Lead,delta:number,note:string){
 c.clientRelationships??={};
 const key=relKey(l),prior=relationship(c,l);
 const changed={...prior,trust:clamp(prior.trust+delta,5,99),lastContactDay:c.day,notes:[note,...prior.notes].slice(0,15)};
 c.clientRelationships[key]=changed;l.relationship=changed.trust;
}
export function discoveryResponse(l:Lead,key:DiscoveryKey):string {
 const segment=l.segment??(l.businessSize==="enterprise"?"bigcorp":l.businessSize==="small"?"startup":"sme");
 switch(key){
  case "need":return "The priority is "+l.objective+". The key challenge is choosing an approach that produces a measurable change, not just impressions.";
  case "budget":return "Indicative campaign media budget: "+money(l.value)+"; target agency service fee: "+money(l.fee)+". These are modeled game estimates, not client disclosures.";
  case "authority":return (l.stakeholder||"Marketing manager")+" will influence the final decision. "+(segment==="bigcorp"?"Procurement also reviews compliance, delivery risk and competing agencies.":"The client values a clear business case and practical execution.");
  case "timing":return "Working campaign window: "+l.duration+" days. "+(segment==="bigcorp"?"Expect multiple approval steps.":"The client expects weekly progress updates.");
 }
}
export function openDiscovery(s:GameState,fx:Fx,id:string){
 const c=s.ceo,l=c?.leads.find(x=>x.id===id);if(!c||!l||!["new","renewal","discovery"].includes(l.status))return;
 l.status="discovery";l.discovery??={answered:[],notes:{},confidence:0};fx.log("Client discovery started · "+l.brand);
}
export function askDiscovery(s:GameState,fx:Fx,id:string,key:DiscoveryKey){
 const l=s.ceo?.leads.find(x=>x.id===id);
 if(!l||l.status!=="discovery"||!DISCOVERY_QUESTIONS.some(x=>x.id===key))return;
 l.discovery??={answered:[],notes:{},confidence:0};
 if(l.discovery.answered.includes(key))return;
 l.discovery.answered.push(key);l.discovery.notes[key]=discoveryResponse(l,key);
 l.discovery.confidence=Math.min(92,l.discovery.answered.length*22+(l.source==="referral"?4:0));
 fx.log("Discovery verified "+key+" with "+l.brand);
}
export function makeOutreach(s:GameState,fx:Fx,id:string,style:OutreachStyle){
 const c=s.ceo,l=c?.leads.find(x=>x.id===id);
 if(!c||!l||l.status!=="prospecting"||!OUTREACH.includes(style))return;
 const cost=style==="network"?260000:style==="insight"?180000:0;
 if(s.agencyCash<cost)return fx.toast("Insufficient outreach budget: "+money(cost));
 if(cost){s.agencyCash-=cost;c.ledger.unshift({day:c.day,what:"Client outreach · "+style,value:-cost,lead:l.brand,status:"paid"});}
 l.outreachAttempts=(l.outreachAttempts??0)+1;
 const segment=l.segment??"sme";
 const bonus=style==="network"?15:style==="insight"?11:7;
 const reputation=clamp(s.reputation/5,0,16);
 const hurdle=segment==="bigcorp"?15:segment==="sme"?5:0;
 const chance=clamp(22+bonus+reputation+(relationship(c,l).trust-50)*.38-hurdle,8,88);
 const roll=hash(l.id+style+c.day+":"+l.outreachAttempts)*100;
 if(roll<chance){
  l.status="discovery";l.discovery??={answered:[],notes:{},confidence:0};
  adjustRelationship(c,l,style==="network"?6:3,"Responded to "+style+" outreach");
  fx.toast(l.brand+" agreed to a discovery meeting.");
 }else{
  l.status="nurturing";l.nurtureUntil=c.day+7;
  adjustRelationship(c,l,style==="personal"?0:1,"No immediate response to "+style+" outreach");
  fx.toast("No meeting yet. Follow up after Day "+l.nurtureUntil+".");
 }
}
export function deepenDiscovery(s:GameState,fx:Fx,id:string){
 const c=s.ceo,l=c?.leads.find(x=>x.id===id);
 if(!c||!l||l.status!=="discovery")return;
 if(l.qualifyFeePaid)return fx.toast("Diligence already completed for this opportunity.");
 const {fee,depth}=qualificationQuote(s,l);
 if(s.agencyCash<fee)return fx.toast("Need "+money(fee)+" for deeper diligence.");
 s.agencyCash-=fee;c.ledger.unshift({day:c.day,what:"Optional discovery diligence · "+depth,value:-fee,lead:l.brand,status:"paid"});
 l.qualifyFeePaid=fee;l.qualifyDepthPaid=depth;
 l.discovery??={answered:[],notes:{},confidence:0};l.discovery.confidence=clamp(l.discovery.confidence+12,0,99);
 fx.log("Deep due diligence on "+l.brand+" increased evidence confidence");
}
export function decideOpportunity(s:GameState,fx:Fx,id:string,decision:"pursue"|"nurture"|"no-bid"){
 const c=s.ceo,l=c?.leads.find(x=>x.id===id);
 if(!c||!l||l.status!=="discovery"||!["pursue","nurture","no-bid"].includes(decision))return;
 if((l.discovery?.answered.length??0)<3)return fx.toast("Clarify at least three of the four BANT discovery questions.");
 l.discovery!.decision=decision;
 if(decision==="pursue"){
  l.status="qualified";l.insightKnown=true;l.qualificationReason="Discovery confirmed need, budget, authority and timeline";
  adjustRelationship(c,l,3,"Agency approved Go decision after discovery");
  fx.toast("Qualified: "+l.brand+". Prepare a proposal.");
 }else if(decision==="nurture"){
  l.status="nurturing";l.nurtureUntil=c.day+7;
  adjustRelationship(c,l,1,"Client placed into relationship nurture");
  fx.toast("Follow-up scheduled for Day "+l.nurtureUntil);
 }else{
  l.status="declined";adjustRelationship(c,l,-1,"No-bid decision: capacity or economics not suitable");
  fx.toast("No Bid: "+l.brand+". Talent and pitching budget preserved.");
 }
}
export function nurtureRelationship(s:GameState,fx:Fx,id:string,action:"case-study"|"check-in"|"intro"){
 const c=s.ceo,l=c?.leads.find(x=>x.id===id);
 if(!c||!l||!["nurturing","new","discovery"].includes(l.status))return;
 if(l.status==="nurturing"&&c.day<(l.nurtureUntil??0))return fx.toast("Next follow-up on Day "+l.nurtureUntil);
 const fee=action==="case-study"?200000:action==="intro"?120000:0;
 if(s.agencyCash<fee)return fx.toast("Insufficient outreach budget");
 s.agencyCash-=fee;if(fee)c.ledger.unshift({day:c.day,what:"Relationship nurture · "+action,value:-fee,lead:l.brand,status:"paid"});
 adjustRelationship(c,l,action==="intro"?5:action==="case-study"?4:2,action);
 l.status="discovery";l.nurtureUntil=undefined;l.discovery??={answered:[],notes:{},confidence:0};
 fx.log("Reconnected with "+l.brand+" using "+action);
}
export function opportunityStage(l:Lead):string{
 if(l.status==="new"||l.status==="prospecting")return "Prospecting";
 if(["discovery","nurturing","renewal"].includes(l.status))return "Discovery";
 if(l.status==="qualified")return "Qualified";
 if(["pitch","shortlisted","pitch_won"].includes(l.status))return "Proposal";
 if(l.status==="negotiating")return "Negotiation";
 return l.status==="signed"?"Won":l.status==="lost"||l.status==="declined"?"Lost":"Other";
}
export function defaultProposal(l:Lead):ProposalPlan{
 return {approach:l.pref,evidence:"research",delivery:"balanced",concept:l.pref==="creative"?"story":l.pref==="cost"?"conversion":"proof",selectedTalentIds:[]};
}
export function projectedTeam(s:GameState,l:Lead,requestedIds:string[]=[]){
 const team=s.ceo?.clientTeams?.find(t=>t.status!=="released"&&t.brand===l.brand);
 const available=new Set([...talentPool(s),...(team?.memberIds??[])]);
 const selected=requestedIds.length?requestedIds.filter(id=>available.has(id)):Array.from(available);
 const essential=["account","research","strategy","creative","production","media","kol","analytics","operations"];
 const roleAvailability=essential.map(role=>({role,employees:selected.filter(id=>eligibleForRole(id,role))}));
 const missing=roleAvailability.filter(x=>!x.employees.length).map(x=>x.role);
 const quality=selected.length?Math.round(selected.reduce((sum,id)=>sum+employeeReadiness(s,id),0)/selected.length):0;
 return {selected,missing,coverage:Math.round((essential.length-missing.length)/essential.length*100),quality,teamSize:selected.length};
}
export function opportunityForecast(s:GameState,l:Lead,proposedFee=l.fee,plan?:ProposalPlan){
 const scope=clamp(l.scope,3,16);
 const duration=l.contractType==="annual-retainer"?365:clamp(l.duration,14,70);
 const team=projectedTeam(s,l,plan?.selectedTalentIds);
 const base=ceoTaskDefs.reduce((sum,t)=>sum+t.cost,0)*scope/8;
 const outsourced=ceoTaskDefs.filter(t=>team.missing.includes(t.role)).reduce((sum,t)=>sum+t.cost*2.1*scope/8,0);
 const personnel=team.selected.length?Math.min(6,team.selected.length)*2300000/30*duration:0;
 const overhead=currentOffice(s).daily*duration*.4;
 const total=Math.round(base+outsourced+personnel+overhead+1100000);
 const margin=Math.round(proposedFee-total);
 const risk=clamp(Math.round(team.missing.length*6+(duration<21?12:0)+(margin<0?20:0)),0,95);
 return {team,cost:total,margin,risk,marginPct:Math.round(margin/Math.max(1,proposedFee)*100),outsourcing:Math.round(outsourced)};
}
export function estimatedWinProbability(s:GameState,l:Lead):number{
 const c=s.ceo,team=projectedTeam(s,l,l.proposal?.selectedTalentIds);
 const rel=c?relationship(c,l).trust:l.relationship;
 const fit=(l.proposal?.approach===l.pref?9:l.proposal?-3:0);
 const tender=c?.tenders?.find(t=>t.leadId===l.id&&t.status==="open");
 const competition=tender?12:(l.rivalIds.length>1?8:4);
 return clamp(Math.round(15+rel*.3+(s.reputation||0)*.20+team.coverage*.13+fit-competition-l.difficulty*.26),5,85);
}
export function expectedPipelineValue(s:GameState):number{
 return Math.round((s.ceo?.leads??[]).filter(l=>["new","prospecting","nurturing","discovery","renewal","qualified","pitch","shortlisted","pitch_won","negotiating"].includes(l.status))
 .reduce((sum,l)=>sum+l.fee*estimatedWinProbability(s,l)/100,0));
}
export function updateProposal(s:GameState,fx:Fx,id:string,patch:Partial<ProposalPlan>){
 const c=s.ceo,l=c?.leads.find(x=>x.id===id);
 if(!c||!l||!["qualified","pitch","shortlisted"].includes(l.status))return;
 if(patch.approach&&!PROPOSAL_APPROACHES.includes(patch.approach))return;
 if(patch.concept&&!PROPOSAL_CONCEPTS.includes(patch.concept))return;
 if(patch.delivery&&!PROPOSAL_DELIVERY.includes(patch.delivery))return;
 const newPlan={...(l.proposal??defaultProposal(l)),...patch};
 const available=new Set([...talentPool(s),...(c.clientTeams??[]).filter(t=>t.brand===l.brand&&t.status!=="released").flatMap(t=>t.memberIds)]);
 newPlan.selectedTalentIds=newPlan.selectedTalentIds.filter(id=>available.has(id));
 l.proposal=newPlan;
 if(c.pitch?.id===id&&c.pitch.step==="prepare"){
  c.pitch.proposal={...newPlan};
  c.pitch.focus=newPlan.approach;c.pitch.team=newPlan.delivery;c.pitch.evidence=newPlan.evidence;
 }
 fx.log("Proposal adjusted for "+l.brand);
}
export function proposalMerit(s:GameState,l:Lead,plan?:ProposalPlan){
 const p=plan??l.proposal;
 if(!p)return 0;
 const team=projectedTeam(s,l,p.selectedTalentIds);
 const aligns=p.approach===l.pref?12:-7;
 const proof=p.evidence==="research"?(l.discovery?.confidence??0)/10:Math.min(10,s.history.filter(h=>h.agency&&h.score>=65).length*3);
 const concept=(p.concept==="conversion"&&l.pref==="cost")||(p.concept==="story"&&l.pref==="creative")||(p.concept==="proof"&&["performance","strategy"].includes(l.pref))?6:0;
 const delivery=p.delivery==="specialist"&&team.coverage<55?-8:p.delivery==="lean"&&l.segment==="bigcorp"?-9:3;
 return Math.round(aligns+proof+concept+delivery+team.coverage*.10-team.missing.length*1.5);
}
/** A per-deal snapshot preserves multiple simultaneous proposals and negotiations
 * while keeping old CEO API methods and existing saves backward-compatible. */
export function focusDeal(s:GameState,id:string){
 const c=s.ceo;if(!c||!c.leads.some(l=>l.id===id))return;
 c.dealSessions??={};
 const old=c.activeDealId??c.negotiation?.id??c.pitch?.id;
 if(old===id){c.activeDealId=id;return;}
 if(old&&(c.pitch?.id===old||c.negotiation?.id===old)){
  c.dealSessions[old]={pitch:c.pitch?.id===old?c.pitch:null,negotiation:c.negotiation?.id===old?c.negotiation:null};
 }
 const chosen=c.dealSessions[id];
 c.pitch=chosen?.pitch??null;c.negotiation=chosen?.negotiation??null;
 c.activeDealId=id;
}
export function activeDealCount(c:CEO){
 const ids=new Set<string>();
 if(c.pitch&&["prepare","objection","revision"].includes(c.pitch.step))ids.add(c.pitch.id);
 if(c.negotiation?.status==="open")ids.add(c.negotiation.id);
 for(const [id,session] of Object.entries(c.dealSessions??{}))
  if((session.pitch&&["prepare","objection","revision"].includes(session.pitch.step))||session.negotiation?.status==="open")ids.add(id);
 return ids.size;
}
export function activeDealLimit(s:GameState){
 const businessSpecialists=s.staff.filter(id=>["account","strategy"].includes(primaryRole(id)??"")).length;
 return clamp(2+Math.floor(businessSpecialists/2),2,5);
}
export function acquisitionDay(s:GameState,fx:Fx){
 const c=s.ceo;if(!c)return;
 for(const l of c.leads){
  if(l.status==="nurturing"&&c.day>=(l.nurtureUntil??Number.MAX_SAFE_INTEGER)){
   // Surface a follow-up in the journal; waiting never auto-converts to a qualified deal.
   if(l.nurtureUntil===c.day){fx.log("Follow-up ready: "+l.brand);}
  }
 }
}
export function onProjectCompleted(s:GameState,fx:Fx,p:Project){
 const c=s.ceo,l=c?.leads.find(x=>x.id===p.leadId);
 if(!c||!l)return;
 const key=relKey(l),prior=relationship(c,l);
 const satisfaction=clamp(Math.round(p.clientTrust??50),5,99);
 c.clientRelationships??={};
 c.clientRelationships[key]={...prior,trust:satisfaction,lastContactDay:c.day,wins:prior.wins+1,notes:["Campaign delivered: KPI "+p.kpi+"%, client trust "+satisfaction,...prior.notes].slice(0,15)};
 l.relationship=satisfaction;
 if(satisfaction<70||(p.quality??0)<70||c.leads.length>=140)return;
 const current=getClient(l.clientMasterId??"");
 const candidates=CLIENT_DATABASE.filter(x=>x.sector===(current?.sector??l.sector)&&
  x.id!==l.clientMasterId&&x.segment!=="bigcorp"&&
  !c.leads.some(other=>other.clientMasterId===x.id&&["new","prospecting","discovery","nurturing","qualified","pitch","negotiating","signed","renewal"].includes(other.status)));
 if(!candidates.length)return;
 const choice=candidates[Math.floor(hash(p.id+":referral")*candidates.length)];
 const seed=agencyLeadForClient(choice);
 const id="referral-"+choice.id+"-"+(++c.seq);
 const newLead:Lead={...seed,id,status:"new",source:"referral",referralFrom:l.brand,relationship:70};
 c.leads.unshift(newLead);
 c.clientRelationships[key].referrals+=1;
 fx.log("Referral earned: "+l.brand+" introduced "+choice.brand+" after a successful campaign");
 fx.toast("New referral from "+l.brand+": "+choice.brand);
}
