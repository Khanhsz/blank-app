/** Asynchronous Gemini narrative after the game engine has already
 * decided client acceptance and revision requirements. Never block gameplay.
 */
import {act,getState} from "./store";
import {applyV4AIReview} from "./freelanceWorkflows";
import type {FreelanceV4Artifact} from "./state";
const URL="https://marketing-tycoon-ai-api.onrender.com/api/freelance-deliverables-review";
const attempts=new Set<string>();
function payload(jobId:string,reviewRound:number,items:FreelanceV4Artifact[]){
 return {jobId,round:reviewRound,items:items.map(a=>({id:a.id,title:a.title,
  summary:a.copy.slice(0,350),issue:a.feedback.slice(0,250),score:a.score,
  status:a.status==="approved"?"approved":"revise"}))};
}
export function prepareFreelanceDeliverableReview(){
 const s=getState(),p=s.campaign.freelanceJob,v=p?.v4;
 if(!p||!v||v.reviewVersion===0||v.reviewMode==="gemini"||
   !["revision","ready"].includes(v.step)||s.agencyUnlocked)return;
 const briefId=s.campaign.briefId,reviewVersion=v.reviewVersion,key=briefId+":"+reviewVersion;
 if(attempts.has(key))return;attempts.add(key);
 const req=payload(p.templateId,v.reviewRound,v.artifacts);
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),19000);
 void fetch(URL,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(req),signal:controller.signal})
  .then(async res=>{if(!res.ok)throw Error("Client review unavailable");
   return res.json() as Promise<{review?:{notes?:{id:string;feedback:string}[];source?:string}}>;
  })
  .then(res=>{
   if(!Array.isArray(res.review?.notes)||res.review?.source!=="gemini")return;
   const now=getState();
   if(now.campaign.briefId!==briefId||now.campaign.freelanceJob?.v4?.reviewVersion!==reviewVersion)return;
   act(x=>{applyV4AIReview(x,reviewVersion,res.review!.notes!);});
  }).catch(()=>{/* Rules feedback remains authoritative if API is offline. */})
  .finally(()=>clearTimeout(timer));
}
