import test from "node:test";
import assert from "node:assert/strict";
import {CLIENT_DATABASE,FINANCIAL_BANDS,CLIENT_BY_ID,SIMULATED_USD_TO_VND} from "../src/game/clientDatabase";
import {defaults,migrate,newCEO} from "../src/game/state";
import {createAgency} from "../src/game/campaign";
import {approachCatalogClient,bigCorpAccess} from "../src/game/clientMarket";
import {ensureCompanyMarket,currentMarketingBudgetVnd,applyInitialFinancialCalibration} from "../src/game/companyMarket";
import {ruleCalibration,calibratedClient,validatedCalibration} from "../src/game/financeCalibration";
import type {Fx} from "../src/game/store";
const fx:Fx={toast:()=>{},log:()=>{}};
const agencyHistory=()=>Array.from({length:3},()=>({brand:"Client",outcome:18,score:80,spent:9000000,rep:4,xp:7,scenarioIndex:0,agency:true}));
test("startup, SME and fictional Big Corp revenue bands stay separated; budgets follow realistic tier shares",()=>{
 for(const c of CLIENT_DATABASE.filter(x=>x.basis==="simulated")){
  const range=FINANCIAL_BANDS[c.segment];
  assert.ok(c.annualRevenueVnd!==null);
  assert.ok(c.annualRevenueVnd!>=range.revenueMinVnd&&c.annualRevenueVnd!<=range.revenueMaxVnd,c.id);
  const rate=c.marketingBudgetVnd/c.annualRevenueVnd!;
  assert.ok(rate>=range.marketingShareMin-.001&&rate<=range.marketingShareMax+.001,c.id);
 }
 assert.ok(FINANCIAL_BANDS.startup.revenueMaxVnd<FINANCIAL_BANDS.sme.revenueMinVnd);
 assert.ok(FINANCIAL_BANDS.sme.revenueMaxVnd<FINANCIAL_BANDS.bigcorp.revenueMinVnd);
});
test("Big Corp dollar-value business simulator agrees with the fictional VND master database",()=>{
 const s=defaults(),m=ensureCompanyMarket(s);
 for(const c of CLIENT_DATABASE.filter(x=>x.segment==="bigcorp"&&x.basis==="simulated")){
  assert.equal(m.companies[c.id].currency,"USD");
  assert.equal(m.companies[c.id].simulatedAnnualRevenue,Math.round(c.annualRevenueVnd!/SIMULATED_USD_TO_VND));
 }
});
test("new agency starts without unsolicited legacy leads and can only prospect Startup/SME",()=>{
 const s=defaults();s.created=true;s.reputation=38;s.expertise=18;s.personalCash=9_000_000;
 s.history=agencyHistory().map(x=>({...x,agency:false}));
 createAgency(s,fx,"New Studio");
 assert.equal(s.agencyUnlocked,true);
 assert.equal(s.ceo?.leads.length,0);
 assert.equal(bigCorpAccess(s).unlocked,false);
 assert.equal(approachCatalogClient(s,fx,"startup-coffee-0"),true);
 assert.equal(approachCatalogClient(s,fx,"sme-tech-1"),true);
 assert.equal(approachCatalogClient(s,fx,"bigcorp-tech-1"),false);
 assert.equal(approachCatalogClient(s,fx,"f50-4"),false);
});
test("Big Corp unlock requires three completed agency campaigns AND reputation 55, independently of freelancer wins",()=>{
 const s=defaults();s.created=true;s.agencyUnlocked=true;s.reputation=54;s.ceo=newCEO(54);
 s.history=agencyHistory();
 assert.equal(bigCorpAccess(s).unlocked,false);
 s.reputation=55;
 assert.equal(bigCorpAccess(s).unlocked,true);
 assert.equal(approachCatalogClient(s,fx,"f50-4"),false,"Fortune prospecting requires a corporate HQ visit");
 s.ceo.day=100;s.clock.day=100;
 assert.equal(approachCatalogClient(s,fx,"f50-4","hq"),true,"RFP opens during incumbent renewal window");
 assert.equal(approachCatalogClient(s,fx,"f50-4","hq"),false,"duplicate deal blocked");
});
test("bounded Gemini correction affects fictional starting revenue and marketing budget without falsifying Fortune data",()=>{
 const s=defaults(),before=CLIENT_BY_ID["sme-coffee-1"],published=CLIENT_BY_ID["f50-4"];
 const suggestion=ruleCalibration();suggestion.source="gemini";
 suggestion.adjustments=suggestion.adjustments.map(x=>x.sector==="coffee"?{...x,sme:1.12,marketing:1.08,bigcorp:1.14}:x);
 s.financeCalibration=validatedCalibration(suggestion);
 const calibrated=calibratedClient(s,before);
 assert.ok(calibrated.annualRevenueVnd!>before.annualRevenueVnd!);
 assert.ok(calibrated.marketingBudgetVnd>before.marketingBudgetVnd);
 assert.equal(calibratedClient(s,published).verifiedRevenueUsd,published.verifiedRevenueUsd);
 assert.equal(calibratedClient(s,published).annualRevenueVnd,null);
 const m=ensureCompanyMarket(s);
 assert.equal(m.companies[before.id].simulatedAnnualRevenue,calibrated.annualRevenueVnd);
 const growthBefore=currentMarketingBudgetVnd(s,before);
 m.companies[before.id].simulatedAnnualRevenue*=1.1;
 assert.ok(currentMarketingBudgetVnd(s,before)>growthBefore);
});
test("late AI corrections never rewrite already advanced revenue histories",()=>{
 const s=defaults(),m=ensureCompanyMarket(s),id="startup-beauty-1";
 const previous=m.companies[id].simulatedAnnualRevenue;
 m.lastWeek=4;
 const ai=ruleCalibration();ai.source="gemini";
 ai.adjustments=ai.adjustments.map(a=>({...a,startup:1.15}));
 s.financeCalibration=ai;
 assert.equal(applyInitialFinancialCalibration(s),false);
 assert.equal(m.companies[id].simulatedAnnualRevenue,previous);
});
test("legacy saved agency pipeline keeps existing deals but does not inject default clients",()=>{
 const s=defaults();s.created=true;s.agencyUnlocked=true;s.ceo=newCEO(70);s.ceo.leads=[];
 const restored=migrate(JSON.parse(JSON.stringify(s)));
 assert.equal(restored.ceo?.leads.length,0);
});
test("Gemini output must contain seven unique sector groups and finite factors",()=>{
 const valid=ruleCalibration();
 assert.equal(validatedCalibration(valid).adjustments.length,7);
 assert.throws(()=>validatedCalibration({...valid,adjustments:valid.adjustments.slice(1)}));
 assert.throws(()=>validatedCalibration({...valid,adjustments:valid.adjustments.map(a=>({...a,startup:Number.NaN}))}));
});
