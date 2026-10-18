import test from "node:test";
import assert from "node:assert/strict";
import {defaults,migrate} from "../src/game/state";
import {scenarios} from "../src/game/data";
import {chooseFreelanceClient} from "../src/game/campaign";
import {getFreelanceJob} from "../src/game/freelanceJobTemplates";
import {WEEKLY_CAPACITY} from "../src/game/freelanceJobs";
import * as Work from "../src/game/freelanceWorkflows";
import type {Fx} from "../src/game/store";

const fx:Fx={log:()=>{},toast:()=>{}};
function assignment(jobId="social-pack"){
 const s=defaults();s.created=true;s.reputation=70;
 s.freelanceCareer!.completedGigs=6;s.freelanceCareer!.completedProjects=2;
 assert.equal(chooseFreelanceClient(s,fx,"startup-coffee-0",jobId),true);
 const t=getFreelanceJob(jobId)!;
 s.campaign.aiScenario={...scenarios[0],fee:t.fee,budget:t.mediaBudget,days:t.days};
 s.campaign.aiStatus="ready";
 return s;
}
function bestChoices(jobId:string,id:string){
 const unit=Work.unitFor(jobId,id)!;
 return Object.fromEntries(unit.fields.map(f=>[f.id,[...f.options].sort((a,b)=>b.fit-a.fit)[0].id]));
}

test("partial freelance drafts survive switching deliverables and save restoration without booking work",()=>{
 const s=assignment();Work.startV4(s,fx);
 const v=s.campaign.freelanceJob!.v4!,first=v.artifacts[0],second=v.artifacts[1];
 const field=Work.unitFor("social-pack",first.id)!.fields[0];
 const choices={[field.id]:field.options[0].id};
 const cash=s.personalCash,day=s.clock.day;
 assert.equal(Work.saveV4Draft(s,first.id,choices,"A partial draft"),true);
 Work.setV4Active(s,second.id);
 const restored=migrate(JSON.parse(JSON.stringify(s)));
 Work.setV4Active(restored,first.id);
 const artifact=restored.campaign.freelanceJob!.v4!.artifacts[0];
 assert.equal(artifact.draft?.copy,"A partial draft");
 assert.equal(artifact.draft?.decisions[field.id],choices[field.id]);
 assert.equal(artifact.version,0);assert.equal(artifact.status,"draft");
 assert.equal(restored.freelanceCareer!.weeklyHours,0);
 assert.equal(restored.campaign.freelanceJob!.actualWorkHours,0);
 assert.equal(restored.personalCash,cash);assert.equal(restored.clock.day,day);
});

test("edited drafts cannot silently submit an older deliverable version to the client",()=>{
 const s=assignment();Work.startV4(s,fx);
 const v=s.campaign.freelanceJob!.v4!;
 for(const a of v.artifacts)assert.equal(Work.editV4(s,fx,a.id,bestChoices("social-pack",a.id),a.copy),true);
 assert.equal(Work.openV4Board(s,fx),true);
 const a=v.artifacts[0],copy=a.copy+"\nRevised handover and attribution notes.";
 Work.returnV4Workspace(s,a.id);
 const hours=s.freelanceCareer!.weeklyHours;
 Work.saveV4Draft(s,a.id,a.decisions,copy);
 assert.equal(Work.openV4Board(s,fx),false);
 assert.equal(v.step,"workspace");assert.equal(a.version,1);
 v.step="board"; // even a stale board action must fail the engine guard
 assert.equal(Work.submitV4Review(s,fx),false);assert.equal(v.reviewRound,0);
 v.step="workspace";
 assert.equal(Work.editV4(s,fx,a.id,a.draft!.decisions,a.draft!.copy),true);
 assert.equal(a.version,2);assert.equal(a.copy,copy);assert.equal(a.draft,undefined);
 assert.equal(s.freelanceCareer!.weeklyHours,hours+1);
 assert.equal(Work.openV4Board(s,fx),true);
 assert.equal(Work.submitV4Review(s,fx),true);assert.equal(v.step,"ready");
 assert.equal(a.status,"approved");
 assert.equal(Work.saveV4Draft(s,a.id,a.decisions,"Approved work cannot change"),false);
});

test("drafts remain editable at the weekly work cap and saving consumes capacity exactly once",()=>{
 const s=assignment();Work.startV4(s,fx);
 const a=s.campaign.freelanceJob!.v4!.artifacts[0],choices=bestChoices("social-pack",a.id);
 s.freelanceCareer!.weeklyHours=WEEKLY_CAPACITY;
 const text="A complete, specific marketing output with a verified client benefit and a measurable next step.";
 assert.equal(Work.saveV4Draft(s,a.id,choices,text),true);
 assert.equal(Work.editV4(s,fx,a.id,choices,text),false);
 assert.equal(a.draft?.copy,text);assert.equal(a.version,0);
 s.clock.week++;s.clock.day+=7;
 const required=Work.v4EditHours(s,a.id);
 assert.equal(Work.editV4(s,fx,a.id,choices,text),true);
 assert.equal(s.freelanceCareer!.weeklyHours,required);
 assert.equal(a.draft,undefined);
 assert.equal(Work.editV4(s,fx,a.id,choices,text),true);
 assert.equal(s.freelanceCareer!.weeklyHours,required,"same saved version costs no additional hours");
});

test("reverting a draft to its saved content clears the draft marker without charging work",()=>{
 const s=assignment();Work.startV4(s,fx);
 const a=s.campaign.freelanceJob!.v4!.artifacts[0];
 Work.saveV4Draft(s,a.id,{},"Temporary text");
 assert.ok(a.draft);
 Work.saveV4Draft(s,a.id,a.decisions,a.copy);
 assert.equal(a.draft,undefined);assert.equal(s.freelanceCareer!.weeklyHours,0);
});

