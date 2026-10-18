/** Staff-operated agency side gigs.
 * Shares the Bedroom public listings, NPC applicant selection and V6 deliverable
 * templates without mutating the solo campaign or personal wallet.
 * All time advances on the existing manual End Week simulation.
 */
import {employeeById,clamp,money} from "./data";
import {CLIENT_BY_ID} from "./clientDatabase";
import {getFreelanceJob} from "./freelanceJobTemplates";
import {newFreelanceV4,designFor,composeCardOutput,artifactScore} from "./freelanceWorkflows";
import {talentPool} from "./clientTeams";
import {eligibleForRole,effectiveCapacity,taskFit,staffRate,profile} from "./personnel";
import type {AgencyGig,GameState,FreelanceV4Artifact} from "./state";
import type {Fx} from "./store";

const roles:Record<string,string>={
 "social-pack":"creative","social-audit":"analytics","content-calendar":"strategy",
 "landing-page":"creative","meta-setup":"media","audience-research":"research",
 "content-sprint":"production","mini-launch":"strategy"
};
export const gigRole=(jobId:string)=>roles[jobId]??"creative";
export const agencyGigs=(s:GameState)=>s.ceo?.agencyGigs??[];
const active=(g:AgencyGig)=>g.status==="working"||g.status==="revision";

/** Dedicated campaign team members cannot be borrowed by a different client.
 * Free-pool employees can handle up to their actual effective task capacity. */
export function eligibleGigStaff(s:GameState,jobId:string){
 if(!s.agencyUnlocked||!s.ceo||!getFreelanceJob(jobId))return [];
 const role=gigRole(jobId);
 return talentPool(s).filter(id=>s.staff.includes(id)&&eligibleForRole(id,role)&&effectiveCapacity(s,id)>0&&
   agencyGigs(s).filter(g=>active(g)&&g.staffId===id).length<effectiveCapacity(s,id))
  .sort((a,b)=>taskFit(s,b,role,jobId)-taskFit(s,a,role,jobId));
}
export function agencyGigGate(s:GameState,jobId:string){
 if(!s.agencyUnlocked||!s.ceo)return "Create an agency first";
 if(!s.staff.length)return "Hire an employee to deliver freelance jobs";
 if(!eligibleGigStaff(s,jobId).length)return "No available specialist in your talent pool. Hire or free a suitable employee";
 return null;
}
/** A winning application is only an offer. The CEO explicitly accepts it and
 * assigns a real specialist; no deposit or phantom job/advance payments. */
export function acceptAgencyGigOffer(s:GameState,fx:Fx,applicationId:string,staffId:string){
 if(!s.agencyUnlocked||!s.ceo)return false;
 const a=s.freelanceBoard?.applications.find(x=>x.id===applicationId);
 const listing=s.freelanceBoard?.listings.find(l=>l.id===a?.listingId);
 const t=getFreelanceJob(a?.templateId);
 if(!a||a.status!=="selected"||!listing||!t)return false;
 if(agencyGigs(s).some(g=>g.applicationId===a.id))return false;
 if(!eligibleGigStaff(s,t.id).includes(staffId))return fx.toast("Assign an available qualified employee, not a reserved client-team member."),false;
 if(s.agencyCash<t.outOfPocket)return fx.toast("Agency needs "+money(t.outOfPocket)+" to cover production expenses."),false;
 const day=s.ceo.day;
 const gig:AgencyGig={id:"agency-gig:"+a.id,applicationId:a.id,listingId:listing.id,
  clientId:listing.clientId,templateId:t.id,staffId,
  fee:a.proposedFee,expenses:t.outOfPocket,startedDay:day,deadlineDay:day+t.days,
  workHours:0,requiredHours:t.hours,laborCost:0,status:"working",reviewRound:0,
  quality:0,artifacts:[],feedback:"Assigned to "+(employeeById(staffId)?.name??staffId)+". Work progresses when you end a week."};
 (s.ceo.agencyGigs??=[]).push(gig);
 a.status="accepted";
 s.agencyCash-=t.outOfPocket;s.ceo.totalDirect+=t.outOfPocket;
 s.ceo.ledger.unshift({day,what:"Side gig production · "+t.title,value:-t.outOfPocket,lead:CLIENT_BY_ID[a.clientId]?.brand??a.clientId,status:"paid"});
 fx.log("Agency side gig signed: "+t.title+" · "+(employeeById(staffId)?.name??staffId)+" assigned");
 fx.toast("Employee assigned. End Week to progress the side gig.");
 return true;
}
export function reassignAgencyGig(s:GameState,fx:Fx,gigId:string,newId:string){
 const g=agencyGigs(s).find(g=>g.id===gigId);
 if(!g||!active(g)||g.staffId===newId)return false;
 if(!eligibleGigStaff(s,g.templateId).includes(newId))return fx.toast("Employee is unavailable or does not match this task."),false;
 g.staffId=newId;
 g.feedback="Reassigned to "+(employeeById(newId)?.name??newId)+". Existing production progress was preserved.";
 fx.log(g.feedback);
 return true;
}
function createStaffOutput(s:GameState,g:AgencyGig){
 const design=designFor(g.templateId);
 if(!design)return [];
 const client=CLIENT_BY_ID[g.clientId];
 const fit=taskFit(s,g.staffId,gigRole(g.templateId),g.templateId);
 const output=newFreelanceV4(g.templateId).artifacts;
 return output.map((a,index)=>{
  const unit=design.units[index];
  const decisions:Record<string,string>={};
  for(const [i,field] of unit.fields.entries()){
   const sorted=[...field.options].sort((x,y)=>y.fit-x.fit);
   const rank=fit>=78||g.reviewRound>0?0:fit>=62&&((index+i)%3!==0)?0:Math.min(1,sorted.length-1);
   decisions[field.id]=sorted[rank].id;
  }
  const copy=composeCardOutput(g.templateId,a.id,decisions,client?.brand??"Client");
  const result:FreelanceV4Artifact={...a,decisions,copy,version:g.reviewRound+1,status:"ready",score:0,feedback:"",
   versions:[{version:g.reviewRound+1,copy,decisions}]};
  result.score=artifactScore(g.templateId,result);
  return result;
 });
}
function produce(s:GameState,g:AgencyGig){
 g.artifacts=createStaffOutput(s,g);
 const avg=g.artifacts.reduce((sum,a)=>sum+a.score,0)/Math.max(1,g.artifacts.length);
 const fit=taskFit(s,g.staffId,gigRole(g.templateId),g.templateId);
 const late=Math.max(0,(s.ceo?.day??s.clock.day)-g.deadlineDay);
 g.quality=clamp(Math.round(avg*.60+fit*.40+(g.reviewRound>0?8:0)-late*1.8),35,98);
 g.status="ready";
 g.feedback="Employee deliverables are ready. Review each output before submitting to the client.";
}
/** Staff are paid once in CEO's existing daily payroll. Gig effort attributes
 * labor cost for the margin only, never charges payroll twice. */
export function progressAgencyGigsDay(s:GameState,fx:Fx){
 if(!s.agencyUnlocked||!s.ceo)return;
 for(const g of agencyGigs(s)){
  if(!active(g))continue;
  if(!s.staff.includes(g.staffId)||effectiveCapacity(s,g.staffId)===0){g.feedback="Assigned employee unavailable. Reassign a specialist.";continue;}
  const taskLoad=agencyGigs(s).filter(x=>active(x)&&x.staffId===g.staffId).length;
  const speed=staffRate(s,g.staffId,gigRole(g.templateId),Math.max(1,taskLoad),g.templateId).speed;
  const work=Math.min(g.requiredHours-g.workHours,Math.max(.5,Math.round(4*speed*100)/100));
  if(work<=0){produce(s,g);continue;}
  g.workHours=Number((g.workHours+work).toFixed(2));
  // Allocate the already-paid daily wage across concurrent side gigs, rather than double counting salary.
  g.laborCost+=((employeeById(g.staffId)?.salary??3000000)/30)*Math.min(1,work/4)/Math.max(1,taskLoad);
  if(g.workHours+0.001>=g.requiredHours){
   produce(s,g);
   fx.log("Side gig output ready · "+(CLIENT_BY_ID[g.clientId]?.brand??g.clientId)+" · quality "+g.quality);
  }
 }
}
/** Client review is a real separate step controlled by the player.
 * Low-quality work triggers staff-led revisions before the final settlement. */
export function submitAgencyGig(s:GameState,fx:Fx,gigId:string){
 const g=agencyGigs(s).find(x=>x.id===gigId),t=getFreelanceJob(g?.templateId);
 if(!g||!t||!s.ceo||!s.agencyUnlocked||g.status!=="ready"||!g.artifacts.length)return false;
 if(g.quality<78&&g.reviewRound<t.revisions){
  g.reviewRound++;g.status="revision";g.workHours=0;g.requiredHours=Math.max(3,Math.ceil(t.hours*.22));
  g.feedback="Client requests revision "+g.reviewRound+"/"+t.revisions+": strengthen the weak evidence, messaging and final CTA.";
  fx.toast("Client asked for revision. Assigned employee will redo the work next week.");
  fx.log("Side gig client requested revision: "+(CLIENT_BY_ID[g.clientId]?.brand??g.clientId));
  return true;
 }
 const deduction=g.quality<78?0.15:0;
 const paid=Math.round(g.fee*(1-deduction));
 // The status is the idempotency guard; reopening a saved game cannot re-credit it.
 g.status="paid";g.completedDay=s.ceo.day;
 g.feedback=deduction?"Final deliverables accepted with a 15% quality deduction.":"Deliverables approved. Client paid the agency.";
 g.artifacts.forEach(a=>{a.status="approved";a.approvedVersion=a.version;a.feedback=g.feedback;});
 s.agencyCash+=paid;
 s.ceo.totalBilled+=paid;s.ceo.totalPaid+=paid;
 s.ceo.ledger.unshift({day:s.ceo.day,what:"Agency side gig paid · "+t.title,value:paid,lead:CLIENT_BY_ID[g.clientId]?.brand??g.clientId,status:"paid",project:g.id});
 s.reputation=clamp(s.reputation+(deduction?0:1),0,100);
 fx.log("Agency side gig final submitted · +"+money(paid)+" to agency cash; margin "+money(paid-g.expenses-g.laborCost));
 fx.toast("Client paid "+money(paid)+" to Agency Cash.");
 return true;
}
export const sideGigReceipts=(s:GameState)=>agencyGigs(s).filter(g=>g.status==="paid").reduce((sum,g)=>sum+Math.round(g.fee*(g.quality<78?.85:1)),0);
