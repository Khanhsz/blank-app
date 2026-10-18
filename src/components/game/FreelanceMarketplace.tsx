import {useEffect} from "react";
import {BriefcaseBusiness,CheckCircle2,LockKeyhole,Users} from "lucide-react";
import {Button} from "@/components/ui/button";
import {act,useGame} from "@/game/store";
import {money} from "@/game/data";
import {CLIENT_BY_ID} from "@/game/clientDatabase";
import {getFreelanceJob} from "@/game/freelanceJobTemplates";
import {workload,WEEKLY_CAPACITY} from "@/game/freelanceJobs";
import * as Market from "@/game/freelanceMarket";
import {prepareFreelanceApplicationReviews} from "@/game/automaticFreelanceReview";
import {chooseFreelanceClient} from "@/game/campaign";

/** The only client acquisition surface for Bedroom. NPC selection uses
 * deterministic saved application records, not Gemini-generated winners. */
export function FreelanceMarketplace({onSelected}:{onSelected?:()=>void}){
 const game=useGame(s=>s),board=game.freelanceBoard;
 useEffect(()=>{if(!board)act(d=>{Market.ensureFreelanceBoard(d);});},[!!board]);
 const activeListings=board?.listings.filter(l=>l.postedWeek===game.clock.week&&l.status==="open")??[];
 const visibleListings=activeListings.filter(l=>!!CLIENT_BY_ID[l.clientId]&&!!getFreelanceJob(l.templateId));
 const applications=board?.applications??[];
 const appliedThisWeek=applications.filter(a=>a.week===game.clock.week).length;
 const career=game.freelanceCareer??workload(game);
 return <div className="mt-job-market">
  <header className="mt-job-market-head"><div><small>BEDROOM · FREELANCE CAREER</small><h2>Job Board</h2>
   <p>One marketplace for Startup and SME work. Apply and compete with other freelancers. High-budget listings require Reputation 31 or higher.</p></div>
   <BriefcaseBusiness size={26}/>
  </header>
  <div className="mt-job-market-stats">
   <div><small>YOUR REPUTATION</small><b>{game.reputation}</b></div>
   <div><small>OPEN JOBS THIS WEEK</small><b>{activeListings.length}</b></div>
   <div><small>APPLICATIONS LEFT</small><b>{Math.max(0,Market.FREELANCE_APPLICATION_LIMIT-appliedThisWeek)}</b></div>
   <div><small>AVAILABLE WORK HOURS</small><b>{Math.max(0,WEEKLY_CAPACITY-career.weeklyHours)}</b></div>
  </div>
  <div className="mt-job-market-unlock">
   {game.reputation>30?<><CheckCircle2 size={16}/><span>High-budget applications unlocked. Skill and portfolio requirements still apply.</span></>:
    <><LockKeyhole size={16}/><span>High-budget jobs are visible but locked at Rep ≤30. Finish smaller jobs to reach <b>Rep 31</b>.</span></>}
  </div>
  <div className="mt-job-market-grid">
   {visibleListings.map(l=>{
    const c=CLIENT_BY_ID[l.clientId],t=getFreelanceJob(l.templateId)!;
    const locked=Market.jobGate(game,t);
    const application=applications.find(a=>a.listingId===l.id);
    return <article key={l.id} className="mt-job-market-card">
     <div className="mt-job-market-cardtop"><span>{c.segment==="sme"?"SME":"STARTUP"} · {c.industry}</span>
      {application?<b>{application.status.toUpperCase()}</b>:locked?<b className="locked"><LockKeyhole size={12}/> LOCKED</b>:<b>OPEN</b>}</div>
     <h3>{t.title}</h3><p>{c.brand} · {t.tier==="gig"?"Starter":t.tier==="project"?"Intermediate":"Advanced"} scope</p>
     <div className="mt-job-market-specs">
      <div><small>SERVICE FEE</small><b>{money(t.fee)}</b></div>
      <div><small>DEADLINE</small><b>{t.days} days</b></div>
      <div><small>DELIVERABLES</small><b>{t.deliverables}</b></div>
      <div><small>APPLICANTS</small><b>{l.applicantIds.length} NPCs</b></div>
     </div>
     <p className="mt-job-market-scope">{t.deliverables}. {t.revisions} included revision{t.revisions!==1?"s":""}. {t.mediaBudget>0?"Client-owned media: "+money(t.mediaBudget)+".":"No client media spend."}</p>
     {locked&&<p className="mt-job-market-locked">{locked}</p>}
     <Button className="w-full" size="sm" variant="outline"
       disabled={!!locked||!!application||game.campaign.phase!=="brief"||appliedThisWeek>=Market.FREELANCE_APPLICATION_LIMIT||career.weeklyHours+Market.APPLICATION_HOURS>WEEKLY_CAPACITY}
       onClick={()=>{act((s,fx)=>{Market.applyDefaultFreelanceJob(s,fx,l.id);});prepareFreelanceApplicationReviews();}}>
       {application?"Application "+application.status:locked?"Locked — "+(game.reputation<=30&&Market.isHighBudgetJob(t)?"Rep 31":"Portfolio"):"Apply Job"}
     </Button>
     {application&&<div className="mt-job-market-app" aria-live="polite">
       <small>{application.status==="pending"?"AI REVIEW IN PROGRESS":application.status==="selected"?"OFFER READY":application.status==="rejected"?"APPLICATION CLOSED":application.status.toUpperCase()}</small>
       <p>{application.feedback}</p>
       {application.status==="selected"&&<div className="mt-job-market-offer">
        <Button size="sm" disabled={game.campaign.phase!=="brief"||!!game.campaign.catalogClientId}
         onClick={()=>{
          let accepted=false;
          act((d,fx)=>{accepted=Market.acceptFreelanceOffer(d,fx,application.id,chooseFreelanceClient);});
          if(accepted)onSelected?.();
         }}>Accept Offer</Button>
        <Button size="sm" variant="outline"
         onClick={()=>act(d=>{Market.declineFreelanceOffer(d,application.id);})}>Decline</Button>
       </div>}
     </div>}
     {!locked&&!application&&<p className="mt-job-market-scope">Apply with a tailored approach and the listed fee · 1 work hour. AI reviews the application immediately.</p>}
    </article>;
   })}
  </div>
  {!visibleListings.length&&<p className="mt-job-market-empty">No job listings this week. New opportunities appear after End Week.</p>}

  <section className="mt-job-market-applications"><h3>Completed Freelance Portfolio</h3>
   {(career.portfolio??[]).length===0?<p>Approved jobs will appear here with their saved deliverables and final payment.</p>:
    [...(career.portfolio??[])].reverse().map(item=><details key={item.id} className="mt-v4-artifact">
     <summary><b>{item.client} · {getFreelanceJob(item.jobType)?.title??item.jobType}</b> · Earned {money(item.earned)} · Quality {item.quality}/100</summary>
     <p>Completed Day {item.completedDay}. {item.feedback}</p>
     {item.artifacts.map(a=><div key={a.id} className="mt-v4-artifact"><b>{a.title} · v{a.version}</b><p style={{whiteSpace:"pre-line"}}>{a.copy}</p></div>)}
    </details>)}
  </section>
  <section className="mt-job-market-applications"><h3>My Applications & Offers</h3>
   {!applications.length&&<p>No applications yet. Choose an available job above and tap Apply Job.</p>}
   {[...applications].reverse().slice(0,12).map(a=><div className="mt-job-market-app" key={a.id}>
    <div><b>{CLIENT_BY_ID[a.clientId]?.brand??"Client"} · {getFreelanceJob(a.templateId)?.title}</b>
     <small>{a.status.toUpperCase()} · Your bid {money(a.proposedFee)} · score {a.score.toFixed(1)}/100</small>
     <p>{a.feedback}</p></div>
    {a.status==="selected"&&<div className="mt-job-market-offer">
      <Button size="sm" disabled={game.campaign.phase!=="brief"||!!game.campaign.catalogClientId} onClick={()=>{
        let accepted=false;
        act((d,fx)=>{accepted=Market.acceptFreelanceOffer(d,fx,a.id,chooseFreelanceClient);});
        if(accepted)onSelected?.();
      }}>Accept Offer & Request Gemini Brief</Button>
      <Button size="sm" variant="outline" onClick={()=>act(d=>{Market.declineFreelanceOffer(d,a.id);})}>Decline</Button>
    </div>}
   </div>)}
  </section>
  <p className="mt-job-market-footer"><Users size={15}/> Startup and SME jobs share one board; new listings arrive after End Week. Outcomes use saved NPC candidates, portfolio and proposal data. Big Corp contracts remain exclusive to Agency Growth Desk.</p>
 </div>;
}
