import test from "node:test";
import assert from "node:assert/strict";
import {defaults,migrate} from "../src/game/state";
import {scenarios} from "../src/game/data";
import {FREELANCE_JOBS,getFreelanceJob} from "../src/game/freelanceJobTemplates";
import {chooseFreelanceClient,agencyReqs} from "../src/game/campaign";
import * as F from "../src/game/freelanceJobs";
import type {Fx} from "../src/game/store";
const fx:Fx={log:()=>{},toast:()=>{}};
const newGame=()=>{const s=defaults();s.created=true;return s;};
function prepare(id="social-pack"){
 const s=newGame();assert.equal(chooseFreelanceClient(s,fx,"startup-coffee-0",id),true);
 const t=getFreelanceJob(id)!;
 s.campaign.aiScenario={...scenarios[0],id:"ai-"+id,brand:"Mây Corner Coffee",budget:t.mediaBudget,fee:t.fee,days:t.days,
  jobMeta:{templateId:t.id,tier:t.tier,deliverables:t.deliverables,hours:t.hours,revisions:t.revisions,mediaBudget:t.mediaBudget,
   serviceFee:t.fee,successMetric:t.successMetric},
  aiPlanning:{context:"Local startup marketing need",insight:"Near-campus audience needs to see relevant proof",strategy:"Test a simple creative direction"},
  aiMeta:{clientId:"startup-coffee-0",category:"coffee",seed:42,label:"Gemini game simulation"}};
 s.campaign.aiStatus="ready";return s;
}
test("Bedroom starts with affordable solo gigs and locks larger scope until portfolio experience",()=>{
 assert.equal(FREELANCE_JOBS.length,8);const s=newGame();
 assert.equal(F.canOfferJob(s,getFreelanceJob("social-pack")!),true);
 assert.equal(F.canOfferJob(s,getFreelanceJob("mini-launch")!),false);
 assert.equal(chooseFreelanceClient(s,fx,"startup-coffee-0","mini-launch"),false);
 assert.equal(getFreelanceJob("social-pack")!.mediaBudget,0);
 assert.equal(getFreelanceJob("social-pack")!.fee,700000);
 assert.ok(FREELANCE_JOBS.every(x=>x.fee>=300000&&x.fee<=7000000));
});
test("four-phase freelance job has real capped weekly workload, client feedback and delayed invoice",()=>{
 const s=prepare();const t=getFreelanceJob("social-pack")!;
 const start=s.personalCash;
 F.startSmallJob(s,fx);
 assert.equal(s.campaign.freelanceJob?.stage,"work");assert.equal(s.personalCash,start+140000);
 for(let i=0;i<3;i++)F.doWork(s,fx,"quality");
 assert.equal(s.campaign.freelanceJob?.hoursWorked,12);
 assert.equal(s.freelanceCareer?.weeklyHours,12);
 F.askForReview(s,fx);assert.equal(s.campaign.freelanceJob?.stage,"feedback");
 F.deliverSmallJob(s,fx);assert.equal(s.campaign.phase,"results");
 assert.equal(s.freelanceCareer?.completedGigs,1);
 assert.equal(s.campaign.journey?.review?.score,s.campaign.freelanceJob?.quality);
 assert.equal(s.freelanceCareer?.invoices[0].amount,t.fee-140000);
 assert.equal(s.personalCash,start+140000-t.outOfPocket);
 const saved=migrate(JSON.parse(JSON.stringify(s)));
 assert.equal(saved.freelanceCareer?.completedGigs,1);
 assert.equal(saved.campaign.freelanceJob?.stage,"done");
 F.deliverSmallJob(saved,fx);assert.equal(saved.freelanceCareer?.completedGigs,1,"no double bill");
});
test("weekly clock settles unpaid invoices without crediting client media to player",()=>{
 const s=prepare();F.startSmallJob(s,fx);
 for(let i=0;i<3;i++)F.doWork(s,fx,"quality");
 F.askForReview(s,fx);F.deliverSmallJob(s,fx);
 const inv=s.freelanceCareer!.invoices[0];inv.clientId="fast-paid";inv.dueDay=s.clock.day+7;
 const cash=s.personalCash;s.clock.day+=7;s.clock.week++;
 F.settleFreelanceWeek(s,fx);
 assert.equal(inv.status,"paid");
 assert.equal(s.personalCash,cash+inv.amount);

 assert.equal(s.freelanceCareer?.weeklyHours,0);
});
test("revisions and client repeat business count once per client",()=>{
 const s=prepare();const p=s.campaign.freelanceJob!;
 F.startSmallJob(s,fx);
 for(let i=0;i<3;i++)F.doWork(s,fx,"speed");
 F.askForReview(s,fx);
 assert.ok(p.quality<68);
 F.reviseSmallJob(s,fx);assert.equal(p.revisions,1);
 F.doWork(s,fx,"quality");F.askForReview(s,fx);
 assert.ok(p.quality>=68);
 F.deliverSmallJob(s,fx);
 const next=prepare();next.freelanceCareer=s.freelanceCareer;
 F.startSmallJob(next,fx);
 for(let i=0;i<3;i++)F.doWork(next,fx,"quality");
 F.askForReview(next,fx);F.deliverSmallJob(next,fx);
 assert.equal(next.freelanceCareer?.repeatClients,1);
 assert.equal(next.freelanceCareer?.clientWins["startup-coffee-0"],2);
});
test("Bedroom uses meaningful speed-versus-quality trade-offs with bounded work days",()=>{
 const careful=prepare("content-calendar");const fast=prepare("content-calendar");
 F.startSmallJob(careful,fx);F.startSmallJob(fast,fx);
 for(let i=0;i<4;i++)F.doWork(careful,fx,"quality");
 for(let i=0;i<3;i++)F.doWork(fast,fx,"speed");
 assert.equal(careful.campaign.freelanceJob?.hoursWorked,16);
 assert.equal(fast.campaign.freelanceJob?.hoursWorked,16,"fast output is capped at the agreed scope");
 assert.equal(careful.campaign.freelanceJob?.actualWorkHours,16);
 assert.equal(fast.campaign.freelanceJob?.actualWorkHours,12);
 assert.ok(careful.campaign.freelanceJob!.quality>fast.campaign.freelanceJob!.quality);
 assert.equal(F.effectiveWorkDay(careful),careful.clock.day+1);
 assert.equal(F.effectiveWorkDay(fast),fast.clock.day+1);
 F.askForReview(careful,fx);F.askForReview(fast,fx);
 assert.ok(careful.campaign.freelanceJob!.quality>fast.campaign.freelanceJob!.quality);
 const after=migrate(JSON.parse(JSON.stringify(careful)));
 assert.equal(after.campaign.freelanceJob?.actualWorkHours,16);
});
test("Freelancer agency progression needs specialist projects, not mandatory agency-sized campaigns",()=>{
 const s=newGame();s.personalCash=9000000;
 s.freelanceCareer!.completedGigs=6;
 s.freelanceCareer!.completedProjects=2;
 s.freelanceCareer!.positiveReviews=5;
 s.freelanceCareer!.repeatClients=1;
 assert.equal(s.freelanceCareer!.completedMiniCampaigns,0);
 assert.ok(agencyReqs(s).every(x=>x.ok),"two specialist projects and eight gigs unlock agency without forced full-scale media campaigns");
 s.freelanceCareer!.completedProjects=1;
 assert.ok(agencyReqs(s).some(x=>!x.ok));
});
test("Client media spending is never invoiced as personal freelancer income",()=>{
 const s=newGame();s.freelanceCareer!.completedGigs=3;
 assert.equal(chooseFreelanceClient(s,fx,"startup-coffee-0","meta-setup"),true);
 const t=getFreelanceJob("meta-setup")!;
 s.campaign.aiScenario={...scenarios[0],id:"ai-meta-setup",brand:"Mây Corner Coffee",budget:t.mediaBudget,fee:t.fee,days:t.days,
  jobMeta:{templateId:t.id,tier:t.tier,deliverables:t.deliverables,hours:t.hours,revisions:t.revisions,mediaBudget:t.mediaBudget,serviceFee:t.fee,successMetric:t.successMetric},
  aiPlanning:{context:"Local client tracking",insight:"Measure relevant demand",strategy:"Test conversion readiness"},
  aiMeta:{clientId:"startup-coffee-0",category:"coffee",seed:42,label:"Gemini game simulation"}};
 s.campaign.aiStatus="ready";
 const initial=s.personalCash;
 F.startSmallJob(s,fx);
 for(let i=0;i<5;i++)F.doWork(s,fx,"quality");
 F.askForReview(s,fx);F.deliverSmallJob(s,fx);
 const invoice=s.freelanceCareer!.invoices[0];
 assert.equal(t.mediaBudget,2000000);
 assert.equal(initial+Math.round(t.fee*.2/10000)*10000-t.outOfPocket,s.personalCash);
 assert.equal(invoice.amount+Math.round(t.fee*.2/10000)*10000,t.fee);
 assert.ok(invoice.amount<t.mediaBudget);
 assert.ok((s.campaign.freelanceJob?.deliveredDay??0)>=s.clock.day);
});
test("legacy agency eligibility continues to work without resetting old saves",()=>{
 const s=newGame();s.personalCash=9000000;s.reputation=55;s.expertise=30;
 for(let i=0;i<3;i++)s.history.push({brand:"Past freelancer",outcome:12,score:82,spent:2000000,rep:8,xp:4,scenarioIndex:0,agency:false});
 assert.ok(agencyReqs(s).every(x=>x.ok));
});
