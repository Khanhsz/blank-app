import {useEffect,useRef,useState} from "react";
import {Camera,CheckCircle2,ChevronLeft,ChevronRight,Clapperboard,Play,RotateCcw,Scissors,Target,Volume2,WandSparkles} from "lucide-react";
import {Button} from "@/components/ui/button";
import {useGame,act} from "@/game/store";
import {WEEKLY_CAPACITY} from "@/game/freelanceJobs";
import {videoScore,videoComplete,videoSummary,currentVideoDraft,changeVideoDraft,commitVideoDraft,
 VIDEO_LEVELS,VIDEO_SCENES,HOOK_OPTIONS,HEADLINE_OPTIONS,MATCH_IDEAL,MATCH_DURATIONS,CAPTION_TARGETS,BEAT_TARGETS,PERFECT_SHOT_DURATION,PERFECT_SHOT_PEAK,capturePerfectShot,continuePerfectShot} from "@/game/videoMiniGames";
import type {VideoMiniState,FreelanceV4Artifact} from "@/game/state";

const clamp=(n:number,a:number,b:number)=>Math.max(a,Math.min(b,n));
const next=(id:string,patch:Partial<VideoMiniState>)=>act(s=>{changeVideoDraft(s,id,patch);});
const duration=(n:number)=>"0:"+String(Math.round(n)).padStart(2,"0");

function Frame({scene="product",headline="",progress=0,frameX=55,frameY=46,zoom=1,caption="",overlay=true}:{
 scene?:string;headline?:string;progress?:number;frameX?:number;frameY?:number;zoom?:number;caption?:string;overlay?:boolean
}){
 const sceneDef=VIDEO_SCENES.find(x=>x.id===scene)??VIDEO_SCENES[2];
 const color=sceneDef.tone;
 const move=Math.sin(progress*2)*14;
 return <div className="mt-reel-frame" aria-label={"Simulated video frame: "+sceneDef.label}>
  <svg viewBox="0 0 180 320" role="img" aria-label="Animated simulated client footage" preserveAspectRatio="xMidYMid meet">
   <defs>
    <linearGradient id={"reel-grad-"+scene} x1="0" x2="1" y1="0" y2="1">
     <stop offset="0" stopColor={color}/><stop offset="1" stopColor="#152a35"/>
    </linearGradient>
   </defs>
   <rect width="180" height="320" fill={"url(#reel-grad-"+scene+")"}/>
   <circle cx="153" cy="64" r="62" fill="#ffffff" opacity=".055"/>
   <path d="M0 235 Q90 204 180 248 L180 320 L0 320Z" fill="#141f29" opacity=".35"/>
   <g transform={`translate(${(frameX-55)*.3+move} ${(frameY-46)*.3+Math.cos(progress*1.5)*4}) scale(${zoom})`}>
    {scene==="process"?<>
    <rect x="63" y="117" width="58" height="95" rx="10" fill="#f7ddb1" opacity=".93"/>
    <path d="M58 117 Q90 87 122 117" fill="none" stroke="#dce8e6" strokeWidth="8"/>
    <path d="M92 95 C78 128 110 145 92 179" fill="none" stroke="#dce8e6" strokeWidth="5" strokeLinecap="round"/>
    </>:<>
    <ellipse cx="93" cy="226" rx="55" ry="14" fill="#0b1821" opacity=".3"/>
    <path d="M52 135 L126 135 L117 214 Q89 228 62 214 Z" fill="#f5e3c7"/>
    <path d="M51 136 Q88 118 127 136" fill="#7d513d"/>
    <ellipse cx="89" cy="135" rx="38" ry="8" fill="#ac7959"/>
    <path d="M123 149 Q157 144 149 176 Q144 191 120 184" fill="none" stroke="#f5e3c7" strokeWidth="8"/>
    <path d="M78 109 Q60 88 80 75 M101 104 Q115 88 100 72" fill="none" stroke="#f6e9d9" opacity=".58" strokeWidth="4" strokeLinecap="round"/>
    </> }
   </g>
   {overlay&&<>
   <rect x="8" y="8" width="164" height="25" rx="6" fill="#122c38" opacity=".7"/>
   <text x="90" y="24" fontSize="9" fontWeight="700" fill="#f4f7f5" textAnchor="middle">CLIENT FOOTAGE · 9:16</text>
   </>}
   <rect x="13" y="269" width="154" height="38" rx="7" fill="#081e28" opacity=".76"/>
   <text x="90" y="285" fontSize="10" fontWeight="700" textAnchor="middle" fill="#ffffff">{headline.slice(0,27)||sceneDef.label}</text>
   <text x="90" y="299" fontSize="8" textAnchor="middle" fill="#dcecef">{caption.slice(0,32)||"Marketing Tycoon · video draft"}</text>
  </svg>
 </div>;
}
function Meter({score,done}:{score:number;done:boolean}){
 return <div className="mt-reel-score"><span>{done?"LIVE QA RESULT":"CHALLENGE IN PROGRESS"}</span>
 <strong>{done?score+"/100":"—"}</strong><div className="mt-reel-bar"><span style={{width:(done?score:0)+"%"}}/></div>
 <small>{!done?"Complete the interaction to see a result.":score>=78?"Ready for client review.": "You can retry to improve this edit before saving."}</small></div>;
}
function ScrollStopper({id,data,brand}:{id:string;data:VideoMiniState;brand:string}){
 const [showResult,setShowResult]=useState(false);
 const ready=videoComplete(data);
 return <div className="mt-reel-game">
 <div className="mt-reel-head"><h3>01 · Scroll Stopper</h3><p>Build the first 3 seconds of your brand introduction. Test whether your opening earns attention.</p></div>
 <div className="mt-reel-layout">
 <Frame scene={data.hookClip==="problem"?"hook":data.hookClip==="reaction"?"experience":data.hookClip==="logo"?"cta":"product"}
 headline={HEADLINE_OPTIONS.find(x=>x.id===data.headline)?.label??brand} caption={brand}/>
 <div className="mt-reel-tools">
  <b>1. Select opening footage</b>
  <div className="mt-reel-select">{HOOK_OPTIONS.map(item=><button key={item.id} className={data.hookClip===item.id?"selected":""} onClick={()=>{next(id,{hookClip:item.id,tests:0});setShowResult(false)}}>{item.emoji} {item.label}</button>)}</div>
  <b>2. Add an opening line</b>
  <div className="mt-reel-select">{HEADLINE_OPTIONS.map(item=><button key={item.id} className={data.headline===item.id?"selected":""} onClick={()=>{next(id,{headline:item.id,tests:0});setShowResult(false)}}>{item.label}</button>)}</div>
  <Button onClick={()=>{next(id,{tests:data.tests+1});setShowResult(true)}}><Target size={14}/> Test Hook in Simulated Feed</Button>
  {(showResult||ready)&&<p role="status" className="mt-reel-feedback">Simulated view-through indicator: <b>{videoScore({...data,tests:Math.max(1,data.tests)})}%</b>. This is fictional gameplay feedback, not a real platform metric.</p>}
 </div>
 </div></div>;
}
/** Reel Rush Lite V5.1. One action: CAPTURE. Playback starts on entry,
 * then a timed press atomically saves the video deliverable to the V4 board.
 * Retrying before Continue replaces the same version without extra work hours.
 */
function PerfectShot({id,artifact}:{id:string;artifact:FreelanceV4Artifact}){
 const [playing,setPlaying]=useState(!artifact.perfectShotUnconfirmed);
 const [time,setTime]=useState(0);
 const started=useRef(0),raf=useRef(0);
 const game=useGame(x=>x);
 const career=game.freelanceCareer;
 const hoursLeft=WEEKLY_CAPACITY-(career?.weeklyWeek===game.clock.week?career.weeklyHours:0);
 const needed=artifact.perfectShotUnconfirmed?0:artifact.version?1:4;
 const result=artifact.video?.kind==="perfect-shot"?artifact.video:null;
 const recorded=artifact.perfectShotUnconfirmed&&!playing&&!!result;
 useEffect(()=>{
  if(!playing)return;
  started.current=performance.now();
  const tick=(now:number)=>{
   setTime(((now-started.current)/1000)%PERFECT_SHOT_DURATION);
   raf.current=requestAnimationFrame(tick);
  };
  raf.current=requestAnimationFrame(tick);
  return ()=>cancelAnimationFrame(raf.current);
 },[playing]);
 const capture=()=>{
  const moment=((performance.now()-started.current)/1000)%PERFECT_SHOT_DURATION;
  let saved=false;
  act((s,fx)=>{saved=capturePerfectShot(s,fx,id,moment)});
  if(saved){setPlaying(false);setTime(moment)}
 };
 const retry=()=>{setTime(0);setPlaying(true)};
 const score=result?videoScore(result):0;
 return <section className="mt-v4-panel mt-reel mt-reel-lite" aria-label="Perfect Shot one-button capture mini-game">
  <div className="mt-v4-title"><div><small>VIDEO 2/5 · ONE-BUTTON CHALLENGE</small>
   <h3>Perfect Shot</h3><p>Watch the product move. Tap CAPTURE when it reaches the spotlight. No camera setup required.</p>
  </div><Camera size={21}/></div>
  <div className="mt-reel-lite-stage">
   <div className="mt-reel-lite-screen">
    <Frame scene="product" headline="Capture the hero moment" caption="Look for the spotlight" progress={time} frameX={55} frameY={46} zoom={1.22}/>
    <div className={"mt-reel-lite-spotlight"+(Math.abs(time-PERFECT_SHOT_PEAK)<.6?" is-near":"")}>
     <span>{Math.abs(time-PERFECT_SHOT_PEAK)<.6?"✦ HERO MOMENT":"● LIVE"}</span>
    </div>
   </div>
   <div className="mt-reel-lite-hud">
    <span>{recorded?"CAPTURE SAVED":"AUTO PLAY · 8s LOOP"}</span>
    <b>{recorded?result?.captureTime.toFixed(2)+"s":time.toFixed(2)+"s"}</b>
   </div>
   <div className="mt-reel-lite-progress" aria-label="Video playback progress">
    <span className="mt-reel-lite-perfect-zone"/>
    <span className="mt-reel-lite-cursor" style={{left:((recorded?result?.captureTime??time:time)/PERFECT_SHOT_DURATION*100)+"%"}}/>
   </div>
  </div>
  {playing&&<>
   <Button className="w-full mt-reel-lite-capture" size="lg" disabled={needed>hoursLeft} onClick={capture}>
    <Camera size={20}/> CAPTURE!
   </Button>
   <p className="mt-reel-muted">{needed>hoursLeft?
    "You need "+needed+" work-hours. End Week before capturing; no progress is lost.":
    "One tap captures and autosaves your Video 2 draft. Aim for the bright hero moment."}</p>
  </>}
  {recorded&&<>
   <div className="mt-reel-lite-result" role="status">
    <small>AUTOSAVED · VIDEO 2 · VERSION {artifact.version}</small>
    <strong>{score>=90?"PERFECT SHOT!":score>=70?"GOOD SHOT!":"NEEDS WORK"}</strong>
    <span>{score}/100 · Captured at {result!.captureTime.toFixed(2)}s</span>
    <p>Your timing is saved in the Deliverable Board. Retry replaces this attempt without charging more work-hours.</p>
   </div>
   <div className="mt-reel-lite-actions">
    <Button variant="outline" onClick={retry}><RotateCcw size={15}/> Retry</Button>
    <Button onClick={()=>act((s,fx)=>{continuePerfectShot(s,fx,id)})}>
     Continue <ChevronRight size={15}/>
    </Button>
   </div>
  </>}
  {!playing&&!recorded&&<Button onClick={retry}><Play size={15}/> Play Again</Button>}
  <p className="mt-reel-muted">Animated simulated footage; no physical camera or MP4 export. Payment still occurs only after client approval and Final Submit.</p>
 </section>;
}
function MatchCut({id,data}:{id:string;data:VideoMiniState}){
 const [playhead,setPlayhead]=useState(0);
 const total=data.lengths.reduce((sum,n)=>sum+n,0);
 let t=clamp(playhead,0,total),index=0;
 while(index<4&&t>=data.lengths[index]){t-=data.lengths[index];index++}
 const swap=(i:number,j:number)=>{
  const order=[...data.order],lengths=[...data.lengths];
  [order[i],order[j]]=[order[j],order[i]];
  [lengths[i],lengths[j]]=[lengths[j],lengths[i]];
  next(id,{order,lengths,edits:data.edits+1});
 };
 return <div className="mt-reel-game"><div className="mt-reel-head"><h3>03 · Match Cut</h3><p>Arrange five shots into a logical story, then trim each shot to keep the narrative moving.</p></div>
 <div className="mt-reel-layout"><Frame scene={data.order[index]} headline={VIDEO_SCENES.find(x=>x.id===data.order[index])?.label} progress={playhead}/>
 <div className="mt-reel-tools">
  <label>Scrub the 9:16 edit · {duration(playhead)} / {duration(total)}<input type="range" min={0} max={total-.01} step={.1} value={clamp(playhead,0,total-.01)} onChange={e=>setPlayhead(+e.target.value)}/></label>
  <div className="mt-reel-track">{data.order.map((id2,i)=><div key={id2} style={{flex:data.lengths[i]}} className={i===index?"active":""}>{i+1}</div>)}</div>
  {data.order.map((shot,i)=><div className="mt-reel-cutrow" key={shot}>
   <span>{VIDEO_SCENES.find(s=>s.id===shot)?.emoji}</span><b>{VIDEO_SCENES.find(s=>s.id===shot)?.label}</b>
   <button aria-label={"Move "+shot+" left"} disabled={i===0} onClick={()=>swap(i,i-1)}><ChevronLeft size={17}/></button>
   <button aria-label={"Move "+shot+" right"} disabled={i===4} onClick={()=>swap(i,i+1)}><ChevronRight size={17}/></button>
   <label><span>{data.lengths[i]}s</span><input aria-label={"Trim "+shot} type="range" min={2} max={10} value={data.lengths[i]} onChange={e=>{const lengths=[...data.lengths];lengths[i]=+e.target.value;next(id,{lengths,edits:data.edits+1})}}/></label>
  </div>)}
  <p className="mt-reel-feedback">Continuity: hook → making → product → customer → CTA. The edit is scored for narrative order and scene duration.</p>
 </div></div></div>;
}
function CaptionRush({id,data}:{id:string;data:VideoMiniState}){
 const [preview,setPreview]=useState(0);
 const captions=["Start with fresh ingredients","Watch how it's made","Enjoy the finished product","See you at the store"];
 const idx=CAPTION_TARGETS.reduce((last,at,i)=>preview>=data.captions[i]&&data.captions[i]>0?i:last,0);
 return <div className="mt-reel-game"><div className="mt-reel-head"><h3>04 · Caption Rush</h3><p>Listen to the simulated 12-second voiceover timeline; align four subtitle cues and move text into the safe area.</p></div>
 <div className="mt-reel-layout"><Frame scene={preview<4?"process":preview<7?"product":"experience"}
 headline={captions[idx]} caption={"Cue "+(idx+1)+" · "+preview.toFixed(1)+"s"} progress={preview}/>
 <div className="mt-reel-tools">
  <label>Preview position {preview.toFixed(1)}s<input type="range" min={0} max={11} step={.1} value={preview} onChange={e=>setPreview(+e.target.value)}/></label>
  <div className="mt-reel-wave" aria-label="Simulated speech waveform">{Array.from({length:50},(_,i)=><span key={i} style={{height:(8+(i*19%24))+"px"}}/>)}</div>
  {captions.map((text,i)=><label key={text}>{i+1}. {text} — start at {data.captions[i].toFixed(1)}s
   <input type="range" min={0} max={11} step={.1} value={data.captions[i]} onChange={e=>{const cues=[...data.captions];cues[i]=+e.target.value;next(id,{captions:cues})}}/>
  </label>)}
  <label>Subtitle safe zone · {data.captionY}% from top<input type="range" min={0} max={100} value={data.captionY} onChange={e=>next(id,{captionY:+e.target.value})}/></label>
  <p className="mt-reel-feedback">The waveform shows spoken segments. Keep captions synchronized and away from the center of the product.</p>
 </div></div></div>;
}
function BeatDrop({id,data}:{id:string;data:VideoMiniState}){
 const [running,setRunning]=useState(false),[time,setTime]=useState(0);
 const start=useRef(0),raf=useRef(0),lastBeat=useRef(-1),audio=useRef<AudioContext|null>(null);
 const beep=()=>{
  const ctx=audio.current;if(!ctx)return;
  const osc=ctx.createOscillator(),gain=ctx.createGain();osc.frequency.value=720;osc.type="sine";
  gain.gain.setValueAtTime(.055,ctx.currentTime);gain.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.075);
  osc.connect(gain);gain.connect(ctx.destination);osc.start();osc.stop(ctx.currentTime+.08);
 };
 useEffect(()=>{
  if(!running)return;
  start.current=performance.now();
  lastBeat.current=-1;
  const tick=(now:number)=>{
   const elapsed=(now-start.current)/1000;
   setTime(Math.min(6.5,elapsed));
   const beat=BEAT_TARGETS.findIndex((b,i)=>i>lastBeat.current&&elapsed>=b);
   if(beat>=0){lastBeat.current=beat;beep()}
   if(elapsed<6.5)raf.current=requestAnimationFrame(tick);
   else setRunning(false);
  };
  raf.current=requestAnimationFrame(tick);
  return ()=>cancelAnimationFrame(raf.current);
 },[running]);
 useEffect(()=>()=>{void audio.current?.close()},[]);
 const startRound=()=>{
  if(!audio.current)try{audio.current=new AudioContext()}catch{/* No audio device */};
  void audio.current?.resume();
  next(id,{beatCuts:[],beatAttempt:data.beatAttempt+1});setTime(0);setRunning(true);
 };
 const cut=()=>{
  if(!running||data.beatCuts.length>=4||time>6.5)return;
  const cuts=[...data.beatCuts,+time.toFixed(2)];next(id,{beatCuts:cuts});
  if(cuts.length===4)setRunning(false);
 };
 useEffect(()=>{
  if(!running)return;
  const key=(e:KeyboardEvent)=>{if(e.code==="Space"&&!e.repeat){e.preventDefault();document.querySelector<HTMLButtonElement>("#reel-cut-btn")?.click()}};
  window.addEventListener("keydown",key);return ()=>window.removeEventListener("keydown",key);
 },[running]);
 return <div className="mt-reel-game"><div className="mt-reel-head"><h3>05 · Beat Drop</h3><p>Press CUT or Space while the playhead is moving. Four precise rhythm edits produce your promotional reel.</p></div>
 <div className="mt-reel-layout"><Frame scene={data.beatCuts.length%2?"process":"product"} headline="Cut to the beat!" progress={time}/>
 <div className="mt-reel-tools">
  <div className="mt-reel-clock"><span>{time.toFixed(2)}s / 6.5s</span><span>{data.beatCuts.length}/4 cuts</span></div>
  <div className="mt-reel-wave mt-reel-beats" aria-label="Beat timing track">
   {Array.from({length:48},(_,i)=><span key={i} style={{height:(9+(i*13%23))+"px"}}/>)}
   {BEAT_TARGETS.map((b,i)=><i key={i} style={{left:(b/6.5*100)+"%"}}/>)}
   <em style={{left:(time/6.5*100)+"%"}}/>
  </div>
  <p className="mt-reel-muted">The four golden markers are musical downbeats. Audio uses simple synthesized tones.</p>
  <div className="mt-reel-row">
   <Button variant="outline" disabled={running} onClick={startRound}><Play size={14}/> {data.beatAttempt?"Retry Rhythm":"Start Rhythm"}</Button>
   <Button id="reel-cut-btn" disabled={!running||data.beatCuts.length>=4} onClick={cut}><Scissors size={15}/> CUT / Space</Button>
  </div>
  {data.beatCuts.length>0&&<p role="status" className="mt-reel-feedback">Cuts at {data.beatCuts.map(x=>x.toFixed(2)+"s").join(" · ")}. {data.beatCuts.length===4?"Playback complete. You can save or retry.":"Keep listening for the next beat."}</p>}
 </div></div></div>;
}
export function VideoDraftPreview({video,title}:{video:VideoMiniState;title:string}){
 const [scene,setScene]=useState(0);
 const scenes=video.kind==="match-cut"?video.order:["hook","process","product","experience","cta"];
 return <div className="mt-reel-board-preview"><Frame scene={scenes[scene%scenes.length]} headline={title}
 caption={video.kind==="beat-drop"?"Cut times: "+video.beatCuts.map(x=>x.toFixed(1)).join(", "):video.kind==="caption-rush"?"Subtitles synced":video.kind}/>
 <div><b>{VIDEO_LEVELS.find(x=>x.kind===video.kind)?.name}</b><span>{videoScore(video)}/100</span><Button size="sm" variant="outline" onClick={()=>setScene(x=>(x+1)%scenes.length)}><Play size={13}/> Preview Next Scene</Button></div></div>;
}
export function VideoMiniGame({artifact,brand}:{artifact:FreelanceV4Artifact;brand:string}){
 const s=useGame(x=>x),data=currentVideoDraft(s,artifact.id);
 if(!data)return null;
 if(data.kind==="perfect-shot")return <PerfectShot id={artifact.id} artifact={artifact}/>;
 const level=VIDEO_LEVELS.find(x=>x.id===artifact.id),score=videoScore(data),complete=videoComplete(data);
 const hoursLeft=WEEKLY_CAPACITY-(s.freelanceCareer?.weeklyWeek===s.clock.week?s.freelanceCareer.weeklyHours:0);
 const hours=artifact.version?1:4;
 const dirty=!!artifact.videoDraft&&(!artifact.video||JSON.stringify(artifact.videoDraft)!==JSON.stringify(artifact.video));
 return <section className="mt-v4-panel mt-reel" aria-label={"Video mini-game "+level?.name}>
 <div className="mt-v4-title"><div><small>VIDEO PRODUCTION · PLAYABLE CHALLENGE</small><h3>{level?.name}</h3><p>{level?.goal}</p></div><Clapperboard size={22}/></div>
 {data.kind==="scroll-stopper"&&<ScrollStopper id={artifact.id} data={data} brand={brand}/>}
 
 {data.kind==="match-cut"&&<MatchCut id={artifact.id} data={data}/>}
 {data.kind==="caption-rush"&&<CaptionRush id={artifact.id} data={data}/>}
 {data.kind==="beat-drop"&&<BeatDrop id={artifact.id} data={data}/>}
 <Meter score={score} done={complete}/>
 <div className="mt-v4-preview"><div><b>Video draft summary</b><span>V{artifact.version||"New"} · {hours} work-hours to save</span></div>
 <p>{videoSummary(data,score)}</p></div>
 <Button className="w-full" disabled={!complete||!dirty||hours>hoursLeft}
 onClick={()=>act((g,fx)=>{commitVideoDraft(g,fx,artifact.id);})}>
 <CheckCircle2 size={15}/> Save Video to Deliverable Board · {hours}h
 </Button>
 <small role="status" className="mt-v4-muted">
 {hours>hoursLeft?"Weekly capacity exhausted. End Week to restore hours. Your edit is autosaved.":
 dirty?"Mini-game actions are saved automatically. Commit a version for client review.":
 artifact.version?"Video version saved. Adjust this edit to create a revised version.":"Complete the challenge and save a video version."}
 </small>
 <small className="mt-reel-muted">Video preview uses animated vector footage and synthesized sound, not recorded client footage or exported MP4. No real media spend.</small>
 </section>;
}
