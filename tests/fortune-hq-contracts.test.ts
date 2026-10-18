import test from "node:test";
import assert from "node:assert/strict";
import {defaults,newCEO,migrate} from "../src/game/state";
import {agencyLeadForClient,getClient} from "../src/game/clientDatabase";
import {approachCatalogClient,approachFortuneAtHQ} from "../src/game/clientMarket";
import {canContractFortune,ensureFortuneAccounts,fortuneRfpStatus,fortuneConflict,FORTUNE_YEAR_DAYS} from "../src/game/fortuneAccounts";
import {sign,ceoTick} from "../src/game/ceo";
import type {Fx} from "../src/game/store";
import type {Lead} from "../src/game/state";
const fx:Fx={toast:()=>{},log:()=>{}};
function agency(){
 const s=defaults();s.created=true;s.agencyUnlocked=true;s.cityUnlocked=true;s.reputation=77;
 s.agencyCash=100_000_000;s.ceo=newCEO(77);s.ceo.leads=[];s.ceo.day=1;
 s.history=Array.from({length:3},()=>({brand:"SME",outcome:15,score:82,spent:10_000_000,rep:6,xp:7,scenarioIndex:0,agency:true}));
 return s;
}
function negotiate(s:ReturnType<typeof agency>,id:string){
 const c=s.ceo!,client=getClient(id)!;
 const base=agencyLeadForClient(client);
 const l:Lead={...base,id:"manual-"+id,status:"negotiating",source:"outbound",relationship:72,
  contractType:"annual-retainer",hqApproach:true};
 c.leads.push(l);
 c.negotiation={id:l.id,round:3,fee:l.fee,scope:l.scope,advance:100,deadline:365,bonus:0,trust:75,notes:[],status:"open",counter:null};
 return l;
}
test("Fortune registry starts with distinct incumbent rival agencies on major top accounts",()=>{
 const s=agency(),accounts=ensureFortuneAccounts(s);
 assert.equal(accounts["f50-1"].ownerAgencyId,"atlas");
 assert.equal(accounts["f50-2"].ownerAgencyId,"pulse");
 assert.equal(accounts["f50-4"].ownerAgencyId,"muse");
 assert.equal(accounts["f50-5"].ownerAgencyId,"north");
 assert.notEqual(accounts["f50-1"].ownerAgencyId,accounts["f50-4"].ownerAgencyId);
});
test("Fortune 50 rejects Marketplace prospecting and accepts only a real HQ interaction",()=>{
 const s=agency();
 assert.equal(approachCatalogClient(s,fx,"f50-42"),false);
 assert.equal(s.ceo!.leads.length,0);
 assert.equal(approachFortuneAtHQ(s,fx,"f50-42"),true);
 const l=s.ceo!.leads.find(x=>x.clientMasterId==="f50-42")!;
 assert.equal(l.hqApproach,true);
 assert.equal(l.contractType,"annual-retainer");
 assert.equal(l.duration,FORTUNE_YEAR_DAYS);
 assert.equal(approachFortuneAtHQ(s,fx,"f50-42"),false);
 assert.equal(approachFortuneAtHQ(s,fx,"bigcorp-tech-0"),false);
});
test("incumbent top Fortune account cannot be pitched until its last 90 simulated days",()=>{
 const s=agency();
 assert.equal(approachFortuneAtHQ(s,fx,"f50-1"),false);
 assert.equal(fortuneRfpStatus(s,"f50-1").owner,"atlas");
 s.ceo!.day=50;
 assert.equal(fortuneRfpStatus(s,"f50-1").remaining,90);
 assert.equal(approachFortuneAtHQ(s,fx,"f50-1"),true);
});
test("signing Fortune annual retainer books exactly one paid 12-month service invoice",()=>{
 const s=agency(),c=s.ceo!,l=negotiate(s,"f50-42"),before=s.agencyCash;
 sign(s,fx);
 assert.equal(l.status,"signed");
 const p=c.projects.find(x=>x.leadId===l.id)!;
 assert.ok(p);
 assert.equal(p.duration,365);
 assert.equal(p.contractTerms?.kind,"annual-retainer");
 assert.equal(p.contractTerms?.annualServiceFeeVnd,l.fee);
 assert.equal(p.contractTerms?.annualMediaBudgetVnd,l.value);
 assert.equal(p.contractTerms?.endDay,c.day+365);
 assert.equal(p.contractTerms?.monthlyReports,true);
 assert.equal(p.contractTerms?.terminationNoticeDays,30);
 assert.equal(p.contractTerms?.paymentStatus,"paid");
 assert.equal(s.agencyCash,before+l.fee);
 assert.equal(c.totalBilled,l.fee);
 assert.equal(c.totalPaid,l.fee);
 assert.equal(p.paymentCount,1);
 assert.equal(c.ledger.filter(e=>e.lead===l.brand&&e.what.includes("Annual marketing retainer")).length,1);
 assert.equal(ensureFortuneAccounts(s)["f50-42"].ownerAgencyId,"player");
 const restored=migrate(JSON.parse(JSON.stringify(s)));
 assert.equal(restored.ceo?.projects.find(x=>x.id===p.id)?.contractTerms?.endDay,p.contractTerms?.endDay);
 assert.equal(restored.ceo?.fortuneAccounts?.["f50-42"].ownerAgencyId,"player");
});
test("365-day retainer remains active after single-project milestone and never double-invoices",()=>{
 const s=agency(),c=s.ceo!,l=negotiate(s,"f50-42");sign(s,fx);
 const p=c.projects.find(x=>x.leadId===l.id)!;
 p.days=219;
 p.tasks.forEach(x=>{x.status="completed";x.quality=77;});
 const amount=c.totalBilled;
 ceoTick(s,fx,1);
 assert.equal(p.status,"active");
 assert.equal(c.totalBilled,amount);
 assert.equal(p.paymentCount,1);
});
test("a single agency cannot contract two Fortune Top 10 tech companies at the same time",()=>{
 const s=agency();s.ceo!.day=100;
 const a=negotiate(s,"f50-4");
 sign(s,fx);
 assert.equal(a.status,"signed");
 assert.equal(fortuneConflict(s,"f50-5"),"Apple");
 assert.equal(approachFortuneAtHQ(s,fx,"f50-5"),false);
 const b=negotiate(s,"f50-5");const before=s.ceo!.projects.length;
 sign(s,fx);
 assert.equal(b.status,"negotiating");
 assert.equal(s.ceo!.projects.length,before);
 assert.equal(canContractFortune(s,"f50-5",b.id).ok,false);
});
