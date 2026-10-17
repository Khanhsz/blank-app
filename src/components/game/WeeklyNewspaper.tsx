import {CalendarDays,Newspaper,ArrowRight,BriefcaseBusiness,TrendingUp,TrendingDown,Minus,ShieldCheck,Users,Building2,Target} from "lucide-react";
import {money} from "@/game/data";
import type {WeeklyEdition,WeeklyArticle,WeeklyCategory} from "@/game/state";

const categories:Record<WeeklyCategory,{label:string,icon:typeof Users}>={
 decisions:{label:"FOUNDER DECISIONS",icon:BriefcaseBusiness},
 finance:{label:"FINANCE",icon:TrendingUp},
 clients:{label:"CLIENTS & PITCHES",icon:Target},
 operations:{label:"OPERATIONS",icon:Building2},
 competition:{label:"COMPETITOR WATCH",icon:ShieldCheck},
 talent:{label:"TALENT MARKET",icon:Users}
};
const sign=(n:number)=>(n>0?"+":"")+money(n);
function Story({story,featured=false}:{story:WeeklyArticle;featured?:boolean}){
 const cat=categories[story.category],Icon=cat.icon;
 return <article className={"mt-week-story "+(featured?"mt-week-story-feature":"")}>
  <div className="mt-week-story-meta"><Icon size={13}/>{cat.label}
    <span className={"mt-week-sentiment "+story.impact}>{story.impact==="positive"?"▲ UP":story.impact==="negative"?"▼ DOWN":"• DEVELOPING"}</span>
  </div>
  <h3>{story.headline}</h3>
  <p>{story.body}</p>
  <div className="mt-week-evidence"><b>REPORTED FROM</b><span>{story.evidence}</span></div>
 </article>;
}
/** A saved, deterministic weekly newspaper shown every time a week advances. */
export function WeeklyNewspaper({edition,onClose}:{edition:WeeklyEdition;onClose:()=>void}){
 const lead=edition.articles.find(x=>x.category==="finance")||edition.articles[0];
 const others=edition.articles.filter(x=>x.id!==lead.id);
 return <div className="mt-week-backdrop" role="presentation" onClick={e=>{if(e.target===e.currentTarget)onClose()}}>
  <section className="mt-week-paper" role="dialog" aria-modal="true" aria-labelledby="weekly-paper-title">
   <div className="mt-week-paper-top"><span><CalendarDays size={15}/> END OF WEEK {edition.weekCompleted}</span><span>SIMULATED BUSINESS JOURNAL · ISSUE {edition.weekCompleted}</span></div>
   <div className="mt-week-masthead">
    <div className="mt-week-kicker">MARKETING CITY / EXECUTIVE INTELLIGENCE</div>
    <h1 id="weekly-paper-title">The Agency Ledger</h1>
    <p>WEEK {edition.weekStarted} BEGINS <span>·</span> MARKET REPORT FOR DAYS {edition.dayFrom}–{edition.dayTo}</p>
   </div>
   <div className="mt-week-paper-ticker">
    <div><small>WEEKLY CASH MOVEMENT</small><strong>{sign(edition.cashAfter-edition.cashBefore)}</strong></div>
    <div><small>REPUTATION CHANGE</small><strong>{edition.repAfter-edition.repBefore>=0?"+":""}{edition.repAfter-edition.repBefore}</strong></div>
    <div><small>COMPLETED CAMPAIGNS</small><strong>{edition.completedProjects}</strong></div>
    <div><small>RIVAL CONTRACT WINS</small><strong>{edition.rivalsWon}</strong></div>
   </div>
   <div className="mt-week-editorial">
    <div className="mt-week-hero-header"><Newspaper size={16}/> THE WEEK IN REVIEW <span>{edition.articles.length} VERIFIED GAME EVENTS</span></div>
    {lead&&<Story story={lead} featured/>}
    <div className="mt-week-editorial-grid">{others.map(story=><Story key={story.id} story={story}/>)}</div>
   </div>
   <div className="mt-week-paper-bottom">
    <span><ShieldCheck size={14}/> Generated from your saved decisions, ledger, campaign progress and rival-agent simulation.</span>
    <button type="button" onClick={onClose}>Start Week {edition.weekStarted} <ArrowRight size={17}/></button>
   </div>
  </section>
 </div>;
}
export function WeekIndicator({week,day,count,unread,onAdvance,onReview}:{week:number;day:number;count:number;unread:boolean;onAdvance:()=>void;onReview:()=>void}){
 return <div className="mt-week-hud" aria-label="Manual weekly turn controls">
  <div className="mt-week-hud-caption"><CalendarDays size={15}/><span><b>WEEK {week}</b><small>DAY {day} · TURN-BASED</small></span></div>
  {count>0&&<button className={"mt-week-news-button "+(unread?"unread":"")} type="button" onClick={onReview}><Newspaper size={15}/> NEWS {unread?"•":""}</button>}
  <button type="button" className="mt-week-advance" disabled={unread} onClick={onAdvance}>End Week <ArrowRight size={16}/></button>
 </div>;
}
