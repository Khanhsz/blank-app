import test from "node:test";
import assert from "node:assert/strict";
import {defaults,migrate,newCEO,newCampaign,type GameState,type Project,type Task} from "../src/game/state";
import {ceoTaskDefs} from "../src/game/data";
import {ceoTick,dailyPayroll,hire} from "../src/game/ceo";
import * as P from "../src/game/personnel";
import * as T from "../src/game/clientTeams";
import type {Fx} from "../src/game/store";
const fx:Fx={toast:()=>{},log:()=>{}};
function agency(){
 const s=defaults();s.created=true;s.agencyUnlocked=true;s.cityUnlocked=true;
 s.agencyCash=100_000_000;s.reputation=60;s.ceo=newCEO(60);s.ceo.weekly=s.clock;
 return s;
}
function project(id:string,role:string,days=30):Project{
 const td=ceoTaskDefs.find(t=>t.role===role)!;
 const task:Task={...td,pre:[],effort:6,status:"backlog",progress:0,quality:0,employee:null,outsourced:false};
 return {id,leadId:"sora",brand:id,adBudget:15_000_000,fee:22_000_000,bonus:0,scope:5,
 duration:days,industry:"Lifestyle",days:0,status:"active",scenarioIndex:4,startedDay:1,target:10,
 pitchQuality:70,mediaSpent:0,mediaReserved:15_000_000,direct:0,campaign:newCampaign(4),
 tasks:[task],paymentCount:0};
}
test("legacy staff IDs gain persistent deterministic employee profiles and missing leads are removed",()=>{
 const s=agency() as any;s.staff=["creator","buyer"];delete s.personnel;
 s.teamLeads={creative:"no-longer-employed"};
 const m=migrate(JSON.parse(JSON.stringify(s)));
 assert.equal(m.personnel.creator.skill,64);
 assert.equal("focus" in m.personnel.buyer,false);
 assert.equal(m.personnel.creator.morale,78);
 assert.equal(m.teamLeads.creative,undefined);
 const n=migrate(JSON.parse(JSON.stringify(m)));
 assert.deepEqual(n.personnel,m.personnel);
});
test("agency can recruit multiple specialists for the same marketing function",()=>{
 const s=agency();
 hire(s,fx,"creator");hire(s,fx,"creator2");hire(s,fx,"buyer2");
 assert.ok(s.staff.includes("creator")&&s.staff.includes("creator2"));
 assert.equal(P.primaryRole("creator2"),"creative");
 assert.equal(P.primaryRole("buyer2"),"media");
 assert.ok(P.candidatesForRole("creative").includes("creator2"));
 assert.equal(s.staff.filter(id=>P.primaryRole(id)==="creative").length,2);
});
test("two-slot staffing capacity is fixed and increasing skill improves work quality",()=>{
 const s=agency();hire(s,fx,"creator2");
 const initial=P.staffRate(s,"creator2","creative",1);
 assert.equal(P.effectiveCapacity(s,"creator2"),2);
 s.personnel.creator2.skill+=10;
 const improved=P.staffRate(s,"creator2","creative",1);
 assert.ok(improved.quality>initial.quality);
 const client=project("leader-client","creative");s.ceo!.projects.push(client);
 const squad=T.startClientTeam(s,client);T.joinClientTeam(s,fx,squad.id,"creator2");
 const oldPay=dailyPayroll(s);T.changeClientLead(s,fx,squad.id,"creator2");
 assert.equal(squad.leadId,"creator2");
 assert.ok(dailyPayroll(s)>=oldPay);
});
test("training costs agency cash, blocks assignment, and finishes after seven game days",()=>{
 const s=agency();hire(s,fx,"researcher2");
 const before=s.agencyCash,skill=s.personnel.researcher2.skill;
 P.train(s,fx,"researcher2");
 assert.ok(s.agencyCash<before);assert.equal(P.effectiveCapacity(s,"researcher2"),0);
 const work=project("research-work","research");
 s.ceo!.projects.push(work);
 const squad=T.startClientTeam(s,work);T.joinClientTeam(s,fx,squad.id,"researcher2");
 ceoTick(s,fx,6);assert.equal(work.tasks[0].employee,null);
 ceoTick(s,fx,1);
 assert.equal(s.personnel.researcher2.skill,skill+9);
 assert.ok(P.effectiveCapacity(s,"researcher2")>0);
 assert.equal(s.personnel.researcher2.trainingUntil,undefined);
});
test("an employee cannot be assigned to tasks for two different clients",()=>{
 const s=agency();hire(s,fx,"creator2");
 const a=project("normal-client","creative"),b=project("urgent-client","creative");
 s.ceo!.projects.push(a,b);
 const teamA=T.startClientTeam(s,a),teamB=T.startClientTeam(s,b);
 T.joinClientTeam(s,fx,teamA.id,"creator2");
 P.assignSpecialist(s,fx,a.id,"creative","creator2");
 P.assignSpecialist(s,fx,b.id,"creative","creator2");
 assert.equal(a.tasks[0].preferredEmployee,"creator2");
 assert.equal(b.tasks[0].preferredEmployee,undefined);
 P.prioritizeProject(s,fx,b.id,"high");
 ceoTick(s,fx,1);
 assert.equal(a.tasks[0].employee,"creator2");
 assert.equal(b.tasks[0].employee,null);
 assert.equal(b.tasks[0].status,"assigned");
 assert.equal(teamB.memberIds.length,0);
});
test("expertise and fatigue affect productivity; delivery earns progression",()=>{
 const s=agency();hire(s,fx,"creator2");
 const p=s.personnel.creator2;
 const initial=P.staffRate(s,"creator2","creative",1);
 p.fatigue=90;p.morale=40;
 const tired=P.staffRate(s,"creator2","creative",1);
 assert.ok(tired.speed<initial.speed);assert.ok(tired.quality<initial.quality);
 p.fatigue=0;p.morale=78;p.xp=19;
 P.recordDelivery(s,{...project("x","creative").tasks[0],status:"completed",quality:85,employee:"creator2"});
 assert.equal(p.skill,75);assert.equal(p.xp,3);
 assert.ok(p.morale>78);
});
