/**
 * Turn-based CEO mode. Nothing advances until the founder commits an entire week.
 * Each edition is generated from persisted decisions and observed simulation deltas,
 * without ungrounded LLM news or API calls.
 */
import {ceoDay} from "./ceo";
import {employees,money} from "./data";
import type {Fx} from "./store";
import type {CEO,GameState,WeeklyArticle,WeeklyCategory,WeeklyDecision,WeeklyEdition,WeeklyProgress} from "./state";

export function weeklyOf(c:CEO):WeeklyProgress{
 if(!c.weekly)c.weekly={week:Math.floor((c.day-1)/7)+1,pending:[],editions:[],lastAdvanceDay:c.day};
 return c.weekly;
}
export function unreadEdition(s:GameState):WeeklyEdition|null{
 return s.ceo?.weekly?.editions.find(e=>!e.read)??null;
}
function addDecision(c:CEO,category:WeeklyCategory,headline:string,detail:string){
 const week=weeklyOf(c);
 const last=week.pending[week.pending.length-1];
 if(last?.headline===headline&&last?.detail===detail)return;
 week.pending.push({id:"decision-"+week.week+"-"+week.pending.length,day:c.day,category,headline,detail});
 week.pending=week.pending.slice(-40);
}
/** Called for every manual player action via the central store; not during End Week. */
export function captureDecision(before:GameState,after:GameState){
 const a=before.ceo,b=after.ceo;
 if(!before.agencyUnlocked||!a||!b||a.day!==b.day)return;
 const hired=after.staff.filter(id=>!before.staff.includes(id));
 const left=before.staff.filter(id=>!after.staff.includes(id));
 for(const id of hired){
  const e=employees.find(x=>x.id===id);
  addDecision(b,"talent","Hired "+(e?.name||id),"You recruited "+(e?.role||id)+". The hire increases monthly payroll and improves access to delivery capacity.");
 }
 for(const id of left){
  const e=employees.find(x=>x.id===id);
  addDecision(b,"talent","Lost "+(e?.name||id),"The employee left your agency. Any unfinished assigned tasks require reassignment or outsourcing.");
 }
 if(before.officeId!==after.officeId){
  addDecision(b,"decisions","Relocated agency headquarters","You moved from "+before.officeId+" to "+after.officeId+". Rent, desk capacity and pitch prestige now follow the new site.");
 }
 for(const l of b.leads){
  const prev=a.leads.find(x=>x.id===l.id);
  if(!prev||prev.status===l.status)continue;
  const status=l.status;
  const explanation:Record<string,string>={
   qualified:"You paid to qualify this lead. Research and pitching became available.",
   pitch:"You committed the pitch-preparation budget to enter the competitive tender.",
   pitch_won:"Your proposal outscored rival agencies; contract negotiation is now available.",
   negotiating:"You began contract negotiations. Terms and payment exposure may change.",
   signed:"You signed an agreement. Delivery obligations and future client payments now matter.",
   declined:"You chose not to pursue this opportunity.",
   lost:"The agency did not secure this account under the current bidding or negotiation outcome.",
   renewal:"An existing relationship created a renewal opportunity."
  };
  addDecision(b,"clients",l.brand+" · "+status.replace("_"," "),explanation[status]||"Client pipeline moved to "+status+".");
 }
 if(a.pitch?.step==="prepare"&&b.pitch?.step==="objection"&&b.pitch){
  addDecision(b,"decisions","Presented your competitive pitch","Pitch focused on "+b.pitch.focus+" with "+b.pitch.team+" staffing and "+b.pitch.evidence+" evidence. These inputs influence rival bid comparison.");
 }
 if(a.negotiation&&b.negotiation&&b.negotiation.round>a.negotiation.round){
  addDecision(b,"decisions","Negotiated new commercial terms","Client negotiation reached round "+b.negotiation.round+". Proposed fee: "+money(b.negotiation.fee)+"; advance "+b.negotiation.advance+"%.");
 }
 if(b.partners.length>a.partners.length){
  for(const id of b.partners.filter(id=>!a.partners.includes(id))){
   addDecision(b,"operations","Signed a delivery partner",id+" partnership provides support and may add future retainer costs.");
  }
 }
 for(const issue of b.inbox){
  const old=a.inbox.find(x=>x.id===issue.id);
  if(issue.status==="resolved"&&old?.status==="open"){
   addDecision(b,"decisions","Resolved a CEO escalation",issue.message+" Decision: "+(issue.resolution||"acknowledged")+".");
  }
 }
 for(const [id,raise] of Object.entries(b.salaryPremiums||{})){
  if(raise!==(a.salaryPremiums?.[id]||0)){
   const emp=employees.find(e=>e.id===id);
   addDecision(b,"talent","Matched a competing talent offer",(emp?.name||id)+" now earns "+money(raise)+" more each month than their original salary. This raises recurring payroll.");
  }
 }
}

/** Advances exactly seven simulation days and commits a grounded newspaper for the next week. */
export function endWeek(s:GameState,fx:Fx):WeeklyEdition|null{
 if(!s.agencyUnlocked||!s.ceo)return null;
 const c=s.ceo,weekly=weeklyOf(c);
 if(weekly.editions.some(e=>!e.read)){fx.toast("Read the current weekly edition before ending another week.");return null}
 const from=c.day,completed=weekly.week;
 const beforeCash=s.agencyCash,beforeRep=s.reputation;
 const beforeProjectCount=c.projects.filter(p=>p.status==="active").length;
 const beforeCompleted=new Set(c.projects.filter(p=>p.status==="completed").map(p=>p.id));
 const priorLeadStatus=new Map(c.leads.map(l=>[l.id,l.status]));
 const priorRivalWins=new Map(c.rivals.map(r=>[r.id,r.wins??0]));
 const decisions=[...weekly.pending];
 // Weekly turns process all seven days atomically. Any escalation is reported in
 // the weekly edition and inbox, not a real-time pause between simulated days.
 const simulationFx:Fx={log:fx.log,toast:()=>{}};
 for(let i=0;i<7;i++)ceoDay(s,c,simulationFx);
 const to=c.day;
 const articles:WeeklyArticle[]=[];
 const append=(category:WeeklyCategory,headline:string,body:string,evidence:string,impact:WeeklyArticle["impact"]="neutral")=>{
  articles.push({id:"story-"+(completed)+"-"+articles.length,category,headline,body,evidence,impact});
 };
 for(const d of decisions)append(d.category,d.headline,d.detail,"Founder decision recorded on day "+d.day,"neutral");
 const net=s.agencyCash-beforeCash;
 const financialEntries=c.ledger.filter(e=>e.day>from&&e.day<=to);
 const payroll=financialEntries.filter(e=>e.what==="Daily payroll").reduce((sum,e)=>sum-e.value,0);
 const rent=financialEntries.filter(e=>e.what.startsWith("Office overhead")).reduce((sum,e)=>sum-e.value,0);
 append("finance",net>=0?"Agency cash increased this week":"Agency cash decreased this week",
  "Net cash movement: "+(net>=0?"+":"")+money(net)+". Seven days of payroll and office overhead totalled "+money(payroll+rent)+". Other effects include project spending, invoices paid and your agency decisions.",
  "Opening cash "+money(beforeCash)+" → closing cash "+money(s.agencyCash)+" · payroll "+money(payroll)+" · office "+money(rent),net>=0?"positive":"negative");
 const newlyCompleted=c.projects.filter(p=>p.status==="completed"&&!beforeCompleted.has(p.id));
 for(const p of newlyCompleted)append("operations",p.brand+" campaign delivered",
  "Your agency completed the client workstreams and generated the recorded KPI result. Delivery quality and payment events affect future opportunities.",
  "Client project "+p.id+" · KPI "+(p.kpi??"pending")+" · project completed day "+(p.completedDay??to),"positive");
 const progressing=c.projects.filter(p=>p.status==="active");
 if(progressing.length)append("operations",progressing.length+" client project"+(progressing.length===1?"":"s")+" in delivery",
  "Team members and external specialists advanced assigned tasks based on your staffing and outsourcing choices.",
  progressing.map(p=>p.brand+": day "+p.days+"/"+p.duration+", "+p.tasks.filter(t=>t.status==="completed").length+"/"+p.tasks.length+" workstreams complete").join(" · "),"neutral");
 const updatedLeads=c.leads.filter(l=>priorLeadStatus.has(l.id)&&priorLeadStatus.get(l.id)!==l.status);
 for(const l of updatedLeads.slice(0,5))append("clients",l.brand+" · "+l.status.replace("_"," "),
  l.status==="lost"?"The tender or contract opportunity closed without a win for your agency.":"The client pipeline changed during weekly simulation.",
  "Previous status "+priorLeadStatus.get(l.id)+" → "+l.status+(l.lostTo?" · won by "+l.lostTo:""),l.status==="lost"?"negative":"neutral");
 const rivalEvents=(c.rivalNews??[]).filter(e=>e.day>from&&e.day<=to);
 for(const event of rivalEvents.slice(0,7))append("competition",event.message,
  event.kind==="win"?"A competitor's real tender outcome updated its customer portfolio and future capacity.":"A rival agent acted on its finances, capabilities, client pipeline or hiring strategy during the past seven days.",
  "Rival market event · day "+event.day+" · "+event.kind,event.kind==="win"?"negative":"neutral");
 const offers=(c.talentOffers??[]).filter(o=>o.day>from&&o.day<=to);
 for(const offer of offers.slice(0,3)){
  const employee=employees.find(x=>x.id===offer.employeeId);
  append("talent",(employee?.name||offer.employeeId)+" received a competing offer",
   offer.status==="open"?"A rival agency approached your employee. Respond in the CEO inbox before the next week ends.":"The competing offer has been "+offer.status+".",
   "Day "+offer.day+" · bonus "+money(offer.bonus)+" · monthly raise "+money(offer.raise),offer.status==="left"?"negative":"neutral");
 }
 const repDelta=s.reputation-beforeRep;
 if(repDelta!==0)append("operations","Agency reputation "+(repDelta>0?"improved":"declined"),
  "Your reputation changed following client results and other recorded agency outcomes.",
  "Reputation "+beforeRep+" → "+s.reputation,repDelta>0?"positive":"negative");
 if(!decisions.length)append("decisions","No founder decisions recorded",
  "This edition reflects existing contracts, team capacity and competitor movements. No new strategic decisions were logged before you ended the week.",
  "No decision journal entries for week "+completed,"neutral");
 const edition:WeeklyEdition={
  id:"weekly-edition-"+completed+"-"+to,weekCompleted:completed,weekStarted:completed+1,
  dayFrom:from+1,dayTo:to,articles,cashBefore:beforeCash,cashAfter:s.agencyCash,repBefore:beforeRep,repAfter:s.reputation,
  projectsBefore:beforeProjectCount,projectsAfter:c.projects.filter(p=>p.status==="active").length,
  rivalsWon:c.rivals.reduce((sum,r)=>sum+(r.wins??0)-(priorRivalWins.get(r.id)||0),0),
  completedProjects:newlyCompleted.length,read:false
 };
 weekly.week++;
 weekly.lastAdvanceDay=to;
 weekly.pending=[];
 weekly.editions.unshift(edition);
 weekly.editions=weekly.editions.slice(0,24);
 fx.log("Week "+completed+" concluded · week "+weekly.week+" begins; a new market bulletin is available.");
 fx.toast("Week "+weekly.week+" started · read your weekly business news.");
 return edition;
}
export function acknowledgeEdition(s:GameState,id:string){
 const edition=s.ceo?.weekly?.editions.find(e=>e.id===id);
 if(edition)edition.read=true;
}
