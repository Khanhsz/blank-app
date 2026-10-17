import test from "node:test";
import assert from "node:assert/strict";
import {resetGame,act,getState} from "../src/game/store";
import {newCampaign} from "../src/game/state";
import {scenarios} from "../src/game/data";
import {prepareNextBrief} from "../src/game/automaticBrief";

const sample=()=>({
 ...scenarios[0],id:"ai-auto-brief-v1",brand:"Future Coffee Lab",
 aiMeta:{category:"coffee",seed:27182,label:"Fictional AI-generated training scenario"},
 insightOptions:["awareness","value","location","trust","style"].map(id=>({id,title:"The "+id+" hypothesis",desc:"Some real fictional case-specific evidence."}))
});
const settle=()=>new Promise(resolve=>setTimeout(resolve,20));

test("game automatically generates a Gemini brief exactly once when character is created",async()=>{
 resetGame();
 const prior=globalThis.fetch;
 let calls=0;
 globalThis.fetch=(async()=>{calls++;return new Response(JSON.stringify({scenario:sample()}),{status:200,headers:{"Content-Type":"application/json"}})}) as typeof fetch;
 try{
  act(s=>{s.created=true});
  prepareNextBrief();prepareNextBrief();
  assert.equal(getState().campaign.aiStatus,"generating");
  await settle();
  assert.equal(calls,1);
  assert.equal(getState().campaign.aiStatus,"ready");
  assert.equal(getState().campaign.aiScenario?.brand,"Future Coffee Lab");
  prepareNextBrief();await settle();
  assert.equal(calls,1);
 }finally{globalThis.fetch=prior}
});
test("Gemini failure falls back automatically and does not spam paid requests",async()=>{
 resetGame();
 const prior=globalThis.fetch;
 let calls=0;
 globalThis.fetch=(async()=>{calls++;return new Response(JSON.stringify({error:"Gemini quota reached"}),{status:429})}) as typeof fetch;
 try{
  act(s=>{s.created=true});
  prepareNextBrief();await settle();
  assert.equal(getState().campaign.aiStatus,"fallback");
  assert.equal(getState().campaign.aiScenario,null);
  assert.match(getState().campaign.aiError||"",/limit/i);
  prepareNextBrief();await settle();
  assert.equal(calls,1);
 }finally{globalThis.fetch=prior}
});
test("late Gemini response is discarded if a new campaign replaces the pending one",async()=>{
 resetGame();
 const prior=globalThis.fetch;
 let respond:((response:Response)=>void)|undefined;
 globalThis.fetch=(()=>new Promise<Response>(r=>{respond=r})) as typeof fetch;
 try{
  act(s=>{s.created=true});
  const first=getState().campaign.briefId;
  prepareNextBrief();
  act(s=>{s.campaign=newCampaign(1)});
  assert.notEqual(getState().campaign.briefId,first);
  respond?.(new Response(JSON.stringify({scenario:sample()}),{status:200}));
  await settle();
  assert.equal(getState().campaign.aiStatus,"pending");
  assert.equal(getState().campaign.aiScenario,null);
 }finally{globalThis.fetch=prior}
});
