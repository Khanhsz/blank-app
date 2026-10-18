import {useState} from "react";
import {ArrowRight,Check,Search,Users} from "lucide-react";
import {Button} from "@/components/ui/button";
import {act,useGame} from "@/game/store";
import {money,employees} from "@/game/data";
import * as C from "@/game/ceo";
import * as A from "@/game/acquisition";
import {ClientCatalog} from "./ClientCatalog";
import {qualificationQuote} from "@/game/pricingAdvisor";
import {tenderFor} from "@/game/rivalAI";
import type {Lead,ProposalPlan,PriceTier} from "@/game/state";

type View="discover"|"pipeline"|"deal";
const STAGES=["Prospecting","Discovery","Qualified","Proposal","Negotiation","Won","Lost"];
function SelectTile({on,disabled,label,detail,click}:{on:boolean;disabled?:boolean;label:string;detail?:string;click:()=>void}){
 return <button type="button" disabled={disabled} aria-pressed={on} onClick={click} className={"mt-growth-option "+(on?"selected":"")}><span><b>{label}</b><small>{detail}</small></span>{on&&<Check size={15}/>}</button>;
}
function Stats({lead}:{lead:Lead}){
 const s=useGame(x=>x),p=lead.proposal??A.defaultProposal(lead),f=A.opportunityForecast(s,lead,lead.pricingAdvice?.recommendedFee??lead.fee,p);
 return <div className="mt-growth-forecast">
  <b>Delivery Feasibility · Simulated Forecast</b>
  <div className="mt-growth-kpis"><div><small>FEE ESTIMATE</small><b>{money(lead.pricingAdvice?.recommendedFee??lead.fee)}</b></div><div><small>PROJECT COST</small><b>{money(f.cost)}</b></div><div><small>MARGIN</small><b>{money(f.margin)}</b></div><div><small>TEAM COVERAGE</small><b>{f.team.coverage}%</b></div></div>
  <p>Risk index {f.risk}/95 · Estimated chance {A.estimatedWinProbability(s,lead)}%. {f.team.missing.length?"Missing roles: "+f.team.missing.join(", ")+". Outsourcing is included in costs.":"Skill coverage looks sufficient; staff are not committed yet."}</p>
 </div>;
}
function Proposal({lead,locked}:{lead:Lead;locked:boolean}){
 const s=useGame(x=>x),p=lead.proposal??A.defaultProposal(lead),available=A.projectedTeam(s,lead).selected;
 const update=(patch:Partial<ProposalPlan>)=>act((d,fx)=>A.updateProposal(d,fx,lead.id,patch));
 return <div className="mt-growth-flow">
  <h4>01 · Strategy</h4>
  <div className="mt-growth-grid">{A.PROPOSAL_APPROACHES.map(id=><SelectTile key={id} on={p.approach===id} disabled={locked} label={id==="cost"?"Value & Cost":id} detail={id==="creative"?"Brand differentiation":id==="performance"?"Measurable growth":id==="strategy"?"Diagnose the market barrier":"Efficient, focused scope"} click={()=>update({approach:id})}/>)}</div>
  <h4>02 · Creative direction</h4>
  <div className="mt-growth-grid">{A.PROPOSAL_CONCEPTS.map(id=><SelectTile key={id} on={p.concept===id} disabled={locked} label={id} detail={id==="proof"?"Demonstrate credibility":id==="story"?"Human and brand storytelling":"Action and conversion"} click={()=>update({concept:id})}/>)}</div>
  <h4>03 · Delivery model</h4>
  <div className="mt-growth-grid">{A.PROPOSAL_DELIVERY.map(id=><SelectTile key={id} on={p.delivery===id} disabled={locked} label={id} detail={id==="lean"?"Small core team":id==="balanced"?"Integrated squad":"Specialist quality first"} click={()=>update({delivery:id})}/>)}</div>
  <details className="mt-growth-talents"><summary>Proposed specialists · no staff lock until contract</summary>
   {available.length?available.map(id=><label key={id}><input type="checkbox" disabled={locked} checked={p.selectedTalentIds.includes(id)} onChange={e=>update({selectedTalentIds:e.target.checked?[...p.selectedTalentIds,id]:p.selectedTalentIds.filter(x=>x!==id)})}/>{employees.find(e=>e.id===id)?.name??id}</label>):<p>No available staff. Plan for hires or outsource after signing.</p>}
   <p>With no individual selection, the forecast considers all currently available employees.</p>
  </details><Stats lead={lead}/>
 </div>;
}
function DealView({id,back,teams}:{id:string|null;back:()=>void;teams:()=>void}){
 const s=useGame(x=>x),c=s.ceo!,l=c.leads.find(x=>x.id===id);
 if(!l)return <p className="mt-growth-empty">Choose a client from Pipeline to continue.</p>;
 const p=c.pitch?.id===l.id?c.pitch:null,n=c.negotiation?.id===l.id?c.negotiation:null;
 const stage=A.opportunityStage(l),relation=A.relationship(c,l);
 const tender=tenderFor(c,l.id);
 return <div className="mt-growth-deal">
  <Button variant="outline" size="sm" onClick={back}>← Back to Pipeline</Button>
  <div className="mt-growth-dealhead"><div><small>{stage.toUpperCase()} · {l.source??"inbound"}</small><h3>{l.brand}</h3><p>{l.industry} · {l.segment??l.businessSize??"client"}</p></div><b>Trust {relation.trust}/100</b></div>
  <div className="mt-growth-kpis"><div><small>MEDIA</small><b>{money(l.value)}</b></div><div><small>SERVICE FEE</small><b>{money(l.fee)}</b></div><div><small>WIN ESTIMATE</small><b>{A.estimatedWinProbability(s,l)}%</b></div><div><small>DEADLINE</small><b>{tender?.status==="open"?Math.max(0,tender.deadline-c.day)+"d":"—"}</b></div></div>
  {l.source==="referral"&&<p className="mt-growth-muted">Referral from {l.referralFrom} · this is a simulated opportunity.</p>}
  {l.status==="prospecting"&&<section className="mt-growth-flow">
   <h4>Outbound Outreach</h4><p>Client has not invited the agency to pitch. First earn a discovery conversation.</p>
   <div className="mt-growth-grid">
    <SelectTile on={false} label="Personal email" detail="Free · reputation matters" click={()=>act((d,fx)=>A.makeOutreach(d,fx,l.id,"personal"))}/>
    <SelectTile on={false} label="Network intro" detail="260k · relationship advantage" click={()=>act((d,fx)=>A.makeOutreach(d,fx,l.id,"network"))}/>
    <SelectTile on={false} label="Share insight" detail="180k · demonstrate expertise" click={()=>act((d,fx)=>A.makeOutreach(d,fx,l.id,"insight"))}/>
   </div>
  </section>}
  {["new","renewal"].includes(l.status)&&<section className="mt-growth-flow"><h4>{l.source==="referral"?"Warm Referral":"Inbound Opportunity"}</h4>
   <p>Learn the business need before building a proposal.</p><Button onClick={()=>act((d,fx)=>A.openDiscovery(d,fx,l.id))}>Begin Client Discovery <ArrowRight size={15}/></Button></section>}
  {l.status==="discovery"&&<section className="mt-growth-flow">
   <h4>Discovery · Need / Budget / Authority / Timing</h4>
   <p>Ask at least three questions; then make an explicit Go/No-Go decision. Basic discovery is free.</p>
   {A.DISCOVERY_QUESTIONS.map(q=><div key={q.id} className="mt-growth-question">
    <SelectTile on={!!l.discovery?.answered.includes(q.id)} label={q.label} detail={q.why} click={()=>act((d,fx)=>A.askDiscovery(d,fx,l.id,q.id))}/>
    {l.discovery?.notes[q.id]&&<p className="mt-growth-answer">{l.discovery.notes[q.id]}</p>}
   </div>)}
   <p>Discovery confidence {l.discovery?.confidence??0}% — reflects evidence coverage, not certainty.</p>
   <Button size="sm" variant="outline" disabled={!!l.qualifyFeePaid||s.agencyCash<qualificationQuote(s,l).fee} onClick={()=>act((d,fx)=>A.deepenDiscovery(d,fx,l.id))}>Optional deeper research · {money(qualificationQuote(s,l).fee)}</Button>
   <Stats lead={l}/>
   <div className="mt-growth-buttons">
    <Button disabled={(l.discovery?.answered.length??0)<3} onClick={()=>act((d,fx)=>A.decideOpportunity(d,fx,l.id,"pursue"))}>Pursue · Go</Button>
    <Button variant="outline" disabled={(l.discovery?.answered.length??0)<3} onClick={()=>act((d,fx)=>A.decideOpportunity(d,fx,l.id,"nurture"))}>Nurture</Button>
    <Button variant="outline" disabled={(l.discovery?.answered.length??0)<3} onClick={()=>act((d,fx)=>A.decideOpportunity(d,fx,l.id,"no-bid"))}>No Bid</Button>
   </div>
  </section>}
  {l.status==="nurturing"&&<section className="mt-growth-flow"><h4>Relationship Nurturing</h4>
   <p>Follow-up due Day {l.nurtureUntil}. A new reply is not guaranteed before the next planned contact.</p>
   <div className="mt-growth-buttons">
    {([["check-in","Helpful check-in"],["case-study","Relevant case study · 200k"],["intro","Warm introduction · 120k"]] as const).map(([key,name])=>
      <Button key={key} variant="outline" disabled={c.day<(l.nurtureUntil??0)} onClick={()=>act((d,fx)=>A.nurtureRelationship(d,fx,l.id,key))}>{name}</Button>)}
   </div></section>}
  {["qualified","pitch","shortlisted","pitch_won"].includes(l.status)&&<section className="mt-growth-flow">
   <h4>Proposal Builder & Competitive Pitch</h4>
   {!p&&l.status==="qualified"&&<>
    <Proposal lead={l} locked={false}/>
    <Button disabled={s.agencyCash<500000||A.activeDealCount(c)>=A.activeDealLimit(s)} onClick={()=>act((d,fx)=>{A.updateProposal(d,fx,l.id,{});C.startPitch(d,fx,l.id);})}>Reserve Pitch Slot · 500k <ArrowRight size={15}/></Button>
    <p>Active proposal slots: {A.activeDealCount(c)}/{A.activeDealLimit(s)}. Multiple deals can progress independently.</p>
   </>}
   {p?.step==="prepare"&&<>
    <Proposal lead={l} locked={false}/>
    <h4>04 · Commercial Offer</h4>
    <p>Choose a cost-backed service fee; campaign media spend is not agency revenue.</p>
    <div className="mt-growth-grid">{(["competitive","balanced","premium"] as PriceTier[]).map(t=><SelectTile key={t} on={p.priceTier===t} label={t} detail={money(l.pricingAdvice?.options[t]??l.fee)} click={()=>act((d,fx)=>C.applySuggestedFee(d,fx,t))}/>)}</div>
    <Button disabled={s.agencyCash<600000} onClick={()=>act(C.presentPitch)}>Submit priced pitch · 600k</Button>
   </>}
   {p?.step==="objection"&&<>
    <p className="mt-growth-objection"><b>Client objection:</b> {p.objection}</p>
    <p>Quoted service fee: {money(C.pitchFee(l,p))}. Defend the business case.</p>
    <div className="mt-growth-grid">{([["evidence","Present evidence"],["creative","Defend creative"],["cut","Concede fee"],["promise","KPI commitment"]] as const).map(([key,label])=>
      <Button key={key} variant="outline" onClick={()=>act(d=>C.answerPitch(d,key))}>{label}</Button>)}</div>
   </>}
   {p?.step==="revision"&&<>
    <p className="mt-growth-objection"><b>Shortlisted:</b> {p.objection}</p>
    <Proposal lead={l} locked={false}/>
    <div className="mt-growth-buttons"><Button disabled={s.agencyCash<250000} onClick={()=>act((d,fx)=>C.submitPitchRevision(d,fx,"improve"))}>Resubmit revised pitch · 250k</Button>
     <Button variant="outline" onClick={()=>act((d,fx)=>C.submitPitchRevision(d,fx,"withdraw"))}>Withdraw</Button></div>
   </>}
   {p?.step==="result"&&p.result&&<>
    <p className="mt-growth-result"><b>{p.result.winner==="player"?"Pitch Won":"Pitch Lost"}</b> · {p.result.explanation}</p>
    <p>Your score {p.result.playerScore} / {p.result.topRival} {p.result.topScore}</p>
    {p.result.winner==="player"?<Button onClick={()=>act(C.beginNegotiation)}>Enter Negotiation</Button>:<Button variant="outline" onClick={()=>{act(C.closePitch);back();}}>Close Result</Button>}
   </>}
  </section>}
  {l.status==="negotiating"&&n&&<section className="mt-growth-flow"><h4>Negotiation · Round {n.round}</h4>
   <div className="mt-growth-kpis"><div><small>FEE</small><b>{money(n.fee)}</b></div><div><small>MARGIN</small><b>{money(C.terms(s,n,l).margin)}</b></div><div><small>SIGN PROB.</small><b>{C.terms(s,n,l).prob}%</b></div><div><small>DURATION</small><b>{n.deadline}d</b></div></div>
   <p>Scope {n.scope} · {l.contractType==="annual-retainer"?"Annual service fee 100% paid at signing":"Advance "+n.advance+"%"} · KPI bonus {money(n.bonus)}</p>
   {l.contractType==="annual-retainer"&&<details><summary>Annual marketing service agreement</summary><p>365-day engagement; annual service fee and separate media budget; monthly KPI reporting, scope/deliverables, confidentiality, client ownership of approved paid creative, 30-day termination notice, and Fortune top-10 category exclusivity.</p></details>}
   {n.notes.slice(-3).map((note,i)=><p className="mt-growth-answer" key={i}>{note}</p>)}
   {n.status==="open"?<div className="mt-growth-grid">{([["maintain","Hold Terms"],["discount","Fee −9%"],["scope","Reduce Scope"],["bonus","KPI Bonus"],...(l.contractType==="annual-retainer"?[]:[["advance","Lower Advance"],["deadline","Add 5 Days"]]),...(n.counter?[["accept","Accept Counter"] as const]:[]),["walk","Walk Away"]] as [string,string][]).map(([key,label])=>
    <Button key={key} size="sm" variant="outline" onClick={()=>act((d,fx)=>C.counter(d,fx,key))}>{label}</Button>)}</div>:<Button variant="outline" onClick={()=>act(C.closeNegotiation)}>Close ({n.status})</Button>}
  </section>}
  {l.status==="signed"&&<section className="mt-growth-flow"><h4>Contract Signed</h4>
   {l.contractType==="annual-retainer"&&<p><b>365-day annual retainer · PAID IN FULL.</b> Media budget is separate and tracked monthly. See Client Team for delivery and reporting.</p>}
   <p>Build the client's dedicated campaign team. Staff cannot serve two clients simultaneously.</p><Button onClick={teams}>Open Client Teams <Users size={15}/></Button></section>}
  {["declined","lost"].includes(l.status)&&<p className="mt-growth-result">Opportunity closed. History remains available in CRM; no client team has been reserved.</p>}
  <details className="mt-growth-relationship"><summary>CRM Relationship History · {relation.wins} wins, {relation.referrals} referrals</summary>
   {relation.notes.length?relation.notes.slice(0,8).map((text,i)=><p key={i}>• {text}</p>):<p>No prior client history recorded.</p>}
  </details>
 </div>;
}
export function GrowthDesk({onTeams}:{onTeams:()=>void}){
 const s=useGame(x=>x),c=s.ceo!;
 const [view,setView]=useState<View>(c.activeDealId?"deal":"pipeline"),[stage,setStage]=useState("Open"),[query,setQuery]=useState("");
 const [current,setCurrent]=useState<string|null>(c.activeDealId??null),[page,setPage]=useState(0);
 const open=c.leads.filter(l=>!["signed","lost","declined"].includes(l.status));
 const matches=c.leads.filter(l=>(stage==="Open"?!["signed","lost","declined"].includes(l.status):stage==="All"||A.opportunityStage(l)===stage)&&l.brand.toLowerCase().includes(query.toLowerCase()));
 const ordered=[...matches].sort((a,b)=>{const da=tenderFor(c,a.id),db=tenderFor(c,b.id);return (da?.status==="open"?da.deadline:Infinity)-(db?.status==="open"?db.deadline:Infinity)||b.relationship-a.relationship;});
 const visible=ordered.slice(page*12,(page+1)*12);
 const select=(id:string)=>{act(d=>A.focusDeal(d,id));setCurrent(id);setView("deal");};
 return <div className="mt-growth-desk">
  <header className="mt-growth-header"><div><small>BUSINESS DEVELOPMENT · CLIENT ACQUISITION V2</small><h2>Growth Desk</h2><p>Discover clients, evaluate real opportunities and win contracts. Dedicated teams form only after signing.</p></div></header>
  <div className="mt-growth-tabs" role="tablist" aria-label="Business development">
   {([["discover","Discover"],["pipeline","Pipeline"],["deal","Deal Room"]] as const).map(([id,label])=>
    <button key={id} type="button" role="tab" aria-selected={view===id} className={view===id?"active":""} onClick={()=>setView(id)}>{label}</button>)}
  </div>
  {view==="discover"&&<ClientCatalog mode="agency" onSelected={()=>{setStage("Open");setPage(0);setView("pipeline");}}/>}
  {view==="pipeline"&&<>
   <div className="mt-growth-kpis">
    <div><small>OPEN DEALS</small><b>{open.length}</b></div>
    <div><small>EXPECTED FEE VALUE</small><b>{money(A.expectedPipelineValue(s))}</b></div>
    <div><small>PITCH SLOTS</small><b>{A.activeDealCount(c)}/{A.activeDealLimit(s)}</b></div>
    <div><small>SIGNED</small><b>{c.leads.filter(l=>l.status==="signed").length}</b></div>
   </div>
   <p className="mt-growth-muted">Pipeline value is probability-weighted estimated service fees, not recognized revenue or cash.</p>
   <div className="mt-growth-filters"><label><Search size={16}/><input aria-label="Find deal" placeholder="Search client" value={query} onChange={e=>{setQuery(e.target.value);setPage(0);}}/></label>
    <select aria-label="Filter pipeline stage" value={stage} onChange={e=>{setStage(e.target.value);setPage(0);}}><option value="Open">Open</option><option value="All">All</option>{STAGES.map(x=><option key={x} value={x}>{x}</option>)}</select>
    <Button variant="outline" onClick={()=>setView("discover")}>Find Clients</Button>
   </div>
   <div className="mt-growth-stagebar">{STAGES.map(x=><button type="button" key={x} aria-pressed={stage===x} onClick={()=>{setStage(x);setPage(0);}}><b>{c.leads.filter(l=>A.opportunityStage(l)===x).length}</b><span>{x}</span></button>)}</div>
   <div className="mt-growth-cards">{visible.length?visible.map(l=>{
    const t=tenderFor(c,l.id),remaining=t?.status==="open"?Math.max(0,t.deadline-c.day):null;
    return <article className="mt-growth-card" key={l.id}><div><b>{l.brand}</b><small>{A.opportunityStage(l)}</small></div>
      <p>{l.industry} · {l.segment??l.businessSize??"Client"} · {l.source??"inbound"}</p>
      <div className="mt-growth-card-metrics"><span>Fee {money(l.fee)}</span><span>Win est. {A.estimatedWinProbability(s,l)}%</span>{remaining!==null&&<span>{remaining}d until tender closes</span>}</div>
      <div><small>{l.status==="prospecting"?"Next: Outreach":l.status==="discovery"?"Next: Discovery":l.status==="nurturing"?"Next: Follow-up":l.status==="qualified"?"Next: Proposal":"Manage opportunity"}</small>
       <Button size="sm" variant="outline" onClick={()=>select(l.id)}>Open Deal <ArrowRight size={14}/></Button></div>
     </article>;
    }):<p className="mt-growth-empty">No deals match these filters. Try Discover to find a new client.</p>}</div>
    <div className="mt-growth-pages"><Button size="sm" variant="outline" disabled={page===0} onClick={()=>setPage(x=>x-1)}>Previous</Button><span>{ordered.length} matching deals · Page {page+1}</span><Button size="sm" variant="outline" disabled={(page+1)*12>=ordered.length} onClick={()=>setPage(x=>x+1)}>Next</Button></div>
  </>}
  {view==="deal"&&<DealView id={current??c.activeDealId??null} back={()=>setView("pipeline")} teams={onTeams}/>}
 </div>;
}
