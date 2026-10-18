import test from "node:test";
import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {createServer} from "node:net";
import {setTimeout as wait} from "node:timers/promises";

const ORIGIN="https://marketing-tycoon-bedroom-play.onrender.com";
const req={
 leadId:"sora",brand:"Sora Home",industry:"Home & lifestyle",objective:"Grow trials",
 preference:"creative",businessSize:"medium",mediaBudget:260000000,
 baselineFee:42000000,scope:7,duration:25,difficulty:50,target:12,intensity:.55,
 estimatedCost:15000000,competitorIndex:1.04,staffCount:4
};
function reservePort(){
 return new Promise((resolve,reject)=>{
  const s=createServer();
  s.once("error",reject);
  s.listen(0,"127.0.0.1",()=>{
   const port=s.address().port;
   s.close(()=>resolve(port));
  });
 });
}
test("the real pricing API route validates the caller, prices tenders and falls back safely without Gemini",async()=>{
 const port=await reservePort();
 const child=spawn(process.execPath,["marketing-tycoon-ai-api/server.mjs"],{
  env:{...process.env,PORT:String(port),GAME_ORIGIN:ORIGIN,GEMINI_API_KEY:""},
  stdio:"ignore"
 });
 try{
  let ready=false;
  for(let i=0;i<50;i++){
   if(child.exitCode!==null)break;
   try{const r=await fetch("http://127.0.0.1:"+port+"/api/status");if(r.ok){ready=true;break}}catch{}
   await wait(100);
  }
  assert.ok(ready,"AI API server starts");
  const url="http://127.0.0.1:"+port+"/api/pricing-advice";
  const valid=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json",Origin:ORIGIN},body:JSON.stringify(req)});
  assert.equal(valid.status,200);
  const payload=await valid.json();
  assert.equal(payload.mode,"rules");
  assert.equal(payload.advice.source,"rules");
  assert.equal(payload.advice.businessSize,"medium");
  assert.equal(payload.advice.mediaBudget,req.mediaBudget);
  assert.ok(payload.advice.recommendedFee>=payload.advice.feeFloor);
  assert.ok(["lean","standard","deep"].includes(payload.advice.qualificationDepth));
  assert.ok(payload.advice.qualificationFee>=90000&&payload.advice.qualificationFee<=1400000);
  const approach=await fetch("http://127.0.0.1:"+port+"/api/generate-brief",{
   method:"POST",headers:{"Content-Type":"application/json",Origin:ORIGIN},
   body:JSON.stringify({category:"coffee",client:{id:"startup-coffee-0",brand:"Mây Corner Coffee",sector:"coffee",segment:"startup",description:"Increase local visits",industry:"Coffee",marketingBudgetVnd:160000000}})
  });
  assert.equal(approach.status,503,"bedroom client cannot proceed without Gemini API key");
  const unavailable=await approach.json();
  assert.match(unavailable.error,/Gemini API/);
  const rejectOrigin=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json",Origin:"https://wrong.example"},body:JSON.stringify(req)});
  assert.equal(rejectOrigin.status,403);
  const bad=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json",Origin:ORIGIN},body:JSON.stringify({...req,mediaBudget:-1})});
  assert.equal(bad.status,400);
 }finally{child.kill();}
});
