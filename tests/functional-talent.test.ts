import test from "node:test";
import assert from "node:assert/strict";
import {defaults,migrate,newCEO,newCampaign,type GameState,type Project,type Task} from "../src/game/state";
import {ceoTaskDefs,employeeById} from "../src/game/data";
import {hire,ceoTick} from "../src/game/ceo";
import * as P from "../src/game/personnel";
import * as T from "../src/game/clientTeams";
import {ensureRecruitment,recruitmentScore,quotedSalary} from "../src/game/recruitment";
import type {Fx} from "../src/game/store";
const fx:Fx={toast:()=>{},log:()=>{}};
const agency=()=>{
 const s=defaults();s.created=true;s.agencyUnlocked=true;s.cityUnlocked=true;s.agencyCash=150_000_000;
 s.reputation=60;s.ceo=newCEO(60);s.ceo.weekly=s.clock;ensureRecruitment(s);return s;
};
function project(name:string,role:string):Project{
 const td=ceoTaskDefs.find(t=>t.role===role)!;
 const task:Task={...td,pre:[],effort:6,status:"backlog",progress:0,quality:0,employee:null,outsourced:false};
 return {id:name,leadId:name,brand:name,adBudget:12e6,fee:24e6,bonus:0,scope:6,duration:24,industry:"Tech",days:0,
  status:"active",scenarioIndex:2,startedDay:1,target:12,pitchQuality:70,mediaSpent:0,mediaReserved:12e6,direct:0,
  campaign:newCampaign(2),tasks:[task],paymentCount:0};
}
test("four functional scores belong to each hire and task fit follows specialization",()=>{
 const s=agency();hire(s,fx,"creator2");hire(s,fx,"planner2");
 const creative=P.talentStats(s,"creator2"),planning=P.talentStats(s,"planner2");
 assert.deepEqual(Object.keys(creative).sort(),["acc","cre","med","str"]);
 assert.ok(creative.cre>creative.med);
 assert.ok(planning.str>planning.med);
 assert.ok(P.taskFit(s,"creator2","creative")>P.taskFit(s,"creator2","production"));
 const old=P.taskFit(s,"creator2","creative");
 s.personnel.creator2.attributes!.cre+=10;
 assert.ok(P.taskFit(s,"creator2","creative")>old);
});
test("higher talent fit increases real task progress without bypassing role restrictions",()=>{
 const a=agency();hire(a,fx,"creator2");
 const work=project("brand-concept","creative");
 a.ceo!.projects.push(work);
 const team=T.startClientTeam(a,work);T.joinClientTeam(a,fx,team.id,"creator2");
 const b=structuredClone(a);
 a.personnel.creator2.attributes!.cre=92;
 b.personnel.creator2.attributes!.cre=35;
 ceoTick(a,fx,1);ceoTick(b,fx,1);
 assert.equal(work.tasks[0].employee,"creator2");
 assert.ok(a.ceo!.projects[0].tasks[0].progress>b.ceo!.projects[0].tasks[0].progress);
 assert.equal(P.eligibleForRole("planner2","creative"),false);
});
test("workforce dashboard shows function gaps and auto staffing never steals staff from other clients",()=>{
 const s=agency();hire(s,fx,"creator2");hire(s,fx,"buyer2");hire(s,fx,"planner2");
 const a=project("brand-a","creative"),b=project("brand-b","media");
 s.ceo!.projects.push(a,b);
 const ca=T.startClientTeam(s,a),cb=T.startClientTeam(s,b);
 T.joinClientTeam(s,fx,ca.id,"creator2");
 const initial=T.functionCoverage(s,ca);
 assert.equal(initial.find(g=>g.id==="cre")!.staffed,1);
 assert.equal(initial.find(g=>g.id==="med")!.staffed,0);
 T.joinClientTeam(s,fx,cb.id,"buyer2");
 T.autoAssembleTeam(s,fx,cb.id);
 assert.equal(ca.memberIds.includes("buyer2"),false);
 assert.equal(cb.memberIds.includes("creator2"),false);
 assert.ok(T.teamCoverage(s,ca).functions.some(x=>x.id==="cre"));
});
test("delivery progress is effort weighted and forecast responds to staffing and fatigue",()=>{
 const s=agency();hire(s,fx,"creator2");
 const task=project("p","creative").tasks[0];
 assert.equal(T.projectProgress({...project("p","creative"),tasks:[{...task,progress:3}]}),50);
 const unassigned=P.deliveryForecast(s,task);
 assert.equal(unassigned.daysLeft,null);
 task.employee="creator2";task.status="in_progress";task.progress=1;
 const fresh=P.deliveryForecast(s,task);
 s.personnel.creator2.fatigue=94;
 const tired=P.deliveryForecast(s,task);
 assert.ok(tired.daysLeft!>=fresh.daysLeft!);
 assert.equal(tired.warning,"High fatigue may slow delivery");
});
test("cross-functional training boosts only the selected ability and save migration is stable",()=>{
 const s=agency();hire(s,fx,"creator2");
 const original=structuredClone(P.talentStats(s,"creator2"));
 P.train(s,fx,"creator2","str");ceoTick(s,fx,7);
 const after=P.talentStats(s,"creator2");
 assert.equal(after.str,Math.min(100,original.str+9));
 assert.equal(after.cre,original.cre);
 const restored=migrate(JSON.parse(JSON.stringify(s)));
 assert.deepEqual(restored.personnel.creator2.attributes,s.personnel.creator2.attributes);
 const legacy=structuredClone(s);
 delete legacy.personnel.creator2.attributes;
 const upgraded=migrate(JSON.parse(JSON.stringify(legacy)));
 assert.ok(upgraded.personnel.creator2.attributes!.cre>upgraded.personnel.creator2.attributes!.med);
 assert.deepEqual(migrate(JSON.parse(JSON.stringify(upgraded))).personnel.creator2.attributes,upgraded.personnel.creator2.attributes);
});
test("new channel recruits get asymmetric attributes, pay scales with talent and persist",()=>{
 const s=agency();const e=s.recruitment!.candidates[0];
 assert.ok(e.startingAttributes);
 assert.equal(e.startingAttributes![P.TALENT_FOR_ROLE[e.specialty!]],e.startingSkill);
 assert.equal(e.salary,quotedSalary(recruitmentScore(e)));
 hire(s,fx,e.id);
 assert.deepEqual(P.talentStats(s,e.id),e.startingAttributes);
 const restored=migrate(JSON.parse(JSON.stringify(s)));
 assert.deepEqual(P.talentStats(restored,e.id),e.startingAttributes);
 assert.equal(employeeById(e.id)?.salary,e.salary);
});
