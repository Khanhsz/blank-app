import {act,getState} from "./store";
import {activateAIBrief} from "./campaign";
import type {Scenario} from "./data";

// A single request per campaign is allowed in an active browser session.
// Generation starts on character creation / after the next client is requested,
// not when the player opens a menu.
const API="https://marketing-tycoon-ai-api.onrender.com";
const active=new Set<string>();
const MAX_WAIT_MS=65000;

function match(id:string){
 const s=getState();
 return s.created&&!s.agencyUnlocked&&s.campaign.phase==="brief"&&s.campaign.briefId===id&&!s.campaign.aiScenario;
}
function friendlyError(message:string){
 if(/limit|quota|429/i.test(message))return "Gemini reached its current usage limit. A built-in brief is ready instead.";
 if(/key|configur|503/i.test(message))return "AI service is not configured. A built-in brief is ready instead.";
 return "Gemini is temporarily unavailable. Your campaign can continue with a built-in brief.";
}
function fallback(id:string,message:string){
 if(!match(id))return;
 act((s,fx)=>{
  if(s.campaign.briefId!==id||s.campaign.phase!=="brief"||s.campaign.aiScenario)return;
  s.campaign.aiStatus="fallback";
  s.campaign.aiError=friendlyError(message);
  fx.log("Built-in campaign brief used because AI generation was unavailable.");
 });
}

/** Called from the game's persistent root, never from an optional menu. */
export function prepareNextBrief(){
 const current=getState();
 if(!current.created||current.agencyUnlocked||current.campaign.phase!=="brief"||current.campaign.aiScenario)return;
 if(current.campaign.aiStatus!=="pending"&&current.campaign.aiStatus!=="generating")return;
 const id=current.campaign.briefId;
 if(!id||active.has(id))return;
 active.add(id);
 act(s=>{
  if(s.campaign.briefId===id&&s.campaign.phase==="brief"){
   s.campaign.aiStatus="generating";
   s.campaign.aiError=null;
  }
 });
 const controller=new AbortController();
 const timer=setTimeout(()=>controller.abort(),MAX_WAIT_MS);
 void (async()=>{
  try{
   const res=await fetch(API+"/api/generate-brief",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({category:["coffee","beauty","fashion","education","tech","fitness","food"][current.history.length%7]}),
    signal:controller.signal
   });
   const data=await res.json().catch(()=>null) as {scenario?:Scenario;error?:string}|null;
   if(!res.ok)throw new Error(data?.error||"Gemini request failed ("+res.status+")");
   const scenario=data?.scenario;
   if(!scenario?.aiMeta||!scenario.reports?.interview||!Array.isArray(scenario.insightOptions))throw Error("Incomplete generated scenario");
   if(match(id)){
    act((s,fx)=>{
     if(s.campaign.briefId!==id||s.campaign.phase!=="brief"||s.campaign.aiScenario)return;
     if(activateAIBrief(s,fx,scenario)){
      s.campaign.aiStatus="ready";
      s.campaign.aiError=null;
     }
    });
   }
  }catch(error){
   fallback(id,error instanceof Error?error.message:"AI generation failed");
  }finally{
   clearTimeout(timer);
   active.delete(id);
  }
 })();
}
