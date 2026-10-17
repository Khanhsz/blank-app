import test from "node:test";
import assert from "node:assert/strict";
import {defaults,newCEO,migrate,newCampaign,type Project,type Task} from "../src/game/state";
import {ceoTaskDefs} from "../src/game/data";
import * as C from "../src/game/ceo";
import * as T from "../src/game/clientTeams";
import * as P from "../src/game/personnel";
import type {Fx} from "../src/game/store";
const fx:Fx={toast:()=>{},log:()=>{}};
const agency=()=>{const s=defaults();s.created=true;s.agencyUnlocked=true;s.cityUnlocked=true;s.agencyCash=220000000;s.reputation=70;s.ceo=newCEO(70);s.ceo.weekly=s.clock;return s};
function project(id:string,brand:string,role="creative"):Project{
 const t=ceoTaskDefs.find(t=>t.role===role)!;
 const task:Task={...t,pre:[],effort:7,status:"backlog",progress:0,quality:0,employee:null,outsourced:false};
 return {id,leadId:id,brand,adBudget:20e6,fee:35e6,bonus:0,scope:7,duration:30,industry:"Tech",
 days:0,status:"active",scenarioIndex:3,startedDay:1,target:16,pitchQuality:70,mediaSpent:0,
 mediaReserved:20e6,direct:0,campaign:newCampaign(3),tasks:[task],paymentCount:0};
}
test("a signed project creates a separate dedicated team without resetting the shared week",()=>{
 const s=agency(),a=project("orion","ORION Electronics");
 s.ceo!.projects.push(a);
 const team=T.startClientTeam(s,a);
 assert.equal(team.id,a.teamId);assert.equal(team.status,"forming");
 assert.equal(team.memberIds.length,0);assert.equal(s.clock.day,1);
});
test("exclusive ownership blocks adding one employee to two client squads",()=>{
 const s=agency(),a=project("a","ORION Electronics"),b=project("b","Sora Home");
 s.ceo!.projects.push(a,b);const ta=T.startClientTeam(s,a),tb=T.startClientTeam(s,b);
 C.hire(s,fx,"creator");C.hire(s,fx,"creator2");
 T.joinClientTeam(s,fx,ta.id,"creator");
 T.joinClientTeam(s,fx,tb.id,"creator");
 assert.deepEqual(ta.memberIds,["creator"]);
 assert.deepEqual(tb.memberIds,[]);
 assert.equal(T.talentPool(s).includes("creator"),false);
 T.joinClientTeam(s,fx,tb.id,"creator2");
 assert.deepEqual(tb.memberIds,["creator2"]);
});
test("CEO auto assignment cannot pull staff assigned to another client even with free capacity",()=>{
 const s=agency(),a=project("a","ORION Electronics"),b=project("b","Sora Home");
 s.ceo!.projects.push(a,b);const ta=T.startClientTeam(s,a),tb=T.startClientTeam(s,b);
 C.hire(s,fx,"creator");T.joinClientTeam(s,fx,ta.id,"creator");
 C.ceoTick(s,fx,1);
 assert.equal(a.tasks[0].employee,"creator");
 assert.equal(b.tasks[0].employee,null);
 assert.ok(s.ceo!.inbox.some(i=>i.project==="b"&&i.type==="capacity"));
 assert.equal(T.teamForProject(s,b)?.status,"forming");
});
test("direct assignment is rejected for an employee who belongs to another client",()=>{
 const s=agency(),a=project("a","ORION Electronics"),b=project("b","Sora Home");
 s.ceo!.projects.push(a,b);const ta=T.startClientTeam(s,a),tb=T.startClientTeam(s,b);
 C.hire(s,fx,"creator");T.joinClientTeam(s,fx,ta.id,"creator");
 P.assignSpecialist(s,fx,b.id,"creative","creator");
 assert.equal(b.tasks[0].preferredEmployee,undefined);
 T.joinClientTeam(s,fx,tb.id,"creator2");
 assert.equal(tb.memberIds.length,0,"unhired talent cannot be allocated");
});
test("safe handover rejects an active specialist; reassignment works when idle",()=>{
 const s=agency(),a=project("a","ORION Electronics"),b=project("b","Sora Home");
 s.ceo!.projects.push(a,b);const ta=T.startClientTeam(s,a),tb=T.startClientTeam(s,b);
 C.hire(s,fx,"creator");T.joinClientTeam(s,fx,ta.id,"creator");C.ceoTick(s,fx,1);
 T.transferClientMember(s,fx,ta.id,tb.id,"creator");
 assert.ok(ta.memberIds.includes("creator"));assert.equal(tb.memberIds.length,0);
 a.tasks[0].status="completed";a.tasks[0].employee=null;
 T.transferClientMember(s,fx,ta.id,tb.id,"creator");
 assert.equal(ta.memberIds.length,0);assert.ok(tb.memberIds.includes("creator"));
});
test("one client may have multiple campaigns managed by the same dedicated team",()=>{
 const s=agency(),a=project("a","ORION Electronics"),b=project("a2","ORION Electronics");
 s.ceo!.projects.push(a,b);const first=T.startClientTeam(s,a),second=T.startClientTeam(s,b);
 assert.equal(first.id,second.id);assert.equal(s.ceo!.clientTeams?.length,1);
 assert.deepEqual(first.projectIds,["a","a2"]);
});
test("agency can pay to outsource a workstream while preserving client segregation",()=>{
 const s=agency(),a=project("a","ORION Electronics"),b=project("b","Sora Home");
 s.ceo!.projects.push(a,b);T.startClientTeam(s,a);T.startClientTeam(s,b);
 const before=s.agencyCash;
 assert.equal(C.outsourceTeamTask(s,fx,a.id,"creative"),true);
 assert.ok(s.agencyCash<before);assert.equal(a.tasks[0].employee,"external");
 assert.equal(b.tasks[0].employee,null);
 assert.equal(a.tasks[0].status,"in_progress");
 assert.equal(C.outsourceTeamTask(s,fx,a.id,"creative"),false);
});
test("completed client releases its roster back to the pool only on explicit close",()=>{
 const s=agency(),a=project("a","ORION Electronics");
 s.ceo!.projects.push(a);const team=T.startClientTeam(s,a);
 C.hire(s,fx,"creator");T.joinClientTeam(s,fx,team.id,"creator");
 T.releaseClientTeam(s,fx,team.id);
 assert.equal(team.status,"active");
 a.status="completed";T.reconcileClientTeams(s);
 assert.equal(team.status,"closing");
 assert.ok(T.ownerTeam(s,"creator"),"closing roster retained until release");
 T.releaseClientTeam(s,fx,team.id);
 assert.equal(team.status,"released");assert.ok(T.talentPool(s).includes("creator"));
});
test("migration resolves pre-existing cross-client assignments without deleting work or XP",()=>{
 const s=agency(),a=project("a","ORION Electronics"),b=project("b","Sora Home");
 C.hire(s,fx,"creator");
 s.ceo!.projects.push(a,b);
 for(const p of [a,b]){p.tasks[0].status="in_progress";p.tasks[0].progress=3;p.tasks[0].employee="creator";}
 delete s.ceo!.clientTeams;
 const loaded=migrate(JSON.parse(JSON.stringify(s)));
 const [aa,bb]=loaded.ceo!.projects;
 assert.equal(aa.tasks[0].status,"in_progress");assert.equal(aa.tasks[0].employee,"creator");
 assert.equal(bb.tasks[0].status,"assigned");assert.equal(bb.tasks[0].progress,3);
 assert.equal(bb.tasks[0].employee,null);
 assert.ok(loaded.ceo!.clientTeams?.some(t=>t.brand==="Sora Home"&&t.memberIds.length===0));
});
test("auto assemble draws only from the global talent pool and never steals from another team",()=>{
 const s=agency(),a=project("a","ORION Electronics"),b=project("b","Sora Home");
 s.ceo!.projects.push(a,b);
 const ta=T.startClientTeam(s,a),tb=T.startClientTeam(s,b);
 for(const id of ["account","planner","creator","buyer","producer","analyst"]){C.hire(s,fx,id);}
 T.joinClientTeam(s,fx,ta.id,"creator");
 T.autoAssembleTeam(s,fx,tb.id);
 assert.equal(tb.memberIds.includes("creator"),false);
 assert.ok(tb.memberIds.length>=2);
 const roster=[...ta.memberIds,...tb.memberIds];
 assert.equal(new Set(roster).size,roster.length);
});
