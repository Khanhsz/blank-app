import test from "node:test";
import assert from "node:assert/strict";
import {validateCandidate,inputCategory,prompt} from "./scenario.mjs";
const input={brand:"Breeze Corner",industry:"F&B",contact:"Ms. Lee · Owner",budget:10000000,baseline:45,target:25,metric:"visits/week",unit:"visits",summary:"Grow the afternoon traffic from local students.",client:"Students pass our cafe but many do not come in.",trueInsight:"awareness",trueSegment:"students",truePosition:"study",trueCreative:"study",trueObjective:"visits",channel:{paid:1.1,creator:1.15,promo:.88,flyer:.8},reports:{audit:"Competitors communicate their location through local short videos.",reviews:"Customers like drinks but say not many people know about us.",industry:"Industry demand is growing but does not explain the specific problem.",interview:"Several students did not know the shop even though they pass it daily."},insightOptions:["awareness","value","location","trust","style"].map(id=>({id,title:"Hypothesis "+id,desc:"Some evidence may point to "+id}))};
test("validated AI scenario retains simulation-compatible fields",()=>{const s=validateCandidate(input,"coffee");assert.equal(s.trueInsight,"awareness");assert.equal(s.reports.interview,input.reports.interview);assert.equal(s.insightOptions.length,5);assert.equal(s.fee,4000000);assert.match(s.id,/^ai-/);});
test("rejects unbounded and invalid game outcomes",()=>{assert.throws(()=>validateCandidate({...input,trueInsight:"guaranteed_win"},"coffee"));assert.throws(()=>validateCandidate({...input,channel:{...input.channel,creator:30}},"coffee"));assert.throws(()=>validateCandidate({...input,budget:3000000000}));});
test("rejects incomplete research or repeated insight options",()=>{assert.throws(()=>validateCandidate({...input,reports:{audit:"hi"}}));assert.throws(()=>validateCandidate({...input,insightOptions:Array(5).fill(input.insightOptions[0])}));});
test("input restrictions",()=>{assert.equal(inputCategory("restricted-category"),"coffee");assert.match(prompt("coffee"),/fictional marketing client/);});

import {SECTORS as MARKET_SECTORS,validateMarketRequest,validateMarketIntelligence,fallbackMarketReport,marketPrompt} from "./company-intelligence.mjs";
const marketInput={week:4,sectors:MARKET_SECTORS.map(sector=>({sector,clientCount:16,averageGrowth:.21,averageAwareness:53,campaignCount:5})),
 recent:[{sector:"tech",actor:"rival",impact:.3}]};
test("company-market API accepts only seven bounded game sectors and aggregate data",()=>{
 const request=validateMarketRequest(marketInput);
 assert.equal(request.sectors.length,7);
 assert.ok(marketPrompt(request).includes("FUTURE weeks"));
 const bad={...marketInput,sectors:[...marketInput.sectors.slice(0,6),{...marketInput.sectors[0]}]};
 assert.throws(()=>validateMarketRequest(bad));
 assert.throws(()=>validateMarketRequest({...marketInput,week:"bad"}));
});
test("Gemini cannot insert companies, falsify finances or exceed permitted macro shocks",()=>{
 const valid={headline:"Retail demand shifts in a fictional market",summary:"Simulated sector-level activity changes cautious consumer expectations.",
  signals:MARKET_SECTORS.map(sector=>({sector,momentum:sector==="tech"?900:-900,reason:"Industry competition"}))};
 const bounded=validateMarketIntelligence(valid,4);
 assert.equal(bounded.signals.find(x=>x.sector==="tech").momentum,.65);
 assert.equal(bounded.signals.find(x=>x.sector==="food").momentum,-.65);
 assert.equal(bounded.signals.length,7);
 assert.throws(()=>validateMarketIntelligence({...valid,signals:[...valid.signals,{sector:"crypto",momentum:5,reason:"False"}]},4));
 const fallback=fallbackMarketReport(validateMarketRequest(marketInput));
 assert.equal(fallback.source,"rules");
 assert.equal(fallback.signals.length,7);
});
