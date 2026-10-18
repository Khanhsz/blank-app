import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {takeQuotaSlot,secondsUntilUtcMidnight,retryAfterSeconds,getCachedGeminiBrief,saveCachedGeminiBrief} from "./brief-quota.mjs";

test("Hourly limit exposes real remaining wait and expires without user-specific identity",()=>{
 const slots=new Map();
 const start=1760810000000;
 assert.deepEqual(takeQuotaSlot(slots,"brief:example",2,3600000,start),{allowed:true,retryAfterSeconds:0});
 assert.equal(takeQuotaSlot(slots,"brief:example",2,3600000,start+500).allowed,true);
 assert.deepEqual(takeQuotaSlot(slots,"brief:example",2,3600000,start+1500),{allowed:false,retryAfterSeconds:3599});
 assert.equal(takeQuotaSlot(slots,"brief:example",2,3600000,start+3600001).allowed,true);
});
test("Daily limit reports time to actual midnight UTC, not a fabricated Google reset",()=>{
 assert.equal(secondsUntilUtcMidnight(Date.parse("2026-10-18T23:59:30Z")),30);
 assert.equal(secondsUntilUtcMidnight(Date.parse("2026-10-18T00:00:00Z")),86400);
});
test("Provider Retry-After recognizes seconds or date without guessing nonexistent provider quota",()=>{
 const now=Date.parse("2026-10-18T14:00:00Z");
 assert.equal(retryAfterSeconds("120",now),120);
 assert.equal(retryAfterSeconds("Sun, 18 Oct 2026 14:03:00 GMT",now),180);
 assert.equal(retryAfterSeconds(null,now),null);
 assert.equal(retryAfterSeconds("unknown",now),null);
});
test("Only a genuine successful generated brief is reusable, with bounded expiry",()=>{
 const cache=new Map(),key=JSON.stringify({id:"startup-coffee-0",jobTemplateId:"landing-page"});
 const modelOutput={brand:"Fictional Coffee",aiMeta:{clientId:"startup-coffee-0"},jobMeta:{templateId:"landing-page"}};
 assert.equal(getCachedGeminiBrief(cache,key,100),null);
 saveCachedGeminiBrief(cache,key,modelOutput,100);
 assert.equal(getCachedGeminiBrief(cache,key,101),modelOutput);
 assert.equal(getCachedGeminiBrief(cache,key,20*60000+100),null);
});
test("Server validates a client and job before spending hourly or daily quota",()=>{
 const source=readFileSync(new URL("./server.mjs",import.meta.url),"utf8");
 const endpoint=source.slice(source.indexOf('if(req.url!=="/api/generate-brief"'));
 assert.ok(endpoint.indexOf("client=validateApproachClient(body.client)")<endpoint.indexOf("takeQuotaSlot(counter,"));
 assert.ok(endpoint.indexOf("client=validateApproachClient(body.client)")<endpoint.indexOf("globalCounter.calls++"));
 assert.ok(endpoint.indexOf("getCachedGeminiBrief(briefCache,cacheKey)")<endpoint.indexOf("takeQuotaSlot(counter,"));
 assert.match(endpoint,/code:"local_hourly_limit"/);
 assert.match(endpoint,/code:"local_daily_limit"/);
 assert.match(endpoint,/gemini_provider_rate_limit/);
 assert.match(endpoint,/saveCachedGeminiBrief\(briefCache,cacheKey,scenario\)/);
});
