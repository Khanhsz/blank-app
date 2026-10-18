import {Sparkles,LoaderCircle,ShieldCheck,WifiOff,RotateCcw} from "lucide-react";
import {Button} from "@/components/ui/button";
import {act} from "@/game/store";
import {retryFreelanceApproach} from "@/game/campaign";
import {getClient} from "@/game/clientDatabase";
import type {Campaign} from "@/game/state";
export function AutomaticBriefNotice({campaign}:{campaign:Campaign}){
 const ready=campaign.aiStatus==="ready"&&!!campaign.aiScenario;
 const error=campaign.aiStatus==="error";
 return <section className={"mt-ai-notice "+(ready?"ready":error?"fallback":"generating")} role="status" aria-live="polite">
  {ready?<ShieldCheck size={18}/>:error?<WifiOff size={18}/>:<LoaderCircle size={18} className="mt-ai-spinner"/>}
  <div>
   <strong>{ready?"Gemini client discovery ready":error?"Gemini approach unsuccessful":"Approaching client with Gemini…"}</strong>
   <small>{ready?"Fictional context, insight hypotheses and strategy guidance are generated for the selected client.":error?(campaign.aiError||"Retry this client approach."):"Generating scenario context, client responses, insight and strategy."}</small>
  </div>
 </section>;
}
export function AutomaticBriefWaiting({campaign}:{campaign:Campaign}){
 const client=campaign.catalogClientId?getClient(campaign.catalogClientId):null;
 const failed=campaign.aiStatus==="error";
 return <div className="mt-ai-waiting" role="status" aria-live="polite">
  <div className="mt-ai-waiting-icon">{failed?<WifiOff size={28}/>:<Sparkles size={28}/>}</div>
  <span className="mt-story-label">BEDROOM WORKSTATION / CLIENT APPROACH</span>
  <h2>{failed?"Client approach needs Gemini":client?"Approaching "+client.brand:"Choose a client to approach"}</h2>
  <p>{failed?(campaign.aiError||"Gemini is not available right now."):
   "Gemini is building "+(client?.brand??"your selected client's")+" market context, fictional discovery conversation, research hypotheses and strategy direction."}</p>
  {!failed&&<div className="mt-ai-waiting-progress"><span/></div>}
  {failed?<Button className="w-full" onClick={()=>act(retryFreelanceApproach)}><RotateCcw size={16}/> Retry Gemini approach</Button>:
  <small>This client stays selected. A valid Gemini result is required; no built-in brief or invented insight will replace it.</small>}
 </div>;
}
