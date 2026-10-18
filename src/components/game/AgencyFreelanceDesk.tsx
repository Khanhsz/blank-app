import "@/agency-freelance.css";
import {useEffect,useState} from "react";
import {BriefcaseBusiness,CheckCircle2,Clock3,UserRoundCheck,Wallet,LockKeyhole} from "lucide-react";
import {Button} from "@/components/ui/button";
import {act,useGame} from "@/game/store";
import {money,employeeById} from "@/game/data";
import {CLIENT_BY_ID} from "@/game/clientDatabase";
import {getFreelanceJob} from "@/game/freelanceJobTemplates";
import {ensureFreelanceBoard,applyDefaultFreelanceJob,jobGate,
 FREELANCE_APPLICATION_LIMIT} from "@/game/freelanceMarket";
import {prepareFreelanceApplicationReviews} from "@/game/automaticFreelanceReview";
import {eligibleGigStaff,agencyGigs,acceptAgencyGigOffer,
 reassignAgencyGig,submitAgencyGig,sideGigReceipts,gigRole} from "@/game/agencyFreelance";

/** Agency-side work is separate from the player's bedroom card minigames:
 * the CEO wins and delegates; employees produce V6 card outputs while End Week
 * advances. Review and final submission stay explicit CEO decisions. */
export function AgencyFreelanceDesk(){
 const s=useGame(v=>v),[assigned,setAssigned]=useState<Record<string,string>>({});
 const board=s.freelanceBoard,gigs=agencyGigs(s);
 useEffect(()=>{if(!board)act(v=>{ensureFreelanceBoard(v);});},[!!board]);
 const listed=board?.listings.filter(l=>l.status==="open"&&l.postedWeek===s.clock.week)??[];
 const applications=board?.applications??[];
 const thisWeek=applications.filter(a=>a.week===s.clock.week).length;
 const active=gigs.filter(g=>g.status!=="paid");
 const paid=gigs.filter(g=>g.status==="paid");
 const gigInfo=(id:string)=>getFreelanceJob(id);
 return <div className="mt-agency-gigs">
  <header className="mt-job-market-head">
   <div><small>AGENCY HQ / SIDE GIG REVENUE</small><h2>Freelance Job Board</h2>
    <p>Pitch small Startup & SME jobs to earn extra agency revenue. Your employees do the work. Assign a suitable, available specialist and use End Week to progress their production.</p>
   </div><BriefcaseBusiness size={24}/>
  </header>
  <div className="mt-job-market-stats">
   <div><small>AGENCY CASH</small><b>{money(s.agencyCash)}</b></div>
   <div><small>ACTIVE SIDE GIGS</small><b>{active.length}</b></div>
   <div><small>SIDE GIG RECEIPTS</small><b>{money(sideGigReceipts(s))}</b></div>
   <div><small>APPLICATIONS LEFT</small><b>{Math.max(0,FREELANCE_APPLICATION_LIMIT-thisWeek)}</b></div>
  </div>
  <div className="mt-job-market-unlock"><UserRoundCheck size={16}/><span>Assigned employees must be in your free talent pool, trained for the job and below their actual workload limit. Dedicated client teams remain protected. No manual editing by the CEO is required.</span></div>
  <section className="mt-job-market-applications"><h3>Open Side Gigs · Week {s.clock.week}</h3>
   <div className="mt-job-market-grid">{listed.map(l=>{
    const job=gigInfo(l.templateId),client=CLIENT_BY_ID[l.clientId],existing=applications.find(a=>a.listingId===l.id);
    if(!job||!client)return null;
    const restriction=jobGate(s,job);
    return <article className="mt-job-market-card" key={l.id}>
     <div className="mt-job-market-cardtop"><span>{client.segment.toUpperCase()} · {client.industry}</span><b>{existing?.status?.toUpperCase()??"OPEN"}</b></div>
     <h3>{job.title}</h3><p>{client.brand}</p>
     <div className="mt-job-market-specs">
      <div><small>SERVICE FEE</small><b>{money(job.fee)}</b></div><div><small>DEADLINE</small><b>{job.days} days</b></div>
      <div><small>STAFF ROLE</small><b>{gigRole(job.id)}</b></div><div><small>PRODUCTION HOURS</small><b>{job.hours}h</b></div>
     </div>
     <p className="mt-job-market-scope">{job.deliverables}. Production expenses {money(job.outOfPocket)}; client media budget {money(job.mediaBudget)} is not agency income.</p>
     {!!restriction&&<p className="mt-job-market-locked"><LockKeyhole size={12}/> {restriction}</p>}
     <Button variant="outline" className="w-full" disabled={!!restriction||!!existing||thisWeek>=FREELANCE_APPLICATION_LIMIT}
      onClick={()=>{act((d,fx)=>{applyDefaultFreelanceJob(d,fx,l.id);});prepareFreelanceApplicationReviews();}}>
      {existing?"Application "+existing.status:restriction?"Specialist unavailable":"Apply as Agency"}
     </Button>
    </article>;
   })}</div>
   {!listed.length&&<p>No open listings this week. Use End Week to refresh the public Job Board.</p>}
  </section>
  <section className="mt-job-market-applications"><h3>Applications & Client Offers</h3>
   {!applications.length&&<p>Your agency has not submitted a freelance proposal yet.</p>}
   {[...applications].reverse().slice(0,15).map(a=>{
    const job=gigInfo(a.templateId),client=CLIENT_BY_ID[a.clientId];
    const options=eligibleGigStaff(s,a.templateId);
    const selected=options.includes(assigned[a.id])?assigned[a.id]:options[0]??"";
    return <div className="mt-job-market-app" key={a.id}>
     <b>{client?.brand??a.clientId} · {job?.title??a.templateId}</b>
     <small>{a.status.toUpperCase()} · Agreed bid {money(a.proposedFee)} · proposal quality {a.score.toFixed(1)}/100</small>
     <p>{a.feedback}</p>
     {a.status==="selected"&&<div className="mt-agency-gig-assign">
      <label htmlFor={"sidegig-"+a.id}>Assign specialist</label>
      <select id={"sidegig-"+a.id} value={selected} onChange={e=>setAssigned(v=>({...v,[a.id]:e.target.value}))}>
       {options.length===0&&<option value="">No available matching staff</option>}
       {options.map(id=><option key={id} value={id}>{employeeById(id)?.name??id} · {gigRole(a.templateId)}</option>)}
      </select>
      <Button size="sm" disabled={!selected||s.agencyCash<(job?.outOfPocket??0)}
       onClick={()=>act((d,fx)=>{acceptAgencyGigOffer(d,fx,a.id,selected);})}>Accept & Delegate</Button>
     </div>}
    </div>;
   })}
  </section>
  <section className="mt-job-market-applications"><h3>Employee Delivery Board</h3>
   {!gigs.length&&<p>No staff-operated freelance contracts yet. Apply for a listing, win the offer and assign an employee.</p>}
   {[...gigs].reverse().map(g=>{
    const job=gigInfo(g.templateId),client=CLIENT_BY_ID[g.clientId];
    const left=Math.max(0,g.requiredHours-g.workHours);
    const current=employeeById(g.staffId)?.name??g.staffId;
    const options=eligibleGigStaff(s,g.templateId).filter(id=>id!==g.staffId);
    const gross=g.status==="paid"?Math.round(g.fee*(g.quality<78?.85:1)):g.fee;
    return <article className="mt-agency-gig" key={g.id}>
     <div className="mt-agency-gig-heading"><div><small>{g.status==="paid"?"PAID":"CLIENT DELIVERY"} · {client?.brand??g.clientId}</small><h4>{job?.title}</h4></div>
      <span>{g.status.toUpperCase()}</span></div>
     <p>{g.feedback}</p>
     <div className="mt-agency-gig-metrics">
      <span><UserRoundCheck size={14}/> {current}</span>
      <span><Clock3 size={14}/> {g.status==="paid"?"Finished D"+g.completedDay:g.status==="ready"?"Ready for review":left.toFixed(1)+"h remaining"}</span>
      <span><Wallet size={14}/> {money(gross)} service fee</span>
     </div>
     {(g.status==="working"||g.status==="revision")&&<>
      <div className="mt-agency-gig-progress"><span style={{width:Math.min(100,Math.round(g.workHours/g.requiredHours*100))+"%"}}/></div>
      <small>Deadline D{g.deadlineDay} · Work done {g.workHours.toFixed(1)}/{g.requiredHours}h. Advance End Week to continue.</small>
      {!!options.length&&<details className="mt-agency-gig-reassign"><summary>Reassign this job</summary><div>{options.map(id=><Button size="sm" variant="outline" key={id} onClick={()=>act((d,fx)=>{reassignAgencyGig(d,fx,g.id,id);})}>{employeeById(id)?.name??id}</Button>)}</div></details>}
     </>}
     {g.artifacts.length>0&&<details className="mt-agency-gig-deliverables" open={g.status==="ready"}>
      <summary>Employee Deliverable Board · {g.artifacts.length} outputs · Quality {g.quality}/100</summary>
      {g.artifacts.map(a=><div key={a.id} className="mt-v4-artifact"><b>{a.title} · v{a.version}</b><p style={{whiteSpace:"pre-line"}}>{a.copy}</p><small>{a.score}/100 · {a.status}</small></div>)}
     </details>}
     {g.status==="ready"&&<Button className="w-full" onClick={()=>act((d,fx)=>{submitAgencyGig(d,fx,g.id);})}>
      <CheckCircle2 size={15}/> Submit to Client Review
     </Button>}
     {g.status==="paid"&&<small>Agency settlement received {money(gross)}. Expenses {money(g.expenses)}; attributed staff labor {money(Math.round(g.laborCost))}. No duplicate payroll deduction.</small>}
    </article>;
   })}
  </section>
  {!!paid.length&&<p className="mt-job-market-footer">Completed {paid.length} staff-operated side gigs. Net contract contribution excludes base office overhead; salaries are already paid by the existing Agency payroll.</p>}
 </div>;
}
