
import {useEffect,useRef,useState} from "react";
import {AnimatePresence,motion,useReducedMotion} from "motion/react";
import {Toaster} from "sonner";
import {ArrowRight,BriefcaseBusiness,Clock3,Compass,Home,LockKeyhole,Map,Pause,Play,Settings2,Users,X,ChevronLeft,ChevronRight,ZoomIn,ZoomOut,RotateCcw,Save,Flag,Trophy,Star,Headphones,Glasses,BookOpen,Camera,CheckCircle2,Mail,LayoutDashboard} from "lucide-react";
import {toast} from "sonner";
import GameSettings from "./components/game/GameSettings";
import {WorldScene,hasWebGL,type District} from "./components/game/WorldScene";
import {CampaignWorkspace,CEOCommandCenter,LocationPanel} from "./components/game/Panels";
import {initStore,useGame,act,getState} from "./game/store";
import * as K from "./game/ceo";
import {money,BRAND_HQ_REP} from "./game/data";
import type {SceneId} from "./game/state";

const buildings:Omit<District,"locked">[]=[
{id:"research",name:"Research Lab",x:-24,z:-18,w:7,d:7,h:8,color:"#73929a"},
{id:"creative",name:"Creative Studio",x:-23,z:3,w:8,d:7,h:6,color:"#d69d72"},
{id:"media",name:"Media Hub",x:-22,z:19,w:8,d:6,h:10,color:"#647e87"},
{id:"influencer",name:"Creator District",x:0,z:-19,w:8,d:7,h:7,color:"#c38a83"},
{id:"network",name:"Networking Café",x:1,z:19,w:8,d:6,h:5,color:"#819b78"},
{id:"brand",name:"Brand HQ",x:24,z:-18,w:8,d:8,h:13,color:"#a58c76"},
{id:"cowork",name:"Co-working",x:25,z:3,w:7,d:7,h:8,color:"#b1a3c5"},
{id:"agency",name:"Your Agency",x:24,z:19,w:8,d:8,h:11,color:"#bd694a"}];
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
 const [webgl,setWebgl]=useState(true);
 const [map2d,setMap2d]=useState(false);
 const [computerHint,setComputerHint]=useState(false);
 const [avatarYaw,setAvatarYaw]=useState(0);
 const [avatarZoom,setAvatarZoom]=useState(1);
 const [sceneFocus,setSceneFocus]=useState<string|null>(null);
 const [celebrate,setCelebrate]=useState<string|null>(null);
 const transitionTimer=useRef<number|null>(null);
 const reduceMotion=useReducedMotion();
 const clock=useRef(0);
 useEffect(()=>{initStore();setWebgl(hasWebGL());return()=>{if(transitionTimer.current!==null)window.clearTimeout(transitionTimer.current)}},[]);
 useEffect(()=>{const handle=window.setInterval(()=>{const v=getState();if(!v.agencyUnlocked||!v.ceo?.speed)return;clock.current+=v.ceo.speed*.25; if(clock.current>=2.2){const n=Math.min(4,Math.floor(clock.current/2.2));clock.current%=2.2;act((d,fx)=>K.ceoTick(d,fx,n));}},250);return()=>clearInterval(handle)},[]);
 useEffect(()=>{if(s.agencyUnlocked&&panel==="campaign")setPanel("ceo")},[s.agencyUnlocked,panel]);
 const districts:District[]=buildings.map(b=>({...b,locked:!s.cityUnlocked||(b.id==="brand"&&!s.agencyUnlocked&&s.reputation<BRAND_HQ_REP)}));
 const change=(to:SceneId)=>{setSceneFocus(null);if(to==="city"&&!s.cityUnlocked)return;if((to==="office"||to==="boardroom")&&!s.agencyUnlocked)return;act(d=>{d.scene=to});setSelected(null);setPanel(to==="office"||to==="boardroom"?"ceo":"none")};
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
 const fromLocation=(next:"campaign"|"ceo")=>next==="campaign"?approachComputer():setPanel("ceo");
 const title=panel==="settings"?"Settings & Save Files":panel==="campaign"?"Campaign Workstation":panel==="ceo"?"CEO Command Center":panel==="avatar"?"Your Creative Identity":panel==="journal"?"Your Campaign Moodboard":panel==="phone"?"Your Messages":panel==="map"?"World Directory":panel==="location"?(buildings.find(b=>b.id===selected)?.name||"Location"):"Welcome to Marketing Tycoon";
 const projects=s.ceo?.projects.filter(p=>p.status==="active").length||0;
 return <div className="game">
   <div className="world">{webgl&&!map2d?<WorldScene scene={s.scene} districts={districts} selected={selected} onSelect={locate} onComputerInteract={interactComputer} onRoomInteract={roomInteract} focus={sceneFocus} preview={!s.created||panel==="onboard"} avatarYaw={avatarYaw} avatarZoom={avatarZoom} character={s.character} room={s.room} staff={s.staff.length} quality={s.graphics}/>:<div className="fallback"><h2>WORLD DIRECTORY</h2><h1>{sceneName[s.scene]}</h1>{s.scene==="city"&&<div className="gridmap">{buildings.map(b=><button onClick={()=>locate(b.id)} key={b.id}>{b.name}</button>)}</div>}{s.scene==="room"&&s.created&&<button id="bedroom-computer-fallback" className="fallback-computer" onClick={interactComputer}>Use bedroom computer → Open client inbox</button>}</div>}</div>
   <header className="header"><div className="brand"><span className="mark">m.</span><div><strong>MARKETING TYCOON</strong><small>FROM BEDROOM TO BOARDROOM</small></div></div><div className="worldlabel"><span className="live"/>{sceneName[s.scene]}<small>{s.agencyUnlocked?"04 / CEO":s.cityUnlocked?"02 / CITY":"01 / FREELANCE"}</small></div><div className="topactions"><button onClick={()=>setPanel("map")} aria-label="Map"><Map size={20}/></button><button onClick={()=>setPanel("settings")} aria-label="Settings and save games"><Settings2 size={20}/></button></div></header>
   {s.created&&<aside className="quest"><span className="eyebrow">YOUR OBJECTIVE</span><h2>{s.agencyUnlocked?"Lead your team. Win the next account.":s.cityUnlocked?"Make your mark in the city.":"Your first campaign awaits."}</h2><p>{s.agencyUnlocked?String(projects)+" active projects. Operations are handled by your staff.":s.cityUnlocked?"Explore the districts; return home and use your computer to view freelance briefs.":"Enter the bedroom and click the computer to check your client inbox."}</p><button id="quest-workstation-guide" onClick={()=>s.agencyUnlocked?setPanel("ceo"):approachComputer()}>{s.agencyUnlocked?"Open CEO dashboard":"Go to bedroom computer"} →</button></aside>}
   {s.created&&<div className="stats"><div>REPUTATION<strong>{s.reputation}</strong></div><div>EXPERTISE<strong>{s.expertise}</strong></div><div className="darkstat">CASH<strong>{money(s.agencyUnlocked?s.agencyCash:s.personalCash)}</strong></div></div>}
   {s.agencyUnlocked&&s.ceo&&<div className="clock"><Clock3 size={16}/><strong>DAY {s.ceo.day}</strong>{([0,1,3] as const).map(v=><button key={v} className={s.ceo?.speed===v?"active":""} onClick={()=>act(d=>K.setSpeed(d,v))}>{v===0?<Pause size={14}/>:<><Play size={14}/>{v===3?"×3":""}</>}</button>)}</div>}
   {s.created&&<nav className="dock"><button onClick={()=>change("room")} className={s.scene==="room"?"active":""}><Home size={19}/>Home</button><button disabled={!s.cityUnlocked} onClick={()=>change("city")} className={s.scene==="city"?"active":""}>{s.cityUnlocked?<Compass size={19}/>:<LockKeyhole size={19}/>}City</button><button id="navigate-workstation" onClick={()=>s.agencyUnlocked?setPanel("ceo"):approachComputer()}><Map size={19}/>{s.agencyUnlocked?"Projects":"Computer"}</button><button disabled={!s.agencyUnlocked&&!s.cityUnlocked} onClick={()=>s.agencyUnlocked?change("office"):(change("city"),locate("agency"))}><BriefcaseBusiness size={19}/>Agency</button><button onClick={()=>setPanel("avatar")}><Users size={19}/>Avatar</button></nav>}
   {s.created&&!s.agencyUnlocked&&s.scene==="room"&&panel==="none"&&<div className="computer-instruction" role="status"><strong>{computerHint?"You are back in your bedroom.":"Your first client is waiting."}</strong><span>Click the glowing computer screen to open your inbox.</span></div>}
   {s.created&&s.scene==="city"&&<div className="maptip">Drag to orbit · Scroll to zoom · Click buildings <button onClick={()=>setMap2d(!map2d)}>{map2d?"3D mode":"2D mode"}</button></div>}
   <AnimatePresence mode="wait">{panel!=="none"&&<motion.section key={panel} initial={{opacity:0,x:30,scale:.986}} animate={{opacity:1,x:0,scale:1}} exit={{opacity:0,x:18,scale:.988}} transition={{type:"spring",stiffness:285,damping:29}} className={"panel "+(panel==="onboard"?"onboardpanel":"")}><header><div><span className="eyebrow">MT® / WORLD EDITION</span><h2>{title}</h2></div>{panel!=="onboard"&&<button className="close" onClick={()=>setPanel("none")} aria-label="Close"><X size={20}/></button>}</header><div className="panelbody">
   {panel==="onboard"&&<Intro onRotate={n=>setAvatarYaw(y=>y+n)} onZoom={n=>setAvatarZoom(z=>Math.max(.65,Math.min(1.45,z+n)))} done={()=>{setSceneFocus(null);setPanel("none");setComputerHint(true)}}/>}
   {panel==="campaign"&&!s.agencyUnlocked&&<CampaignWorkspace/>}
   {panel==="ceo"&&s.agencyUnlocked&&<CEOCommandCenter/>}
   {panel==="location"&&selected&&<LocationPanel id={selected} onOpen={fromLocation}/>}
   {panel==="avatar"&&<Customize/>}
   {panel==="settings"&&<GameSettings onReset={()=>{setPanel("onboard");setSelected(null);setSceneFocus(null)}}/>}
   {panel==="journal"&&<div className="world-ambient-panel"><div className="eyebrow">YOUR CREATIVE PROCESS</div><h3>Project moodboard</h3><p>Your research, strategy and creative decisions remain saved as you explore. Return to the bedroom computer for your active campaign.</p><div className="world-item-stat">Current phase <b>{s.campaign.phase}</b></div><button className="world-action" onClick={approachComputer}>Return to workstation ↗</button></div>}
   {panel==="phone"&&<div className="world-ambient-panel"><div className="eyebrow">MESSAGES & NETWORK</div><h3>Your professional life</h3><p>{s.agencyUnlocked?"Your Account Manager handles routine messages. Open CEO inbox for decisions that need you.":"A potential client is waiting in your email inbox. Check the computer to see the brief."}</p><button className="world-action" onClick={()=>s.agencyUnlocked?setPanel("ceo"):approachComputer()}>{s.agencyUnlocked?"Open CEO inbox":"Go to computer"} ↗</button></div>}
   {panel==="map"&&<div className="directory">{buildings.map(b=><button key={b.id} disabled={!s.cityUnlocked} onClick={()=>{if(s.cityUnlocked){change("city");locate(b.id)}}}><span>{b.name}</span>{s.cityUnlocked?"→":"Locked"}</button>)}</div>}
   </div></motion.section>}</AnimatePresence>
   <Toaster position="top-center" richColors/>
 </div>
}
