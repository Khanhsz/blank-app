import {act,getState} from "./store";
import {activateAIBrief} from "./campaign";
import {getClient} from "./clientDatabase";
import type {Scenario} from "./data";

// Every newly approached bedroom client MUST be grounded in a successful Gemini
// response. The game never silently substitutes a deterministic/static brief.
const API="https://marketing-tycoon-ai-api.onrender.com";
const active=new Set<string>();
const MAX_WAIT_MS=65000;
function match(id:string,clientId:string){
 const s=getState();
 return s.created&&!s.agencyUnlocked&&s.campaign.phase==="brief"&&
  s.campaign.briefId===id&&s.campaign.catalogClientId===clientId&&!s.campaign.aiScenario;
}
function friendlyError(message:string){
 if(/quota|limit|429/i.test(message))return "Gemini quota has been reached. Retry the selected client later; no substitute brief will be used.";
 if(/key|configur|503/i.test(message))return "Gemini API is not configured. This client approach requires a working API connection.";
 if(/abort|timeout/i.test(message))return "Gemini did not respond in time. Retry this client approach.";
 return "Gemini could not develop this client's context and strategy. Retry the approach.";
}
function fail(id:string,clientId:string,message:string){
 if(!match(id,clientId))return;
 act((s,fx)=>{
  if(s.campaign.briefId!==id||s.campaign.catalogClientId!==clientId||s.campaign.aiScenario)return;
  s.campaign.aiStatus="error";
  s.campaign.aiError=friendlyError(message);
  fx.log("Gemini approach failed for "+clientId+" · player can retry without losing progress");
 });
}
/** Persistent root watcher; begins ONLY after the player approaches a client. */
export function prepareNextBrief(){
 const current=getState(),c=current.campaign;
 if(!current.created||current.agencyUnlocked||c.phase!=="brief"||!c.catalogClientId||c.aiScenario)return;
 if(c.aiStatus!=="pending"&&c.aiStatus!=="generating")return;
 const id=c.briefId,clientId=c.catalogClientId;
 if(!id||active.has(id))return;
 const client=getClient(clientId);
 if(!client||client.segment==="bigcorp"){fail(id,clientId,"Invalid client approach");return;}
 active.add(id);
 act(s=>{
  if(s.campaign.briefId===id&&s.campaign.catalogClientId===clientId){
   s.campaign.aiStatus="generating";s.campaign.aiError=null;
  }
 });
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),MAX_WAIT_MS);
 void (async()=>{
  try{
   const res=await fetch(API+"/api/generate-brief",{
    method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({category:client.sector,client:{
     id:client.id,brand:client.brand,sector:client.sector,segment:client.segment,
     description:client.description,industry:client.industry,marketingBudgetVnd:client.marketingBudgetVnd,jobTemplateId:c.freelanceJob?.templateId??"social-pack"
    }}),signal:controller.signal
   });
   const body=await res.json().catch(()=>null) as {scenario?:Scenario;mode?:string;error?:string}|null;
   if(!res.ok)throw Error(body?.error||"Gemini HTTP "+res.status);
   const scenario=body?.scenario;
   if(body?.mode!=="ai"||!scenario?.aiMeta||scenario.aiMeta.clientId!==clientId||
     scenario.brand!==client.brand||
     (scenario.jobMeta?.templateId!==c.freelanceJob?.templateId)||!scenario.clientAnswers?.barrier||
     !scenario.aiPlanning?.context||!scenario.aiPlanning?.insight||!scenario.aiPlanning?.strategy)
    throw Error("Invalid Gemini client response");
   if(match(id,clientId)){
    let accepted=false;
    act((s,fx)=>{
     if(s.campaign.briefId!==id||s.campaign.catalogClientId!==clientId||s.campaign.aiScenario)return;
     accepted=activateAIBrief(s,fx,scenario);
     if(accepted){s.campaign.aiStatus="ready";s.campaign.aiError=null;}
    });
    if(!accepted)fail(id,clientId,"Gemini generated an invalid campaign");
   }
  }catch(error){fail(id,clientId,error instanceof Error?error.message:"Gemini unavailable")}
  finally{clearTimeout(timer);active.delete(id);}
 })();
}
