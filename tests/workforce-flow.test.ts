import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {defaults,newCEO,newCampaign,migrate,type Project,type Task} from "../src/game/state";
import {ceoTaskDefs} from "../src/game/data";
import * as C from "../src/game/ceo";
import * as T from "../src/game/clientTeams";
import type {Fx} from "../src/game/store";

const fx:Fx={toast:()=>{},log:()=>{}};
function world(){
 const s=defaults();
 s.created=true;s.agencyUnlocked=true;s.cityUnlocked=true;
 s.agencyCash=250000000;s.reputation=70;s.ceo=newCEO(70);
 return s;
}
function project(id:string,brand:string,role="media"):Project{
 const t=ceoTaskDefs.find(t=>t.role===role)!;
 const task:Task={...t,pre:[],effort:7,status:"assigned",progress:0,quality:0,employee:null,outsourced:false};
 return {id,leadId:id,brand,adBudget:20e6,fee:35e6,bonus:0,scope:7,duration:30,industry:"Tech",
 days:0,status:"active",scenarioIndex:3,startedDay:1,target:16,pitchQuality:70,mediaSpent:0,mediaReserved:20e6,direct:0,
 campaign:newCampaign(3),tasks:[task],paymentCount:0};
}
test("Workforce replaces the separate CEO Teams and People tabs, but retains Campaign Delivery",()=>{
 const panels=readFileSync("src/components/game/Panels.tsx","utf8");
 const view=readFileSync("src/components/game/ClientTeamBoard.tsx","utf8");
 assert.match(panels,/const TABS = \["inbox", "pipeline", "workforce",/);
 assert.doesNotMatch(panels,/tab==="people"|tab==="teams"/);
 assert.match(view,/Client teams/);
 assert.match(view,/Talent pool/);
 assert.match(view,/Campaign delivery/);
 assert.match(view,/EmployeeDetail/);
 assert.match(view,/Outsource/);
 assert.doesNotMatch(view,/mt-squad-task-list/);
});
test("planner recommends available matching specialists and never steals a rival client's staff",()=>{
 const s=world(),a=project("a","A", "media"),b=project("b","B","media");
 s.ceo!.projects.push(a,b);
 const ta=T.startClientTeam(s,a),tb=T.startClientTeam(s,b);
 for(const id of ["buyer","buyer2","account","planner","creator"])C.hire(s,fx,id);
 T.joinClientTeam(s,fx,ta.id,"buyer");
 const plan=T.staffingPlan(s,tb);
 assert.ok(plan.needs.missing.includes("media"));
 assert.equal(plan.ranked.some(x=>x.id==="buyer"),false);
 assert.ok(plan.ranked.some(x=>x.id==="buyer2"));
 assert.ok(plan.next);
 T.autoAssembleTeam(s,fx,tb.id);
 assert.ok(tb.memberIds.includes("buyer2"));
 assert.ok(ta.memberIds.includes("buyer"));
 assert.equal(new Set([...ta.memberIds,...tb.memberIds]).size,ta.memberIds.length+tb.memberIds.length);
});
test("a training-only specialist cannot be recommended for a time-critical gap",()=>{
 const s=world(),p=project("a","A","creative");
 s.ceo!.projects.push(p);const team=T.startClientTeam(s,p);
 C.hire(s,fx,"creator");C.hire(s,fx,"producer");
 s.personnel["creator"].trainingUntil=s.ceo!.day+7;
 const plan=T.staffingPlan(s,team);
 assert.equal(plan.ranked.some(x=>x.id==="creator"),false);
 assert.equal(plan.ranked.some(x=>x.id==="producer"),true);
 assert.ok(plan.unavailablePool.includes("creator"));
});
test("staffing warnings respond to critical deadlines, fatigue and actual job coverage",()=>{
 const s=world(),p=project("a","A","analytics");
 s.ceo!.projects.push(p);const team=T.startClientTeam(s,p);
 p.days=26;
 assert.equal(T.teamNeeds(s,team).status,"critical");
 assert.equal(T.teamNeeds(s,team).remaining,4);
 C.hire(s,fx,"analyst");T.joinClientTeam(s,fx,team.id,"analyst");
 assert.equal(T.teamNeeds(s,team).missing.length,0);
 s.personnel["analyst"].fatigue=85;
 assert.equal(T.teamNeeds(s,team).status,"attention");
 assert.ok(T.teamNeeds(s,team).overloaded.includes("analyst"));
});
test("planner is read-only; staff actions and old saves retain client exclusivity",()=>{
 const s=world(),p=project("a","A","creative");
 s.ceo!.projects.push(p);const team=T.startClientTeam(s,p);
 C.hire(s,fx,"creator");C.hire(s,fx,"buyer");C.hire(s,fx,"planner");
 const before=JSON.stringify(s);
 T.staffingPlan(s,team);T.teamNeeds(s,team);T.staffingPlan(s,team);
 assert.equal(JSON.stringify(s),before);
 T.autoAssembleTeam(s,fx,team.id);
 const restored=migrate(JSON.parse(JSON.stringify(s)));
 assert.deepEqual(restored.ceo!.clientTeams!.find(x=>x.id===team.id)?.memberIds,team.memberIds);
 assert.ok(restored.staff.every(id=>restored.ceo!.clientTeams!.filter(t=>t.status!=="released"&&t.memberIds.includes(id)).length<=1));
});
