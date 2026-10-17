import {useEffect,useState} from "react";
import {Sparkles,RefreshCw,ShieldCheck,AlertCircle,BookOpen,LoaderCircle} from "lucide-react";
import {act,useGame} from "@/game/store";
import {activateAIBrief} from "@/game/campaign";
import type {Scenario} from "@/game/data";
const BASE="https://marketing-tycoon-ai-api.onrender.com";
const categories=[["coffee","Coffee & F&B"],["fashion","Fashion"],["beauty","Skincare"],["education","Education"],["fitness","Fitness"],["tech","Consumer Tech"],["food","Food & Beverage"]] as const;
type Availability="loading"|"ready"|"unavailable";
export function AIBriefLauncher(){
 const s=useGame(x=>x);
 const [category,setCategory]=useState("coffee");
 const [availability,setAvailability]=useState<Availability>("loading");
 const [error,setError]=useState("");
 const [busy,setBusy]=useState(false);
 useEffect(()=>{
  const controller=new AbortController();
  const timeout=window.setTimeout(()=>controller.abort(),30000);
  fetch(BASE+"/api/status",{signal:controller.signal}).then(async r=>{if(!r.ok)throw Error("AI service is starting");const data=await r.json();setAvailability(data.available?"ready":"unavailable")}).catch(()=>{if(!controller.signal.aborted)setAvailability("unavailable")}).finally(()=>window.clearTimeout(timeout));
  return()=>{controller.abort();window.clearTimeout(timeout)};
 },[]);
 async function create(){
  if(busy||s.agencyUnlocked||s.campaign.phase!=="brief")return;
  setBusy(true);setError("");
  const controller=new AbortController(),timer=window.setTimeout(()=>controller.abort(),50000);
  try{
   const response=await fetch(BASE+"/api/generate-brief",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({category}),signal:controller.signal});
   const body=await response.json();
   if(!response.ok)throw Error(body?.error||"AI generation failed");
   const sc=body.scenario as Scenario;
   if(!sc?.aiMeta||!sc?.reports?.interview||!Array.isArray(sc.insightOptions))throw Error("Incomplete AI scenario returned");
   let accepted=false;
   act((d,fx)=>{accepted=activateAIBrief(d,fx,sc)});
   if(!accepted)throw Error("Finish the current campaign before generating another brief");
  }catch(e){setError(e instanceof Error?e.message:"AI request failed. Use a built-in brief.");}
  finally{window.clearTimeout(timer);setBusy(false)}
 }
 return <section className="mt-ai-launcher" aria-label="AI Dynamic Campaign">
  <div className="mt-ai-launcher-top"><span className="mt-ai-spark"><Sparkles size={19}/></span><div><small>OPTIONAL GAME MODE</small><h3>AI Dynamic Campaign</h3></div><span className={"mt-ai-state "+availability}>{availability==="ready"?"AI AVAILABLE":availability==="loading"?"CONNECTING":"OFFLINE"}</span></div>
  <p>Generate a fictional client, research evidence and realistic insight hypotheses. Your strategic decisions still determine the result.</p>
  <div className="mt-ai-category"><label htmlFor="ai-brief-category">CLIENT INDUSTRY</label><select id="ai-brief-category" value={category} disabled={busy} onChange={e=>setCategory(e.target.value)}>{categories.map(([key,name])=><option key={key} value={key}>{name}</option>)}</select></div>
  {s.campaign.aiScenario&&<div className="mt-ai-active"><ShieldCheck size={15}/><span>Active AI scenario: <b>{s.campaign.aiScenario.brand}</b><small>Research evidence is revealed only when you collect it.</small></span></div>}
  {error&&<div className="mt-ai-error" role="alert"><AlertCircle size={15}/><span>{error}</span></div>}
  {availability==="unavailable"&&<div className="mt-ai-help"><BookOpen size={16}/><span>AI mode needs a Gemini key on the server. Built-in campaigns still work with no key or waiting.</span></div>}
  <button className="mt-ai-generate" type="button" disabled={busy||availability!=="ready"} onClick={create}>{busy?<LoaderCircle size={17} className="mt-ai-spinner"/>:<Sparkles size={17}/>} {busy?"Creating a new client…":s.campaign.aiScenario?"Generate another brief":"Generate AI client brief"} </button>
  <small className="mt-ai-disclaimer">AI-created scenarios are fictional game content, not verified market research. Limited requests protect API usage.</small>
 </section>;
}
