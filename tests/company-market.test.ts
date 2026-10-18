import test from "node:test";
import assert from "node:assert/strict";
import {defaults,migrate,newCEO} from "../src/game/state";
import {CLIENT_DATABASE,CLIENT_BY_ID,CLIENT_COUNTS} from "../src/game/clientDatabase";
import {ensureCompanyMarket,advanceCompanyMarket,recordClientDelivery,recordRivalDelivery,currentFortuneBoard,projectedFortuneRanking,applyGeminiMarketIntelligence,marketIntelligencePayload} from "../src/game/companyMarket";
import type {Fx} from "../src/game/store";
const fx:Fx={log:()=>{},toast:()=>{}};
test("all 112 clients have deterministic, separately labeled revenue simulations",()=>{
 const s=defaults(),market=ensureCompanyMarket(s);
 assert.equal(CLIENT_COUNTS.total,112);
 assert.equal(CLIENT_COUNTS.bigcorp,56);
 assert.equal(Object.keys(market.companies).length,112);
 for(const c of CLIENT_DATABASE){
  const model=market.companies[c.id];
  assert.equal(model.id,c.id);
  assert.equal(model.currency,c.segment==="bigcorp"?"USD":"VND");
  assert.ok(model.simulatedAnnualRevenue>0);
  assert.equal(model.totalGrowthPct,0);
  assert.equal(model.awareness,c.brandAwareness);
 }
 assert.equal(ensureCompanyMarket(s),market);
});
test("only Big Corp participate in quarterly top 50 and published Fortune ranks never change",()=>{
 const s=defaults(),initial=ensureCompanyMarket(s);
 const p=currentFortuneBoard(s);
 assert.equal(p.week,0);assert.equal(p.entries.length,50);
 assert.equal(new Set(p.entries.map(e=>e.id)).size,50);
 assert.ok(p.entries.every(e=>CLIENT_BY_ID[e.id].segment==="bigcorp"));
 const official=CLIENT_BY_ID["f50-4"].fortuneRank;
 advanceCompanyMarket(s,12,fx);
 assert.equal(currentFortuneBoard(s).week,0,"weekly financial performance must not republish rankings");
 advanceCompanyMarket(s,13,fx);
 assert.equal(currentFortuneBoard(s).week,13);
 assert.equal(currentFortuneBoard(s).entries.length,50);
 assert.equal(CLIENT_BY_ID["f50-4"].fortuneRank,official);
 assert.equal(s.companyMarket?.quarters.length,2);
 assert.equal(projectedFortuneRanking(s).length,50);
});
test("campaign outcome changes the client company's next week without crediting player finance twice",()=>{
 const baseline=defaults(),withCamp=defaults(),id="bigcorp-tech-1";
 ensureCompanyMarket(baseline);ensureCompanyMarket(withCamp);
 recordClientDelivery(withCamp,{clientId:id,projectId:"player-111",spendVnd:2000000000,quality:92,kpi:55});
 recordRivalDelivery(withCamp,{clientId:id,projectId:"rival-222",agency:"Atlas",spendVnd:2400000000,quality:81});
 const beforeCash=withCamp.personalCash,beforeRep=withCamp.reputation;
 advanceCompanyMarket(withCamp,1,fx);advanceCompanyMarket(baseline,1,fx);
 const richer=withCamp.companyMarket!.companies[id],other=baseline.companyMarket!.companies[id];
 assert.ok(richer.simulatedAnnualRevenue>other.simulatedAnnualRevenue);
 assert.ok(richer.playerMarketingImpact>0&&richer.rivalMarketingImpact>0);
 assert.equal(richer.campaigns,2);
 assert.equal(withCamp.personalCash,beforeCash);assert.equal(withCamp.reputation,beforeRep);
});
test("no duplicate effects from repeated End Week calls, repeated project completion or save reload",()=>{
 const s=defaults();
 recordClientDelivery(s,{clientId:"sme-coffee-0",projectId:"c-1",spendVnd:4000000,quality:83,kpi:18});
 recordClientDelivery(s,{clientId:"sme-coffee-0",projectId:"c-1",spendVnd:4000000,quality:83,kpi:18});
 assert.equal(s.companyMarket?.pending.length,1);
 advanceCompanyMarket(s,1,fx);
 const copy=structuredClone(s.companyMarket!.companies["sme-coffee-0"]);
 assert.equal(advanceCompanyMarket(s,1,fx),null);
 assert.deepEqual(s.companyMarket!.companies["sme-coffee-0"],copy);
 const saved=migrate(JSON.parse(JSON.stringify(s)));
 assert.equal(saved.companyMarket?.lastWeek,1);
 assert.deepEqual(saved.companyMarket?.companies["sme-coffee-0"],copy);
});
test("Gemini signals are validated and bounded; old reports cannot retroactively change revenue",()=>{
 const s=defaults();advanceCompanyMarket(s,4,fx);
 const revenue=s.companyMarket!.companies["bigcorp-fashion-0"].simulatedAnnualRevenue;
 const payload=marketIntelligencePayload(s);
 assert.equal(payload.week,4);assert.equal(payload.sectors.length,7);
 const applied=applyGeminiMarketIntelligence(s,{week:4,headline:"Demand rises cautiously in beauty",summary:"This report affects future weeks only; revenue is still computed by the game.",
  source:"gemini",signals:payload.sectors.map(x=>({sector:x.sector,momentum:x.sector==="fashion"?500:-400,reason:"Sample indicator"}))});
 assert.equal(applied,true);
 assert.equal(s.companyMarket!.macro.fashion,.65);
 assert.equal(s.companyMarket!.macro.food,-.65);
 assert.equal(s.companyMarket!.companies["bigcorp-fashion-0"].simulatedAnnualRevenue,revenue);
 assert.equal(applyGeminiMarketIntelligence(s,{week:4,headline:"Repeat",summary:"Duplicate report",source:"rules",signals:[]}),false);
 advanceCompanyMarket(s,5,fx);
 assert.notEqual(s.companyMarket!.companies["bigcorp-fashion-0"].simulatedAnnualRevenue,revenue);
});
test("rival agency autonomous campaigns have traceable financial business impact",()=>{
 const s=defaults();s.agencyUnlocked=true;s.ceo=newCEO(60);
 advanceCompanyMarket(s,4,fx);
 const m=ensureCompanyMarket(s);
 assert.ok(m.activity.some(e=>e.actor==="rival"&&e.agency));
 assert.ok(Object.values(m.companies).some(c=>c.rivalMarketingImpact>0));
 assert.ok(m.activity.every(e=>CLIENT_BY_ID[e.clientId]));
});
