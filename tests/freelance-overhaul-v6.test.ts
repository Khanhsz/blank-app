import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {defaults,migrate} from "../src/game/state";
import {scenarios} from "../src/game/data";
import {getFreelanceJob,FREELANCE_JOBS} from "../src/game/freelanceJobTemplates";
import {ensureFreelanceBoard} from "../src/game/freelanceMarket";
import {chooseFreelanceClient} from "../src/game/campaign";
import * as Work from "../src/game/freelanceWorkflows";
import type {Fx} from "../src/game/store";

const fx:Fx={toast:()=>{},log:()=>{}};
function landing(){
 const s=defaults();s.created=true;s.reputation=75;
 assert.equal(chooseFreelanceClient(s,fx,"startup-coffee-0","landing-page"),true);
 const t=getFreelanceJob("landing-page")!;
 s.campaign.aiScenario={...scenarios[0],client:"Independent coffee startup",fee:t.fee,budget:t.mediaBudget,days:t.days,
  aiPlanning:{context:"Small café needs a mobile sign-up page",insight:"First-time visitors need clear menu proof",strategy:"Turn visitors into signups"}};
 s.campaign.aiStatus="ready";assert.equal(Work.startV4(s,fx),true);
 return s;
}
function best(jobId:string,id:string){
 return Object.fromEntries(Work.unitFor(jobId,id)!.fields.map(field=>
  [field.id,[...field.options].sort((a,b)=>b.fit-a.fit)[0].id]));
}
function build(s:ReturnType<typeof landing>){
 const v=s.campaign.freelanceJob!.v4!;
 for(const a of v.artifacts){
  const decisions=best("landing-page",a.id);
  const copy=Work.composeCardOutput("landing-page",a.id,decisions,"Mây Corner");
  assert.equal(Work.saveV4Draft(s,a.id,decisions,copy),true);
  assert.equal(Work.editV4(s,fx,a.id,decisions,copy),true);
  assert.equal(Work.isArtifactComplete("landing-page",a),true);
 }
}
test("V6 advertises exactly 8 new job types and never offers legacy short videos",()=>{
 assert.equal(FREELANCE_JOBS.length,8);
 assert.equal(FREELANCE_JOBS.some(t=>t.id==="short-video"),false);
 assert.equal(FREELANCE_JOBS.filter(t=>t.id==="landing-page").length,1);
 assert.equal(Work.allDesigns.length,8);
 assert.ok(getFreelanceJob("short-video"),"Old signed video contract remains loadable");
 const s=defaults(),board=ensureFreelanceBoard(s);
 assert.ok(board.listings.every(x=>x.templateId!=="short-video"));
});

test("V6 migrates only unclaimed video listings without rewriting awarded applications",()=>{
 const s=defaults(),b=ensureFreelanceBoard(s);
 const old=b.listings[0];old.templateId="short-video";old.fee=1_500_000;
 const another=b.listings[1];another.templateId="short-video";
 b.applications.push({id:"legacy-awarded",listingId:another.id,clientId:another.clientId,
 templateId:"short-video",week:s.clock.week,approach:"creative",price:"standard",proposedFee:1_500_000,
 score:75,winChance:90,status:"accepted",feedback:"Historical client offer"});
 delete (b as typeof b & {catalogVersion?:number}).catalogVersion;
 ensureFreelanceBoard(s);
 assert.equal(old.templateId,"landing-page");
 assert.equal(old.fee,getFreelanceJob("landing-page")!.fee);
 assert.equal(another.templateId,"short-video");
 assert.equal(b.applications[0].templateId,"short-video");
 const before=JSON.stringify(b);
 ensureFreelanceBoard(s);
 assert.equal(JSON.stringify(b),before,"Migration must be idempotent");
});

test("Landing editor produces five real outputs, movable page order and immutable brief snapshot",()=>{
 const s=landing(),p=s.campaign.freelanceJob!,v=p.v4!;
 assert.equal(v.briefSnapshot?.context,"Small café needs a mobile sign-up page");
 assert.equal(v.briefSnapshot?.fee,getFreelanceJob("landing-page")!.fee);
 assert.equal(v.artifacts.length,5);
 const oldFee=v.briefSnapshot!.fee,day=v.briefSnapshot!.deadlineDay;
 s.campaign.aiScenario!.aiPlanning!.context="AI response refreshed after acceptance";
 s.campaign.aiScenario!.fee=999_999_999;
 assert.equal(v.briefSnapshot?.fee,oldFee);
 assert.equal(v.briefSnapshot?.deadlineDay,day);
 const first=v.artifacts[0].id;
 assert.equal(Work.moveV4Unit(s,first,1),true);
 assert.equal(v.artifacts[1].id,first);
 assert.equal(Work.openV4Board(s,fx),false,"Empty choices cannot be sent to client");
 build(s);
 assert.equal(Work.openV4Board(s,fx),true);
 assert.equal(Work.submitV4Review(s,fx),true);
 assert.equal(v.step,"ready");
 assert.ok(v.artifacts.every(a=>a.approvedVersion===a.version));
});

test("Approved output editing invalidates that version and blocks premature settlement",()=>{
 const s=landing(),v=s.campaign.freelanceJob!.v4!;
 build(s);Work.openV4Board(s,fx);Work.submitV4Review(s,fx);
 const approved=v.artifacts[0],prior=approved.version,other=v.artifacts[1];
 assert.equal(Work.finalizeV4({...s,campaign:{...s.campaign,freelanceJob:{...s.campaign.freelanceJob!,v4:{...v,step:"board"}}}},fx),false);
 Work.returnV4Workspace(s,approved.id);
 assert.equal(v.step,"workspace");
 const options=best("landing-page",approved.id);
 const updated=Work.composeCardOutput("landing-page",approved.id,options,"Edited café brand");
 assert.equal(Work.saveV4Draft(s,approved.id,options,updated),true);
 assert.equal(Work.editV4(s,fx,approved.id,options,updated),true);
 assert.equal(approved.version,prior+1);
 assert.equal(approved.approvedVersion,undefined);
 assert.equal(other.status,"approved","Unmodified sections keep their approval");
 assert.equal(Work.openV4Board(s,fx),true);
 assert.equal(Work.finalizeV4(s,fx),false,"Board is not Final Submit");
 assert.equal(Work.submitV4Review(s,fx),true);
 assert.equal(approved.approvedVersion,approved.version);
 assert.equal(other.approvedVersion,other.version);
});

test("Final Submit credits once, records real portfolio, survives reload and animation replay",()=>{
 const s=landing(),v=s.campaign.freelanceJob!.v4!,c=s.campaign,t=getFreelanceJob("landing-page")!;
 build(s);Work.openV4Board(s,fx);Work.submitV4Review(s,fx);
 const cash=s.personalCash,briefId=c.briefId;
 assert.equal(Work.finalizeV4(s,fx),true);
 assert.equal(s.personalCash,cash+t.fee-t.outOfPocket);
 assert.equal(Work.finalizeV4(s,fx),false);
 assert.deepEqual(s.freelanceCareer!.transactionIds,["freelance:"+briefId]);
 assert.equal(s.freelanceCareer!.portfolio?.length,1);
 assert.equal(s.freelanceCareer!.portfolio?.[0].artifacts.length,5);
 assert.equal(v.step,"paid");
 const restored=migrate(JSON.parse(JSON.stringify(s)));
 const savedCash=restored.personalCash;
 assert.equal(Work.finalizeV4(restored,fx),false);
 assert.equal(restored.personalCash,savedCash);
 assert.equal(restored.freelanceCareer?.portfolio?.[0].artifacts.length,5);
 const ui=readFileSync("src/components/game/FreelanceV4Desk.tsx","utf8");
 assert.ok(ui.includes("CashCelebration"));
 assert.ok(ui.includes("Campaign.nextClient(state,fx)"));
 assert.ok(!ui.includes('id:"paid",label:"Paid"'));
});

test("V6 exposes accessible card choices and a responsive, reduced-motion financial animation",()=>{
 const editor=readFileSync("src/components/game/FreelanceV4Desk.tsx","utf8");
 const css=readFileSync("src/freelance-overhaul.css","utf8");
 assert.ok(editor.includes('aria-pressed={decisions[field.id]===o.id}'));
 assert.ok(editor.includes("composeCardOutput"));
 assert.ok(editor.includes("LandingPagePreview"));
 assert.ok(css.includes("prefers-reduced-motion"));
 assert.ok(css.includes("@media(max-width:540px)"));
});


test("Seven job-specific workbenches share persisted decision choices and no fake Done progress",()=>{
 const ui=readFileSync("src/components/game/FreelanceV4Desk.tsx","utf8");
 const checks=[
  "Social creative canvas","Account inspection","14-day publishing calendar",
  "Ads Manager · campaign draft","Evidence sorting desk","Channel adaptation studio","Local launch timeline"
 ];
 for(const label of checks)assert.ok(ui.includes(label),"missing workspace "+label);
 assert.ok(ui.includes('<JobSpecificWorkbench jobId={jobId}'));
 assert.ok(ui.includes('onClick={()=>choose("budget",a.id)}'));
 assert.ok(ui.includes('onClick={()=>choose("signal",o.id)}'));
 assert.ok(ui.includes('onClick={()=>choose("evidence",id)}'));
 assert.ok(ui.includes('onClick={()=>choose("channel",id)}'));
 assert.ok(!ui.includes('Done +10%'));
 const calendar=Work.designFor("content-calendar")!;
 assert.equal(calendar.units.length,7,"entry job starts with seven scheduled posts");
 assert.ok(calendar.units.every(a=>a.id.startsWith("day-")));
});

test("V6 workstation adapts to modal width, not only the browser viewport",()=>{
 const css=readFileSync("src/freelance-overhaul.css","utf8");
 const gameCss=readFileSync("src/styles.css","utf8");
 assert.match(gameCss,/\.panel\{[^}]*width:min\(490px,/,"Gameplay desk is a narrow overlay on desktop");
 assert.match(css,/\.mt-v6\{container-type:inline-size\}/,"Freelance workspaces must measure their panel container");
 assert.match(css,/@container\s*\(min-width:560px\)/);
 assert.match(css,/@container\s*\(min-width:850px\)/);
 const mobileFirst=css.split("/* V6.1 container-aware workstation:")[1].split("@container (min-width:560px)")[0];
 assert.match(mobileFirst,/\.mt-v6-editor-grid\{grid-template-columns:minmax\(0,1fr\)\}/);
 assert.match(mobileFirst,/\.mt-v6-card-options\{grid-template-columns:minmax\(0,1fr\)\}/);
 assert.match(mobileFirst,/\.mt-v6-live-preview\{position:static/);
 for(const cls of ["mt-v6-calendar-grid","mt-v6-hotspots","mt-v6-budget-bars","mt-v6-channels","mt-v6-social-canvas"]){
  assert.ok(mobileFirst.includes("."+cls+"{grid-template-columns:"),cls+" must collapse inside desktop panel");
 }
});
