import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {defaults,migrate} from "../src/game/state";
import {getClient,scenarioForClient} from "../src/game/clientDatabase";
import {chooseFreelanceClient,retryFreelanceApproach,activateAIBrief} from "../src/game/campaign";
import {approveBrief,askClient,briefAnswer} from "../src/game/journey";
import {scenarios} from "../src/game/data";
import type {Fx} from "../src/game/store";
const fx:Fx={log:()=>{},toast:()=>{}};
test("bedroom approach selects an SME and does not load a simulated/static brief",()=>{
 const s=defaults();s.created=true;
 const client=getClient("sme-tech-0")!;
 assert.ok(chooseFreelanceClient(s,fx,client.id));
 assert.equal(s.campaign.catalogClientId,client.id);
 assert.equal(s.campaign.aiScenario,null);
 assert.equal(s.campaign.aiStatus,"pending");
 assert.equal(s.campaign.phase,"brief");
 assert.equal(s.campaign.journey!.step,"brief");
 assert.equal(chooseFreelanceClient(s,fx,"f50-1"),false);
});
test("Gemini-generated context and strategy are required before accepting an approached client",()=>{
 const s=defaults();s.created=true;
 const client=getClient("startup-coffee-0")!;
 chooseFreelanceClient(s,fx,client.id);
 askClient(s,fx,"audience");askClient(s,fx,"barrier");
 approveBrief(s,fx,"discover");
 assert.equal(s.campaign.phase,"brief");
 const fabricated=scenarioForClient(client);
 assert.equal(activateAIBrief(s,fx,fabricated),false);
 const sc={...scenarios[0],id:"ai-genuine-case",brand:client.brand,
  aiMeta:{category:client.sector,seed:22,label:"Gemini fictional",clientId:client.id},
  aiPlanning:{context:"A new coffee client faces local student visibility challenges.",insight:"Students need credible reasons to try the brand.",strategy:"Test local student discovery and verifiable product quality."},
  clientAnswers:{audience:"Students in the neighborhood",barrier:"They miss our storefront",success:"Growth in qualified visits",constraint:"Budget and approval timelines"}
 };
 assert.equal(activateAIBrief(s,fx,sc),true);
 s.campaign.aiStatus="ready";
 assert.equal(briefAnswer(s,"barrier"),sc.clientAnswers.barrier);
 approveBrief(s,fx,"discover");
 assert.equal(s.campaign.phase,"planning");
 assert.equal(s.campaign.aiScenario?.aiPlanning?.strategy,sc.aiPlanning.strategy);
});
test("Gemini failure remains a retryable error and never fabricates context or advances progress",()=>{
 const s=defaults();s.created=true;
 chooseFreelanceClient(s,fx,"startup-beauty-0");
 s.campaign.aiStatus="error";
 s.campaign.aiError="Gemini quota reached";
 retryFreelanceApproach(s,fx);
 assert.equal(s.campaign.aiStatus,"pending");
 assert.equal(s.campaign.aiError,null);
 assert.equal(s.campaign.aiScenario,null);
 const restored=migrate(JSON.parse(JSON.stringify({...s,campaign:{...s.campaign,aiStatus:"error"}})));
 assert.equal(restored.campaign.aiStatus,"error");
});
test("bedroom generation is always Gemini and client-initiated; no static scenario fallback",()=>{
 const source=readFileSync("src/game/automaticBrief.ts","utf8");
 const view=readFileSync("src/components/game/CampaignJourney.tsx","utf8");
 const catalog=readFileSync("src/components/game/ClientCatalog.tsx","utf8");
 assert.match(source,/!c.catalogClientId/);
 assert.match(source,/\/api\/generate-brief/);
 assert.match(source,/scenario\.aiMeta\.clientId!==clientId/);
 assert.doesNotMatch(source,/Built-in campaign brief used|s\.campaign\.aiStatus="fallback"/);
 assert.match(view,/GEMINI · INSIGHT HYPOTHESIS/);
 assert.match(view,/GEMINI · STRATEGY DIRECTION/);
 assert.match(catalog,/Approach/);
});
