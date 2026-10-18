import {cityClient} from "../src/game/city";
import test from "node:test";
import assert from "node:assert/strict";
import {defaults,newCEO,migrate} from "../src/game/state";
import {ceoDay,hire,dailyPayroll,qualify,startPitch,presentPitch,answerPitch} from "../src/game/ceo";
import {ensureTender,marketShare,registerRivalWin,resolveTalentOffer,rivalBidScore} from "../src/game/rivalAI";
import {employees} from "../src/game/data";
import type {Fx} from "../src/game/store";
const fx:Fx={toast:()=>{},log:()=>{}};
function game(){const s=defaults();s.agencyUnlocked=true;s.cityUnlocked=true;s.agencyCash=240000000;s.reputation=67;s.ceo=newCEO(67);s.ceo.pauseOnIssue=false;return s}
test("rival agencies create actual bids and win unclaimed tenders",()=>{
 const s=game(),c=s.ceo!,l=c.leads.find(x=>x.id==="sora")!;
 const t=ensureTender(c,l);
 assert.ok(t);assert.equal(t!.status,"open");
 const before=c.rivals.find(r=>r.id===t!.rivalId)!.clients;
 while(c.day<=t!.deadline)ceoDay(s,c,fx);
 assert.equal(l.status,"lost");
 assert.equal(l.lostTo,c.rivals.find(r=>r.id===t!.rivalId)!.name);
 assert.equal(c.rivals.find(r=>r.id===t!.rivalId)!.clients,before+1);
 assert.equal(t!.status,"won");
 assert.ok(c.rivalNews?.some(x=>x.kind==="win"&&x.message.includes("Sora Home")));
});
test("in-flight founder pitch is not stolen automatically at deadline",()=>{
 const s=game(),c=s.ceo!,l=c.leads.find(x=>x.id==="orion")!;
 qualify(s,fx,l.id);startPitch(s,fx,l.id);const t=ensureTender(c,l)!;
 assert.equal(l.status,"pitch");assert.ok(c.pitch);
 while(c.day<=t.deadline)ceoDay(s,c,fx);
 assert.equal(l.status,"pitch");assert.equal(t.status,"open");
 presentPitch(s);answerPitch(s,"evidence");
 assert.equal(c.pitch?.step,"result");
 assert.ok(["player",...l.rivalIds].includes(c.pitch!.result!.winner));
});
test("agent investments and cash flow modify actual rival state over multiple weeks",()=>{
 const s=game(),c=s.ceo!;c.leads=[];
 const atlas=c.rivals.find(r=>r.id==="atlas")!;
 atlas.clients=35;atlas.people=13;atlas.cash=500000000;
 const original={tier:atlas.officeTier??1,people:atlas.people,cash:atlas.cash};
 for(let i=0;i<35;i++)ceoDay(s,c,fx);
 assert.ok(atlas.officeTier!>original.tier||atlas.people>original.people);
 assert.notEqual(atlas.cash,original.cash);
 assert.ok(c.rivalNews?.some(e=>e.rivalId===atlas.id&&(e.kind==="expand"||e.kind==="hire")));
 assert.ok(marketShare(c).rivals.some(x=>x.id===atlas.id&&x.value>0));
});
test("retention choice costs cash and permanently affects real payroll",()=>{
 const s=game(),c=s.ceo!;s.staff=["researcher","planner"];
 const emp=employees.find(x=>x.id==="researcher")!;
 const before=dailyPayroll(s),cash=s.agencyCash;
 c.talentOffers=[{id:"offer-test",employeeId:emp.id,rivalId:"pulse",day:3,expires:10,bonus:2400000,raise:350000,status:"open"}];
 assert.equal(resolveTalentOffer(s,fx,"offer-test","retain"),true);
 assert.equal(s.agencyCash,cash-2400000);
 assert.equal(c.talentOffers[0].status,"retained");
 assert.equal(dailyPayroll(s),before+350000/30);
 assert.ok(s.staff.includes(emp.id));
 const loaded=migrate(JSON.parse(JSON.stringify(s)));
 assert.equal(loaded.ceo?.salaryPremiums?.[emp.id],350000);
});
test("a competitor poach removes staff and releases their active assignment for recovery",()=>{
 const s=game(),c=s.ceo!;s.staff=["researcher","planner"];
 c.talentOffers=[{id:"offer-loss",employeeId:"researcher",rivalId:"pulse",day:2,expires:9,bonus:2200000,raise:300000,status:"open"}];
 const pulse=c.rivals.find(x=>x.id==="pulse")!,headcount=pulse.people;
 c.projects.push({id:"project-temp",leadId:"orion",brand:"Demo",adBudget:10000000,fee:20000000,bonus:0,scope:4,duration:30,industry:"Tech",days:0,status:"active",scenarioIndex:0,startedDay:1,target:12,pitchQuality:60,mediaSpent:0,mediaReserved:10000000,direct:0,campaign:defaults().campaign,paymentCount:0,tasks:[{key:"research",label:"Research",role:"research",effort:6,pre:[],cost:1000000,status:"in_progress",progress:3,quality:0,employee:"researcher",outsourced:false}]});
 assert.equal(resolveTalentOffer(s,fx,"offer-loss","release"),true);
 assert.ok(!s.staff.includes("researcher"));
 assert.equal(pulse.people,headcount+1);
 assert.equal(c.projects[0].tasks[0].status,"assigned");
 assert.equal(c.projects[0].tasks[0].progress,3);
});
test("rival hiring competes for recruitment without permanent hidden locks",()=>{
 const s=game(),c=s.ceo!;
 c.talentMarket={analyst:{rivalId:"muse",untilDay:10}};c.day=4;
 hire(s,fx,"analyst");assert.ok(!s.staff.includes("analyst"));
 c.day=11;hire(s,fx,"analyst");assert.ok(s.staff.includes("analyst"));
});
test("old CEO saves get autonomous AI defaults without wiping prior deals",()=>{
 const s=game(),c=s.ceo!;const l=c.leads[0];l.status="qualified";
 delete c.tenders;delete c.rivalNews;delete c.salaryPremiums;delete c.talentOffers;delete c.talentMarket;
 const migrated=migrate(JSON.parse(JSON.stringify(s)));
 assert.deepEqual(migrated.ceo?.tenders,[]);
 assert.deepEqual(migrated.ceo?.talentOffers,[]);
 assert.deepEqual(migrated.ceo?.salaryPremiums,{});
 assert.equal(migrated.ceo?.leads.find(x=>x.id===l.id)?.status,"qualified");
});
test("rival economic model keeps scores bounded and avoids duplicate client awards",()=>{
 const s=game(),c=s.ceo!,l=c.leads[0];
 const bid=ensureTender(c,l)!;const r=c.rivals.find(x=>x.id===bid.rivalId)!;
 assert.ok(rivalBidScore(r,l,c.day)>=10&&rivalBidScore(r,l,c.day)<=99);
 const num=r.clients;
 assert.equal(registerRivalWin(s,c,l.id,r.id),true);
 assert.equal(registerRivalWin(s,c,l.id,r.id),false);
 assert.equal(r.clients,num+1);
});

test("startup agency seasonal leads are SME only and never include unearned corporate accounts",()=>{
 const s=game(),c=s.ceo!;
 c.leads=[];
 for(let i=0;i<27;i++)ceoDay(s,c,fx);
 const current=c.leads.find(l=>l.id==="market-startup-coffee-0-28");
 assert.ok(current);
 assert.equal(current.segment,"startup");
 assert.ok(current.value<=16_000_000);
 assert.ok(current.fee<=20_000_000);
 assert.equal(c.leads.some(l=>l.id==="market-orion-28"),false);
});
test("fresh fictional corporate tenders recur once qualified agency reaches premium status",()=>{
 const s=game(),c=s.ceo!;
 s.history=Array.from({length:3},()=>({brand:"Delivered",outcome:15,score:75,spent:8_000_000,rep:3,xp:7,scenarioIndex:0,agency:true}));
 for(let i=0;i<27;i++)ceoDay(s,c,fx);
 assert.equal(c.day,28);
 const rfp=c.leads.find(l=>l.id==="market-orion-28");
 assert.ok(rfp,"Day 28 must create a new ORION RFP");
 assert.equal(rfp.status,"new");
 assert.equal(cityClient(s,"orion")?.id,rfp.id);
 assert.ok(c.tenders?.some(t=>t.leadId===rfp.id&&t.status==="open"));
 const count=c.leads.length;
 // Rendering a map or reading agency state must not produce extra jobs.
 for(let i=0;i<5;i++)cityClient(s,"orion");
 assert.equal(c.leads.length,count);
 for(let i=0;i<28;i++)ceoDay(s,c,fx);
 assert.ok(c.leads.some(l=>l.id==="market-sora-56"));
 assert.equal(new Set(c.leads.map(l=>l.id)).size,c.leads.length);
});
