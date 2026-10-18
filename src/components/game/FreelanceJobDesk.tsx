import {useGame,act} from "@/game/store";
import * as F from "@/game/freelanceJobs";
import * as C from "@/game/campaign";
import {getFreelanceJob} from "@/game/freelanceJobTemplates";
import {money} from "@/game/data";
import {Button} from "@/components/ui/button";
import {BookOpen,CheckCircle2,Clock3,Coins,FileCheck,PenTool,Users} from "lucide-react";

/** One solo work contract, four meaningful steps. Never pretends a content
 * freelancer can buy a nationwide media campaign. */
export function FreelanceJobDesk(){
 const s=useGame(x=>x),c=s.campaign,p=c.freelanceJob,t=getFreelanceJob(p?.templateId);
 if(!p||!t)return null;
 const sc=C.scenarioOf(c),career=F.workload(s);
 const remaining=Math.max(0,t.hours+(p.revisions?4:0)-p.hoursWorked);
 const timing=F.freelanceDeliveryEstimate(s);
 return <div className="mt-gig-desk">
  <header className="mt-gig-head"><div><small>BEDROOM · SOLO FREELANCE WORKSPACE</small><h2>{t.title}</h2><p>{sc.brand} · {sc.industry} · {t.tier==="gig"?"Solo Gig":"Freelance Project"}</p></div><PenTool size={25}/></header>
  <div className="mt-gig-metrics"><div><small>SERVICE FEE</small><b>{money(t.fee)}</b></div><div><small>CLIENT MEDIA</small><b>{money(t.mediaBudget)}</b></div><div><small>EFFORT</small><b>{t.hours} hours</b></div><div><small>DEADLINE</small><b>{t.days} days</b></div></div>
  <p className="mt-gig-note">The media budget belongs to the client, never your personal cash. Performance is graded mainly on agreed deliverables, quality, revisions and timing.</p>
  <div className="mt-gig-steps">{(["Brief","Work","Feedback","Handover"] as const).map((label,i)=>
   <span key={label} className={["brief","work","feedback","done"][i]===p.stage?"active":""}>{i+1}. {label}</span>)}</div>
  {p.stage==="brief"&&<section className="mt-gig-panel">
   <h3>01 · Scope & client discovery</h3>
   <p>{sc.client||sc.summary}</p>
   {sc.aiPlanning?.context&&<div className="mt-gig-context"><b>Gemini · Company context</b><p>{sc.aiPlanning.context}</p></div>}
   <p><strong>Deliverables:</strong> {t.deliverables}</p>
   <p><strong>Acceptance metric:</strong> {t.successMetric}</p>
   <p><strong>Included revisions:</strong> {t.revisions} rounds · <strong>Estimated personal expenses:</strong> {money(t.outOfPocket)}</p>
   <Button className="w-full" onClick={()=>act(F.startSmallJob)}>Accept freelance scope · 20% deposit</Button>
  </section>}
  {p.stage==="work"&&<section className="mt-gig-panel">
    <h3>02 · Complete the deliverables</h3>
    <p>{t.deliverables}. Each action logs four work hours. Better quality takes longer; working fast completes more scope but creates revision risk. You have {F.WEEKLY_CAPACITY} hours of freelance capacity each game week.</p>
    <div className="mt-gig-progress"><span>Hours completed: <b>{p.hoursWorked}/{t.hours+(p.revisions?4:0)}</b></span>
     <span>Real work hours: <b>{p.actualWorkHours??p.hoursWorked}</b> · remaining weekly <b>{Math.max(0,F.WEEKLY_CAPACITY-career.weeklyHours)}</b></span>
     <span>Estimated completion Day <b>{timing?.workDay??s.clock.day}</b> / deadline Day <b>{p.deadlineDay}</b></span></div>
    <div className="mt-gig-choices">
     <Button variant="outline" disabled={career.weeklyHours+4>F.WEEKLY_CAPACITY} onClick={()=>act((x,fx)=>F.doWork(x,fx,"research"))}>Validate evidence · 4h / 4h progress</Button>
     <Button variant="outline" disabled={career.weeklyHours+4>F.WEEKLY_CAPACITY} onClick={()=>act((x,fx)=>F.doWork(x,fx,"quality"))}>Craft for quality · 4h / 4h progress</Button>
     <Button variant="outline" disabled={career.weeklyHours+4>F.WEEKLY_CAPACITY} onClick={()=>act((x,fx)=>F.doWork(x,fx,"speed"))}>Speed up · 4h / 6h progress</Button>
    </div>
    <p className="mt-gig-note">Work-day estimates assume eight productive hours a day within the global weekly turn. Passing End Week still advances the entire game. Speed sacrifices quality; evidence validation is especially useful for audit and research jobs.</p>
    <Button className="w-full" disabled={remaining>0} onClick={()=>act(F.askForReview)}>Send deliverables for client feedback</Button>
   </section>}
  {p.stage==="feedback"&&<section className="mt-gig-panel">
    <h3>03 · Client feedback</h3>
    <div className="mt-gig-context"><b>Client review</b><p>{p.clientFeedback}</p><small>Quality index: {p.quality}/100 · Revisions: {p.revisions}/{t.revisions}</small></div>
    {(p.quality>=68||p.revisions>=t.revisions)?<Button className="w-full" onClick={()=>act(F.deliverSmallJob)}>04 · Handover and send final invoice <FileCheck size={15}/></Button>:
     <Button variant="outline" className="w-full" disabled={p.revisions>=t.revisions} onClick={()=>act(F.reviseSmallJob)}>Apply included revision · 4h</Button>}
    {p.quality<68&&p.revisions>=t.revisions&&<p>Revision limit reached. You may hand over as-is with reduced client satisfaction and a 20% reduction in the remaining fee.</p>}
   </section>}
  {p.stage==="done"&&<section className="mt-gig-panel">
   <h3><CheckCircle2 size={18}/> Deliverables accepted</h3>
   <p>Quality {p.quality}/100 · Agreed service fee {money(p.acceptedFee??t.fee)} · Personal expenses {money(t.outOfPocket)}.</p>
   <p>Modeled handover Day {p.deliveredDay??s.clock.day}. Final invoice is paid after its due date in a future End Week. Returning clients build repeat-business history.</p>
   <Button className="w-full" onClick={()=>act(C.nextClient)}>Find another freelance job</Button>
  </section>}
  <details className="mt-gig-ledger"><summary>Freelancer finances & portfolio</summary>
    <div className="mt-gig-metrics"><div><small>COMPLETED GIGS</small><b>{career.completedGigs}</b></div><div><small>PROJECTS</small><b>{career.completedProjects}</b></div><div><small>POSITIVE REVIEWS</small><b>{career.positiveReviews}</b></div><div><small>REPEAT CLIENTS</small><b>{career.repeatClients}</b></div></div>
    {career.invoices.filter(x=>x.status!=="paid").map(x=><div className="mt-gig-invoice" key={x.id}><span>{x.clientId} · {money(x.amount)} · {x.status} · due Day {x.dueDay}</span>
      {x.status==="late"&&!x.reminded&&<Button size="sm" variant="outline" onClick={()=>act((v,fx)=>F.followUpInvoice(v,fx,x.id))}>Send reminder</Button>}</div>)}
  </details>
 </div>;
}
