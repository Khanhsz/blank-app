import {ArrowLeft,ArrowRight,CheckCircle2,ClipboardCheck,Clock3,FileCheck2,PenTool,RefreshCcw,Send,Wallet,BookOpen} from "lucide-react";
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

const phases=[{id:"brief",label:"Brief"},{id:"workspace",label:"Workspace"},{id:"board",label:"Deliverable Board"},{id:"revision",label:"Client Review"},{id:"ready",label:"Final Submit"},{id:"paid",label:"Paid"}] as const;
function Editor({artifact,jobId}:{artifact:FreelanceV4Artifact;jobId:string}){
 const game=useGame(s=>s);
 const unit=Work.unitFor(jobId,artifact.id)!;
 const decisions=artifact.draft?.decisions??artifact.decisions,copy=artifact.draft?.copy??artifact.copy;
 const update=(choices:Record<string,string>,content:string)=>act(s=>{Work.saveV4Draft(s,artifact.id,choices,content);});
 const draft:FreelanceV4Artifact={...artifact,decisions,copy};
 const score=artifactScore(jobId,draft);
 const allChosen=unit.fields.every(f=>!!decisions[f.id]);
 const dirty=!!artifact.draft;
 const hours=Work.v4EditHours(game,artifact.id);
 const hoursLeft=Math.max(0,WEEKLY_CAPACITY-(game.freelanceCareer?.weeklyWeek===game.clock.week?game.freelanceCareer.weeklyHours:0));
 return <section className="mt-v4-panel" aria-label={"Editing "+unit.title}>
  <div className="mt-v4-title"><div><small>JOB-SPECIFIC WORKSPACE</small><h3>{unit.title}</h3><p>{unit.description}</p></div><span>v{artifact.version||"Draft"}</span></div>
  <div className="mt-v4-choices">{unit.fields.map(field=><label key={field.id} className="mt-v4-field">
   <span>{field.label}</span>
   <select value={decisions[field.id]??""} onChange={e=>update({...decisions,[field.id]:e.target.value},copy)}>
    <option value="">Choose a professional direction</option>
    {field.options.map(o=><option key={o.id} value={o.id}>{o.label} — {o.detail}</option>)}
   </select>
  </label>)}</div>
  <label className="mt-v4-copy"><span>Editable output · script / report / content</span>
   <textarea rows={8} maxLength={2500} value={copy} onChange={e=>update(decisions,e.target.value)} aria-label="Edit deliverable content"/>
  </label>
  <div className="mt-v4-preview">
   <div><b>Preview & QA · target {Work.V4_ACCEPTANCE_SCORE}/100</b><span>{allChosen?score+"/100":"Decisions incomplete"}</span></div>
   <p>{copy}</p>
   <div className="mt-v4-tags">{unit.fields.map(f=>{const chosen=f.options.find(x=>x.id===decisions[f.id]);return <span key={f.id}>{f.label}: {chosen?.label??"Not set"}</span>})}</div>
  </div>
  <div className="mt-v4-actions">
   <Button disabled={!allChosen||copy.trim().length<20||hours>hoursLeft||(!dirty&&artifact.version>0)} onClick={()=>act((s,fx)=>{Work.editV4(s,fx,artifact.id,decisions,copy);})}>
    <CheckCircle2 size={15}/> {artifact.version?"Save Version "+(artifact.version+1):"Save Deliverable"} · {hours}h
   </Button>
   <small role="status">{dirty?"Draft saved automatically. Save a deliverable version to include these changes in client review.":artifact.version?"Deliverable version saved for client review.":"Choose each direction, then save the deliverable."}</small>
   {hours>hoursLeft&&<small className="mt-v4-capacity">Need {hours}h; {hoursLeft}h left this week. Your draft is saved. Use End Week to restore work hours.</small>}
  </div>
 </section>;
}
export function FreelanceV4Desk(){
 const s=useGame(x=>x),c=s.campaign,p=c.freelanceJob,v=p?.v4,job=getFreelanceJob(p?.templateId);
 const def=designFor(p?.templateId),career=workload(s);
 if(!p||!v||!job||!def)return null;
 const sc=c.aiScenario;
 const current=v.artifacts.find(a=>a.id===v.activeId)??v.artifacts[0];
 const completed=v.artifacts.filter(a=>a.status==="ready"||a.status==="approved").length;
 const approved=v.artifacts.filter(a=>a.status==="approved").length;
 const drafts=v.artifacts.filter(a=>!!a.draft).length;
 const estimate=freelanceDeliveryEstimate(s);
 const fee=p.acceptedFee??job.fee;
 const amount=Work.v4PaymentAmount(fee,v.deduction);
 const nav=phases.findIndex(x=>x.id===(v.step==="client_review"?"revision":v.step));
 const reviewItems=v.artifacts.filter(a=>a.status==="revise");
 return <div className="mt-v4">
  <header className="mt-v4-header">
   <div><small>BEDROOM · {def.workstation.toUpperCase()}</small><h2>{job.title}</h2><p>{sc?.brand??"Client"} · {job.tier==="gig"?"Entry Gig":job.tier==="project"?"Specialist Project":"Mini Campaign"}</p></div><PenTool size={22}/>
  </header>
  <div className="mt-v4-metrics">
   <div><small>AGREED FEE</small><b>{money(fee)}</b></div><div><small>CLIENT MEDIA</small><b>{money(job.mediaBudget)}</b></div><div><small>DELIVERABLES</small><b>{completed}/{v.artifacts.length}</b></div><div><small>WORK HOURS LEFT</small><b>{Math.max(0,WEEKLY_CAPACITY-career.weeklyHours)}</b></div>
  </div>
  <div className="mt-v4-route" aria-label="Freelance delivery stages">{phases.map((item,i)=><span key={item.id} className={nav===i?"active":nav>i?"complete":""}>{i+1}. {item.label}</span>)}</div>
  {v.step==="brief"&&<section className="mt-v4-panel">
   <div className="mt-v4-title"><div><small>01 · CLIENT BRIEF & REQUIREMENTS</small><h3>Understand the assignment</h3></div><BookOpen size={20}/></div>
   <p className="mt-v4-main-copy">{sc?.client??sc?.summary??"Review the approved assignment."}</p>
   {sc?.aiPlanning?.context&&<div className="mt-v4-client"><b>Gemini · Client context</b><p>{sc.aiPlanning.context}</p></div>}
   {sc?.aiPlanning?.insight&&<div className="mt-v4-client"><b>Insight hypothesis</b><p>{sc.aiPlanning.insight}</p></div>}
   <p><b>Scope:</b> {job.deliverables}</p><p><b>Acceptance:</b> {job.successMetric}</p>
   <p><b>Deadline:</b> {job.days} days · <b>Revisions:</b> {job.revisions} included · <b>Est. effort:</b> {job.hours}h</p>
   <p className="mt-v4-muted">Accepting this brief does not pay a deposit. You are paid after final delivery is approved. Client media is not freelance income.</p>
   <Button className="w-full" onClick={()=>act(Work.startV4)}>Accept Job · Start Working <ArrowRight size={16}/></Button>
  </section>}
  {v.step==="workspace"&&<section className="mt-v4-work">
   <div className="mt-v4-client"><b>Assignment</b><p>{def.intro}</p>{sc?.reports?.interview&&<details><summary>Client evidence and context</summary><p>{sc.reports.interview}</p><p>{sc.reports.audit}</p></details>}</div>
   <div className="mt-v4-selector" aria-label="Choose a job deliverable">
    {v.artifacts.map((a,i)=><button key={a.id} type="button" className={a.id===current.id?"active":""}
     disabled={a.status==="approved"} onClick={()=>act(s=>Work.setV4Active(s,a.id))}>
     <span>{i+1}. {a.title}</span><small>{a.status==="approved"?"Approved":a.draft?"Draft saved · version needed":a.version?"v"+a.version+" · "+a.status:"New draft"}</small>
    </button>)}
   </div>
   <Editor key={c.briefId+"-"+current.id} artifact={current} jobId={job.id}/>
   <div className="mt-v4-bottom">
    <div><small>Progress</small><b>{completed}/{v.artifacts.length} deliverable versions</b><small>{drafts>0?" · "+drafts+" edited draft(s) to save":""} · {p.actualWorkHours??0}h worked · deadline Day {p.deadlineDay} · est. Day {estimate?.workDay??s.clock.day}</small></div>
    <Button disabled={completed!==v.artifacts.length||drafts>0} onClick={()=>act(Work.openV4Board)}>
      Review All Deliverables <ArrowRight size={15}/>
    </Button>
   </div>
  </section>}
  {v.step==="board"&&<section className="mt-v4-panel">
   <div className="mt-v4-title"><div><small>DELIVERABLE BOARD</small><h3>Confirm every output</h3><p>Inspect the actual draft and return to Workspace to edit before client review.</p></div><ClipboardCheck size={20}/></div>
   <div className="mt-v4-boards">{v.artifacts.map(a=><div className="mt-v4-artifact" key={a.id}>
    <div><b>{a.title}</b><span>{a.status} · v{a.version} · {a.score}/100</span></div>
    <p>{a.copy}</p>
    <div className="mt-v4-tags">{Object.entries(a.decisions).map(([key,value])=><span key={key}>{key}: {value}</span>)}</div>
    <Button variant="outline" size="sm" disabled={a.status==="approved"} onClick={()=>act(s=>Work.returnV4Workspace(s,a.id))}><PenTool size={14}/> Back & Edit</Button>
   </div>)}</div>
   <Button className="w-full" onClick={()=>{act(Work.submitV4Review);prepareFreelanceDeliverableReview();}}>
    <Send size={15}/> Submit for Client Review
   </Button>
  </section>}
  {v.step==="revision"&&<section className="mt-v4-panel">
   <div className="mt-v4-title"><div><small>CLIENT REVIEW · ROUND {v.reviewRound}/{job.revisions+1}</small><h3>Specific revisions requested</h3></div><RefreshCcw size={20}/></div>
   <p>{p.clientFeedback}</p>
   <div className="mt-v4-boards">{v.artifacts.map(a=><div className="mt-v4-artifact" key={a.id}>
    <div><b>{a.title}</b><span>{a.status==="approved"?"Approved":"Needs revision"}</span></div>
    <p>{a.feedback}</p>
    {a.status==="revise"&&<Button variant="outline" size="sm" onClick={()=>act(s=>Work.returnV4Workspace(s,a.id))}>Edit This Deliverable <ArrowRight size={14}/></Button>}
   </div>)}</div>
   <p className="mt-v4-muted">{reviewItems.length} output(s) need adjustments. Approved outputs remain locked. Saving a revision uses 1 work hour.</p>
  </section>}
  {v.step==="ready"&&<section className="mt-v4-panel">
   <div className="mt-v4-title"><div><small>CLIENT REVIEW FINISHED</small><h3>Final Submit & Payment</h3></div><FileCheck2 size={20}/></div>
   <p>{p.clientFeedback}</p>
   <div className="mt-v4-boards">{v.artifacts.map(a=><div className="mt-v4-artifact" key={a.id}>
    <div><b>{a.title}</b><span>{a.status==="approved"?"Approved":"Accepted as-is"}</span></div><p>{a.feedback}</p>
   </div>)}</div>
   <div className="mt-v4-payment">
    <div><span>Service fee</span><b>{money(fee)}</b></div>
    <div><span>Contractual deduction ({v.deduction}%)</span><b>-{money(fee-amount)}</b></div>
    <div><span>Personal expenses</span><b>-{money(job.outOfPocket)}</b></div>
    <div><span>Net cash credited</span><strong>{money(amount-job.outOfPocket)}</strong></div>
   </div>
   <p className="mt-v4-muted">No earlier deposit was paid. Final Submit records the client-approved payment once and closes this job. The client media budget is never credited to you.</p>
   <Button className="w-full" onClick={()=>act(Work.finalizeV4)}><Wallet size={15}/> Final Submit · Receive {money(amount)}</Button>
  </section>}
  {v.step==="paid"&&<section className="mt-v4-panel">
   <div className="mt-v4-title"><div><small>PROJECT CLOSED · PAID</small><h3><CheckCircle2 size={18}/> Deliverables accepted</h3></div><Wallet size={20}/></div>
   <p>{v.artifacts.length} deliverables completed · overall quality {v.score}/100 · fee received {money(v.paidAmount??0)} · personal expenses {money(job.outOfPocket)}.</p>
   <p>Portfolio updated. Individual deliverable versions remain saved for reference.</p>
   <details><summary>Completed portfolio artifacts</summary>{v.artifacts.map(a=><div className="mt-v4-artifact" key={a.id}><b>{a.title} · v{a.version}</b><p>{a.copy}</p></div>)}</details>
   <Button className="w-full" onClick={()=>act(Campaign.nextClient)}>Return to Job Board <ArrowRight size={16}/></Button>
  </section>}
 </div>;
}

