/** Instant freelance application review after Apply; End Week is not required.
 * Gemini provides the selection explanation. A bounded, deterministic game
 * draw computes the winner exactly once from persisted application data.
 */
import {act,getState} from "./store";
import {CLIENT_BY_ID} from "./clientDatabase";
import {getFreelanceJob} from "./freelanceJobTemplates";
import {assessFreelanceApplication,completeFreelanceApplication} from "./freelanceMarket";
const API="https://marketing-tycoon-ai-api.onrender.com";
const inFlight=new Set<string>();
const MAX_WAIT=24000;

type Review={feedback:string;source:"gemini"|"rules"};
function requestInput(s:ReturnType<typeof getState>,applicationId:string){
 const a=s.freelanceBoard?.applications.find(x=>x.id===applicationId);
 const l=s.freelanceBoard?.listings.find(x=>x.id===a?.listingId);
 if(!a||!l||a.status!=="pending")return null;
 const c=CLIENT_BY_ID[a.clientId],t=getFreelanceJob(a.templateId);
 const assessment=assessFreelanceApplication(s,a.id);
 if(!c||!t||!assessment)return null;
 return {sector:c.sector,segment:c.segment,jobId:t.id,
  selected:assessment.selected,score:assessment.score,strongestRival:assessment.strongestRival,
  npcCount:assessment.npcCount,jobFee:t.fee,proposedFee:a.proposedFee};
}
async function requestReview(payload:NonNullable<ReturnType<typeof requestInput>>):Promise<Review>{
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),MAX_WAIT);
 try{
  const res=await fetch(API+"/api/freelance-review",{method:"POST",
   headers:{"Content-Type":"application/json"},signal:controller.signal,body:JSON.stringify(payload)});
  if(!res.ok)throw Error("Review request failed "+res.status);
  const result=await res.json() as {review?:{feedback?:string;source?:string}};
  const feedback=result.review?.feedback?.trim();
  if(!feedback||feedback.length<12||!["gemini","rules"].includes(result.review?.source??""))throw Error("Malformed review");
  return {feedback:feedback.slice(0,280),source:result.review!.source as "gemini"|"rules"};
 }finally{clearTimeout(timer)}
}
export function prepareFreelanceApplicationReviews(){
 const state=getState();
 if(!state.created)return;
 for(const application of state.freelanceBoard?.applications??[]){
  if(application.status!=="pending")continue;
  const payload=requestInput(state,application.id);
  if(!payload)continue;
  const fingerprint=application.id+":"+application.week+":"+application.score+":"+application.proposedFee;
  if(inFlight.has(fingerprint))continue;
  inFlight.add(fingerprint);
  void requestReview(payload).catch(()=>({feedback:"",source:"rules" as const})).then(result=>{
   const now=getState();
   const current=now.freelanceBoard?.applications.find(x=>x.id===application.id);
   if(!current||current.status!=="pending"||
      current.week!==application.week||current.score!==application.score||
      current.proposedFee!==application.proposedFee)return;
   act((s,fx)=>{completeFreelanceApplication(s,fx,application.id,result.feedback,result.source);});
  }).finally(()=>{inFlight.delete(fingerprint)});
 }
}
