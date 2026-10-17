import {Sparkles,LoaderCircle,ShieldCheck,WifiOff} from "lucide-react";
import type {Campaign} from "@/game/state";
export function AutomaticBriefNotice({campaign}:{campaign:Campaign}){
 const ready=campaign.aiStatus==="ready"&&!!campaign.aiScenario;
 const offline=campaign.aiStatus==="fallback";
 return <section className={"mt-ai-notice "+(ready?"ready":offline?"fallback":"generating")} role="status" aria-live="polite">
  {ready?<ShieldCheck size={18}/>:offline?<WifiOff size={18}/>:<LoaderCircle size={18} className="mt-ai-spinner"/>}
  <div>
   <strong>{ready?"Brief created by Gemini":offline?"Ready with a built-in client brief":"Preparing your new client brief…"}</strong>
   <small>{ready?"This case is fictional. Research evidence is revealed as you investigate.":offline?(campaign.aiError||"You can continue playing normally."):"Gemini is developing your client, evidence and insight choices automatically."}</small>
  </div>
 </section>;
}
export function AutomaticBriefWaiting(){
 return <div className="mt-ai-waiting" role="status" aria-live="polite">
  <div className="mt-ai-waiting-icon"><Sparkles size={28}/></div>
  <span className="mt-story-label">INCOMING CLIENT / AI GAME MASTER</span>
  <h2>A new opportunity is on its way.</h2>
  <p>Gemini is creating a fictional business challenge, customer research and insight hypotheses for your next marketing campaign.</p>
  <div className="mt-ai-waiting-progress"><span/></div>
  <small>Your progress is saved. If Gemini is unavailable, the game will automatically load a built-in client brief.</small>
 </div>;
}
