import {useRef,useState} from "react";
import {toast} from "sonner";
import {Download,Upload,Save,RotateCcw,ShieldAlert,Monitor,Accessibility,FileCheck2} from "lucide-react";
import {act,getState,restoreGame,resetGame,saveNow,useGame} from "@/game/store";
import {migrate} from "@/game/state";
import {GameSection,FeedbackStrip} from "./GameVisuals";

export default function GameSettings({onReset}:{onReset:()=>void}){
 const s=useGame(x=>x),[confirm,setConfirm]=useState(false),input=useRef<HTMLInputElement>(null);
 const [loading,setLoading]=useState(false);
 function exportSave(){
  const payload=JSON.stringify({type:"marketing-tycoon-save",version:2,exportedAt:new Date().toISOString(),state:getState()},null,2);
  const url=URL.createObjectURL(new Blob([payload],{type:"application/json"}));
  const link=document.createElement("a");link.href=url;link.download="marketing-tycoon-save.json";
  document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);toast.success("Save exported to a JSON backup");
 }
 async function importSave(e:React.ChangeEvent<HTMLInputElement>){
  const file=e.target.files?.[0];if(!file)return;
  if(file.size>4*1024*1024){toast.error("Save file is too large");e.target.value="";return}
  setLoading(true);
  try{
   const raw=JSON.parse(await file.text());
   const candidate=raw?.type==="marketing-tycoon-save"?raw.state:raw;
   if(!candidate||typeof candidate!=="object"||!candidate.campaign||!candidate.character)throw new Error("Not a compatible Marketing Tycoon save");
   restoreGame(candidate);
   toast.success("All gameplay progress and agency data were restored.");
  }catch(error){toast.error(error instanceof Error?error.message:"Could not load this save file")}finally{setLoading(false);e.target.value=""}
 }
 return <div className="mt-settings">
  <GameSection eyebrow="GAME PREFERENCES" title="Make the world yours" icon={<Monitor size={22}/>} sub="Changes apply immediately and are stored in your current save."/>
  <div className="mt-setting-entry"><span><b>Graphics quality</b><small>Adjust shadows and render resolution</small></span><div className="mt-setting-choices">{(["low","high"] as const).map(q=><button key={q} aria-pressed={s.graphics===q} className={s.graphics===q?"active":""} onClick={()=>act(d=>{d.graphics=q})}>{q==="low"?"Performance":"High"}</button>)}</div></div>
  <div className="mt-setting-entry"><span><b>Pause the simulation</b><small>Agency staff work only while simulation time advances</small></span><div className="mt-setting-choices"><button disabled={!s.agencyUnlocked} onClick={()=>act(d=>{if(d.ceo)d.ceo.speed=d.ceo.speed===0?1:0})}>{!s.agencyUnlocked?"Not CEO yet":s.ceo?.speed===0?"Resume":"Pause"}</button></div></div>
  <GameSection eyebrow="PERSISTENCE" title="Your progress is yours" icon={<Save size={20}/>} sub="Autosave remains enabled. Download a backup before switching devices or clearing browser data."/>
  <div className="mt-save-controls">
   <button onClick={saveNow}><Save size={17}/> Save now</button>
   <button onClick={exportSave}><Download size={17}/> Export save</button>
   <button onClick={()=>input.current?.click()} disabled={loading}><Upload size={17}/>{loading?"Loading...":"Import save"}</button>
   <input ref={input} type="file" accept=".json,application/json" hidden onChange={importSave}/>
  </div>
  <FeedbackStrip tone="neutral">Saved games remain in this browser unless you export and import them on another device. Existing saves migrate automatically.</FeedbackStrip>
  <div className="mt-reset-area"><b><ShieldAlert size={17}/> New career</b><p>Resets this browser's local game. Export a backup first if you want to keep it.</p>{confirm?<div className="mt-setting-choices"><button onClick={()=>setConfirm(false)}>Cancel</button><button className="danger" onClick={()=>{resetGame();toast("New career started");setConfirm(false);onReset()}}>Confirm reset</button></div>:<button onClick={()=>setConfirm(true)}>Reset local progress</button>}</div>
 </div>;
}
