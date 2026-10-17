
import {useEffect,useRef,useState} from "react";
import {Toaster} from "sonner";
import {ArrowRight,BriefcaseBusiness,Clock3,Compass,Home,LockKeyhole,Map,Pause,Play,Settings2,Users,X} from "lucide-react";
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
type Panel="none"|"onboard"|"campaign"|"ceo"|"location"|"avatar"|"map";
function Intro({done}:{done:()=>void}) {
 const s=useGame(x=>x);const [name,setName]=useState(s.character.name);
 return <div className="onboard"><p className="eyebrow">CHAPTER 01 — A NEW BEGINNING</p><h1>Start small.<br/><em>Think big.</em></h1><p>From a student's bedroom to the boardroom. Make decisions that change your career.</p>
 <label>YOUR CHARACTER NAME</label><input value={name} maxLength={24} onChange={e=>setName(e.target.value)}/>
 <label>INITIAL SPECIALISATION</label><div className="choices">{["Strategy","Creative","Research","Performance"].map(v=><button key={v} className={s.character.interest===v?"selected":""} onClick={()=>act(d=>{d.character.interest=v})}>{v}</button>)}</div>
 <label>OUTFIT COLOR</label><div className="swatches">{["#4c9589","#bd694a","#485f9f","#9470a8"].map(c=><button key={c} style={{background:c}} onClick={()=>act(d=>{d.character.outfit=c})}/>)}</div>
 <button id="begin-journey" data-testid="begin-journey" className="primary" onClick={()=>{act(d=>{d.created=true;d.character.name=name.trim()||"Alex";d.scene="room";});done()}}>Begin the journey <ArrowRight size={16}/></button><small>No login required · Local saves</small></div>;
}
function Customize(){const s=useGame(x=>x);return <div className="customize"><p>Customize your room, character and performance settings.</p><label>SKIN TONE</label><div className="swatches">{["#f0c9a7","#d6a681","#a87256","#6d4639"].map(c=><button key={c} style={{background:c}} onClick={()=>act(d=>{d.character.skin=c})}/>)}</div><label>OUTFIT</label><div className="swatches">{["#4c9589","#bd694a","#485f9f","#9470a8"].map(c=><button key={c} style={{background:c}} onClick={()=>act(d=>{d.character.outfit=c})}/>)}</div><label>ROOM WALL COLOR</label><div className="swatches">{["#efe4d3","#dae8e0","#d7d6e8","#f0d5c0"].map(c=><button key={c} style={{background:c}} onClick={()=>act(d=>{d.room.wall=c})}/>)}</div><label>DETAILS</label><div className="choices">{(["plant","lamp","shelf"] as const).map(k=><button key={k} className={s.room[k]?"selected":""} onClick={()=>act(d=>{d.room[k]=!d.room[k]})}>{k}</button>)}</div><label>GRAPHICS</label><div className="choices">{(["high","low"] as const).map(q=><button key={q} className={s.graphics===q?"selected":""} onClick={()=>act(d=>{d.graphics=q})}>{q==="high"?"High quality":"Performance"}</button>)}</div></div>}
export default function App(){
 const s=useGame(x=>x);
 const [panel,setPanel]=useState<Panel>(getState().created?(getState().agencyUnlocked?"ceo":"none"):"onboard");
 const [selected,setSelected]=useState<string|null>(null);
 const [webgl,setWebgl]=useState(true);
 const [map2d,setMap2d]=useState(false);
 const [computerHint,setComputerHint]=useState(false);
 const clock=useRef(0);
 useEffect(()=>{initStore();setWebgl(hasWebGL())},[]);
 useEffect(()=>{const handle=window.setInterval(()=>{const v=getState();if(!v.agencyUnlocked||!v.ceo?.speed)return;clock.current+=v.ceo.speed*.25; if(clock.current>=2.2){const n=Math.min(4,Math.floor(clock.current/2.2));clock.current%=2.2;act((d,fx)=>K.ceoTick(d,fx,n));}},250);return()=>clearInterval(handle)},[]);
 useEffect(()=>{if(s.agencyUnlocked&&panel==="campaign")setPanel("ceo")},[s.agencyUnlocked,panel]);
 const districts:District[]=buildings.map(b=>({...b,locked:!s.cityUnlocked||(b.id==="brand"&&!s.agencyUnlocked&&s.reputation<BRAND_HQ_REP)}));
 const change=(to:SceneId)=>{if(to==="city"&&!s.cityUnlocked)return;if((to==="office"||to==="boardroom")&&!s.agencyUnlocked)return;act(d=>{d.scene=to});setSelected(null);setPanel(to==="office"||to==="boardroom"?"ceo":"none")};
 const locate=(id:string)=>{setSelected(id);setPanel("location")};
 // Only the bedroom computer opens freelance briefs; menu actions guide you home.
 const approachComputer=()=>{
   if(getState().agencyUnlocked){setPanel("ceo");return;}
   if(getState().scene!=="room")act(d=>{d.scene="room"});
   setSelected(null);setPanel("none");setComputerHint(true);
 };
 const interactComputer=()=>{
   const state=getState();
   if(!state.created||state.scene!=="room")return;
   setSelected(null);setComputerHint(false);setPanel(state.agencyUnlocked?"ceo":"campaign");
 };
 const fromLocation=(next:"campaign"|"ceo")=>next==="campaign"?approachComputer():setPanel("ceo");
 const title=panel==="campaign"?"Campaign Workstation":panel==="ceo"?"CEO Command Center":panel==="avatar"?"Your Creative Identity":panel==="map"?"World Directory":panel==="location"?(buildings.find(b=>b.id===selected)?.name||"Location"):"Welcome to Marketing Tycoon";
 const projects=s.ceo?.projects.filter(p=>p.status==="active").length||0;
 return <div className="game">
   <div className="world">{webgl&&!map2d?<WorldScene scene={s.scene} districts={districts} selected={selected} onSelect={locate} onComputerInteract={interactComputer} character={s.character} room={s.room} staff={s.staff.length} quality={s.graphics}/>:<div className="fallback"><h2>WORLD DIRECTORY</h2><h1>{sceneName[s.scene]}</h1>{s.scene==="city"&&<div className="gridmap">{buildings.map(b=><button onClick={()=>locate(b.id)} key={b.id}>{b.name}</button>)}</div>}{s.scene==="room"&&s.created&&<button id="bedroom-computer-fallback" className="fallback-computer" onClick={interactComputer}>Use bedroom computer → Open client inbox</button>}</div>}</div>
   <header className="header"><div className="brand"><span className="mark">m.</span><div><strong>MARKETING TYCOON</strong><small>FROM BEDROOM TO BOARDROOM</small></div></div><div className="worldlabel"><span className="live"/>{sceneName[s.scene]}<small>{s.agencyUnlocked?"04 / CEO":s.cityUnlocked?"02 / CITY":"01 / FREELANCE"}</small></div><div className="topactions"><button onClick={()=>setPanel("map")} aria-label="Map"><Map size={20}/></button><button onClick={()=>setPanel("avatar")} aria-label="Settings"><Settings2 size={20}/></button></div></header>
   {s.created&&<aside className="quest"><span className="eyebrow">YOUR OBJECTIVE</span><h2>{s.agencyUnlocked?"Lead your team. Win the next account.":s.cityUnlocked?"Make your mark in the city.":"Your first campaign awaits."}</h2><p>{s.agencyUnlocked?String(projects)+" active projects. Operations are handled by your staff.":s.cityUnlocked?"Explore the districts; return home and use your computer to view freelance briefs.":"Enter the bedroom and click the computer to check your client inbox."}</p><button id="quest-workstation-guide" onClick={()=>s.agencyUnlocked?setPanel("ceo"):approachComputer()}>{s.agencyUnlocked?"Open CEO dashboard":"Go to bedroom computer"} →</button></aside>}
   {s.created&&<div className="stats"><div>REPUTATION<strong>{s.reputation}</strong></div><div>EXPERTISE<strong>{s.expertise}</strong></div><div className="darkstat">CASH<strong>{money(s.agencyUnlocked?s.agencyCash:s.personalCash)}</strong></div></div>}
   {s.agencyUnlocked&&s.ceo&&<div className="clock"><Clock3 size={16}/><strong>DAY {s.ceo.day}</strong>{([0,1,3] as const).map(v=><button key={v} className={s.ceo?.speed===v?"active":""} onClick={()=>act(d=>K.setSpeed(d,v))}>{v===0?<Pause size={14}/>:<><Play size={14}/>{v===3?"×3":""}</>}</button>)}</div>}
   {s.created&&<nav className="dock"><button onClick={()=>change("room")} className={s.scene==="room"?"active":""}><Home size={19}/>Home</button><button disabled={!s.cityUnlocked} onClick={()=>change("city")} className={s.scene==="city"?"active":""}>{s.cityUnlocked?<Compass size={19}/>:<LockKeyhole size={19}/>}City</button><button id="navigate-workstation" onClick={()=>s.agencyUnlocked?setPanel("ceo"):approachComputer()}><Map size={19}/>{s.agencyUnlocked?"Projects":"Computer"}</button><button disabled={!s.agencyUnlocked&&!s.cityUnlocked} onClick={()=>s.agencyUnlocked?change("office"):(change("city"),locate("agency"))}><BriefcaseBusiness size={19}/>Agency</button><button onClick={()=>setPanel("avatar")}><Users size={19}/>Avatar</button></nav>}
   {s.created&&!s.agencyUnlocked&&s.scene==="room"&&panel==="none"&&<div className="computer-instruction" role="status"><strong>{computerHint?"You are back in your bedroom.":"Your first client is waiting."}</strong><span>Click the glowing computer screen to open your inbox.</span></div>}
   {s.created&&s.scene==="city"&&<div className="maptip">Drag to orbit · Scroll to zoom · Click buildings <button onClick={()=>setMap2d(!map2d)}>{map2d?"3D mode":"2D mode"}</button></div>}
   {panel!=="none"&&<section className={"panel "+(panel==="onboard"?"onboardpanel":"")}><header><div><span className="eyebrow">MT® / WORLD EDITION</span><h2>{title}</h2></div>{panel!=="onboard"&&<button className="close" onClick={()=>setPanel("none")} aria-label="Close"><X size={20}/></button>}</header><div className="panelbody">
   {panel==="onboard"&&<Intro done={()=>{setPanel("none");setComputerHint(true)}}/>}
   {panel==="campaign"&&!s.agencyUnlocked&&<CampaignWorkspace/>}
   {panel==="ceo"&&s.agencyUnlocked&&<CEOCommandCenter/>}
   {panel==="location"&&selected&&<LocationPanel id={selected} onOpen={fromLocation}/>}
   {panel==="avatar"&&<Customize/>}
   {panel==="map"&&<div className="directory">{buildings.map(b=><button key={b.id} disabled={!s.cityUnlocked} onClick={()=>{if(s.cityUnlocked){change("city");locate(b.id)}}}><span>{b.name}</span>{s.cityUnlocked?"→":"Locked"}</button>)}</div>}
   </div></section>}
   <Toaster position="top-center" richColors/>
 </div>
}
