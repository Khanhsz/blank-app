import "@/freelance-overhaul.css";
import {useEffect,useState} from "react";
import {ArrowLeft,ArrowRight,CheckCircle2,ClipboardCheck,FileCheck2,PenTool,RefreshCcw,Send,Wallet,BookOpen,ChevronUp,ChevronDown} from "lucide-react";
import {Button} from "@/components/ui/button";
import {useGame,act} from "@/game/store";
import {money} from "@/game/data";
import {getFreelanceJob} from "@/game/freelanceJobTemplates";
import {workload,WEEKLY_CAPACITY,freelanceDeliveryEstimate} from "@/game/freelanceJobs";
import {designFor,artifactScore} from "@/game/freelanceWorkflows";
import * as Work from "@/game/freelanceWorkflows";
import * as Campaign from "@/game/campaign";
import {prepareFreelanceDeliverableReview} from "@/game/automaticDeliverableReview";
import type {FreelanceV4Artifact} from "@/game/state";
import {VideoMiniGame,VideoDraftPreview} from "./VideoMiniGame";

const phases=[{id:"brief",label:"Brief"},{id:"workspace",label:"Workspace"},{id:"board",label:"Deliverable Board"},{id:"revision",label:"Client Review"},{id:"ready",label:"Final Submit"}] as const;

/** The legacy select/text editor is available ONLY to video contracts signed before migration. */
function LegacyVideoEditor({artifact,jobId}:{artifact:FreelanceV4Artifact;jobId:string}){
 const game=useGame(s=>s),unit=Work.unitFor(jobId,artifact.id)!;
 const decisions=artifact.draft?.decisions??artifact.decisions,copy=artifact.draft?.copy??artifact.copy;
 const update=(choices:Record<string,string>,content:string)=>act(s=>{Work.saveV4Draft(s,artifact.id,choices,content);});
 const allChosen=unit.fields.every(f=>!!decisions[f.id]);
 const hours=Work.v4EditHours(game,artifact.id);
 const left=Math.max(0,WEEKLY_CAPACITY-(game.freelanceCareer?.weeklyWeek===game.clock.week?game.freelanceCareer.weeklyHours:0));
 return <section className="mt-v4-panel"><h3>{unit.title} · legacy contract</h3>
  <div className="mt-v4-choices">{unit.fields.map(field=><label key={field.id} className="mt-v4-field">
   <span>{field.label}</span><select value={decisions[field.id]??""} onChange={e=>update({...decisions,[field.id]:e.target.value},copy)}>
    <option value="">Choose a direction</option>{field.options.map(o=><option key={o.id} value={o.id}>{o.label}</option>)}
   </select></label>)}</div>
  <label className="mt-v4-copy"><span>Existing script</span><textarea rows={6} value={copy} maxLength={2500} onChange={e=>update(decisions,e.target.value)}/></label>
  <Button disabled={!allChosen||copy.trim().length<20||hours>left} onClick={()=>act((s,fx)=>Work.editV4(s,fx,artifact.id,decisions,copy))}>Save legacy deliverable</Button>
 </section>;
}

/** Picking a card updates the persisted draft and its preview in the SAME store action. */
function CardEditor({artifact,jobId,brand}:{artifact:FreelanceV4Artifact;jobId:string;brand:string}){
 const game=useGame(s=>s),unit=Work.unitFor(jobId,artifact.id)!;
 const decisions=artifact.draft?.decisions??artifact.decisions,copy=artifact.draft?.copy??artifact.copy;
 const complete=unit.fields.every(f=>f.options.some(o=>o.id===decisions[f.id]));
 const score=artifactScore(jobId,{...artifact,decisions,copy});
 const hours=Work.v4EditHours(game,artifact.id);
 const left=Math.max(0,WEEKLY_CAPACITY-(game.freelanceCareer?.weeklyWeek===game.clock.week?game.freelanceCareer.weeklyHours:0));
 const changed=!!artifact.draft||artifact.version===0;
 const choose=(fieldId:string,optionId:string)=>{
  const next={...decisions,[fieldId]:optionId};
  const content=Work.composeCardOutput(jobId,artifact.id,next,brand);
  act(s=>{Work.saveV4Draft(s,artifact.id,next,content);});
 };
 return <section className="mt-v4-panel mt-v6-editor" aria-label={"Editing "+unit.title}>
  <div className="mt-v4-title"><div><small>INTERACTIVE WORKSPACE · v{artifact.version||"Draft"}</small><h3>{unit.title}</h3><p>{unit.description}</p></div><PenTool size={20}/></div>
  <div className="mt-v6-editor-grid">
   <div className="mt-v6-card-fields">{unit.fields.map((field,index)=><div className="mt-v6-card-group" key={field.id}>
    <div className="mt-v6-field-heading"><b>{index+1}. {field.label}</b><span>{decisions[field.id]?"✓ Selected":"Choose one card"}</span></div>
    <div className="mt-v6-card-options">{field.options.map(o=><button type="button" key={o.id}
     className={"mt-v6-card-option "+(decisions[field.id]===o.id?"selected":"")} aria-pressed={decisions[field.id]===o.id}
     onClick={()=>choose(field.id,o.id)}><b>{o.label}</b><small>{o.detail}</small><span>{decisions[field.id]===o.id?"✓":""}</span></button>)}</div>
   </div>)}</div>
   <aside className="mt-v6-live-preview"><div className="mt-v6-preview-heading"><b>LIVE DELIVERABLE PREVIEW</b><span>{complete?score+"/100":"Draft"}</span></div>
    <div className={"mt-v6-preview-sheet mt-v6-"+jobId}>
     <small>{brand} · MARKETING DELIVERABLE</small><h4>{unit.title}</h4>
     {unit.fields.map(field=>{const choice=field.options.find(o=>o.id===decisions[field.id]);return <div className="mt-v6-preview-line" key={field.id}>
      <small>{field.label}</small><b>{choice?.label??"Choose "+field.label.toLowerCase()}</b>
      <p>{choice?.detail??"Your selected direction will appear here."}</p>
     </div>})}
    </div>
    <details><summary>View the saved output text</summary><pre>{copy}</pre></details>
    <p className="mt-v6-preview-note">Preview and client review are generated from the selected cards stored in this deliverable. No fictitious performance data is promised.</p>
   </aside>
  </div>
  <div className="mt-v4-actions">
   <Button disabled={!complete||!changed||hours>left} onClick={()=>act((s,fx)=>Work.editV4(s,fx,artifact.id,decisions,copy))}>
    <CheckCircle2 size={15}/> {artifact.version?"Save Version "+(artifact.version+1):"Save Deliverable"} · {hours}h
   </Button>
   <span role="status">{artifact.draft?"✓ Choices auto-saved · finalize the version to send":artifact.version?"✓ Version saved and ready for the Deliverable Board":"Choose one card from each row to create this output."}</span>
   {hours>left&&<small className="mt-v4-capacity">Capacity {left}h left; your choices remain saved. End Week to restore work hours.</small>}
  </div>
 </section>;
}

function CashCelebration({amount,expenses,balance}:{amount:number;expenses:number;balance:number}){
 const [display,setDisplay]=useState(Math.round(balance-amount+expenses));
 useEffect(()=>{
  if(window.matchMedia("(prefers-reduced-motion: reduce)").matches){setDisplay(balance);return;}
  let frame=0;const start=performance.now(),from=balance-amount+expenses;
  const tick=(now:number)=>{const t=Math.min(1,(now-start)/950),ease=1-Math.pow(1-t,3);
   setDisplay(Math.round(from+(balance-from)*ease));if(t<1)frame=requestAnimationFrame(tick);};
  frame=requestAnimationFrame(tick);return()=>cancelAnimationFrame(frame);
 },[amount,expenses,balance]);
 return <section className="mt-v6-celebration" role="status" aria-live="polite" aria-label="Contract completed, payment credited">
  <div className="mt-v6-coin" aria-hidden="true">$$</div><CheckCircle2 size={30}/>
  <h3>Final Submit complete!</h3><strong>+{money(amount)}</strong>
  <p>Money added once · Portfolio saved</p>
  <div className="mt-v6-balance"><Wallet size={16}/> Wallet <b>{money(display)}</b></div>
  <small>Returning to the Job Board automatically…</small>
 </section>;
}

function LandingPagePreview({artifacts,brand}:{artifacts:FreelanceV4Artifact[];brand:string}){
 return <div className="mt-v6-landing"><div className="mt-v6-landing-bar"><span>◉ ◉ ◉</span><b>{brand} / Preview</b><small>Mobile-ready</small></div>
  {artifacts.map(a=><div className="mt-v6-landing-block" key={a.id}><small>{a.title}</small>
   <h4>{a.draft?.decisions.message?Work.unitFor("landing-page",a.id)?.fields[0].options.find(o=>o.id===(a.draft?.decisions??a.decisions).message)?.label:
     Work.unitFor("landing-page",a.id)?.fields[0].options.find(o=>o.id===a.decisions.message)?.label??"Select a headline"}</h4>
   <p>{(a.draft?.decisions??a.decisions).visual?
     Work.unitFor("landing-page",a.id)?.fields[1].options.find(o=>o.id===(a.draft?.decisions??a.decisions).visual)?.detail:"Select a visual direction"}</p>
   <span>{Work.unitFor("landing-page",a.id)?.fields[2].options.find(o=>o.id===(a.draft?.decisions??a.decisions).action)?.label??"Choose CTA"}</span>
  </div>)}
 </div>;
}

export function FreelanceV4Desk(){
 const s=useGame(x=>x),c=s.campaign,p=c.freelanceJob,v=p?.v4,job=getFreelanceJob(p?.templateId);
 const def=designFor(p?.templateId),career=workload(s);
 useEffect(()=>{
  if(v?.step!=="paid"||c.phase!=="results")return;
  const timer=window.setTimeout(()=>act((state,fx)=>{
   if(state.campaign.briefId===c.briefId&&state.campaign.freelanceJob?.v4?.step==="paid")Campaign.nextClient(state,fx);
  }),1400);
  return()=>window.clearTimeout(timer);
 },[c.briefId,c.phase,v?.step]);
 if(!p||!v||!job||!def)return null;
 const sc=c.aiScenario,snapshot=v.briefSnapshot;
 const current=v.artifacts.find(a=>a.id===v.activeId)??v.artifacts[0];
 const completed=v.artifacts.filter(a=>Work.isArtifactComplete(job.id,a)&&["ready","approved"].includes(a.status)).length;
 const drafts=Work.v4HasDrafts(v),estimate=freelanceDeliveryEstimate(s);
 const fee=snapshot?.fee??p.acceptedFee??job.fee,amount=Work.v4PaymentAmount(fee,v.deduction);
 const nav=phases.findIndex(x=>x.id===(v.step==="client_review"?"revision":v.step==="paid"?"ready":v.step));
 const reviewItems=v.artifacts.filter(a=>a.status==="revise");
 if(v.step==="paid")return <CashCelebration amount={v.paidAmount??0} balance={s.personalCash} expenses={job.outOfPocket}/>;
 return <div className="mt-v4 mt-v6">
  <header className="mt-v4-header"><div><small>BEDROOM · {def.workstation.toUpperCase()}</small><h2>{job.title}</h2>
   <p>{sc?.brand??"Client"} · {job.tier==="gig"?"Entry Gig":job.tier==="project"?"Specialist Project":"Mini Campaign"}</p></div><PenTool size={22}/></header>
  <div className="mt-v4-metrics">
   <div><small>AGREED SERVICE FEE</small><b>{money(fee)}</b></div>
   <div><small>CLIENT MEDIA · NOT INCOME</small><b>{money(job.mediaBudget)}</b></div>
   <div><small>DELIVERABLES</small><b>{completed}/{v.artifacts.length}</b></div>
   <div><small>HOURS LEFT THIS WEEK</small><b>{Math.max(0,WEEKLY_CAPACITY-career.weeklyHours)}</b></div>
  </div>
  <div className="mt-v4-route" aria-label="Freelance delivery stages">{phases.map((item,i)=><span key={item.id}
   className={nav===i?"active":nav>i?"complete":""}>{i+1}. {item.label}</span>)}</div>

  {v.step==="brief"&&<section className="mt-v4-panel">
   <div className="mt-v4-title"><div><small>01 · CLIENT BRIEF & REQUIREMENTS</small><h3>Understand the assignment</h3></div><BookOpen size={20}/></div>
   <p className="mt-v4-main-copy">{sc?.client??sc?.summary??"Review the approved assignment."}</p>
   {sc?.aiPlanning?.context&&<div className="mt-v4-client"><b>Gemini · Simulated client context</b><p>{sc.aiPlanning.context}</p></div>}
   {sc?.aiPlanning?.insight&&<div className="mt-v4-client"><b>Insight hypothesis</b><p>{sc.aiPlanning.insight}</p></div>}
   <div className="mt-v6-brief-grid"><p><b>Marketing objective</b><span>{job.objective}</span></p><p><b>Target audience</b><span>{sc?.clientAnswers?.audience??"Audience in the client scenario"}</span></p>
    <p><b>Scope & deliverables</b><span>{job.deliverables}</span></p><p><b>Acceptance criteria</b><span>{job.successMetric}</span></p></div>
   <p><b>Fee:</b> {money(fee)} · <b>Deadline:</b> {job.days} days · <b>Included revision rounds:</b> {job.revisions}</p>
   <p className="mt-v4-muted">No deposit. Client media budgets never become your income. Your brief is frozen when you accept.</p>
   <Button className="w-full" onClick={()=>act(Work.startV4)}>Accept Brief · Open Workspace <ArrowRight size={16}/></Button>
  </section>}

  {v.step==="workspace"&&<section className="mt-v4-work">
   <div className="mt-v4-client"><b>3 fixed requirements · {snapshot?.objective??job.objective}</b>
    <p>{snapshot?.context??def.intro}</p>
    <div className="mt-v6-pins"><span>Audience: {snapshot?.audience??"Client segment"}</span><span>{snapshot?.acceptance??job.successMetric}</span>
     <span>Deadline: Day {snapshot?.deadlineDay??p.deadlineDay}</span></div>
    <details><summary>Full contracted brief</summary><p>{snapshot?.scope??job.deliverables}</p><p>{snapshot?.insight??sc?.aiPlanning?.insight}</p></details>
   </div>
   <div className="mt-v4-selector" aria-label="Choose a job deliverable">{v.artifacts.map((a,i)=><button key={a.id} type="button" className={a.id===current.id?"active":""}
    onClick={()=>act(state=>Work.setV4Active(state,a.id))}><span>{i+1}. {a.title}</span>
    <small>{a.status==="approved"?"✓ Approved v"+a.version:a.draft?"Draft auto-saved":a.version?"v"+a.version+" · "+a.status:"New output"}</small></button>)}</div>
   {job.id==="landing-page"&&<div className="mt-v6-page-tools"><h3>Landing page order</h3>
    <p>Move each section to repair the page's hierarchy. Use arrow buttons on touch screens and keyboards.</p>
    {v.artifacts.map((a,i)=><div key={a.id}><b>{i+1}. {a.title}</b><span>
     <button aria-label={"Move "+a.title+" up"} disabled={i===0} onClick={()=>act(d=>Work.moveV4Unit(d,a.id,-1))}><ChevronUp size={16}/></button>
     <button aria-label={"Move "+a.title+" down"} disabled={i===v.artifacts.length-1} onClick={()=>act(d=>Work.moveV4Unit(d,a.id,1))}><ChevronDown size={16}/></button>
    </span></div>)}
    <LandingPagePreview artifacts={v.artifacts} brand={sc?.brand??"Client"}/></div>}
   {job.id==="short-video"&&(current.version===0||current.video||current.videoDraft)?
    <VideoMiniGame key={c.briefId+"-"+current.id} artifact={current} brand={sc?.brand??"Client"}/>:
    job.id==="short-video"?<LegacyVideoEditor key={current.id} artifact={current} jobId={job.id}/>:
    <CardEditor key={current.id} artifact={current} jobId={job.id} brand={sc?.brand??"Client"}/>}
   <div className="mt-v4-bottom"><div><small>Progress</small><b>{completed}/{v.artifacts.length} saved deliverables</b>
    <small>{drafts?" · draft changes waiting to be finalized":""} · {p.actualWorkHours??0}h worked · Day {estimate?.workDay??s.clock.day}</small></div>
    <Button disabled={completed!==v.artifacts.length||drafts} onClick={()=>act(Work.openV4Board)}>Open Deliverable Board <ArrowRight size={15}/></Button>
   </div>
  </section>}

  {v.step==="board"&&<section className="mt-v4-panel">
   <div className="mt-v4-title"><div><small>DELIVERABLE BOARD</small><h3>Inspect every output</h3><p>Review the versioned deliverables before sending them to the client.</p></div><ClipboardCheck size={20}/></div>
   {job.id==="landing-page"&&<LandingPagePreview artifacts={v.artifacts} brand={sc?.brand??"Client"}/>}
   <div className="mt-v4-boards">{v.artifacts.map(a=><div className="mt-v4-artifact" key={a.id}>
    <div><b>{a.title}</b><span>{a.status==="approved"?"✓ Approved":a.status==="revise"?"Needs changes":"Ready for review"} · v{a.version} · {a.score}/100</span></div>
    <p className="mt-v6-output-copy">{a.copy}</p>
    {a.video&&<VideoDraftPreview video={a.video} title={a.title}/>}
    <div className="mt-v4-tags">{Object.entries(a.decisions).map(([key,value])=><span key={key}>{key}: {value}</span>)}</div>
    {a.feedback&&<p>{a.feedback}</p>}
    <Button variant="outline" size="sm" onClick={()=>act(d=>Work.returnV4Workspace(d,a.id))}><PenTool size={14}/> Back & Edit This Output</Button>
   </div>)}</div>
   <Button className="w-full" disabled={drafts||completed!==v.artifacts.length} onClick={()=>{act(Work.submitV4Review);prepareFreelanceDeliverableReview();}}>
    <Send size={15}/> Send Deliverables for Client Review
   </Button>
  </section>}

  {v.step==="revision"&&<section className="mt-v4-panel">
   <div className="mt-v4-title"><div><small>CLIENT REVIEW · ROUND {v.reviewRound}</small><h3>Fix the specific client feedback</h3></div><RefreshCcw size={20}/></div>
   <p>{p.clientFeedback}</p><div className="mt-v4-boards">{v.artifacts.map(a=><div className="mt-v4-artifact" key={a.id}>
    <div><b>{a.title}</b><span>{a.status==="approved"?"✓ Approved":"Revision requested"}</span></div>
    <p>{a.feedback}</p>{a.video&&<VideoDraftPreview video={a.video} title={a.title}/>}
    {a.status==="revise"&&<Button variant="outline" size="sm" onClick={()=>act(d=>Work.returnV4Workspace(d,a.id))}>Edit This Deliverable <ArrowRight size={14}/></Button>}
   </div>)}</div>
   <p className="mt-v4-muted">{reviewItems.length} output(s) need changes. Previously approved versions stay accepted unless edited.</p>
  </section>}

  {v.step==="ready"&&<section className="mt-v4-panel">
   <div className="mt-v4-title"><div><small>CLIENT ACCEPTED THE FINAL VERSIONS</small><h3>Final Submit</h3></div><FileCheck2 size={20}/></div>
   <p>{p.clientFeedback}</p><div className="mt-v4-boards">{v.artifacts.map(a=><div className="mt-v4-artifact" key={a.id}>
    <div><b>{a.title}</b><span>{a.approvedVersion===a.version?"✓ Approved v"+a.version:"Version needs re-approval"}</span></div>
    <p className="mt-v6-output-copy">{a.copy}</p><p>{a.feedback}</p>
    <Button variant="outline" size="sm" onClick={()=>act(d=>Work.returnV4Workspace(d,a.id))}>Reopen & Edit</Button>
   </div>)}</div>
   <div className="mt-v4-payment"><div><span>Service fee</span><b>{money(fee)}</b></div>
    <div><span>Agreed adjustment</span><b>-{money(fee-amount)}</b></div>
    <div><span>Freelancer expenses</span><b>-{money(job.outOfPocket)}</b></div>
    <div><span>Wallet increase</span><strong>{money(amount-job.outOfPocket)}</strong></div></div>
   <p className="mt-v4-muted">Final Submit pays once, saves your portfolio and returns to the Job Board automatically. No deposit, claim or separate payment screen.</p>
   <Button className="w-full" disabled={v.artifacts.some(a=>a.status!=="approved"||a.approvedVersion!==a.version)||drafts}
    onClick={()=>act(Work.finalizeV4)}><Wallet size={15}/> Final Submit · Receive {money(amount)}</Button>
  </section>}
 </div>;
}
