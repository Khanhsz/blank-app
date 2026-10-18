import test from "node:test";
import {readFileSync} from "node:fs";
import assert from "node:assert/strict";
import {defaults,migrate} from "../src/game/state";
import {FREELANCE_JOBS,getFreelanceJob} from "../src/game/freelanceJobTemplates";
import {chooseFreelanceClient} from "../src/game/campaign";
import {startSmallJob,deliverSmallJob,doWork,askForReview} from "../src/game/freelanceJobs";
import * as Market from "../src/game/freelanceMarket";
import type {Fx} from "../src/game/store";
const fx:Fx={toast:()=>{},log:()=>{}};
const game=()=>{const s=defaults();s.created=true;return s;};
test("One Bedroom Job Board always shows Startup and SME jobs with both locked and available scopes",()=>{
 const s=game(),b=Market.ensureFreelanceBoard(s);
 assert.equal(b.listings.length,7);
 assert.ok(b.listings.every(l=>l.postedWeek===1));
 assert.ok(b.listings.every(l=>["startup","sme"].some(x=>l.clientId.startsWith(x))));
 assert.ok(b.listings.some(l=>!Market.jobGate(s,getFreelanceJob(l.templateId)!)));
 assert.ok(b.listings.some(l=>Market.isHighBudgetJob(getFreelanceJob(l.templateId)!)));
 assert.equal(Market.ensureFreelanceBoard(s).listings.length,7);
});
test("Reputation 30 is locked out of expensive SME and Startup jobs but keeps entry gigs",()=>{
 const s=game(),t=getFreelanceJob("audience-research")!;
 s.freelanceCareer!.completedGigs=5;s.reputation=30;
 assert.equal(Market.isHighBudgetJob(t),true);
 assert.match(Market.jobGate(s,t)??"",/31/);
 const listing=Market.ensureFreelanceBoard(s).listings.find(x=>x.templateId===t.id)!;
 assert.equal(Market.applyFreelanceJob(s,fx,listing.id,"research","standard"),false);
 assert.equal(s.freelanceBoard?.applications.length,0);
 assert.equal(Market.jobGate(s,getFreelanceJob("social-pack")!),null);
 s.reputation=31;
 assert.equal(Market.jobGate(s,t),null);
 assert.equal(Market.applyFreelanceJob(s,fx,listing.id,"research","standard"),true);
});
test("Application stores chosen approach and fee, consumes one hour, rejects duplicates and caps weekly submissions",()=>{
 const s=game(),board=Market.ensureFreelanceBoard(s);
 for(const l of board.listings.filter(l=>!Market.jobGate(s,getFreelanceJob(l.templateId)!)).slice(0,3)){
  assert.equal(Market.applyFreelanceJob(s,fx,l.id,"creative","competitive"),true);
 }
 assert.equal(s.freelanceBoard!.applications.length,3);
 assert.equal(s.freelanceCareer!.weeklyHours,3);
 const first=board.listings[0];
 assert.equal(Market.applyFreelanceJob(s,fx,first.id,"creative","competitive"),false);
 const a=s.freelanceBoard!.applications[0];
 assert.equal(a.proposedFee,Market.bidFee(getFreelanceJob(a.templateId)!,"competitive"));
 assert.ok(a.score>=0&&a.winChance>=0&&a.winChance<=100);
 assert.equal(a.status,"pending");
});
test("NPC selection resolves only once at End Week and survives save restore without rerolling",()=>{
 const a=game(),b=game(),listing=Market.ensureFreelanceBoard(a).listings.find(l=>l.templateId==="social-pack")!;
 Market.ensureFreelanceBoard(b);
 assert.equal(Market.applyFreelanceJob(a,fx,listing.id,"value","standard"),true);
 assert.equal(Market.applyFreelanceJob(b,fx,listing.id,"value","standard"),true);
 a.clock.week=2;b.clock.week=2;
 Market.advanceFreelanceBoard(a,1,fx);Market.advanceFreelanceBoard(b,1,fx);
 const x=a.freelanceBoard!.applications[0],y=b.freelanceBoard!.applications[0];
 assert.equal(x.status,y.status);
 assert.ok(["selected","rejected"].includes(x.status));
 assert.equal(a.freelanceBoard!.listings.filter(l=>l.postedWeek===2).length,7);
 const saved=migrate(JSON.parse(JSON.stringify(a)));
 assert.equal(saved.freelanceBoard?.applications[0].status,x.status);
 Market.advanceFreelanceBoard(saved,1,fx);
 assert.equal(saved.freelanceBoard?.applications[0].status,x.status);
});
test("No direct Bedroom approach bypasses Job Board; only a selected offer may be accepted",()=>{
 const s=game();const b=Market.ensureFreelanceBoard(s);
 const l=b.listings.find(l=>l.templateId==="social-pack")!;
 assert.equal(chooseFreelanceClient(s,fx,l.clientId,l.templateId),false);
 assert.equal(Market.applyFreelanceJob(s,fx,l.id,"value","standard"),true);
 assert.equal(Market.acceptFreelanceOffer(s,fx,"application-"+l.id,chooseFreelanceClient),false);
 const a=b.applications[0];a.status="selected";a.feedback="Chosen by client";
 assert.equal(Market.acceptFreelanceOffer(s,fx,a.id,chooseFreelanceClient),true);
 assert.equal(a.status,"accepted");
 assert.equal(s.campaign.catalogClientId,l.clientId);
 assert.equal(s.campaign.freelanceJob?.acceptedFee,a.proposedFee);
 assert.equal(Market.acceptFreelanceOffer(s,fx,a.id,chooseFreelanceClient),false);
 assert.equal(s.campaign.aiStatus,"pending","Gemini starts only after accepted offer");
});
test("Accepted quote—not base template fee—drives deposit and final invoice",()=>{
 const s=game();const b=Market.ensureFreelanceBoard(s);
 const l=b.listings.find(x=>x.templateId==="social-pack")!;
 assert.equal(Market.applyFreelanceJob(s,fx,l.id,"creative","premium"),true);
 const a=b.applications[0];a.status="selected";
 assert.equal(Market.acceptFreelanceOffer(s,fx,a.id,chooseFreelanceClient),true);
 const base=getFreelanceJob(l.templateId)!;
 s.campaign.aiStatus="ready";
 s.campaign.aiScenario={...requireMockScenario(s,base)};
 const before=s.personalCash;
 startSmallJob(s,fx);
 const deposit=Math.round(a.proposedFee*.2/10000)*10000;
 assert.equal(s.personalCash,before+deposit);
 for(let i=0;i<3;i++)doWork(s,fx,"quality");
 askForReview(s,fx);deliverSmallJob(s,fx);
 const inv=s.freelanceCareer!.invoices[0];
 assert.equal(inv.amount+deposit,a.proposedFee);
});
function requireMockScenario(s:ReturnType<typeof game>,t:NonNullable<ReturnType<typeof getFreelanceJob>>){
 return {id:"ai-contract",brand:"Fictional contracted client",industry:"Coffee",contact:"Owner",
  budget:t.mediaBudget,fee:t.fee,days:t.days,baseline:45,target:18,metric:"visits",unit:"visits",
  summary:"Scoped social content",client:"Please prepare branded social content",
  trueInsight:"awareness" as const,trueSegment:"students",truePosition:"study",trueCreative:"study",trueObjective:"visits",
  channel:{paid:1,creator:1,promo:1,flyer:1},
  insightOptions:[{id:"awareness",title:"Awareness gap",desc:"Need discovery"}],
  reports:{audit:"",reviews:"",industry:"",interview:""},
  aiMeta:{category:"coffee",seed:8,label:"Simulation"}} as NonNullable<typeof s.campaign.aiScenario>;
}
test("Big Corp never appears in Bedroom and legacy saves without the board remain valid",()=>{
 const s=game(),board=Market.ensureFreelanceBoard(s);
 assert.ok(board.listings.every(l=>!l.clientId.startsWith("bigcorp")&&!l.clientId.startsWith("f50-")));
 const old=game();delete old.freelanceBoard;
 const migrated=migrate(JSON.parse(JSON.stringify(old)));
 assert.equal(migrated.freelanceBoard,undefined);
 assert.equal(chooseFreelanceClient(migrated,fx,"startup-coffee-0"),true,"legacy direct scenarios are preserved for pre-migration saves");
});

// One Bedroom Job Board: no Industry, Client size, Access, or Find job toolbar.
// Locked and available listings are always presented together.
test("Bedroom Job Board displays all weekly jobs directly with no filters",()=>{
 const view=readFileSync("src/components/game/FreelanceMarketplace.tsx","utf8");
 assert.ok(view.includes("visibleListings.map"));
 assert.ok(view.includes("Market.jobGate(game,t)"));
 assert.ok(view.includes('mt-job-market-grid'));
 assert.ok(!view.includes('mt-job-market-filters'));
 assert.ok(!view.includes('aria-label="Search freelance jobs"'));
 assert.ok(!view.includes('aria-label="Filter job access"'));
 assert.ok(!view.includes('aria-label="Filter freelance industry"'));
 assert.ok(!view.includes('aria-label="Filter freelance client size"'));
});

test("Bedroom Apply Job submits immediately, with no Prepare Application screen or form",()=>{
 const view=readFileSync("src/components/game/FreelanceMarketplace.tsx","utf8");
 assert.ok(view.includes('Market.applyDefaultFreelanceJob(s,fx,l.id)'));
 assert.ok(view.includes(':"Apply Job"'));
 assert.ok(!view.includes("Prepare Application"));
 assert.ok(!view.includes("applicationRef"));
 assert.ok(!view.includes('aria-label="Job application form"'));
 assert.ok(!view.includes("mt-job-market-apply"));
});
test("One-click Apply uses the industry-aligned strategy and listed fee and does not bypass gating",()=>{
 const s=game(),board=Market.ensureFreelanceBoard(s);
 const starter=board.listings.find(l=>l.templateId==="social-pack")!;
 const standard=Market.bidFee(getFreelanceJob(starter.templateId)!,"standard");
 assert.equal(Market.applyDefaultFreelanceJob(s,fx,starter.id),true);
 const a=board.applications[0];
 assert.equal(a.proposedFee,standard);
 assert.equal(a.price,"standard");
 assert.equal(a.status,"pending");
 assert.equal(s.freelanceCareer!.weeklyHours,1);
 assert.equal(Market.applyDefaultFreelanceJob(s,fx,starter.id),false,"same job cannot be applied twice");
 const premium=board.listings.find(l=>Market.isHighBudgetJob(getFreelanceJob(l.templateId)!))!;
 assert.equal(Market.applyDefaultFreelanceJob(s,fx,premium.id),false,"reputation and portfolio gates still apply");
 assert.equal(board.applications.length,1);
});
