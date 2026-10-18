import test from "node:test";
import assert from "node:assert/strict";
import {defaults,migrate,newCEO,newCampaign,type Project,type Task} from "../src/game/state";
import {ceoTaskDefs,employeeById} from "../src/game/data";
import {hire} from "../src/game/ceo";
import {ensureRecruitment,startRecruitmentCampaign,RECRUITMENT_CHANNELS} from "../src/game/recruitment";
import {endWeek,acknowledgeEdition} from "../src/game/weekly";
import {startClientTeam,joinClientTeam,ownerTeam} from "../src/game/clientTeams";
import {resourceOverview,creativeAdvice,compareCreativeOptions,forecastChoice,daysToApplicants} from "../src/game/resourcePlanning";
import type {Fx} from "../src/game/store";
const fx:Fx={toast:()=>{},log:()=>{}};
function agency(){
 const s=defaults();s.created=true;s.agencyUnlocked=true;s.cityUnlocked=true;s.agencyCash=150_000_000;s.reputation=50;
 s.ceo=newCEO(50);s.ceo.weekly=s.clock;ensureRecruitment(s);return s;
}
function project(id:string,roles:string[]=["creative"]):Project{
 const tasks:Task[]=roles.map((r,i)=>{
  const td=ceoTaskDefs.find(t=>t.role===r)!;
  return {...td,pre:i?[roles[i-1]]:[],effort:3,status:"backlog",progress:0,quality:0,employee:null,outsourced:false};
 });
 return {id,leadId:"sora",brand:id,adBudget:12_000_000,fee:42_000_000,bonus:0,scope:8,duration:28,industry:"FMCG",
  days:0,status:"active",scenarioIndex:0,startedDay:1,target:15,pitchQuality:75,mediaSpent:0,mediaReserved:12_000_000,
  direct:0,campaign:newCampaign(0),tasks,paymentCount:0};
}
test("planner is read-only and differentiates blocked from unblocked Creative delivery",()=>{
 const s=agency(),p=project("creative-gap");
 s.ceo!.projects.push(p);const team=startClientTeam(s,p);
 const before=JSON.stringify(s),overview=resourceOverview(s);
 assert.equal(overview.functions.find(f=>f.id==="cre")?.teamsMissing,1);
 const plan=compareCreativeOptions(s,team.id)!;
 assert.equal(plan.baseline.completionDay,null);
 assert.ok(plan.alternatives.find(o=>o.kind==="recruit")!.completionDay!>s.ceo!.day+daysToApplicants(s));
 assert.ok(plan.alternatives.find(o=>o.kind==="outsource")!.completionDay!<s.ceo!.day+10);
 assert.equal(plan.alternatives.find(o=>o.kind==="reallocate")!.viable,false);
 assert.equal(JSON.stringify(s),before,"preview must not mutate payroll, tasks, hires or time");
});
test("real free talent and existing client allocation are respected by planning",()=>{
 const s=agency();hire(s,fx,"creator2");
 const a=project("client-a"),b=project("client-b");
 s.ceo!.projects.push(a,b);
 const ta=startClientTeam(s,a),tb=startClientTeam(s,b);
 assert.equal(creativeAdvice(s,tb.id)?.bestReallocate,"creator2");
 const free=forecastChoice(s,{kind:"reallocate",teamId:tb.id,employeeId:"creator2"});
 assert.ok(free.completionDay!==null);
 joinClientTeam(s,fx,ta.id,"creator2");
 assert.equal(ownerTeam(s,"creator2")?.id,ta.id);
 const assigned=creativeAdvice(s,tb.id)!;
 assert.ok(assigned.transfer.includes("creator2"));
 assert.equal(assigned.pool.includes("creator2"),false);
 const before=JSON.stringify(s);
 forecastChoice(s,{kind:"reallocate",teamId:tb.id,employeeId:"creator2"});
 assert.equal(JSON.stringify(s),before);
});
test("outsource estimate uses exact existing task formula, recruit accounts for payroll and onboarding",()=>{
 const s=agency(),p=project("cost");
 s.ceo!.projects.push(p);const team=startClientTeam(s,p);
 const plan=compareCreativeOptions(s,team.id,"journal")!;
 const outsourcing=plan.alternatives.find(o=>o.kind==="outsource")!;
 const recruit=plan.alternatives.find(o=>o.kind==="recruit")!;
 assert.equal(outsourcing.upfront,Math.round(ceoTaskDefs.find(t=>t.role==="creative")!.cost*2.1*(p.scope/8)));
 assert.equal(recruit.upfront,RECRUITMENT_CHANNELS[2].fee+Math.round(recruit.monthly*.3/10000)*10000);
 assert.equal(recruit.cost30,recruit.upfront+recruit.monthly);
 assert.ok(recruit.completionDay!>outsourcing.completionDay!);
});
test("7-day upskill removes task capacity before skill improvement, not instant magic progress",()=>{
 const s=agency();hire(s,fx,"creator2");
 const p=project("training");s.ceo!.projects.push(p);
 const team=startClientTeam(s,p);joinClientTeam(s,fx,team.id,"creator2");
 const ordinary=forecastChoice(s,{kind:"baseline",teamId:team.id});
 const trained=forecastChoice(s,{kind:"upskill",teamId:team.id,employeeId:"creator2"});
 assert.ok(ordinary.completionDay!==null);
 assert.ok(trained.completionDay!>ordinary.completionDay!);
 assert.equal(trained.monthly,0);
 assert.equal(trained.upfront,Math.round(employeeById("creator2")!.salary*.35));
});
test("targeted hiring produces a Creative applicant after next weekly refresh and persists focus",()=>{
 const s=agency();const start=s.agencyCash;
 assert.equal(startRecruitmentCampaign(s,fx,"journal","creative"),true);
 assert.equal(s.recruitment!.postings![0].focusRole,"creative");
 assert.equal(s.agencyCash,start-RECRUITMENT_CHANNELS[2].fee);
 const restored=migrate(JSON.parse(JSON.stringify(s)));
 assert.equal(restored.recruitment!.postings![0].focusRole,"creative");
 const e=endWeek(s,fx);assert.ok(e);acknowledgeEdition(s,e!.id);
 const candidates=s.recruitment!.candidates.filter(x=>x.source==="journal");
 assert.ok(candidates.length>=2&&candidates.length<=4);
 assert.ok(candidates.some(x=>x.specialty==="creative"));
 assert.equal(candidates[0].specialty,"creative");
 assert.equal(s.recruitment!.postings!.length,0);
});

test("Creative outsource selection identifies the exact project within a multi-campaign client squad",()=>{
 const s=agency();
 const first=project("campaign-one",["strategy","creative"]),second=project("campaign-two",["creative"]);
 second.brand=first.brand;
 s.ceo!.projects.push(first,second);
 const t1=startClientTeam(s,first),t2=startClientTeam(s,second);
 assert.equal(t1.id,t2.id);
 const advice=creativeAdvice(s,t1.id)!;
 assert.equal(advice.priorityProjectId,second.id,"ready Creative must be chosen over blocked Creative");
 const opted=forecastChoice(s,{kind:"outsource",teamId:t1.id,projectId:advice.priorityProjectId!,taskKey:"creative"});
 assert.ok(opted.completedTasks>0);
 assert.equal(opted.upfront,Math.round(ceoTaskDefs.find(t=>t.key==="creative")!.cost*2.1*(second.scope/8)));
});
test("planner cannot outsource an in-progress Creative task or suggest non-role-qualified talent",()=>{
 const s=agency();hire(s,fx,"buyer2");
 const p=project("creative-current");p.tasks[0].status="in_progress";p.tasks[0].progress=1;
 s.ceo!.projects.push(p);const team=startClientTeam(s,p);
 const advice=creativeAdvice(s,team.id)!;
 assert.equal(advice.priorityTask,null,"already running work cannot be outsourced");
 assert.equal(advice.bestReallocate,null,"Media specialist cannot unblock Creative");
 assert.equal(compareCreativeOptions(s,team.id)!.alternatives.find(x=>x.kind==="outsource")!.viable,false);
});
