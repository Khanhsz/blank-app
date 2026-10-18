import type {GameState,FreelanceJobProgress} from "./state";
import {newFreelanceCareer} from "./state";
import {getFreelanceJob,type FreelanceJobTemplate} from "./freelanceJobTemplates";
import {clamp,money} from "./data";
import type {Fx} from "./store";

export const WEEKLY_CAPACITY=28;
export const workload=(s:GameState)=>s.freelanceCareer??(s.freelanceCareer=newFreelanceCareer());
export const completedGigCount=(s:GameState)=>workload(s).completedGigs+workload(s).completedProjects;
export function canOfferJob(s:GameState,t:FreelanceJobTemplate){
 const career=workload(s);
 if(t.tier==="gig")return true;
 if(t.tier==="project")return completedGigCount(s)>=t.requiredGigs;
 return completedGigCount(s)>=t.requiredGigs&&career.completedProjects>=2;
}
export function startSmallJob(s:GameState,fx:Fx){
 const c=s.campaign,p=c.freelanceJob,sc=c.aiScenario,template=getFreelanceJob(p?.templateId);
 if(s.agencyUnlocked||!p||!template||template.tier==="campaign"||!sc||c.aiStatus!=="ready"||c.phase!=="brief")return;
 if(!canOfferJob(s,template))return fx.toast("Build your portfolio before taking this scope.");
 p.stage="work";p.deadlineDay=s.clock.day+template.days;p.hoursWorked=0;p.weekHours=0;
 c.startedDay=s.clock.day;c.phase="planning";
 // Client media remains in a separate non-player budget. Partial upfront fee
 // represents a real commitment; delivery and payment are still required.
 const deposit=Math.round(template.fee*.2/10000)*10000;
 s.personalCash+=deposit;
 fx.log("Signed freelancer scope: "+template.title+" · "+money(template.fee)+" service fee · deposit "+money(deposit));
}
export function doWork(s:GameState,fx:Fx,choice:"research"|"quality"|"speed"){
 const c=s.campaign,p=c.freelanceJob,t=getFreelanceJob(p?.templateId);
 if(!p||!t||p.stage!=="work"||t.tier==="campaign")return;
 const career=workload(s);
 if(career.weeklyWeek!==s.clock.week){career.weeklyWeek=s.clock.week;career.weeklyHours=0;}
 const hours=4;
 if(career.weeklyHours+hours>WEEKLY_CAPACITY)return fx.toast("Your solo workload is full this week. Advance End Week.");
 const required=t.hours+(p.revisions?4:0);
 if(p.hoursWorked>=required)return fx.toast("All agreed deliverables are ready for client review.");
 career.weeklyHours+=hours;p.hoursWorked+=hours;p.weekHours+=hours;
 p.focus=choice;
 const insightAligned=choice==="research"&&scInsightMatches(s);
 const gain=choice==="quality"?4:choice==="research"?(insightAligned?4:2):1;
 p.quality=clamp((p.quality||50)+gain,0,100);
 fx.log("Solo work session: "+t.title+" · "+hours+"h ("+career.weeklyHours+"/"+WEEKLY_CAPACITY+" weekly capacity)");
}
function scInsightMatches(s:GameState){return ["trust","awareness","value","style","location"].includes(s.campaign.aiScenario?.trueInsight??"");}
export function askForReview(s:GameState,fx:Fx){
 const p=s.campaign.freelanceJob,t=getFreelanceJob(p?.templateId);
 if(!p||!t||p.stage!=="work"||p.hoursWorked<t.hours+(p.revisions?4:0))return fx.toast("Finish the deliverables before sending to client.");
 p.stage="feedback";
 const late=s.clock.day>p.deadlineDay?12:0;
 const quality=clamp(p.quality+(p.focus==="quality"?8:0)+(p.focus==="research"?5:0)+(p.revisions?6:0)-late,0,99);
 p.quality=quality;
 p.clientFeedback=quality>=68?"Client approved the agreed deliverables. Prepare handover and final invoice.":
 "Client asks for clearer alignment with the brand brief. Revise the work within the included rounds.";
 fx.log("Client feedback: "+p.clientFeedback);
}
export function reviseSmallJob(s:GameState,fx:Fx){
 const p=s.campaign.freelanceJob,t=getFreelanceJob(p?.templateId);
 if(!p||!t||p.stage!=="feedback"||p.quality>=68||p.revisions>=t.revisions)return;
 p.revisions++;p.stage="work";p.hoursWorked=t.hours;
 fx.log("Revision round "+p.revisions+" for "+t.title);
}
export function deliverSmallJob(s:GameState,fx:Fx){
 const c=s.campaign,p=c.freelanceJob,t=getFreelanceJob(p?.templateId);
 if(!p||!t||p.stage!=="feedback"||(p.quality<68&&p.revisions<t.revisions)||c.final)return fx.toast("Complete client feedback and included revision rounds first.");
 const career=workload(s),id=c.briefId,clientId=c.catalogClientId??"unknown";
 if(career.completedIds.includes(id))return;
 career.completedIds.push(id);
 const late=s.clock.day>p.deadlineDay;
 const quality=clamp(p.quality-(late?8:0),0,99);
 const rating=quality>=75&&!late;
 const remaining=Math.max(0,Math.round((t.fee-Math.round(t.fee*.2/10000)*10000)*(quality<68?.8:1)/10000)*10000);
 const invoiceId="freelance-"+id;
 const delay=clientId.length%5===0?14:7;
 career.invoices.push({id:invoiceId,clientId,amount:remaining,dueDay:s.clock.day+delay,status:"pending",reminded:false});
 s.personalCash-=t.outOfPocket;
 if(t.tier==="gig")career.completedGigs++;else career.completedProjects++;
 if(rating)career.positiveReviews++;
 const past=career.clientWins[clientId]??0;
 if(past===1)career.repeatClients++;
 career.clientWins[clientId]=past+1;
 s.reputation+=rating?6:3;s.expertise+=t.tier==="gig"?2:4;
 p.stage="done";c.phase="results";c.journey??={step:"report",questions:[],diagnosis:null,confidence:0,approach:null,message:"",pitchedCreative:null,pitchFeedback:null,pitchCount:0,mediaPlan:null,review:null};
 c.journey.review={highlight:"kpi",reason:"creative",next:"validate",score:quality};c.journey.step="report";
 c.final={pct:rating?14:2,outcome:t.hours,adReach:0,quality,qualityScore:quality,rep:rating?6:3,xp:2,
  fit:{insight:1,segment:1,position:1,objective:1,creative:1},performance:rating?"target":"near"};
 s.history.push({brand:c.aiScenario?.brand??"Client",outcome:rating?14:2,score:quality,spent:t.outOfPocket,rep:rating?6:3,xp:2,scenarioIndex:c.scenarioIndex,agency:false});
 if(!s.cityUnlocked)s.cityUnlocked=true;
 fx.log("Delivered "+t.title+" · "+money(remaining)+" invoiced · "+(rating?"positive":"neutral")+" review");
 fx.toast("Job delivered. Invoice will settle after a future End Week.");
}
export function settleFreelanceWeek(s:GameState,fx:Fx){
 const career=workload(s);
 career.weeklyHours=0;career.weeklyWeek=s.clock.week;
 for(const invoice of career.invoices){
  if(invoice.status==="paid")continue;
  if(s.clock.day<invoice.dueDay)continue;
  if(invoice.status==="pending"&&invoice.dueDay>s.clock.day-7&&!invoice.reminded&&invoice.clientId.length%5===0){
   invoice.status="late";fx.log("Invoice payment delayed: "+invoice.clientId);continue;
  }
  invoice.status="paid";s.personalCash+=invoice.amount;
  fx.log("Freelance invoice paid: "+money(invoice.amount));
 }
}
export function followUpInvoice(s:GameState,fx:Fx,id:string){
 const invoice=workload(s).invoices.find(x=>x.id===id);
 if(!invoice||invoice.status!=="late"||invoice.reminded)return;
 invoice.reminded=true;invoice.dueDay=s.clock.day+7;fx.log("Client invoice reminder issued; payment scheduled after one week.");
}
export function recordMiniCampaign(s:GameState){
 const career=workload(s),p=s.campaign.freelanceJob;
 if(p?.stage==="done"||!p||getFreelanceJob(p.templateId)?.tier!=="campaign")return;
 if(career.completedIds.includes(s.campaign.briefId))return;
 career.completedIds.push(s.campaign.briefId);career.completedMiniCampaigns++;
 const clientId=s.campaign.catalogClientId??"unknown",past=career.clientWins[clientId]??0;
 if(past===1)career.repeatClients++;
 career.clientWins[clientId]=past+1;
 if((s.campaign.final?.qualityScore??0)>=72)career.positiveReviews++;
 p.stage="done";
}
