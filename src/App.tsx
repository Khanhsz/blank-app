
import {useEffect,useRef,useState,Suspense,lazy} from "react";
import {AnimatePresence,motion,useReducedMotion} from "motion/react";
import {Toaster} from "sonner";
import {ArrowRight,BriefcaseBusiness,Clock3,Compass,Home,LockKeyhole,Map,Pause,Play,Settings2,Users,X,ChevronLeft,ChevronRight,ZoomIn,ZoomOut,RotateCcw,Save,Flag,Trophy,Star,Headphones,Glasses,BookOpen,Camera,CheckCircle2,Mail,LayoutDashboard} from "lucide-react";
import {toast} from "sonner";
import GameSettings from "./components/game/GameSettings";
import type {District} from "./components/game/WorldScene";
const WorldScene=lazy(()=>import("./components/game/WorldScene").then(m=>({default:m.WorldScene})));
import {CampaignWorkspace,CEOCommandCenter,LocationPanel} from "./components/game/Panels";
import {WeeklyNewspaper,WeekIndicator} from "./components/game/WeeklyNewspaper";
import {endWeek,acknowledgeEdition} from "./game/weekly";
import {initStore,useGame,act,getState} from "./game/store";
import * as K from "./game/ceo";
import {prepareNextBrief} from "./game/automaticBrief";
import {money,BRAND_HQ_REP} from "./game/data";
import {cityLots,findOffice,currentOffice,cityCounts,type DistrictKind} from "./game/city";
import {AssetRegistry} from "./components/game/AssetRegistry";
import type {SceneId} from "./game/state";

const buildings=cityLots;
const sceneName:Record<SceneId,string>={room:"The Bedroom",city:"Marketing City",office:"Agency HQ",boardroom:"The Boardroom"};
type Panel="none"|"onboard"|"campaign"|"ceo"|"location"|"avatar"|"map"|"journal"|"phone"|"settings";

const shadeOptions=["#4c9589","#bd694a","#485f9f","#9470a8","#cba457"];
const skinOptions=["#f0c9a7","#d6a681","#a87256","#6d4639"];
const hairOptions=["#352824","#654734","#aa7952","#222329"];
function SelectionRow({label,values,value,set}:{label:string;values:string[];value:string;set:(s:string)=>void}){
 return <div className="mt-avatar-config"><label>{label}</label><div className="mt-color-options">{values.map(c=><button type="button" key={c} title={c} aria-label={label+" "+c} aria-pressed={value===c} className={value===c?"selected":""} style={{background:c}} onClick={()=>set(c)} />)}</div></div>;
}
function Intro({done,onRotate,onZoom}:{done:()=>void;onRotate:(d:number)=>void;onZoom:(d:number)=>void}){
 const s=useGame(x=>x),[name,setName]=useState(s.character.name);
 return <div className="mt-intro-screen">
  <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{duration:.6}} className="mt-intro-title"><span className="mt-story-label">CHAPTER 01 / THE FIRST CAMPAIGN</span><h1>Every great agency <em>starts somewhere.</em></h1><p>A bedroom. A secondhand desk. Your first client. What happens next is up to you.</p></motion.div>
  <div className="mt-avatar-showcase-controls"><span><Camera size={15}/> LIVE 3D CHARACTER</span><div><button aria-label="Rotate character left" onClick={()=>onRotate(-Math.PI/5)}><ChevronLeft size={17}/></button><button aria-label="Rotate character right" onClick={()=>onRotate(Math.PI/5)}><ChevronRight size={17}/></button><button aria-label="Zoom in character" onClick={()=>onZoom(-.12)}><ZoomIn size={17}/></button><button aria-label="Zoom out character" onClick={()=>onZoom(.12)}><ZoomOut size={17}/></button></div></div>
  <div className="mt-onboard-field"><label htmlFor="hero-name">YOUR NAME</label><input id="hero-name" value={name} maxLength={24} onChange={e=>setName(e.target.value)} placeholder="Choose a name"/></div>
  <div className="mt-onboard-field"><label>CAREER BACKGROUND</label><div className="mt-selector-row">{["Strategy","Creative","Research","Performance"].map(v=><button aria-pressed={s.character.interest===v} key={v} className={s.character.interest===v?"selected":""} onClick={()=>act(d=>{d.character.interest=v})}>{v}</button>)}</div></div>
  <SelectionRow label="OUTFIT" values={shadeOptions} value={s.character.outfit} set={c=>act(d=>{d.character.outfit=c})}/>
  <div className="mt-avatar-config"><label>HAIR STYLE</label><div className="mt-selector-row">{(["short","curly","bun"] as const).map(v=><button key={v} aria-pressed={(s.character.hairstyle||"short")===v} className={(s.character.hairstyle||"short")===v?"selected":""} onClick={()=>act(d=>{d.character.hairstyle=v})}>{v}</button>)}</div></div>
  <div className="mt-avatar-config"><label>ACCESSORY</label><div className="mt-selector-row">{(["none","glasses","headphones"] as const).map(v=><button key={v} aria-pressed={(s.character.accessory||"none")===v} className={(s.character.accessory||"none")===v?"selected":""} onClick={()=>act(d=>{d.character.accessory=v})}>{v==="glasses"?"Glasses":v==="headphones"?"Headphones":"None"}</button>)}</div></div>
  <motion.button whileHover={{y:-2}} whileTap={{scale:.98}} id="begin-journey" data-testid="begin-journey" className="mt-begin-button" onClick={()=>{act(d=>{d.created=true;d.character.name=name.trim()||"Alex";d.scene="room"});done()}}>ENTER YOUR WORLD <ArrowRight size={18}/></motion.button>
  <small className="mt-intro-caption">Game progress is automatically saved in this browser.</small>
 </div>;
}
function Customize(){
 const s=useGame(x=>x);return <div className="mt-character-editor"><div className="mt-character-heading"><span className="mt-story-label">YOUR AVATAR / CUSTOMISE</span><h3>{s.character.name}</h3><p>Changes are reflected live on your 3D character.</p></div>
 <SelectionRow label="SKIN TONE" values={skinOptions} value={s.character.skin} set={v=>act(d=>{d.character.skin=v})}/>
 <SelectionRow label="HAIR COLOUR" values={hairOptions} value={s.character.hair} set={v=>act(d=>{d.character.hair=v})}/>
 <SelectionRow label="OUTFIT" values={shadeOptions} value={s.character.outfit} set={v=>act(d=>{d.character.outfit=v})}/>
 <div className="mt-avatar-config"><label>HAIR STYLE</label><div className="mt-selector-row">{(["short","curly","bun"] as const).map(v=><button key={v} aria-pressed={(s.character.hairstyle||"short")===v} className={(s.character.hairstyle||"short")===v?"selected":""} onClick={()=>act(d=>{d.character.hairstyle=v})}>{v}</button>)}</div></div>
 <div className="mt-avatar-config"><label>ACCESSORY</label><div className="mt-selector-row">{(["none","glasses","headphones"] as const).map(v=><button key={v} aria-pressed={(s.character.accessory||"none")===v} className={(s.character.accessory||"none")===v?"selected":""} onClick={()=>act(d=>{d.character.accessory=v})}>{v}</button>)}</div></div>
 <div className="mt-avatar-config"><label>ROOM WALLS</label><div className="mt-color-options">{["#efe4d3","#dae8e0","#d7d6e8","#f0d5c0"].map(c=><button key={c} aria-pressed={s.room.wall===c} className={s.room.wall===c?"selected":""} style={{background:c}} onClick={()=>act(d=>{d.room.wall=c})}/>)}</div></div>
 <div className="mt-avatar-config"><label>ROOM DETAILS</label><div className="mt-selector-row">{(["plant","lamp","shelf"] as const).map(k=><button key={k} className={s.room[k]?"selected":""} aria-pressed={s.room[k]} onClick={()=>act(d=>{d.room[k]=!d.room[k]})}>{s.room[k]?"✓ ":""}{k}</button>)}</div></div>
 </div>;
}
export default function App(){
 const s=useGame(x=>x);
 const [panel,setPanel]=useState<Panel>(getState().created?(getState().agencyUnlocked?"ceo":"none"):"onboard");
 const [selected,setSelected]=useState<string|null>(null);
 const [directoryType,setDirectoryType]=useState<"all"|"upgraded"|DistrictKind>("all");
 const [directorySearch,setDirectorySearch]=useState("");
 const [webgl,setWebgl]=useState(true);
 const [map2d,setMap2d]=useState(false);
 const [computerHint,setComputerHint]=useState(false);
 const [avatarYaw,setAvatarYaw]=useState(0);
 const [avatarZoom,setAvatarZoom]=useState(1);
 const [sceneFocus,setSceneFocus]=useState<string|null>(null);
 const [moveInput,setMoveInput]=useState("");
 const [celebrate,setCelebrate]=useState<string|null>(null);
 const [reviewNews,setReviewNews]=useState<string|null>(null);
 const transitionTimer=useRef<number|null>(null);
 const reduceMotion=useReducedMotion();
 const previousMilestones=useRef({phase:getState().campaign.phase,history:getState().history.length,agency:getState().agencyUnlocked,city:getState().cityUnlocked,staff:getState().staff.length,projects:getState().ceo?.projects.length??0,upgrades:getState().upgrades.length});
 useEffect(()=>{initStore();try{const cvs=document.createElement("canvas");setWebgl(!!(cvs.getContext("webgl2")||cvs.getContext("webgl")))}catch{setWebgl(false)}return()=>{if(transitionTimer.current!==null)window.clearTimeout(transitionTimer.current)}},[]);
 useEffect(()=>{if(s.agencyUnlocked&&panel==="campaign")setPanel("ceo")},[s.agencyUnlocked,panel]);
 // Every unaccepted freelance brief begins with Gemini automatically, whether
 // the player is looking at the bedroom or opening the computer.
 useEffect(()=>{prepareNextBrief()},[s.created,s.agencyUnlocked,s.campaign.phase,s.campaign.briefId,s.campaign.aiStatus]);
 useEffect(()=>{if(panel!=="ceo"||!s.agencyUnlocked)return;const board=!!(s.ceo?.pitch||s.ceo?.negotiation);if(board&&s.scene!=="boardroom")act(d=>{d.scene="boardroom"});else if(!board&&s.scene==="boardroom")act(d=>{d.scene="office"})},[panel,s.agencyUnlocked,!!s.ceo?.pitch,!!s.ceo?.negotiation,s.scene]);
 useEffect(()=>{const p=previousMilestones.current;let message="";
  if(!p.city&&s.cityUnlocked)message="MARKETING CITY UNLOCKED";
  else if(!p.agency&&s.agencyUnlocked)message="AGENCY FOUNDED · CEO JOURNEY UNLOCKED";
  else if((s.ceo?.projects.length??0)>p.projects)message="NEW CLIENT CONTRACT · PROJECT ACTIVATED";
  else if(s.staff.length>p.staff)message="NEW EMPLOYEE HIRED · TEAM EXPANDED";
  else if(s.upgrades.length>p.upgrades)message="CAREER UPGRADE UNLOCKED";
  else if(s.history.length>p.history)message="CAMPAIGN DELIVERED · PORTFOLIO UPDATED";
  else if(p.phase!==s.campaign.phase&&s.campaign.phase==="results")message="RESULTS ARE READY";
  else if(p.phase!==s.campaign.phase&&s.campaign.phase==="live")message="CAMPAIGN LAUNCHED";
  p.phase=s.campaign.phase;p.history=s.history.length;p.agency=s.agencyUnlocked;p.city=s.cityUnlocked;p.staff=s.staff.length;p.projects=s.ceo?.projects.length??0;p.upgrades=s.upgrades.length;
  if(!message)return;setCelebrate(message);const id=window.setTimeout(()=>setCelebrate(null),2600);return()=>window.clearTimeout(id);
 },[s.history.length,s.agencyUnlocked,s.cityUnlocked,s.campaign.phase,s.staff.length,s.upgrades.length,s.ceo?.projects.length]);
 const districts:District[]=buildings.map(b=>({...b,
   name:b.id===s.officeId?(b.id==="agency"?"Your Agency · Starter HQ":"★ YOUR HQ · "+b.name):b.name,
   occupied:b.id===s.officeId&&s.agencyUnlocked,
   h:b.kind==="rival"?b.h+Math.max(0,(s.ceo?.rivals.find(r=>r.id===b.rivalId)?.officeTier??1)-1)*3:b.h,
   locked:!s.cityUnlocked||(b.id==="brand"&&!s.agencyUnlocked&&s.reputation<BRAND_HQ_REP)||(b.kind==="office"&&(!s.agencyUnlocked||s.reputation<findOffice(b.id).minRep))
 }));
 const change=(to:SceneId)=>{setMoveInput("");setSceneFocus(null);if(to==="city"&&!s.cityUnlocked)return;if((to==="office"||to==="boardroom")&&!s.agencyUnlocked)return;act(d=>{d.scene=to});setSelected(null);setPanel(to==="office"||to==="boardroom"?"ceo":"none")};
 const locate=(id:string)=>{setSelected(id);setPanel("location")};
 const roomInteract=(id:"board"|"phone"|"wardrobe")=>{if(getState().scene!=="room")return;setSceneFocus(id);if(transitionTimer.current!==null)window.clearTimeout(transitionTimer.current);transitionTimer.current=window.setTimeout(()=>setPanel(id==="board"?"journal":id==="phone"?"phone":"avatar"),reduceMotion?0:370)};
 // Only the bedroom computer opens freelance briefs; menu actions guide you home.
 const approachComputer=()=>{setSceneFocus(null);
   if(getState().agencyUnlocked){setPanel("ceo");return;}
   if(getState().scene!=="room")act(d=>{d.scene="room"});
   setSelected(null);setPanel("none");setComputerHint(true);
 };
 const interactComputer=()=>{
   const state=getState();
   if(!state.created||state.scene!=="room")return;
   setSelected(null);setComputerHint(false);setSceneFocus("pc");if(transitionTimer.current!==null)window.clearTimeout(transitionTimer.current);transitionTimer.current=window.setTimeout(()=>setPanel(state.agencyUnlocked?"ceo":"campaign"),reduceMotion?0:390);
 };
 const fromLocation=(next:"campaign"|"ceo")=>next==="campaign"?approachComputer():change("office");
 const title=panel==="settings"?"Settings & Save Files":panel==="campaign"?"Campaign Workstation":panel==="ceo"?"CEO Command Center":panel==="avatar"?"Your Creative Identity":panel==="journal"?"Your Campaign Moodboard":panel==="phone"?"Your Messages":panel==="map"?"World Directory":panel==="location"?(buildings.find(b=>b.id===selected)?.name||"Location"):"Welcome to Marketing Tycoon";
 const projects=s.ceo?.projects.filter(p=>p.status==="active").length||0;
 return <div className="game">
   <div className="world">{webgl&&!map2d?<Suspense fallback={<div className="mt-world-loader" role="status"><span className="mt-world-loader-spin"/><b>Building your world…</b><small>Preparing the 3D environment</small></div>}><WorldScene scene={s.scene} districts={districts} selected={selected} onSelect={locate} onComputerInteract={interactComputer} onRoomInteract={roomInteract} focus={sceneFocus} preview={!s.created||panel==="onboard"} avatarYaw={avatarYaw} avatarZoom={avatarZoom} moveInput={moveInput} officeName={buildings.find(b=>b.id===s.officeId)?.name||"Starter HQ"} officeCapacity={currentOffice(s).capacity} character={s.character} room={s.room} staff={s.staff.length} quality={s.graphics}/></Suspense>:<div className="fallback"><h2>WORLD DIRECTORY</h2><h1>{sceneName[s.scene]}</h1>{s.scene==="city"&&<div className="gridmap">{buildings.map(b=><button onClick={()=>locate(b.id)} key={b.id}>{b.name}</button>)}</div>}{s.scene==="room"&&s.created&&<button id="bedroom-computer-fallback" className="fallback-computer" onClick={interactComputer}>Use bedroom computer → Open client inbox</button>}</div>}</div>
   <header className="header"><div className="brand"><span className="mark">m.</span><div><strong>MARKETING TYCOON</strong><small>FROM BEDROOM TO BOARDROOM</small></div></div><div className="worldlabel"><span className="live"/>{sceneName[s.scene]}<small>{s.agencyUnlocked?"04 / CEO":s.cityUnlocked?"02 / CITY":"01 / FREELANCE"}</small></div><div className="topactions"><button onClick={()=>setPanel("map")} aria-label="Map"><Map size={20}/></button><button onClick={()=>setPanel("settings")} aria-label="Settings and save games"><Settings2 size={20}/></button></div></header>
   {s.created&&<aside className="quest"><span className="eyebrow">YOUR OBJECTIVE</span><h2>{s.agencyUnlocked?"Lead your team. Win the next account.":s.cityUnlocked?"Make your mark in the city.":"Your first campaign awaits."}</h2><p>{s.agencyUnlocked?String(projects)+" active projects. Operations are handled by your staff.":s.cityUnlocked?"Explore the districts; return home and use your computer to view freelance briefs.":"Enter the bedroom and click the computer to check your client inbox."}</p><button id="quest-workstation-guide" onClick={()=>s.agencyUnlocked?setPanel("ceo"):approachComputer()}>{s.agencyUnlocked?"Open CEO dashboard":"Go to bedroom computer"} →</button></aside>}
   {s.created&&<div className="stats"><div>REPUTATION<strong>{s.reputation}</strong></div><div>EXPERTISE<strong>{s.expertise}</strong></div><div className="darkstat">CASH<strong>{money(s.agencyUnlocked?s.agencyCash:s.personalCash)}</strong></div></div>}
   {s.agencyUnlocked&&s.ceo&&<WeekIndicator week={s.ceo.weekly?.week??Math.floor((s.ceo.day-1)/7)+1} day={s.ceo.day} count={s.ceo.weekly?.editions.length??0} unread={!!s.ceo.weekly?.editions.some(x=>!x.read)} onAdvance={()=>act((d,fx)=>endWeek(d,fx))} onReview={()=>setReviewNews(s.ceo?.weekly?.editions[0]?.id??null)}/>}
   {s.created&&<nav className="dock"><button onClick={()=>change("room")} className={s.scene==="room"?"active":""}><Home size={19}/>Home</button><button disabled={!s.cityUnlocked} onClick={()=>change("city")} className={s.scene==="city"?"active":""}>{s.cityUnlocked?<Compass size={19}/>:<LockKeyhole size={19}/>}City</button><button id="navigate-workstation" onClick={()=>s.agencyUnlocked?setPanel("ceo"):approachComputer()}><Map size={19}/>{s.agencyUnlocked?"Projects":"Computer"}</button><button disabled={!s.agencyUnlocked&&!s.cityUnlocked} onClick={()=>s.agencyUnlocked?change("office"):(change("city"),locate("agency"))}><BriefcaseBusiness size={19}/>Agency</button><button onClick={()=>setPanel("avatar")}><Users size={19}/>Avatar</button></nav>}
   {s.created&&!s.agencyUnlocked&&s.scene==="room"&&panel==="none"&&<div className="computer-instruction" role="status"><strong>{computerHint?"You are back in your bedroom.":"Your first client is waiting."}</strong><span>Click the glowing computer screen to open your inbox.</span></div>}

   {s.created&&s.scene==="city"&&panel==="none"&&<div className="mt-city-controls" aria-label="Touch character controls">
    <span>MOVE</span><div className="mt-city-pad">
    {(["up","left","down","right"] as const).map((dir,i)=><button type="button" key={dir} className={"mt-city-pad-"+dir} aria-label={"Walk "+dir}
      onPointerDown={e=>{e.preventDefault();setSelected(null);setMoveInput(dir)}}
      onPointerUp={()=>setMoveInput("")} onPointerCancel={()=>setMoveInput("")} onPointerLeave={()=>setMoveInput("")}>
      {["↑","←","↓","→"][i]}
    </button>)}
    </div></div>}
   {s.created&&s.scene==="city"&&<div className="maptip">Drag to orbit · Scroll to zoom · Click buildings <button onClick={()=>setMap2d(!map2d)}>{map2d?"3D mode":"2D mode"}</button></div>}
   <AnimatePresence mode="wait">{panel!=="none"&&<motion.section key={panel} initial={{opacity:0,x:30,scale:.986}} animate={{opacity:1,x:0,scale:1}} exit={{opacity:0,x:18,scale:.988}} transition={{type:"spring",stiffness:285,damping:29}} className={"panel "+(panel==="onboard"?"onboardpanel":"")}><header><div><span className="eyebrow">MT® / WORLD EDITION</span><h2>{title}</h2></div>{panel!=="onboard"&&<button className="close" onClick={()=>setPanel("none")} aria-label="Close"><X size={20}/></button>}</header><div className="panelbody">
   {panel==="onboard"&&<Intro onRotate={n=>setAvatarYaw(y=>y+n)} onZoom={n=>setAvatarZoom(z=>Math.max(.65,Math.min(1.45,z+n)))} done={()=>{setSceneFocus(null);setPanel("none");setComputerHint(true)}}/>}
   {panel==="campaign"&&!s.agencyUnlocked&&<CampaignWorkspace/>}
   {panel==="ceo"&&s.agencyUnlocked&&<CEOCommandCenter onReadEdition={setReviewNews}/>}
   {panel==="location"&&selected&&<LocationPanel id={selected} onOpen={fromLocation}/>}
   {panel==="avatar"&&<Customize/>}
   {panel==="settings"&&<GameSettings onReset={()=>{setPanel("onboard");setSelected(null);setSceneFocus(null)}}/>}
   {panel==="journal"&&<div className="world-ambient-panel"><div className="eyebrow">YOUR CREATIVE PROCESS</div><h3>Project moodboard</h3><p>Your research, strategy and creative decisions remain saved as you explore. Return to the bedroom computer for your active campaign.</p><div className="world-item-stat">Current phase <b>{s.campaign.phase}</b></div><button className="world-action" onClick={approachComputer}>Return to workstation ↗</button></div>}
   {panel==="phone"&&<div className="world-ambient-panel"><div className="eyebrow">MESSAGES & NETWORK</div><h3>Your professional life</h3><p>{s.agencyUnlocked?"Your Account Manager handles routine messages. Open CEO inbox for decisions that need you.":"A potential client is waiting in your email inbox. Check the computer to see the brief."}</p><button className="world-action" onClick={()=>s.agencyUnlocked?setPanel("ceo"):approachComputer()}>{s.agencyUnlocked?"Open CEO inbox":"Go to computer"} ↗</button></div>}
   {panel==="map"&&<div className="mt-world-directory">
     <div className="mt-map-summary"><span><strong>{buildings.length}</strong> interactive locations</span><span>{cityCounts.rivals} rival HQs</span><span>{cityCounts.offices} available office sites</span><span>{cityCounts.clients} client HQs</span><span><strong>{AssetRegistry.all().filter(x=>!x.decorative).length}</strong> NEW GLB BUILDINGS</span></div>
     <input aria-label="Search buildings" className="mt-directory-search" placeholder="Search buildings or districts…" value={directorySearch} onChange={e=>setDirectorySearch(e.target.value)}/>
     <div className="mt-directory-filters">{(["all","upgraded","core","rival","office","client"] as const).map(k=><button key={k} className={directoryType===k?"active":""} onClick={()=>setDirectoryType(k)}>{({all:"All",upgraded:"3D Upgrades",core:"Districts",rival:"Rival Agencies",office:"Office Spaces",client:"Client HQs"} as const)[k]}</button>)}</div>
     <div className="directory">{districts.filter(b=>(directoryType==="all"||directoryType===b.kind||(directoryType==="upgraded"&&AssetRegistry.has(b.id)))&&(!directorySearch||b.name.toLowerCase().includes(directorySearch.toLowerCase())||(b.district||"").toLowerCase().includes(directorySearch.toLowerCase()))).map(b=><button key={b.id} disabled={!s.cityUnlocked} onClick={()=>{if(s.cityUnlocked){change("city");locate(b.id)}}}><span><b>{b.name}</b><small>{b.district} · {AssetRegistry.has(b.id)?"3D GLB "+AssetRegistry.version.toUpperCase()+" · ":""}{b.kind==="rival"?"Competitor":b.kind==="office"?(b.occupied?"Current HQ":"Office listing"):b.kind==="client"?"Corporate client":"Gameplay location"}{b.locked?" · Locked":""}</small></span>{b.occupied?"★":s.cityUnlocked?"→":"🔒"}</button>)}</div>
   </div>}
   </div></motion.section>}</AnimatePresence>
   <AnimatePresence>{celebrate&&<motion.div role="status" className="mt-milestone" initial={{opacity:0,y:28,scale:.9}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:-12,scale:.95}} transition={{duration:reduceMotion?0:.42}}><Trophy size={22}/><div><small>CAREER MILESTONE</small><strong>{celebrate}</strong></div><Star size={18}/></motion.div>}</AnimatePresence>
   {s.ceo?.weekly?.editions.find(x=>!x.read)||s.ceo?.weekly?.editions.find(x=>x.id===reviewNews)?<WeeklyNewspaper edition={(s.ceo.weekly!.editions.find(x=>!x.read)||s.ceo.weekly!.editions.find(x=>x.id===reviewNews))!} onClose={()=>{const unread=s.ceo?.weekly?.editions.find(x=>!x.read);if(unread)act(d=>acknowledgeEdition(d,unread.id));setReviewNews(null)}}/>:null}
   <Toaster position="top-center" richColors/>
 </div>
}
