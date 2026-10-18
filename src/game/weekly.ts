/**
 * Global turn clock: Week 1 starts in the bedroom; the same clock continues
 * through freelancing and CEO progression. Every turn advances exactly 7 days.
 * No browser timers or AI-generated outcomes are used.
 */
import {ceoDay} from "./ceo";
import {progressFreelanceWeek,scenarioOf,phaseOf,scheduleOf} from "./campaign";
import {employees,money} from "./data";
import {ensureRecruitment} from "./recruitment";
import {advanceCompanyMarket,recordClientDelivery,ensureCompanyMarket} from "./companyMarket";
import {catalogForBrand} from "./clientDatabase";
import {settleFreelanceWeek} from "./freelanceJobs";
import {ensureFreelanceBoard,advanceFreelanceBoard} from "./freelanceMarket";
import type {Fx} from "./store";
import type {GameState,GameClock,WeeklyArticle,WeeklyCategory,WeeklyDecision,WeeklyEdition} from "./state";

export function weeklyOf(s:GameState):GameClock{return s.clock;}
export function unreadEdition(s:GameState):WeeklyEdition|null{return s.clock.editions.find(e=>!e.read)??null;}

function addDecision(s:GameState,category:WeeklyCategory,headline:string,detail:string){
 const w=s.clock,last=w.pending[w.pending.length-1];
 if(last?.headline===headline&&last?.detail===detail)return;
 w.pending.push({id:"decision-"+w.week+"-"+w.pending.length,day:w.day,category,headline,detail});
 w.pending=w.pending.slice(-40);
}

/** Capture actual decisions before a week commits; never journal a clock tick. */
export function captureDecision(before:GameState,after:GameState){
 if(before.clock.day!==after.clock.day)return;
 const a=before.campaign,b=after.campaign;
 if(a.briefId===b.briefId){
  if(phaseOf(a)!==phaseOf(b))addDecision(after,"decisions","Campaign moved to "+phaseOf(b),scenarioOf(b).brand+" changed from "+phaseOf(a)+" to "+phaseOf(b)+".");
  if(b.research.length>a.research.length)addDecision(after,"decisions","Research commissioned",b.research.filter(x=>!a.research.includes(x)).join(", "));
  if(!a.survey&&b.survey)addDecision(after,"decisions","Survey conducted","Sample size "+b.survey.sample+" · audience "+b.survey.audience);
  if(a.insight!==b.insight&&b.insight)addDecision(after,"decisions","Insight hypothesis selected",b.insight);
  if(a.creative!==b.creative&&b.creative)addDecision(after,"operations","Creative production commissioned",b.creative+" · scheduled for next weekly review");
  if(!a.mediaBooked&&b.mediaBooked)addDecision(after,"operations","Media booked","Committed "+money(Object.values(b.media).reduce((sum,v)=>sum+v,0)));
  if(a.optimization!==b.optimization&&b.optimization)addDecision(after,"decisions","Optimization selected",b.optimization);
 }else{
  addDecision(after,"clients","New client brief received",scenarioOf(b).brand+" · "+scheduleOf(b).weeks+" week campaign");
 }
 const ac=before.ceo,bc=after.ceo;
 if(!before.agencyUnlocked||!ac||!bc)return;
 const placed=after.recruitment?.postings?.filter(p=>!(before.recruitment?.postings??[]).some(previous=>previous.id===p.id))??[];
 for(const posting of placed){
  addDecision(after,"talent","Recruitment campaign launched",
   posting.channel+" · posting fee "+money(posting.fee)+" · applications expected Week "+posting.arrivalWeek);
 }
 for(const id of after.staff.filter(x=>!before.staff.includes(x))){
  const e=employees.find(x=>x.id===id);
  addDecision(after,"talent","Hired "+(e?.name||id),"Team capacity increased in "+(e?.role||"a function")+". Payroll will rise.");
 }
 for(const id of before.staff.filter(x=>!after.staff.includes(x))){
  addDecision(after,"talent","Employee departed",id+" left; outstanding functional capacity may be affected.");
 }
 if(before.officeId!==after.officeId)addDecision(after,"operations","Agency relocated","HQ moved from "+before.officeId+" to "+after.officeId);
 for(const l of bc.leads){
  const prev=ac.leads.find(x=>x.id===l.id);
  if(prev&&prev.status!==l.status)addDecision(after,"clients",l.brand+" · "+l.status.replace("_"," "),"Pipeline status moved from "+prev.status+" to "+l.status+".");
 }
 if(ac.pitch?.step==="prepare"&&bc.pitch?.step==="objection"&&bc.pitch)addDecision(after,"decisions","Competitive pitch presented","Focus "+bc.pitch.focus+" · staffing "+bc.pitch.team+" · evidence "+bc.pitch.evidence);
 if(ac.negotiation&&bc.negotiation&&bc.negotiation.round>ac.negotiation.round)addDecision(after,"clients","Contract terms renegotiated","Round "+bc.negotiation.round+" · fee "+money(bc.negotiation.fee));
 for(const id of bc.partners.filter(x=>!ac.partners.includes(x)))addDecision(after,"operations","Delivery partner added",id);
 for(const issue of bc.inbox){
  const old=ac.inbox.find(x=>x.id===issue.id);
  if(issue.status==="resolved"&&old?.status==="open")addDecision(after,"decisions","Escalation resolved",issue.message+" · "+(issue.resolution??"acknowledged"));
 }
}

export function endWeek(s:GameState,fx:Fx):WeeklyEdition|null{
 if(!s.created)return null;
 const weekly=weeklyOf(s),c=s.ceo;
 if(s.agencyUnlocked&&!c)return null;
 if(weekly.editions.some(e=>!e.read)){fx.toast("Read this week's report before advancing again.");return null;}
 const from=weekly.day,completed=weekly.week,wasAgency=s.agencyUnlocked;
 const beforeCash=wasAgency?s.agencyCash:s.personalCash,beforeRep=s.reputation;
 const beforeProjects=c?.projects.filter(p=>p.status==="active").length??(s.campaign.phase==="results"?0:1);
 const beforeCompleted=new Set(c?.projects.filter(p=>p.status==="completed").map(p=>p.id)??[]);
 const leadStates=new Map(c?.leads.map(l=>[l.id,l.status])??[]);
 const rivalWins=new Map(c?.rivals.map(r=>[r.id,r.wins??0])??[]);
 const historyCount=s.history.length,decisions=[...weekly.pending];
 const simulationFx:Fx={log:fx.log,toast:()=>{}};
 if(wasAgency&&c){
  for(let i=0;i<7;i++)ceoDay(s,c,simulationFx);
  weekly.day=c.day;
 }else weekly.day+=7;
 weekly.week++;weekly.lastAdvanceDay=weekly.day;
 if(!wasAgency){
  if(s.campaign.freelanceJob?.v4&&s.campaign.freelanceJob.v4.step!=="paid"&&s.campaign.freelanceJob.v4.step!=="brief"){
   // V4 all eight scopes—including Mini Launch—use the title-specific
   // Deliverable Board and client review, never the legacy campaign auto-tick.
   const job=s.campaign.freelanceJob;
   if(s.clock.day>job.deadlineDay&&job.stage==="work")simulationFx.log("V4 freelancer deadline passed; client review will reflect late delivery.");
  }else if(s.campaign.freelanceJob&&s.campaign.freelanceJob.stage!=="done"&&s.campaign.freelanceJob.stage!=="brief"&&s.campaign.freelanceJob.templateId!=="mini-launch"){
   // Small jobs are driven by focused work sessions, not 7-stage media ticks.
   const job=s.campaign.freelanceJob;
   if(weekly.day>job.deadlineDay&&job.stage==="work")simulationFx.log("Freelance deadline passed; quality penalty applies at client review.");
  }else progressFreelanceWeek(s,simulationFx);
  settleFreelanceWeek(s,simulationFx);
 }
 // Refresh the shared market for both bedroom freelancers and staffed agencies.
 ensureFreelanceBoard(s);
 advanceFreelanceBoard(s,completed,simulationFx);
 const to=weekly.day;
 if(c)c.weekly=weekly;
 // Project completions are queued by CEO, freelancer deliveries are queued
 // here; one business tick per End Week updates all clients and competitors.
 if(!wasAgency&&s.history.length>historyCount){
  const last=s.history[s.history.length-1];
  recordClientDelivery(s,{clientId:s.campaign.catalogClientId??catalogForBrand(last.brand)?.id,
   projectId:"freelance-"+s.campaign.briefId,spendVnd:last.spent,quality:last.score,kpi:last.outcome});
 }
 const quarterly=advanceCompanyMarket(s,completed,simulationFx);
 const articles:WeeklyArticle[]=[];
 const append=(category:WeeklyCategory,headline:string,body:string,evidence:string,impact:WeeklyArticle["impact"]="neutral")=>{
  articles.push({id:"story-"+completed+"-"+articles.length,category,headline,body,evidence,impact});
 };
 for(const d of decisions)append(d.category,d.headline,d.detail,"Decision recorded on Day "+d.day);
 const afterCash=wasAgency?s.agencyCash:s.personalCash,net=afterCash-beforeCash;
 append("finance",net>=0?"Cash balance improved":"Cash balance decreased",
  (wasAgency?"Agency":"Freelance")+" cash moved "+(net>=0?"+":"")+money(net)+" during Week "+completed+".",
  money(beforeCash)+" → "+money(afterCash),net>0?"positive":net<0?"negative":"neutral");
 if(wasAgency&&c){
  const entries=c.ledger.filter(e=>e.day>from&&e.day<=to),payroll=entries.filter(e=>e.what==="Daily payroll").reduce((a,e)=>a-e.value,0);
  const rent=entries.filter(e=>e.what.startsWith("Office overhead")).reduce((a,e)=>a-e.value,0);
  if(payroll+rent)append("finance","Staff and office operating costs","Ongoing agency costs reduce runway and should be supported by client cash receipts.","Payroll "+money(payroll)+" · office "+money(rent));
  const completedProjects=c.projects.filter(p=>p.status==="completed"&&!beforeCompleted.has(p.id));
  for(const p of completedProjects)append("operations",p.brand+" delivered","Campaign completed; KPI, quality and project margin were recorded.","Project "+p.id+" · KPI "+(p.kpi??"pending"),"positive");
  for(const p of c.projects.filter(p=>p.status==="active"))append("operations",p.brand+" in delivery",
   "Workstreams progress from staffing, inter-team dependencies and outsourcing. Check Functions for bottlenecks.",
   p.tasks.filter(t=>t.status==="completed").length+"/"+p.tasks.length+" tasks · Day "+p.days+"/"+p.duration);
  for(const l of c.leads.filter(l=>leadStates.get(l.id)&&leadStates.get(l.id)!==l.status).slice(0,5))
   append("clients",l.brand+" · "+l.status,"The account pipeline changed during this simulated week.","Before: "+leadStates.get(l.id)+" · After: "+l.status,l.status==="lost"?"negative":"neutral");
  for(const event of (c.rivalNews??[]).filter(e=>e.day>from&&e.day<=to).slice(0,7))
   append("competition",event.message,"A rival agency acted through its existing market simulation.","Day "+event.day+" · "+event.kind,event.kind==="win"?"negative":"neutral");
  for(const offer of (c.talentOffers??[]).filter(o=>o.day>from&&o.day<=to).slice(0,3))
   append("talent","Competing talent offer","A rival tried to recruit "+offer.employeeId+". Check the CEO inbox.","Day "+offer.day+" · bonus "+money(offer.bonus),offer.status==="left"?"negative":"neutral");
 }else{
  const p=s.campaign,sch=scheduleOf(p);
  if(phaseOf(p)==="executing")append("operations","Production and bookings reviewed",
    (p.creative?"Creative production "+(to>=(p.productionReadyDay??Infinity)?"is ready.":"is in progress."):"No creative selected.")+" "+(p.mediaBooked?"Media is booked.":"Media not yet booked."),
    "Game Day "+to+" · launch target Day "+sch.plannedLaunchDay,to>sch.plannedLaunchDay?"negative":"neutral");
  if(p.weeklyResults?.length){
   const last=p.weeklyResults[p.weeklyResults.length-1];
   if(last.week===completed)append("operations","Live campaign performance","Weekly media has been simulated after your decisions.","Reach "+last.reach+" · cumulative KPI uplift "+last.uplift+"%","positive");
  }
  if(s.history.length>historyCount)append("clients",scenarioOf(p).brand+" campaign reviewed",
    "The deadline was reached. Results reflect actual live weeks and any missed flight.",
    "Target +"+scenarioOf(p).target+"% · achieved "+(p.final?.pct??0)+"%",(p.final?.performance==="target"?"positive":"negative"));
  if(to>sch.plannedLaunchDay&&phaseOf(p)!=="live"&&phaseOf(p)!=="results")
   append("clients","Scheduled launch has slipped","Missing production or strategy can shorten the campaign's media flight.","Target Day "+sch.plannedLaunchDay+" · today Day "+to,"negative");
 }
 const liveMarket=ensureCompanyMarket(s);
 if(quarterly){
  const movers=quarterly.entries.filter(x=>x.change!==0).sort((a,b)=>Math.abs(b.change)-Math.abs(a.change)).slice(0,2)
   .map(x=>{const prior=x.previousRank??0;return x.id+" #"+prior+" → #"+x.rank;});
  append("clients","Simulation Fortune 50: quarterly ranking published",
   "Big Corp positions have been recalculated from simulated revenue, brand strength and recent marketing performance.",
   "Game Week "+completed+" · top-50 cohort · "+(movers.join("; ")||"No major rank changes"),"neutral");
 }
 const latestEvents=liveMarket.activity.filter(x=>x.week===completed);
 if(latestEvents.length)append("clients","Campaigns influenced client businesses",
   "Player and rival marketing activity changed modeled brand awareness, growth and revenue; impacts are bounded simulations.",
   latestEvents.filter(x=>x.actor==="player").length+" player · "+latestEvents.filter(x=>x.actor==="rival").length+" rival campaigns","neutral");
 const delta=s.reputation-beforeRep;
 if(delta!==0)append("operations","Reputation "+(delta>0?"increased":"decreased"),"Campaign outcomes changed your standing.","Reputation "+beforeRep+" → "+s.reputation,delta>0?"positive":"negative");
 if(!decisions.length)append("decisions","No decisions recorded this week","Time still moved forward. Deadlines and automated work continue.","Week "+completed);
 const edition:WeeklyEdition={
  id:"weekly-edition-"+completed+"-"+to,weekCompleted:completed,weekStarted:completed+1,
  dayFrom:from+1,dayTo:to,articles,cashBefore:beforeCash,cashAfter:afterCash,repBefore:beforeRep,repAfter:s.reputation,
  projectsBefore:beforeProjects,projectsAfter:c?.projects.filter(p=>p.status==="active").length??(s.campaign.phase==="results"?0:1),
  rivalsWon:c?.rivals.reduce((sum,r)=>sum+(r.wins??0)-(rivalWins.get(r.id)??0),0)??0,
  completedProjects:wasAgency?c?.projects.filter(p=>p.status==="completed"&&!beforeCompleted.has(p.id)).length??0:s.history.length-historyCount,
  read:false
 };
 weekly.pending=[];weekly.editions.unshift(edition);weekly.editions=weekly.editions.slice(0,24);
 ensureRecruitment(s); // refresh the recruiting board only after a completed turn
 fx.log("Week "+completed+" complete · Week "+weekly.week+" begins");
 fx.toast("Week "+weekly.week+" started · read your weekly review");
 return edition;
}
export function acknowledgeEdition(s:GameState,id:string){
 const edition=s.clock.editions.find(e=>e.id===id);
 if(edition)edition.read=true;
}
