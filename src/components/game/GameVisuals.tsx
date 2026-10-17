import {motion,AnimatePresence} from "motion/react";
import type {ReactNode} from "react";
import {Check,AlertTriangle,BriefcaseBusiness,Coins,FlaskConical,Lightbulb,Target,Clapperboard,Radio,ChartNoAxesCombined,FileCheck2,ChevronRight,Activity,ShieldCheck,Users,Clock3} from "lucide-react";
import type {Phase} from "@/game/state";
import {PHASES,PHASE_LABEL} from "@/game/state";

export const mtEase=[.22,1,.36,1] as const;
export const mtMotion={micro:.16,panel:.38,scene:.75};
export function GameSection({eyebrow,title,sub,icon,children}: {eyebrow:string;title:string;sub?:string;icon?:ReactNode;children?:ReactNode}){
 return <section className="mt-game-section"><div className="mt-section-head">{icon&&<span className="mt-section-symbol">{icon}</span>}<div><small>{eyebrow}</small><h3>{title}</h3>{sub&&<p>{sub}</p>}</div></div>{children}</section>;
}
const icons=[FileCheck2,FlaskConical,Users,ShieldCheck,Target,Lightbulb,Clapperboard,Radio,Activity] as const;
export function CampaignTimeline({phase}:{phase:Phase}){
 const active=PHASES.indexOf(phase);
 return <div className="mt-timeline"><div className="mt-timeline-head"><small>CAMPAIGN PROGRESSION</small><strong>{String(active+1).padStart(2,"0")} <span>/ {PHASES.length}</span></strong></div><div className="mt-timeline-track">{PHASES.map((p,i)=>{const Icon=icons[i];return <div title={PHASE_LABEL[p]} key={p} className={"mt-timeline-point "+(i<active?"completed":i===active?"current":"pending")}><div className="mt-timeline-line"/><span className="mt-phase-dot">{i<active?<Check size={13} strokeWidth={3}/>:<Icon size={13}/>}</span>{i===active&&<span className="mt-phase-caption">{PHASE_LABEL[p]}</span>}</div>})}</div></div>;
}
export function AnimatedGauge({percent,label,suffix="%",tone="copper"}:{percent:number;label:string;suffix?:string;tone?:"copper"|"teal"|"sage"}){
 const safe=Math.max(0,Math.min(100,Number.isFinite(percent)?percent:0));
 return <div className="mt-gauge"><div className="mt-gauge-text"><span>{label}</span><strong>{Math.round(percent)}{suffix}</strong></div><div className="mt-gauge-track"><motion.div className={"mt-gauge-fill "+tone} initial={{width:0}} animate={{width:safe+"%"}} transition={{duration:.48,ease:mtEase}}/></div></div>;
}
export function GameStat({label,value,sub,icon}:{label:string;value:ReactNode;sub?:string;icon?:ReactNode}){
 return <div className="mt-number-stat"><div className="mt-number-top">{icon&&<span>{icon}</span>}<small>{label}</small></div><strong>{value}</strong>{sub&&<span className="mt-number-sub">{sub}</span>}</div>;
}
export function BarComparison({rows,max}:{rows:{label:string;value:number;display?:string}[];max?:number}){
 const upper=Math.max(1,max??Math.max(...rows.map(r=>r.value)));
 return <div className="mt-chart" role="img" aria-label={rows.map(r=>r.label+": "+r.value).join("; ")}>{rows.map((r,i)=><div className="mt-chart-row" key={r.label}><div className="mt-chart-meta"><span>{r.label}</span><b>{r.display??r.value.toFixed(0)}</b></div><div className="mt-chart-rail"><motion.div className="mt-chart-fill" style={{background:["#bc7154","#82a7a0","#7d879e","#bd9a63"][i%4]}} initial={{width:0}} animate={{width:(100*Math.min(upper,Math.max(0,r.value))/upper)+"%"}} transition={{duration:.55,ease:mtEase,delay:i*.065}}/></div></div>)}</div>;
}
export function PhaseScene({phase,children}:{phase:string;children:ReactNode}){
 return <AnimatePresence mode="wait" initial={false}><motion.div key={phase} className="mt-phase-content" initial={{opacity:0,y:14,filter:"blur(5px)"}} animate={{opacity:1,y:0,filter:"blur(0px)"}} exit={{opacity:0,y:-9,filter:"blur(4px)"}} transition={{duration:.29,ease:mtEase}}>{children}</motion.div></AnimatePresence>;
}
export function DecisionCard({active,onClick,title,description,disabled=false}:{active?:boolean;onClick:()=>void;title:string;description?:string;disabled?:boolean}){
 return <motion.button type="button" whileHover={disabled?undefined:{y:-2}} whileTap={disabled?undefined:{scale:.984}} disabled={disabled} onClick={onClick} aria-pressed={!!active} className={"mt-decision "+(active?"active":"")}><span className="mt-decision-check">{active?<Check size={14}/>:<ChevronRight size={14}/>}</span><span><b>{title}</b>{description&&<small>{description}</small>}</span></motion.button>;
}
export function FeedbackStrip({children,tone="neutral"}:{children:ReactNode;tone?:"neutral"|"positive"|"danger"}){return <div className={"mt-feedback "+tone}>{tone==="positive"?<Check size={16}/>:tone==="danger"?<AlertTriangle size={16}/>:<Activity size={16}/>}<span>{children}</span></div>}
export function CEOOverview({cash,work,day,issues}:{cash:string;work:number;day:number;issues:number}){
 return <div className="mt-ceo-overview"><GameStat label="AVAILABLE CAPITAL" icon={<Coins size={15}/>} value={cash}/><GameStat label="ACTIVE PROJECTS" icon={<BriefcaseBusiness size={15}/>} value={work}/><GameStat label="DAY" icon={<Clock3 size={15}/>} value={day}/><GameStat label="DECISIONS" icon={<Activity size={15}/>} value={issues}/></div>
}
export function RivalLandscape({rows}:{rows:{name:string;rep:number;specialty:string;mine?:boolean}[]}){
 return <GameSection eyebrow="LIVE COMPETITIVE LANDSCAPE" title="Industry positioning" sub="Reputation values derive from current rival and player states." icon={<ChartNoAxesCombined size={20}/>}><BarComparison max={100} rows={[...rows].sort((a,b)=>b.rep-a.rep).map(r=>({label:r.name,value:r.rep,display:Math.round(r.rep)+"/100 · "+r.specialty}))}/></GameSection>;
}
