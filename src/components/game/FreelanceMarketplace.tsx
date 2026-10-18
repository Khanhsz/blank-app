import {useEffect,useState} from "react";
import {ArrowRight,BriefcaseBusiness,CheckCircle2,LockKeyhole,Users} from "lucide-react";
import {Button} from "@/components/ui/button";
import {act,useGame} from "@/game/store";
import {money} from "@/game/data";
import {CLIENT_BY_ID} from "@/game/clientDatabase";
import {getFreelanceJob} from "@/game/freelanceJobTemplates";
import {workload} from "@/game/freelanceJobs";
import * as Market from "@/game/freelanceMarket";
import {chooseFreelanceClient} from "@/game/campaign";
import type {FreelanceBidApproach,FreelanceBidPrice} from "@/game/state";

/** The only client acquisition surface for Bedroom. NPC selection uses
 * deterministic saved application records, not Gemini-generated winners. */
export function FreelanceMarketplace({onSelected}:{onSelected?:()=>void}){
 const game=useGame(s=>s),board=game.freelanceBoard;
 const [active,setActive]=useState<string|null>(null);
 const [approach,setApproach]=useState<FreelanceBidApproach>("creative");
 const [price,setPrice]=useState<FreelanceBidPrice>("standard");
 useEffect(()=>{if(!board)act(d=>{Market.ensureFreelanceBoard(d);});},[!!board]);
 const activeListings=board?.listings.filter(l=>l.postedWeek===game.clock.week&&l.status==="open")??[];
 const visibleListings=activeListings.filter(l=>!!CLIENT_BY_ID[l.clientId]&&!!getFreelanceJob(l.templateId));
 const selected=activeListings.find(l=>l.id===active);
 const selectedTemplate=getFreelanceJob(selected?.templateId);
 const estimate=selected&&selectedTemplate?Market.winEstimate(game,selected,approach,price):null;
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
   <div><small>AVAILABLE WORK HOURS</small><b>{Math.max(0,28-career.weeklyHours)}</b></div>
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
    return <article key={l.id} className={"mt-job-market-card "+(active===l.id?"chosen":"")}>
     <div className="mt-job-market-cardtop"><span>{c.segment==="sme"?"SME":"STARTUP"} · {c.industry}</span>
      {application?<b>{application.status.toUpperCase()}</b>:locked?<b className="locked"><LockKeyhole size={12}/> LOCKED</b>:<b>OPEN</b>}</div>
     <h3>{t.title}</h3><p>{c.brand}</p>
     <div className="mt-job-market-specs">
      <div><small>SERVICE FEE</small><b>{money(t.fee)}</b></div>
      <div><small>DEADLINE</small><b>{t.days} days</b></div>
      <div><small>DELIVERABLES</small><b>{t.hours}h effort</b></div>
      <div><small>APPLICANTS</small><b>{l.applicantIds.length} NPCs</b></div>
     </div>
     <p className="mt-job-market-scope">{t.deliverables}. {t.revisions} included revision{t.revisions!==1?"s":""}. {t.mediaBudget>0?"Client-owned media: "+money(t.mediaBudget)+".":"No client media spend."}</p>
     {locked&&<p className="mt-job-market-locked">{locked}</p>}
     <Button className="w-full" size="sm" variant="outline" disabled={!!locked||!!application||game.campaign.phase!=="brief"}
       onClick={()=>{setActive(l.id);setApproach("creative");setPrice("standard");}}>
       {application?"Application "+application.status:locked?"Locked — "+(game.reputation<=30&&Market.isHighBudgetJob(t)?"Rep 31":"Portfolio"):"Prepare Application"} <ArrowRight size={14}/>
     </Button>
    </article>;
   })}
  </div>
  {!visibleListings.length&&<p className="mt-job-market-empty">No job listings this week. New opportunities appear after End Week.</p>}
  {selected&&selectedTemplate&&<section className="mt-job-market-apply">
   <div className="mt-job-market-applyhead"><div><small>APPLICATION PREVIEW · NO CONTRACT YET</small><h3>{CLIENT_BY_ID[selected.clientId].brand} · {selectedTemplate.title}</h3></div>
    <Button size="sm" variant="outline" onClick={()=>setActive(null)}>Close</Button></div>
   <p>Choose a proposal approach and fee. The client will evaluate applicants at the next End Week. Each application uses one work hour, not cash.</p>
   <div className="mt-job-market-choices"><label><span>Approach</span><select aria-label="Application strategy" value={approach} onChange={e=>setApproach(e.target.value as FreelanceBidApproach)}>
    <option value="creative">Creative direction</option><option value="performance">Performance & measurement</option>
    <option value="research">Research-led proposal</option><option value="value">Cost-efficient delivery</option></select></label>
    <label><span>Fee offer</span><select aria-label="Application fee" value={price} onChange={e=>setPrice(e.target.value as FreelanceBidPrice)}>
     <option value="competitive">Competitive · {money(Market.bidFee(selectedTemplate,"competitive"))}</option>
     <option value="standard">Standard · {money(Market.bidFee(selectedTemplate,"standard"))}</option>
     <option value="premium">Premium · {money(Market.bidFee(selectedTemplate,"premium"))}</option></select></label></div>
   {estimate&&<div className="mt-job-market-estimate">
    <div><small>APPLICATION FIT</small><b>{estimate.score.toFixed(0)}/100</b></div>
    <div><small>ESTIMATED WIN CHANCE</small><b>{estimate.probability}%</b></div>
    <div><small>OTHER APPLICANTS</small><b>{selected.applicantIds.length}</b></div>
   </div>}
   <Button className="w-full" disabled={appliedThisWeek>=Market.FREELANCE_APPLICATION_LIMIT||career.weeklyHours+1>28||!!applications.find(a=>a.listingId===selected.id)}
    onClick={()=>{act((s,fx)=>Market.applyFreelanceJob(s,fx,selected.id,approach,price));setActive(null);}}>
    Submit Application · 1 work hour
   </Button>
   <small>Selection is deterministic and recorded when the listing closes. Client media never becomes personal income.</small>
  </section>}
  <section className="mt-job-market-applications"><h3>My Applications & Offers</h3>
   {!applications.length&&<p>No applications yet. Choose a Starter Gig above and submit your first proposal.</p>}
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
