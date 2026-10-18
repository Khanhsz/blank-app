import test from "node:test";
import {readFileSync} from "node:fs";
import assert from "node:assert/strict";
import {defaults,migrate} from "../src/game/state";
import {FREELANCE_JOBS,getFreelanceJob} from "../src/game/freelanceJobTemplates";
import {chooseFreelanceClient,nextClient} from "../src/game/campaign";
import {startSmallJob,deliverSmallJob,doWork,askForReview} from "../src/game/freelanceJobs";
import * as Market from "../src/game/freelanceMarket";
import * as V4 from "../src/game/freelanceWorkflows";
import * as V5 from "../src/game/videoMiniGames";
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
test("AI review may resolve immediately without End Week and save cannot reroll",()=>{
 const a=game(),b=game(),listing=Market.ensureFreelanceBoard(a).listings.find(l=>l.templateId==="social-pack")!;
 Market.ensureFreelanceBoard(b);
 assert.equal(Market.applyFreelanceJob(a,fx,listing.id,"value","standard"),true);
 assert.equal(Market.applyFreelanceJob(b,fx,listing.id,"value","standard"),true);
 const assessment=Market.assessFreelanceApplication(a,"application-"+listing.id)!;
 assert.equal(typeof assessment.selected,"boolean");
 assert.equal(a.clock.week,1);
 assert.equal(Market.completeFreelanceApplication(a,fx,"application-"+listing.id,"Gemini analyzed your portfolio against this job.","gemini"),true);
 assert.equal(Market.completeFreelanceApplication(b,fx,"application-"+listing.id,"Gemini analyzed your portfolio against this job.","gemini"),true);
 const x=a.freelanceBoard!.applications[0],y=b.freelanceBoard!.applications[0];
 assert.equal(x.status,y.status);
 assert.equal(x.status,assessment.selected?"selected":"rejected");
 assert.ok(["selected","rejected"].includes(x.status));
 assert.equal(Market.completeFreelanceApplication(a,fx,x.id,"Attempt to reroll","rules"),false);
 assert.equal(a.clock.week,1,"no End Week required for offer");
 const restored=migrate(JSON.parse(JSON.stringify(a)));
 assert.equal(restored.freelanceBoard!.applications[0].status,x.status);
 assert.equal(restored.freelanceBoard!.applications[0].feedback,x.feedback);
});
test("End Week only refreshes listings; pending AI applications stay pending across weekly turns",()=>{
 const s=game(),listing=Market.ensureFreelanceBoard(s).listings.find(l=>l.templateId==="social-pack")!;
 assert.equal(Market.applyFreelanceJob(s,fx,listing.id,"value","standard"),true);
 s.clock.week=2;
 Market.advanceFreelanceBoard(s,1,fx);
 assert.equal(s.freelanceBoard?.applications[0].status,"pending");
 assert.equal(s.freelanceBoard?.listings.filter(l=>l.postedWeek===2).length,7);
 assert.equal(Market.completeFreelanceApplication(s,fx,s.freelanceBoard!.applications[0].id,undefined,"rules"),true);
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

test("One click Apply displays AI Pending and Accept Offer in selected job card",()=>{
 const view=readFileSync("src/components/game/FreelanceMarketplace.tsx","utf8");
 const app=readFileSync("src/App.tsx","utf8");
 assert.ok(view.includes("prepareFreelanceApplicationReviews()"));
 assert.ok(view.includes("AI REVIEW IN PROGRESS"));
 assert.ok(view.includes("Accept Offer"));
 assert.ok(!view.includes("Selection takes place at End Week"));
 assert.ok(app.includes("prepareFreelanceApplicationReviews()"),"review resumes after restore, outside a modal");
});

function v4Game(jobId:string){
 const s=game(),t=getFreelanceJob(jobId)!;
 s.campaign.briefId="v4-"+jobId;
 s.campaign.catalogClientId="startup-coffee-0";
 s.campaign.freelanceJob={templateId:jobId,stage:"brief",hoursWorked:0,revisionHours:0,focus:null,
  clientFeedback:null,quality:50,revisions:0,deadlineDay:0,weekHours:0,actualWorkHours:0,
  acceptedFee:Math.round(t.fee*1.15),v4:V4.newFreelanceV4(jobId)};
 s.campaign.aiScenario=requireMockScenario(s,t);
 s.campaign.aiStatus="ready";
 return s;
}
function fillV4(s:ReturnType<typeof game>,badId?:string){
 const v=s.campaign.freelanceJob!.v4!,def=V4.designFor(s.campaign.freelanceJob!.templateId)!;
 if(def.id==="short-video"){
  for(const a of v.artifacts){
   const patch=idealVideo(a.id);
   assert.equal(V5.changeVideoDraft(s,a.id,patch),true);
   let saved=V5.commitVideoDraft(s,fx,a.id);
   if(!saved){s.clock.week++;saved=V5.commitVideoDraft(s,fx,a.id);}
   assert.equal(saved,true,"video mini-game deliverable "+a.id);
  }
  return;
 }

 for(const a of [...v.artifacts]){
  const unit=def.units.find(x=>x.id===a.id)!;
  const decisions=Object.fromEntries(unit.fields.map(f=>{
   const best=badId===a.id?[...f.options].sort((a,b)=>a.fit-b.fit)[0]:[...f.options].sort((a,b)=>b.fit-a.fit)[0];
   return [f.id,best.id];
  }));
  const copy=badId===a.id?"Draft requires supporting facts.":a.copy;
  let saved=V4.editV4(s,fx,a.id,decisions,copy);
  if(!saved){s.clock.week++;saved=V4.editV4(s,fx,a.id,decisions,copy);}
  assert.equal(saved,true,"saving "+a.id);
 }
}
test("V4 all eight titles produce distinct structured outputs and pay only once after approval",()=>{
 assert.equal(V4.allDesigns.length,8);
 assert.equal(new Set(V4.allDesigns.map(x=>x.workstation)).size,8);
 for(const def of V4.allDesigns){
  const s=v4Game(def.id),c=s.campaign,p=c.freelanceJob!,v=p.v4!,t=getFreelanceJob(def.id)!;
  const initialCash=s.personalCash;
  assert.equal(V4.startV4(s,fx),true);
  assert.equal(s.personalCash,initialCash,"brief and starting the job must not pay deposit");
  assert.equal(v.step,"workspace");
  assert.ok(v.artifacts.length>=4,"job has real separate outputs");
  fillV4(s);
  assert.ok(v.artifacts.every(x=>x.version===1&&x.versions.length===1));
  assert.equal(V4.openV4Board(s,fx),true);
  assert.equal(V4.submitV4Review(s,fx),true);
  assert.equal(v.step,"ready","good work accepted for "+def.id);
  assert.equal(s.personalCash,initialCash,"client review is not payment");
  assert.equal(V4.finalizeV4(s,fx),true);
  const fee=p.acceptedFee!;
  assert.equal(s.personalCash,initialCash+fee-t.outOfPocket);
  assert.equal(v.paidAmount,fee);assert.equal(v.step,"paid");
  assert.equal(V4.finalizeV4(s,fx),false);
  assert.equal(s.freelanceCareer!.completedIds.filter(x=>x===c.briefId).length,1);
  const restored=migrate(JSON.parse(JSON.stringify(s)));
  assert.equal(restored.campaign.freelanceJob?.v4?.step,"paid");
  assert.equal(restored.campaign.freelanceJob?.v4?.artifacts[0].version,1);
  nextClient(restored,fx);
  assert.equal(restored.campaign.catalogClientId,null,"paid job can return to the Job Board");
  assert.equal(restored.campaign.phase,"brief");
 }
});
test("V4 deliverable board allows targeted edits, preserves approved items and controls revision limits",()=>{
 const s=v4Game("social-pack"),p=s.campaign.freelanceJob!,v=p.v4!;
 V4.startV4(s,fx);
 const problem=v.artifacts[0].id;
 fillV4(s,problem);
 V4.openV4Board(s,fx);
 assert.equal(V4.submitV4Review(s,fx),true);
 assert.equal(v.step,"revision");
 const accepted=v.artifacts.filter(a=>a.status==="approved").map(a=>a.id);
 assert.ok(accepted.length>0);
 assert.equal(V4.returnV4Workspace(s,problem),undefined);
 assert.equal(v.step,"workspace");
 const choice=V4.unitFor(p.templateId,problem)!;
 const valid=Object.fromEntries(choice.fields.map(f=>[f.id,[...f.options].sort((a,b)=>b.fit-a.fit)[0].id]));
 assert.equal(V4.editV4(s,fx,problem,valid,v.artifacts[0].copy),true);
 assert.equal(v.artifacts[0].versions.length,2);
 assert.ok(accepted.every(id=>v.artifacts.find(a=>a.id===id)?.status==="approved"));
 assert.equal(V4.openV4Board(s,fx),true);
 assert.equal(V4.submitV4Review(s,fx),true);
 assert.equal(v.step,"ready");
 const originalStatus=v.artifacts.map(a=>a.status);
 const nextVersion=v.reviewVersion;
 assert.equal(V4.applyV4AIReview(s,nextVersion,[{id:problem,feedback:"Client likes this revised social message and execution."}]),true);
 assert.deepEqual(v.artifacts.map(a=>a.status),originalStatus,"AI cannot change awards or review states");
});
test("V4 enforces capacity, completeness and 20% deduction when all included revisions exhausted",()=>{
 const s=v4Game("social-audit"),p=s.campaign.freelanceJob!,v=p.v4!,t=getFreelanceJob("social-audit")!;
 V4.startV4(s,fx);
 assert.equal(V4.openV4Board(s,fx),false);
 fillV4(s,v.artifacts[0].id);
 V4.openV4Board(s,fx);V4.submitV4Review(s,fx);
 assert.equal(v.step,"revision");
 V4.returnV4Workspace(s,v.artifacts[0].id);
 const a=v.artifacts[0],unit=V4.unitFor(p.templateId,a.id)!;
 const low=Object.fromEntries(unit.fields.map(f=>[f.id,[...f.options].sort((a,b)=>a.fit-b.fit)[0].id]));
 assert.equal(V4.editV4(s,fx,a.id,low,"Draft needs supporting facts. R1"),true);
 V4.openV4Board(s,fx);V4.submitV4Review(s,fx);
 assert.equal(v.step,"ready");assert.equal(v.deduction,20);
 const before=s.personalCash;assert.equal(V4.finalizeV4(s,fx),true);
 const fee=Math.round((p.acceptedFee??t.fee)*.8);
 assert.equal(v.paidAmount,fee);
 assert.equal(s.personalCash,before+fee-t.outOfPocket);
});


function idealVideo(id:string){
 switch(id){
 case "video-1":return {hookClip:"problem",headline:"benefit",tests:1};
 case "video-2":return {frameX:55,frameY:46,zoom:1.22,captureTime:4.5,captures:1};
 case "video-3":return {order:[...V5.MATCH_IDEAL],lengths:[...V5.MATCH_DURATIONS],edits:5};
 case "video-4":return {captions:[...V5.CAPTION_TARGETS],captionY:78};
 case "video-5":return {beatCuts:[...V5.BEAT_TARGETS],beatAttempt:1};
 default:throw Error("unknown video ID "+id);
 }
}
test("Reel Rush has five genuine distinct mini-game states and human-input QA scores",()=>{
 assert.deepEqual(V5.VIDEO_LEVELS.map(x=>x.kind),["scroll-stopper","perfect-shot","match-cut","caption-rush","beat-drop"]);
 for(const {id} of V5.VIDEO_LEVELS){
  const draft=V5.initialVideoState(id);
  assert.equal(V5.videoComplete(draft),false,"new "+id+" cannot be instantly completed");
  const wrong=V5.videoScore(draft);
  assert.equal(wrong,0);
  const completed={...draft,...idealVideo(id)};
  assert.equal(V5.videoComplete(completed),true,id);
  assert.ok(V5.videoScore(completed)>=78,"successful actual moves pass "+id);
  assert.match(V5.videoSummary(completed),/video draft/i);
 }
});
test("Reel Rush video edits autosave, require gameplay and persist immutable submitted video versions",()=>{
 const s=v4Game("short-video"),v=s.campaign.freelanceJob!.v4!;
 assert.equal(V4.startV4(s,fx),true);
 assert.equal(V5.commitVideoDraft(s,fx,"video-1"),false,"blank game cannot commit");
 assert.equal(V4.editV4(s,fx,"video-1",{hook:"problem",story:"howto",pacing:"captions",cta:"visit"},
  "This old form should not allow bypassing a new video mini-game."),false);
 assert.equal(V5.changeVideoDraft(s,"video-1",{hookClip:"problem",headline:"benefit",tests:1}),true);
 const draft=v.artifacts[0].videoDraft!;
 assert.equal(draft.tests,1);
 assert.equal(V4.openV4Board(s,fx),false,"uncommitted game draft must not enter review");
 const cash=s.personalCash;
 assert.equal(V5.commitVideoDraft(s,fx,"video-1"),true);
 assert.equal(s.personalCash,cash,"saving a video does not pay freelancer");
 assert.equal(v.artifacts[0].version,1);
 assert.equal(v.artifacts[0].video?.tests,1);
 assert.equal(v.artifacts[0].versions[0].video?.kind,"scroll-stopper");
 assert.equal(V5.changeVideoDraft(s,"video-1",{hookClip:"logo",headline:"generic",tests:1}),true);
 assert.equal(v.artifacts[0].video?.hookClip,"problem","editing must not overwrite submitted version");
 assert.equal(v.artifacts[0].videoDraft?.hookClip,"logo");
 const restored=migrate(JSON.parse(JSON.stringify(s)));
 assert.equal(restored.campaign.freelanceJob?.v4?.artifacts[0].videoDraft?.hookClip,"logo");
 assert.equal(restored.campaign.freelanceJob?.v4?.artifacts[0].video?.hookClip,"problem");
});
test("Five video drafts go to V4 client review, targeted revision and exactly-once payment",()=>{
 const s=v4Game("short-video"),c=s.campaign,p=c.freelanceJob!,v=p.v4!,cash=s.personalCash;
 V4.startV4(s,fx);
 for(const a of v.artifacts){
  assert.equal(V5.changeVideoDraft(s,a.id,idealVideo(a.id)),true);
  assert.equal(V5.commitVideoDraft(s,fx,a.id),true);
 }
 const bad=v.artifacts[4];
 assert.equal(V5.changeVideoDraft(s,bad.id,{beatCuts:[.3,1.2,2.0,2.6],beatAttempt:2}),true);
 assert.equal(V5.commitVideoDraft(s,fx,bad.id),true);
 assert.equal(V4.openV4Board(s,fx),true);
 assert.equal(V4.submitV4Review(s,fx),true);
 assert.equal(v.step,"revision");
 assert.equal(bad.status,"revise");
 assert.ok(v.artifacts.slice(0,4).every(a=>a.status==="approved"));
 V4.returnV4Workspace(s,bad.id);
 assert.equal(v.step,"workspace");
 assert.equal(V5.changeVideoDraft(s,bad.id,{beatCuts:[...V5.BEAT_TARGETS],beatAttempt:3}),true);
 assert.equal(V5.commitVideoDraft(s,fx,bad.id),true);
 assert.equal(bad.versions.length,3);
 assert.equal(V4.openV4Board(s,fx),true);
 assert.equal(V4.submitV4Review(s,fx),true);
 assert.equal(v.step,"ready");
 assert.equal(s.personalCash,cash);
 assert.equal(V4.finalizeV4(s,fx),true);
 assert.equal(V4.finalizeV4(s,fx),false);
 assert.equal(s.personalCash,cash+(p.acceptedFee??0)-getFreelanceJob("short-video")!.outOfPocket);
});
test("V5 quality and state cannot be forged through invalid scene or beat input",()=>{
 const s=v4Game("short-video");
 V4.startV4(s,fx);
 const base=s.campaign.freelanceJob!.v4!.artifacts[2];
 assert.equal(V5.changeVideoDraft(s,base.id,{order:["hook","hook","product","process","cta"]}),false);
 assert.equal(base.videoDraft,undefined);
 assert.equal(V5.changeVideoDraft(s,"video-5",{beatCuts:[-3,88]}),false);
 assert.equal(V5.changeVideoDraft(s,"video-4",{captionY:999}),false);
});
test("Reel Rush actually replaces dropdown editor and its output is visible at Board / Client Review",()=>{
 const workspace=readFileSync("src/components/game/FreelanceV4Desk.tsx","utf8");
 const editor=readFileSync("src/components/game/VideoMiniGame.tsx","utf8");
 assert.ok(workspace.includes("<VideoMiniGame"));
 assert.ok(workspace.includes("<VideoDraftPreview"));
 assert.ok(editor.includes("requestAnimationFrame"));
 assert.ok(editor.includes("CAPTURE!"));
 assert.ok(!editor.includes("onPointerMove"),"Perfect Shot no longer has draggable camera framing");
 assert.ok(editor.includes("onClick={cut}"));
 assert.ok(editor.includes("input type="));
});

test("Perfect Shot V5.1 scores ONLY the instant of pressing Capture",()=>{
 assert.equal(V5.PERFECT_SHOT_DURATION,8);
 assert.equal(V5.perfectShotTimingScore(4.5),100);
 assert.ok(V5.perfectShotTimingScore(4.5)>V5.perfectShotTimingScore(3));
 const fast={...V5.initialVideoState("video-2"),captureTime:4.5,captures:1,frameX:0,frameY:100,zoom:.8};
 const slow={...V5.initialVideoState("video-2"),captureTime:1,captures:1,frameX:55,frameY:46,zoom:1.22};
 assert.equal(V5.videoScore(fast),100,"camera X/Y and zoom no longer matter");
 assert.ok(V5.videoScore(slow)<V5.videoScore(fast));
 assert.match(V5.videoSummary(fast),/One-button hero capture/);
});
test("Perfect Shot V5.1 autosaves a 4h first capture, retry replaces SAME version for 0h",()=>{
 const s=v4Game("short-video"),v=s.campaign.freelanceJob!.v4!;
 V4.startV4(s,fx);
 const cash=s.personalCash;
 assert.equal(V5.capturePerfectShot(s,fx,"video-2",4.5),true);
 const a=v.artifacts[1],firstHours=pHours(s);
 assert.equal(a.perfectShotUnconfirmed,true);
 assert.equal(firstHours,4);
 assert.equal(a.version,1);
 assert.equal(a.versions.length,1);
 assert.equal(a.score,100);
 assert.equal(a.video?.captureTime,4.5);
 assert.equal(a.videoDraft,undefined);
 assert.equal(s.personalCash,cash);
 assert.equal(V5.capturePerfectShot(s,fx,"video-2",2),true);
 assert.equal(a.version,1);
 assert.equal(a.versions.length,1);
 assert.equal(a.video?.captureTime,2);
 assert.equal(a.versions[0].video?.captureTime,2,"retry updates the saved version snapshot");
 assert.equal(a.score,V5.perfectShotTimingScore(2));
 assert.equal(pHours(s),firstHours,"no additional work hours for retry");
 assert.equal(V5.capturePerfectShot(s,fx,"video-2",4.49),true);
 assert.equal(a.version,1);
 assert.equal(a.score,100);
 assert.equal(V5.capturePerfectShot(s,fx,"video-2",99),false,"can't capture outside playback");
 assert.equal(V5.capturePerfectShot(s,fx,"video-2",-1),false);
 assert.equal(V5.continuePerfectShot(s,fx,"video-2"),true);
 assert.equal(a.perfectShotUnconfirmed,false);
 assert.equal(v.activeId,"video-3","Continue opens next unsaved video automatically");
 assert.equal(V5.continuePerfectShot(s,fx,"video-2"),false);
 assert.equal(V5.capturePerfectShot(s,fx,"video-2",3.3),true);
 assert.equal(a.version,2,"a later revisit after Continue creates proper revision");
 assert.equal(pHours(s),firstHours+1,"later confirmed revision charges 1 hour");
 assert.equal(s.personalCash,cash);
});
function pHours(s:ReturnType<typeof game>){return s.campaign.freelanceJob?.actualWorkHours??0}
test("Perfect Shot capture and Retry survive reload and do not bypass V4 review/payment",()=>{
 const s=v4Game("short-video"),v=s.campaign.freelanceJob!.v4!;
 V4.startV4(s,fx);
 assert.equal(V5.capturePerfectShot(s,fx,"video-2",4.1),true);
 const restored=migrate(JSON.parse(JSON.stringify(s)));
 const a=restored.campaign.freelanceJob!.v4!.artifacts[1];
 assert.equal(a.perfectShotUnconfirmed,true);
 assert.equal(a.video?.captureTime,4.1);
 assert.equal(a.version,1);
 assert.equal(restored.personalCash,s.personalCash);
 assert.equal(V5.capturePerfectShot(restored,fx,"video-2",4.5),true);
 assert.equal(a.video?.captureTime,4.5);
 assert.equal(restored.campaign.freelanceJob?.actualWorkHours,4);
 assert.equal(V5.continuePerfectShot(restored,fx,"video-2"),true);
 assert.equal(V4.finalizeV4(restored,fx),false,"no money before board and client approval");
 const old=readFileSync("src/components/game/VideoMiniGame.tsx","utf8");
 const perfect=old.slice(old.indexOf("function PerfectShot("),old.indexOf("function MatchCut("));
 assert.ok(perfect.includes("requestAnimationFrame"),"footage plays automatically");
 assert.ok(perfect.includes("capturePerfectShot"));
 assert.ok(perfect.includes("continuePerfectShot"));
 assert.ok(perfect.includes("CAPTURE!"));
 assert.ok(!perfect.includes('type="range"'),"no X/Y or zoom sliders");
 assert.ok(!perfect.includes("onPointerMove"),"no camera dragging");
 assert.ok(!perfect.includes("Save Video to Deliverable Board"),"autosave replaces manual Save");
});
