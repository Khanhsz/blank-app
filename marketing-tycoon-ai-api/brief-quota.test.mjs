import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {retryAfterSeconds,getCachedGeminiBrief,saveCachedGeminiBrief} from "./brief-quota.mjs";

test("Gemini provider Retry-After preserves provider wait hints",()=>{
 const now=Date.parse("2026-10-18T14:00:00Z");
 assert.equal(retryAfterSeconds("120",now),120);
 assert.equal(retryAfterSeconds("Sun, 18 Oct 2026 14:03:00 GMT",now),180);
 assert.equal(retryAfterSeconds(null,now),null);
 assert.equal(retryAfterSeconds("unknown",now),null);
});
test("Previously generated real Gemini briefs are briefly reusable without local request limits",()=>{
 const cache=new Map(),key=JSON.stringify({id:"startup-coffee-0",jobTemplateId:"landing-page"});
 const modelOutput={brand:"Fictional Coffee",aiMeta:{clientId:"startup-coffee-0"},jobMeta:{templateId:"landing-page"}};
 assert.equal(getCachedGeminiBrief(cache,key,100),null);
 saveCachedGeminiBrief(cache,key,modelOutput,100);
 assert.equal(getCachedGeminiBrief(cache,key,101),modelOutput);
 assert.equal(getCachedGeminiBrief(cache,key,20*60000+100),null);
});
test("All game-side hourly daily and per-IP Gemini request ceilings are removed",()=>{
 const source=readFileSync(new URL("./server.mjs",import.meta.url),"utf8");
 const helper=readFileSync(new URL("./brief-quota.mjs",import.meta.url),"utf8");
 for(const banned of ["globalCounter","takeQuotaSlot(","counted(","remoteIP(","local_hourly_limit","local_daily_limit","Hourly pricing advice limit reached","Hourly market insight limit reached","Review limit reached","Application review limit reached"]){
  assert.ok(!source.includes(banned),"Removed application rate limit: "+banned);
 }
 assert.ok(!helper.includes("export function takeQuotaSlot"));
 assert.ok(!helper.includes("export function secondsUntilUtcMidnight"));
 for(const call of ["generateScenario(category,client)","generatePricingAdvice(x)","generateMarketIntelligence(input)","generateFinancialCalibration()","generateFreelanceReview(input)","generateDeliverableReview(input)"]){
  assert.ok(source.includes("await "+call),"Gemini feature must still be reachable: "+call);
 }
 assert.ok(source.includes("client=validateApproachClient(body.client)"));
 assert.ok(source.includes("if(!apiKey())return response(res,503"));
 assert.ok(source.includes("gemini_provider_rate_limit"));
 assert.ok(source.includes("getCachedGeminiBrief(briefCache,cacheKey)"));
 assert.ok(source.includes("saveCachedGeminiBrief(briefCache,cacheKey,scenario)"));
});
