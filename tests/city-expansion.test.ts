import {ceoLeadDefs} from "../src/game/data";
import {qualify,startPitch} from "../src/game/ceo";
import test from "node:test";
import assert from "node:assert/strict";
import {defaults,migrate,newCEO} from "../src/game/state";
import {cityLots,cityCounts,officeOptions,currentOffice,leaseOffice,cityRival} from "../src/game/city";
import {ceoDay,hire} from "../src/game/ceo";
import type {Fx} from "../src/game/store";
const fx:Fx={toast:()=>{},log:()=>{}};
test("expanded city has 27 unique functional buildings; original game destinations remain",()=>{
 assert.equal(cityLots.length,27);
 assert.deepEqual(cityCounts,{core:8,rivals:5,offices:8,clients:6});
 assert.equal(new Set(cityLots.map(l=>l.id)).size,27);
 assert.equal(new Set(cityLots.map(l=>l.x+","+l.z)).size,27);
 for(const place of cityLots){assert.ok(Math.abs(place.x)<=49);assert.ok(Math.abs(place.z)<=41);assert.ok(place.w>0&&place.d>0&&place.h>0)}
 for(const id of ["research","creative","media","influencer","network","brand","cowork","agency"])assert.ok(cityLots.some(l=>l.id===id&&l.kind==="core"));
});
test("rival building listings use the same evolving CEO agency state",()=>{
 const s=defaults();s.agencyUnlocked=true;s.ceo=newCEO(48);
 const rival=cityLots.find(l=>l.id==="rival-pulse");
 assert.ok(rival?.rivalId);
 assert.equal(cityRival(s,rival.rivalId!)?.name,"Pulse Performance");
 s.ceo.rivals.find(r=>r.id==="pulse")!.clients=88;
 assert.equal(cityRival(s,"pulse")?.clients,88);
});
test("office rental is financially real, changes employee capacity and daily overhead",()=>{
 const s=defaults();s.agencyUnlocked=true;s.cityUnlocked=true;s.reputation=45;s.ceo=newCEO(45);s.agencyCash=65000000;
 assert.equal(currentOffice(s).id,"agency");assert.equal(currentOffice(s).daily,160000);
 const option=officeOptions.find(o=>o.id==="office-atrium")!;
 const originalCash=s.agencyCash,originalRep=s.reputation;
 assert.equal(leaseOffice(s,fx,option.id),true);
 assert.equal(s.officeId,option.id);
 assert.equal(s.agencyCash,originalCash-option.deposit);
 assert.equal(currentOffice(s).capacity,option.capacity);
 assert.equal(s.reputation,originalRep+option.prestige);
 assert.ok(s.ceo?.ledger.some(x=>x.what.includes("Office relocation deposit")));
 const beforeDay=s.agencyCash;
 ceoDay(s,s.ceo!,fx);
 assert.equal(s.agencyCash,beforeDay-option.daily);
 assert.equal(s.ceo?.day,2);
 const restored=migrate(JSON.parse(JSON.stringify(s)));
 assert.equal(restored.officeId,option.id);
 assert.equal(restored.world.leasedOffices.length,1);
});
test("office prestige is a one-time reward; leasing requires cash, reputation and agency",()=>{
 const s=defaults();s.cityUnlocked=true;s.agencyCash=80000000;s.reputation=60;s.ceo=newCEO(60);
 assert.equal(leaseOffice(s,fx,"office-loft"),false);
 s.agencyUnlocked=true;
 assert.equal(leaseOffice(s,fx,"office-skyline"),false);
 assert.equal(leaseOffice(s,fx,"office-loft"),true);
 const reputation=s.reputation;
 assert.equal(leaseOffice(s,fx,"office-brick"),true);
 const newRep=s.reputation;
 assert.ok(newRep>reputation);
 assert.equal(leaseOffice(s,fx,"office-loft"),true);
 assert.equal(s.reputation,newRep);
 assert.deepEqual(s.world.leasedOffices,["office-loft","office-brick"]);
});
test("starter office capacity prevents unlimited hiring until relocating",()=>{
 const s=defaults();s.agencyUnlocked=true;s.ceo=newCEO(50);s.reputation=50;s.agencyCash=100000000;
 s.staff=Array(8).fill("legacy-team");
 hire(s,fx,"researcher");
 assert.equal(s.staff.length,8);
 assert.equal(leaseOffice(s,fx,"office-loft"),true);
 hire(s,fx,"researcher");
 assert.equal(s.staff.length,9);
});
test("saves from older versions default to starter HQ without losing progress",()=>{
 const old=defaults() as any;
 delete old.officeId;old.world={visited:["network"],contacts:[]};
 const loaded=migrate(old);
 assert.equal(loaded.officeId,"agency");
 assert.deepEqual(loaded.world.leasedOffices,[]);
 assert.deepEqual(loaded.world.visited,["network"]);
});


test("six corporate client headquarters map to real CEO opportunities",()=>{

 const clientLots=cityLots.filter(l=>l.kind==="client");
 assert.equal(clientLots.length,6);
 for(const lot of clientLots){
  const lead=ceoLeadDefs.find(x=>x.id===lot.clientId);
  assert.ok(lead,"Every client HQ must map to an actual procurement brief: "+lot.id);
  assert.ok(lead!.fee>0);
  assert.ok(lead!.value>lead!.fee);
  assert.ok(lead!.rivalIds.length>=1);
 }
});
test("legacy CEO opportunities remain unchanged without injecting unearned corporate leads",()=>{
 const s=defaults();s.agencyUnlocked=true;s.ceo=newCEO(54);
 const oldIds=new Set(["orion","sora","vertex"]);
 s.ceo.leads=s.ceo.leads.filter(l=>oldIds.has(l.id));
 const savedLead=s.ceo.leads.find(x=>x.id==="orion")!;
 savedLead.status="qualified";savedLead.relationship=79;
 s.ceo.day=33;
 const loaded=migrate(JSON.parse(JSON.stringify(s)));
 assert.equal(loaded.ceo?.leads.length,3);
 assert.equal(loaded.ceo?.leads.find(l=>l.id==="orion")?.status,"qualified");
 assert.equal(loaded.ceo?.leads.find(l=>l.id==="orion")?.relationship,79);
 assert.equal(loaded.ceo?.day,33);
 assert.equal(loaded.ceo?.leads.some(l=>l.id==="bloom"),false);
});
test("mapped corporate client uses actual qualification and competitive pitch system",()=>{
 const s=defaults();s.agencyUnlocked=true;s.ceo=newCEO(58);s.agencyCash=6000000;s.staff=["account","research","creative","media"];
 const l=s.ceo.leads.find(x=>x.id==="bloom")!;
 assert.equal(l.status,"new");
 qualify(s,fx,l.id);
 assert.equal(l.status,"qualified");
 assert.equal(l.insightKnown,true);
 const afterQualification=s.agencyCash;
 startPitch(s,fx,l.id);
 assert.equal(l.status,"pitch");
 assert.equal(s.agencyCash,afterQualification-500000);
 assert.equal(s.ceo.pitch?.id,l.id);
});
