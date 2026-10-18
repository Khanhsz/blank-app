/** Marketing Tycoon — Reel Rush V5. All five mini-games run on deterministic
 * gameplay data and user actions. There are NO fake MP4s or paid media assets.
 * Only committing a video version consumes hours; only V4 Final Submit pays.
 */
import type {GameState,VideoMiniKind,VideoMiniState} from "./state";
import type {Fx} from "./store";
import {workload,WEEKLY_CAPACITY} from "./freelanceJobs";
import {getFreelanceJob} from "./freelanceJobTemplates";
const clamp=(n:number,a:number,b:number)=>Math.min(b,Math.max(a,n));
export const VIDEO_LEVELS:{id:string;kind:VideoMiniKind;name:string;goal:string}[]=[
 {id:"video-1",kind:"scroll-stopper",name:"Scroll Stopper",goal:"Find a strong, audience-relevant opening and test it."},
 {id:"video-2",kind:"perfect-shot",name:"Perfect Shot",goal:"Frame the moving product and capture the hero moment."},
 {id:"video-3",kind:"match-cut",name:"Match Cut",goal:"Assemble a clear five-scene story and trim excess."},
 {id:"video-4",kind:"caption-rush",name:"Caption Rush",goal:"Synchronize subtitles and respect on-screen safe zones."},
 {id:"video-5",kind:"beat-drop",name:"Beat Drop",goal:"Make four timed edits while the playhead moves to a beat."}
];
export const VIDEO_SCENES=[
 {id:"hook",label:"Attention / Hook",emoji:"⚡",tone:"#487b89"},
 {id:"process",label:"Making / Process",emoji:"🎬",tone:"#537c77"},
 {id:"product",label:"Product Close-up",emoji:"☕",tone:"#8f7357"},
 {id:"experience",label:"Customer Moment",emoji:"✨",tone:"#716989"},
 {id:"cta",label:"Brand / CTA",emoji:"📍",tone:"#497786"}
] as const;
export const MATCH_IDEAL=VIDEO_SCENES.map(x=>x.id);
export const MATCH_DURATIONS=[3,5,4,6,3];
export const CAPTION_TARGETS=[1,3.2,5.7,8];
export const BEAT_TARGETS=[1.2,2.5,3.8,5.1];
export const HOOK_OPTIONS=[
 {id:"logo",label:"Logo opening",emoji:"🏷️",clarity:50},
 {id:"problem",label:"Customer problem",emoji:"⚡",clarity:96},
 {id:"product",label:"Product reveal",emoji:"☕",clarity:89},
 {id:"reaction",label:"Customer reaction",emoji:"✨",clarity:85}
] as const;
export const HEADLINE_OPTIONS=[
 {id:"none",label:"No headline",fit:30},
 {id:"generic",label:"See more!",fit:60},
 {id:"benefit",label:"A better everyday moment",fit:95},
 {id:"question",label:"What makes this different?",fit:90}
] as const;
export function initialVideoState(id:string):VideoMiniState{
 const lv=VIDEO_LEVELS.find(x=>x.id===id);
 if(!lv)throw Error("Unsupported video deliverable");
 return {kind:lv.kind,hookClip:"logo",headline:"none",tests:0,
  frameX:20,frameY:30,zoom:1,captureTime:-1,captures:0,
  order:["product","cta","hook","experience","process"],lengths:[7,7,7,7,7],edits:0,
  captions:[0,0,0,0],captionY:15,
  beatCuts:[],beatAttempt:0};
}
const err=(x:number,target:number,scale:number)=>Math.abs(x-target)*scale;
export function videoScore(d:VideoMiniState):number{
 if(!videoComplete(d))return 0;
 switch(d.kind){
 case "scroll-stopper":{
  const hook=HOOK_OPTIONS.find(x=>x.id===d.hookClip)?.clarity??0;
  const headline=HEADLINE_OPTIONS.find(x=>x.id===d.headline)?.fit??0;
  const lift=hook===96&&headline===95?5:0;
  return clamp(Math.round(hook*.61+headline*.39+lift),0,100);
 }
 case "perfect-shot":
  return clamp(Math.round(100-err(d.frameX,55,.42)-err(d.frameY,46,.48)-err(d.zoom,1.22,39)-err(d.captureTime,4.5,11)),0,100);
 case "match-cut":{
  const matches=d.order.reduce((sum,id,i)=>sum+(id===MATCH_IDEAL[i]?1:0),0);
  const orderScore=matches/MATCH_IDEAL.length*73;
  const pacing= d.lengths.reduce((sum,length,i)=>sum+clamp(1-Math.abs(length-MATCH_DURATIONS[i])/5,0,1),0)/5*27;
  return clamp(Math.round(orderScore+pacing),0,100);
 }
 case "caption-rush":{
  const error=d.captions.reduce((sum,n,i)=>sum+Math.abs(n-CAPTION_TARGETS[i]),0)/CAPTION_TARGETS.length;
  return clamp(Math.round(100-error*16-Math.abs(d.captionY-78)*.32),0,100);
 }
 case "beat-drop":{
  const error=d.beatCuts.reduce((sum,n,i)=>sum+Math.abs(n-BEAT_TARGETS[i]),0)/BEAT_TARGETS.length;
  return clamp(Math.round(100-error*33),0,100);
 }
 }
}
export function videoComplete(d:VideoMiniState):boolean{
 switch(d.kind){
 case "scroll-stopper":return d.tests>=1&&HOOK_OPTIONS.some(x=>x.id===d.hookClip)&&HEADLINE_OPTIONS.some(x=>x.id===d.headline);
 case "perfect-shot":return d.captures>=1&&d.captureTime>=0&&d.captureTime<=10&&d.frameX>=0&&d.frameX<=100&&d.frameY>=0&&d.frameY<=100&&d.zoom>=.8&&d.zoom<=1.8;
 case "match-cut":return d.edits>=1&&d.order.length===5&&new Set(d.order).size===5&&d.order.every(x=>new Set<string>(MATCH_IDEAL).has(x))&&d.lengths.length===5&&d.lengths.every(n=>Number.isInteger(n)&&n>=2&&n<=10);
 case "caption-rush":return d.captions.length===4&&d.captions.every(n=>Number.isFinite(n)&&n>=0&&n<=11)&&d.captionY>=0&&d.captionY<=100&&d.captions.some(n=>n>0);
 case "beat-drop":return d.beatCuts.length===4&&d.beatCuts.every((n,i)=>Number.isFinite(n)&&n>=0&&n<=7&&(i===0||n>d.beatCuts[i-1]));
 }
}
export function videoSummary(d:VideoMiniState,score=videoScore(d)):string{
 const label=VIDEO_LEVELS.find(x=>x.kind===d.kind)?.name??"Video";
 const parts:Record<VideoMiniKind,string>={
 "scroll-stopper":"Opening: "+d.hookClip+"; headline: "+d.headline+"; "+d.tests+" simulated hook test(s).",
 "perfect-shot":"Camera ("+d.frameX+"%, "+d.frameY+"%), zoom "+d.zoom.toFixed(2)+"; product captured at "+d.captureTime.toFixed(2)+"s.",
 "match-cut":"Edited sequence: "+d.order.join(" → ")+"; scene lengths "+d.lengths.join("/")+"s.",
 "caption-rush":"Caption cues: "+d.captions.map(n=>n.toFixed(1)+"s").join(", ")+"; position "+d.captionY+"% from top.",
 "beat-drop":"Timeline cuts: "+d.beatCuts.map(n=>n.toFixed(2)+"s").join(", ")+"; rhythm attempt "+d.beatAttempt+"."
 };
 return label+" · simulated vertical video draft. "+parts[d.kind]+" Editing score "+score+"/100. Client can request a specific correction.";
}
export function currentVideoDraft(s:GameState,id:string):VideoMiniState|null{
 const p=s.campaign.freelanceJob,v=p?.v4,a=v?.artifacts.find(x=>x.id===id);
 if(p?.templateId!=="short-video"||!v||!a)return null;
 const lv=VIDEO_LEVELS.find(x=>x.id===id);
 if(!lv)return null;
 return a.videoDraft??a.video??initialVideoState(id);
}
/** Called from direct mini-game actions. Persist replayable decisions without
 * spending extra hours for dragging/sliding/scrubbing or browser reloads.
 */
export function changeVideoDraft(s:GameState,id:string,change:Partial<VideoMiniState>){
 const p=s.campaign.freelanceJob,v=p?.v4,a=v?.artifacts.find(x=>x.id===id);
 if(p?.templateId!=="short-video"||!v||v.step!=="workspace"||!a||a.status==="approved")return false;
 const base=currentVideoDraft(s,id);
 if(!base)return false;
 const next:VideoMiniState={...base,...change,kind:base.kind};
 if(!Number.isInteger(next.tests)||next.tests<0||next.tests>100||
  !Number.isInteger(next.captures)||next.captures<0||next.captures>100||
  next.frameX<0||next.frameX>100||next.frameY<0||next.frameY>100||
  next.zoom<.8||next.zoom>1.8||next.captureTime>10||next.captureTime< -1||
  next.captionY<0||next.captionY>100||
  !Number.isInteger(next.edits)||next.edits<0||next.edits>100||
  next.beatCuts.length>4||next.beatCuts.some(x=>!Number.isFinite(x)||x<0||x>7)||
  next.captions.length!==4||next.captions.some(x=>!Number.isFinite(x)||x<0||x>11)||
  next.order.length!==5||new Set(next.order).size!==5||
  next.order.some(x=>!new Set<string>(MATCH_IDEAL).has(x))||
  next.lengths.length!==5||next.lengths.some(x=>!Number.isInteger(x)||x<2||x>10))return false;
 a.videoDraft=next;
 return true;
}
export function commitVideoDraft(s:GameState,fx:Fx,id:string){
 const p=s.campaign.freelanceJob,v=p?.v4,a=v?.artifacts.find(x=>x.id===id);
 if(p?.templateId!=="short-video"||!v||v.step!=="workspace"||!a||a.status==="approved")return false;
 const data=a.videoDraft;
 if(!data||!videoComplete(data))return fx.toast("Complete the playable video challenge before saving a draft."),false;
 const career=workload(s);
 if(career.weeklyWeek!==s.clock.week){career.weeklyWeek=s.clock.week;career.weeklyHours=0;}
 const hours=a.version?1:Math.ceil(getFreelanceJob("short-video")!.hours/v.artifacts.length);
 if(career.weeklyHours+hours>WEEKLY_CAPACITY)return fx.toast("Not enough weekly work hours. End Week to recover capacity."),false;
 const score=videoScore(data);
 // Version and work-hour bookkeeping mirrors V4, but the deliverable itself is
 // the actual mini-game output, not a four-dropdown text form.
 career.weeklyHours+=hours;p.actualWorkHours=(p.actualWorkHours??0)+hours;p.hoursWorked+=hours;
 a.video=structuredClone(data);
 delete a.videoDraft;
 a.version++;a.status="ready";a.score=score;a.feedback="";
 a.decisions={minigame:data.kind};
 a.copy=videoSummary(data,score);
 a.versions.push({version:a.version,copy:a.copy,decisions:{...a.decisions},video:structuredClone(data)});
 a.versions=a.versions.slice(-8);
 fx.log("Saved "+a.title+" · "+VIDEO_LEVELS.find(x=>x.id===id)?.name+" · "+score+"/100 · "+hours+"h.");
 return true;
}
