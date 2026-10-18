import test from "node:test";
import assert from "node:assert/strict";
import {defaults,newCEO,migrate} from "../src/game/state";
import {CLIENT_DATABASE,CLIENT_COUNTS,SECTORS,queryClients,getClient,scenarioForClient,agencyLeadForClient} from "../src/game/clientDatabase";
import {chooseFreelanceClient,scenarioOf} from "../src/game/campaign";
import {approachCatalogClient} from "../src/game/clientMarket";
import {sign} from "../src/game/ceo";
import type {Fx} from "../src/game/store";
const fx:Fx={toast:()=>{},log:()=>{}};
const game=()=>{const s=defaults();s.created=true;return s;};
test("112 canonical clients span seven exact sectors and all three segments",()=>{
 assert.equal(SECTORS.length,7);
 assert.deepEqual(SECTORS.map(x=>x.id),["coffee","beauty","fashion","education","tech","fitness","food"]);
 assert.equal(CLIENT_COUNTS.total,112);
 assert.equal(CLIENT_COUNTS.startup,28);
 assert.equal(CLIENT_COUNTS.sme,28);
 assert.equal(CLIENT_COUNTS.bigcorp,56);
 assert.equal(CLIENT_COUNTS.fortune,14);
 assert.equal(new Set(CLIENT_DATABASE.map(x=>x.id)).size,CLIENT_DATABASE.length);
 for(const sector of SECTORS){
  for(const segment of ["startup","sme","bigcorp"] as const){
   assert.ok(CLIENT_DATABASE.some(c=>c.sector===sector.id&&c.segment===segment));
  }
 }
});
test("every company has bounded marketing and awareness indices, explicit data provenance, and valid financial units",()=>{
 for(const c of CLIENT_DATABASE){
  assert.ok(c.marketingBudgetVnd>0);
  assert.ok(c.brandAwareness>=0&&c.brandAwareness<=100);
  assert.ok(c.scaleScore>=0&&c.scaleScore<=100);
  assert.ok(c.commercialScore>=0&&c.commercialScore<=100);
  if(c.basis==="simulated"){
   assert.equal(c.fortuneRank,null);
   assert.ok(c.annualRevenueVnd!>0);
   assert.ok(c.employees!>0);
   assert.equal(c.verifiedRevenueUsd,null);
  }else{
   assert.ok(c.fortuneRank!>=1&&c.fortuneRank!<=50);
   assert.equal(c.fortuneYear,2026);
   assert.ok(c.rankingSource?.startsWith("https://fortune.com/"));
   assert.equal(c.annualRevenueVnd,null,"never fabricate actual audited revenue");
   if(c.verifiedRevenueUsd!==null)assert.ok(c.revenueSource?.includes("fortune.com"));
  }
 }
});
test("Fortune registry is a genuine subset of top 50 without pretending all seven sectors exist there",()=>{
 const fortune=queryClients({fortuneOnly:true});
 assert.equal(fortune.length,14);
 assert.ok(fortune.some(c=>c.brand==="Amazon"&&c.fortuneRank===1));
 assert.ok(fortune.some(c=>c.brand==="Apple"&&c.fortuneRank===4));
 assert.ok(fortune.some(c=>c.brand==="Walmart"&&c.fortuneRank===2));
 assert.ok(!fortune.some(c=>c.sector==="education"||c.sector==="fitness"||c.sector==="coffee"));
 assert.equal(getClient("f50-41")?.verifiedRevenueUsd,null);
});
test("company rankings and filters use revenue, commercial budget, sector and brand awareness",()=>{
 const s=queryClients({segment:"sme",sector:"beauty"});
 assert.equal(s.length,4);
 const scaled=queryClients({sort:"scale"});
 assert.ok(scaled[0].scaleScore>=scaled[1].scaleScore);
 const revenue=queryClients({segment:"sme",sort:"revenue"});
 assert.ok(revenue[0].annualRevenueVnd!>=revenue[1].annualRevenueVnd!);
 const budget=queryClients({sort:"budget"});
 assert.ok(budget[0].marketingBudgetVnd>=budget[1].marketingBudgetVnd);
 const aware=queryClients({sort:"awareness"});
 assert.ok(aware[0].brandAwareness>=aware[1].brandAwareness);
 assert.equal(queryClients({search:"Mây Corner"}).length,1);
});
test("Freelancer can choose any startup/SME client independently of fixed scenario sequence, and cannot select Big Corp",()=>{
 const s=game();
 assert.equal(chooseFreelanceClient(s,fx,"sme-tech-1"),true);
 assert.equal(s.campaign.catalogClientId,"sme-tech-1");
 assert.equal(s.campaign.aiStatus,"pending");
 assert.equal(s.campaign.aiScenario,null,"no prewritten bedroom brief before Gemini");
 assert.equal(s.campaign.startedDay,1);
 assert.equal(chooseFreelanceClient(s,fx,"startup-fashion-2"),true);
 assert.equal(s.campaign.catalogClientId,"startup-fashion-2");
 assert.equal(chooseFreelanceClient(s,fx,"f50-1"),false);
 assert.equal(s.campaign.catalogClientId,"startup-fashion-2");
 const saved=migrate(JSON.parse(JSON.stringify(s)));
 assert.equal(saved.campaign.catalogClientId,"startup-fashion-2");
 assert.equal(saved.campaign.aiScenario,null);
 assert.equal(saved.campaign.aiStatus,"pending");
});
test("catalog generated briefs remain valid complete scenarios for the existing 7-mission engine",()=>{
 for(const c of CLIENT_DATABASE.filter(c=>c.segment!=="bigcorp")){
  const sc=scenarioForClient(c);
  assert.ok(sc.budget>0&&sc.fee>0);
  assert.ok(sc.days>=14);
  assert.ok(["awareness","value","location","trust","style"].includes(sc.trueInsight));
  assert.equal(sc.insightOptions?.length,5);
  assert.ok(sc.reports.interview&&sc.reports.reviews&&sc.reports.audit);
 }
});
test("new agency may prospect Startup/SME only; Big Corp unlock requires completed delivery and reputation",()=>{
 const s=game();s.agencyUnlocked=true;s.ceo=newCEO(75);s.reputation=75;
 assert.equal(approachCatalogClient(s,fx,"f50-4"),false);
 assert.equal(approachCatalogClient(s,fx,"sme-coffee-2"),true);
 s.history=Array.from({length:3},()=>({brand:"Test",outcome:15,score:80,spent:1000000,rep:3,xp:7,scenarioIndex:0,agency:true}));
 assert.equal(approachCatalogClient(s,fx,"f50-4"),true);
 const a=s.ceo.leads.find(x=>x.clientMasterId==="f50-4")!;
 assert.equal(a.brand,"Apple");assert.equal(a.segment,"bigcorp");
 assert.equal(a.businessSize,"enterprise");assert.ok(a.value>0);
 assert.equal(approachCatalogClient(s,fx,"f50-4"),false);
 assert.equal(s.ceo.leads.filter(x=>x.clientMasterId==="f50-4").length,1);
 assert.equal(approachCatalogClient(s,fx,"sme-coffee-2"),false);
 assert.ok(s.ceo.leads.find(x=>x.clientMasterId==="sme-coffee-2"));
});
test("new agency contracts load client-specific scenario instead of inheriting wrong legacy category",()=>{
 const s=game();s.agencyUnlocked=true;s.cityUnlocked=true;s.agencyCash=200000000;s.ceo=newCEO(78);s.ceo.day=1;
 assert.equal(approachCatalogClient(s,fx,"sme-education-2"),true);
 const l=s.ceo.leads.find(x=>x.clientMasterId==="sme-education-2")!;
 l.status="negotiating";
 s.ceo.negotiation={id:l.id,round:3,fee:l.fee,scope:l.scope,advance:30,deadline:l.duration,bonus:0,trust:70,notes:[],status:"open",counter:null};
 sign(s,fx);
 const p=s.ceo.projects.find(p=>p.leadId===l.id)!;
 assert.ok(p);
 assert.equal(p.clientMasterId,"sme-education-2");
 assert.equal(p.campaign.catalogClientId,"sme-education-2");
 assert.equal(p.campaign.aiScenario?.brand,l.brand);
 assert.equal(p.campaign.aiScenario?.budget,l.value);
 assert.equal(p.campaign.aiScenario?.days,l.duration);
 assert.equal(s.ceo.clientTeams?.some(team=>team.brand===l.brand),true);
 const m=migrate(JSON.parse(JSON.stringify(s)));
 assert.equal(m.ceo?.projects.find(p=>p.id===p.id)?.campaign.aiScenario?.brand,l.brand);
});
