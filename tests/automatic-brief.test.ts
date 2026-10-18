import test from "node:test";
import assert from "node:assert/strict";
import {resetGame,act,getState} from "../src/game/store";
import {newCampaign} from "../src/game/state";
import {scenarios} from "../src/game/data";
import {getClient} from "../src/game/clientDatabase";
import {getFreelanceJob} from "../src/game/freelanceJobTemplates";
import {chooseFreelanceClient,retryFreelanceApproach} from "../src/game/campaign";
import {prepareNextBrief} from "../src/game/automaticBrief";
const fx={toast:()=>{},log:()=>{}};
const sample=(clientId="startup-coffee-0")=>{
 const client=getClient(clientId)!;
 return {...scenarios[0],id:"ai-approach-example",brand:client.brand,budget:0,fee:700000,days:4,
  jobMeta:{templateId:"social-pack",tier:"gig" as const,deliverables:"5 social posts",hours:12,revisions:2,serviceFee:700000,mediaBudget:0,successMetric:"Approved posts"},
  aiMeta:{category:client.sector,seed:27182,label:"Simulated Gemini scenario",clientId},
  insightOptions:["awareness","value","location","trust","style"].map(id=>({id,title:"The "+id+" hypothesis",desc:"Fictional client-specific evidence."})),
  aiPlanning:{context:"A new local company competes for students.",insight:"Students need a clear reason to consider this venue.",strategy:"Test targeted proof and discoverability first."},
  clientAnswers:{audience:"Nearby students",barrier:"Weak awareness",success:"Increase visits",constraint:"14 days"}
 };
};
const settle=()=>new Promise(resolve=>setTimeout(resolve,40));
test("only a selected bedroom client starts Gemini, exactly once per approach",async()=>{
 resetGame();
 const prior=globalThis.fetch;
 let calls=0;
 globalThis.fetch=(async(_url,init)=>{calls++;
  const req=JSON.parse(String((init as RequestInit).body));
  assert.equal(req.client.id,"startup-coffee-0");
  return new Response(JSON.stringify({mode:"ai",scenario:sample()}),{status:200,headers:{"Content-Type":"application/json"}});
 }) as typeof fetch;
 try{
  act(s=>{s.created=true});
  prepareNextBrief();assert.equal(calls,0,"no unsolicited random campaign on character creation");
  act((s,fx)=>chooseFreelanceClient(s,fx,"startup-coffee-0"));
  prepareNextBrief();prepareNextBrief();
  assert.equal(getState().campaign.aiStatus,"generating");
  await settle();
  assert.equal(calls,1);
  assert.equal(getState().campaign.aiStatus,"ready");
  assert.equal(getState().campaign.aiScenario?.brand,getClient("startup-coffee-0")!.brand);
  assert.ok(getState().campaign.aiScenario?.aiPlanning?.strategy);
  prepareNextBrief();await settle();assert.equal(calls,1);
 }finally{globalThis.fetch=prior}
});
test("Gemini failure is explicit, retryable, and never replaced by a built-in brief",async()=>{
 resetGame();
 const prior=globalThis.fetch;
 let calls=0;
 globalThis.fetch=(async()=>{calls++;return new Response(JSON.stringify({error:"Gemini quota reached"}),{status:429})}) as typeof fetch;
 try{
  act((s,fx)=>{s.created=true;chooseFreelanceClient(s,fx,"startup-coffee-0")});
  prepareNextBrief();await settle();
  assert.equal(getState().campaign.aiStatus,"error");
  assert.equal(getState().campaign.aiScenario,null);
  assert.match(getState().campaign.aiError||"",/quota/i);
  prepareNextBrief();await settle();assert.equal(calls,1);
  act((s,fx)=>retryFreelanceApproach(s,fx));
  prepareNextBrief();await settle();
  assert.equal(calls,2,"explicit retry makes another Gemini call");
  assert.equal(getState().campaign.aiStatus,"error");
 }finally{globalThis.fetch=prior}
});
test("late Gemini response is discarded if the player approaches a different client",async()=>{
 resetGame();
 const prior=globalThis.fetch;
 let respond:((response:Response)=>void)|undefined;
 globalThis.fetch=(()=>new Promise<Response>(r=>{respond=r})) as typeof fetch;
 try{
  act((s,fx)=>{s.created=true;chooseFreelanceClient(s,fx,"startup-coffee-0")});
  const first=getState().campaign.briefId;
  prepareNextBrief();
  act((s,fx)=>chooseFreelanceClient(s,fx,"startup-fashion-0"));
  assert.notEqual(getState().campaign.briefId,first);
  respond?.(new Response(JSON.stringify({mode:"ai",scenario:sample()}),{status:200}));
  await settle();
  assert.equal(getState().campaign.aiStatus,"pending");
  assert.equal(getState().campaign.aiScenario,null);
 }finally{globalThis.fetch=prior}
});
