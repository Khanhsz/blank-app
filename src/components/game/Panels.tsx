import { useState } from "react";
import {BriefcaseBusiness,Coins,FlaskConical,Target,Clapperboard,ChartNoAxesCombined,Handshake,Users,FileText,Activity,ShieldCheck,Check} from "lucide-react";
import {AnimatedGauge,BarComparison,CampaignTimeline,DecisionCard,FeedbackStrip,GameSection,GameStat,PhaseScene,CEOOverview,RivalLandscape} from "./GameVisuals";
import { Button } from "@/components/ui/button";
import {AutomaticBriefNotice,AutomaticBriefWaiting} from "./AIBriefLauncher";
import { act, useGame } from "@/game/store";
import * as C from "@/game/campaign";
import * as K from "@/game/ceo";
import {qualificationQuote} from "@/game/pricingAdvisor";
import {tenderFor,marketShare,resolveTalentOffer} from "@/game/rivalAI";
import { ceoPartners, ceoRoles, creatives, employees, insights, mediaChannels, money, objectives, optimizations, positions, researchOptions, segments, surveyCosts, upgrades, BRAND_HQ_REP, type Channel, type UpgradeId } from "@/game/data";
import { PHASES, PHASE_LABEL } from "@/game/state";
import {findCityLot,findOffice,currentOffice,cityRival,cityClient,leaseOffice} from "@/game/city";
import {departmentMetrics} from "@/game/functions";
import * as P from "@/game/personnel";
import {ClientTeamBoard} from "./ClientTeamBoard";
import {GrowthDesk} from "./GrowthDesk";
import * as A from "@/game/acquisition";
import * as T from "@/game/clientTeams";
import {CampaignJourney} from "./CampaignJourney";

const Choice = ({ on, onClick, title, sub }: { on?: boolean; onClick: () => void; title: string; sub?: string }) => (
  <DecisionCard active={on} onClick={onClick} title={title} description={sub}/>
);
const Row = ({ k, v }: { k: string; v: React.ReactNode }) => <div className="flex justify-between border-b border-border py-1.5 text-sm"><span className="text-muted-foreground">{k}</span><b>{v}</b></div>;

export function CampaignWorkspace(){ return <CampaignJourney/>; }

export function LocationPanel({ id, onOpen }: { id: string; onOpen: (p: "campaign" | "ceo") => void }) {
  const s = useGame((x) => x);
  const [name, setName] = useState("");
  const lot=findCityLot(id);
  if(lot?.kind==="rival" && lot.rivalId){
    const rival=cityRival(s,lot.rivalId);
    if(!rival)return <p>No market information available.</p>;
    return <div className="mt-city-building-panel">
      <div className="mt-location-identity"><span className="mt-location-eyebrow">COMPETITOR HEADQUARTERS · {lot.district}</span><h3>{rival.name}</h3><p>{rival.type} · {rival.special} specialist</p></div>
      <div className="mt-location-stat-grid"><GameStat label="REPUTATION" value={Math.round(rival.rep)+"/100"}/><GameStat label="ACTIVE CLIENTS" value={rival.clients}/><GameStat label="TEAM MEMBERS" value={rival.people}/></div>
      <BarComparison max={100} rows={[{label:"Creative capability",value:rival.creative},{label:"Performance capability",value:rival.performance},{label:"Strategy capability",value:rival.strategy}]}/>
      <div className="mt-location-fact"><b>Competitive intelligence</b><p>Pricing index {rival.price.toFixed(2)}× market baseline · Strategic aggression {Math.round(rival.aggression*100)}%. Rivals evolve as simulated agency time advances.</p></div>
      {!s.agencyUnlocked?<FeedbackStrip>Found your own agency to compete in major pitch battles. This is a real rival from the simulated market, not a decorative building.</FeedbackStrip>:
       <Button className="w-full" onClick={()=>onOpen("ceo")}>Open CEO competitive intelligence →</Button>}
     </div>;
  }

  if(lot?.kind==="client" && lot.clientId){
    const l=cityClient(s,lot.clientId);
    if(!l)return <FeedbackStrip>This client is not available in your current game state.</FeedbackStrip>;
    const live=s.ceo?.leads.find(x=>x.id===l.id);
    const status=live?.status||"future";
    const tender=s.ceo?tenderFor(s.ceo,l.id):undefined;
    const scope=l.duration+" days · "+l.scope+" workstreams";
    return <div className="mt-city-building-panel">
      <div className="mt-location-identity"><span className="mt-location-eyebrow">CORPORATE CLIENT HQ · {lot.district}</span><h3>{l.brand}</h3><p>{l.industry} · {l.origin}</p></div>
      <div className="mt-client-status"><span>ACCOUNT STATUS</span><strong>{s.agencyUnlocked?status.replaceAll("_"," ").toUpperCase():"FUTURE OPPORTUNITY"}</strong></div>
      <p className="mt-client-brief">{l.desc}</p>
      {tender?.status==="open"&&<div className="mt-ai-tender-notice"><b>LIVE COMPETITIVE TENDER</b><span>Closes Day {tender.deadline} · Current Day {s.ceo?.day} · Rival bids are active</span></div>}
      <div className="mt-location-stat-grid"><GameStat label="CAMPAIGN BUDGET" value={money(l.value)}/><GameStat label="AGENCY FEE" value={money(l.fee)}/><GameStat label="DIFFICULTY" value={Math.round(l.difficulty)+"/100"}/></div>
      <div className="mt-location-fact"><b>Client requirements</b><p>{l.objective} · {scope}. Preferred capability: {l.pref}. You will compete with other agencies in the city.</p></div>
      <p className="text-xs text-muted-foreground">Outreach, discovery, qualification, pitch and negotiation are managed in the unified Growth Desk.</p>
      {!s.agencyUnlocked?<FeedbackStrip>This is a potential corporate client. Found your own agency to qualify their lead and compete for the account.</FeedbackStrip>:
       <div className="mt-client-actions">
        <Button className="w-full" onClick={()=>{act(d=>A.focusDeal(d,l.id));onOpen("ceo");}}>Open {l.brand} in Growth Desk →</Button>
        {status==="signed"&&<FeedbackStrip tone="positive">Contract signed. Manage delivery through the dedicated Client Team.</FeedbackStrip>}
              </div>}
     </div>;
  }
  if(lot?.kind==="office"){
    const option=findOffice(id),active=s.officeId===id&&s.agencyUnlocked;
    const eligible=s.agencyUnlocked&&s.reputation>=option.minRep&&s.agencyCash>=option.deposit&&!active;
    return <div className="mt-city-building-panel">
      <div className="mt-location-identity"><span className="mt-location-eyebrow">{lot.district} / OFFICE PROPERTY</span><h3>{lot.name}</h3><p>{option.description}</p></div>
      <div className="mt-location-stat-grid"><GameStat label="LEASE DEPOSIT" value={money(option.deposit)}/><GameStat label="DAILY OVERHEAD" value={money(option.daily)}/><GameStat label="TEAM CAPACITY" value={option.capacity}/></div>
      <div className="mt-location-fact"><b>Office impact on your agency</b><p>Prestige +{option.prestige} (first lease only) · Pitch preparation advantage · Expanded recruitment capacity. Relocation updates your real agency ledger and recurring daily cost.</p></div>
      <div className="mt-office-comparison"><div><span>Current HQ</span><strong>{findCityLot(s.officeId)?.name||"Starter HQ"}</strong></div><div><span>Current daily cost</span><strong>{money(currentOffice(s).daily)}</strong></div><div><span>Required reputation</span><strong>{option.minRep}</strong></div></div>
      {active?<><FeedbackStrip tone="positive">This building is your active agency headquarters.</FeedbackStrip><Button className="w-full" onClick={()=>onOpen("ceo")}>Enter your agency →</Button></>:
       <><Button className="w-full" disabled={!eligible} onClick={()=>act((d,fx)=>leaseOffice(d,fx,id))}>Lease & relocate · {money(option.deposit)}</Button>
       {!s.agencyUnlocked?<FeedbackStrip>Found an agency before leasing office space.</FeedbackStrip>:
        s.reputation<option.minRep?<FeedbackStrip>Need {option.minRep} reputation to lease this office (current {s.reputation}).</FeedbackStrip>:
        s.agencyCash<option.deposit?<FeedbackStrip>Not enough agency cash for the deposit.</FeedbackStrip>:null}</>}
     </div>;
  }
  if (id in upgrades) { const u = upgrades[id as UpgradeId], own = s.upgrades.includes(id); return <div className="space-y-3"><h4 className="font-semibold">{u.name}</h4><p className="text-sm text-muted-foreground">{u.desc}</p><Button className="w-full" disabled={own || C.playerMoney(s) < u.cost} onClick={() => act((d, f) => C.buyUpgrade(d, f, id as UpgradeId))}>{own ? "Owned" : `Buy · ${money(u.cost)}`}</Button></div>; }
  if (id === "cowork") return <Button className="w-full" disabled={s.upgrades.includes("cowork") || C.playerMoney(s) < 300000} onClick={() => act((d, f) => C.buyUpgrade(d, f, "cowork"))}>{s.upgrades.includes("cowork") ? "Member" : `Join coworking · ${money(300000)} (+1 XP)`}</Button>;
  if (id === "network" || id === "brand") {
    if (s.agencyUnlocked) return <Button className="w-full" onClick={() => onOpen("ceo")}>Open sales pipeline</Button>;
    const locked = id === "brand" && s.reputation < BRAND_HQ_REP;
    return <div className="space-y-3"><Row k="Campaigns completed" v={s.history.length} /><Row k="Reputation" v={s.reputation} />{locked && <p className="text-sm text-muted-foreground">Requires {BRAND_HQ_REP} reputation.</p>}
      <Button className="w-full" disabled={locked || !s.campaign.journey?.review || s.campaign.phase !== "results"} onClick={() => act(C.nextClient)}>Request a new client brief</Button>
      {s.campaign.phase !== "results" && <Button variant="outline" className="w-full" onClick={() => onOpen("campaign")}>Continue current campaign</Button>}</div>;
  }
  if (id === "agency") {
    if (s.agencyUnlocked) return <div className="mt-city-building-panel"><GameSection eyebrow="AGENCY HEADQUARTERS" title={s.agencyName||"Your Agency"} sub={"Current location: "+(findCityLot(s.officeId)?.name||"Starter HQ")}/><div className="mt-location-stat-grid"><GameStat label="STAFF" value={s.staff.length+"/"+currentOffice(s).capacity}/><GameStat label="DAILY OVERHEAD" value={money(currentOffice(s).daily)}/></div><Button className="w-full" onClick={() => onOpen("ceo")}>Enter CEO Command Center</Button></div>;
    return <div className="space-y-2">{C.agencyReqs(s).map((r) => <Row key={r.name} k={(r.ok ? "Done · " : "Locked · ") + r.name} v={r.num} />)}
      <input className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm" placeholder="Agency name" value={name} onChange={(e) => setName(e.target.value)} disabled={!C.canOpenAgency(s)} />
      <Button className="w-full" disabled={!C.canOpenAgency(s)} onClick={() => act((d, f) => C.createAgency(d, f, name))}>Found agency · 8,000,000đ</Button></div>;
  }
  return null;
}

const TABS = ["inbox", "pipeline", "teams", "people", "finance", "rivals", "news", "partners"] as const;
export function CEOCommandCenter({onReadEdition}:{onReadEdition?:(id:string)=>void}) {
  const s = useGame((x) => x);
  const [tab, setTab] = useState<(typeof TABS)[number]>(s.ceo?.activeDealId?"pipeline":"inbox");
  const c = s.ceo; if (!c) return null;
  const busy = K.capacity(c), open = K.openIssues(c);
  return (
    <div className="mt-ceo-stage">
      <div className="mt-ceo-heading"><div><small>AGENCY HQ / EXECUTIVE OFFICE</small><h2>{s.agencyName||"Agency Command"}</h2></div><span className="mt-ceo-status">MANUAL · WEEK {s.clock.week} <span/></span></div>
      <CEOOverview cash={money(s.agencyCash)} work={c.projects.filter(p=>p.status==="active").length} day={s.clock.day} issues={open.length}/>
      <div className="mt-ceo-tabs" role="tablist" aria-label="CEO sections">{TABS.map(t => <button key={t} type="button" role="tab" aria-selected={tab===t} className={"mt-ceo-tab "+(tab===t?"active":"")} onClick={()=>setTab(t)}>{t}{t==="inbox"&&open.length>0?<b>{open.length}</b>:null}</button>)}</div>
      <PhaseScene phase={tab}>
      {tab === "inbox" && (open.length ? open.map((i) => <div key={i.id} className="mt-escalation"><div className="text-xs text-muted-foreground">Day {i.day} · {i.type}</div><p className="text-sm">{i.message}</p><div className="mt-2 flex flex-wrap gap-2">{i.choices.map((ch) => <Button key={ch} size="sm" variant="outline" className="capitalize" onClick={() => act((d, f) => K.resolveIssue(d, f, i.id, ch))}>{ch}</Button>)}</div></div>) : <p className="text-sm text-muted-foreground">Inbox clear. Staff are working autonomously — check the pipeline for new deals.</p>)}
      {tab==="pipeline"&&<GrowthDesk onTeams={()=>setTab("teams")}/>}
      {tab==="teams"&&<ClientTeamBoard onPeople={()=>setTab("people")}/>}
       {tab==="people"&&<div className="mt-personnel-grid">
        <GameSection eyebrow="PEOPLE & CULTURE" title="Talent Pool & Staffing" sub="Recruit, train and develop staff. Assign employees exclusively to a client through the Teams tab." icon={<Users size={19}/>}/>
        <div className="mt-journey-team-summary"><span>Headcount <b>{s.staff.length}/{currentOffice(s).capacity}</b></span><span>Payroll/day <b>{money(K.dailyPayroll(s))}</b></span><span>Available <b>{T.talentPool(s).length}</b></span></div>
        {employees.map(e=>{const hired=s.staff.includes(e.id),p=P.profile(s,e.id),role=P.primaryRole(e.id);const training=!!p.trainingUntil&&p.trainingUntil>c.day;
        return <div key={e.id} className={"mt-personnel-card "+(hired?"hired":"")}>
          <div className="flex justify-between gap-2 items-start"><div><b>{e.name}</b><p className="text-xs text-muted-foreground">{e.role} · {money(e.salary)}/mo</p></div>
            {hired?<span className="mt-personnel-status">{T.ownerTeam(s,e.id)?"CLIENT SQUAD":training?"TRAINING":"TALENT POOL"}</span>:<Button size="sm" disabled={s.agencyCash<e.salary||s.staff.length>=currentOffice(s).capacity||(c.talentMarket?.[e.id]?.untilDay??0)>c.day} onClick={()=>act((d,fx)=>K.hire(d,fx,e.id))}>Hire</Button>}
          </div>
          {hired?<><div className="mt-personnel-values"><span>Expertise <b>{Math.round(p.skill)}</b></span><span>Morale <b>{Math.round(p.morale)}</b></span><span>Fatigue <b>{Math.round(p.fatigue)}</b></span><span>Load <b>{busy[e.id]??0}/{P.effectiveCapacity(s,e.id)}</b></span></div>
            <div className="mt-personnel-meter"><span style={{width:Math.max(0,Math.min(100,p.skill))+"%"}}/></div>
            <div className="mt-personnel-controls">
              <select aria-label={"Delivery style for "+e.name} value={p.focus} onChange={v=>act((d,fx)=>P.setWorkStyle(d,fx,e.id,v.target.value as import("@/game/state").WorkStyle))}>
                <option value="balanced">Balanced · 2 slots</option><option value="speed">Speed · fast / lower QA</option><option value="quality">Quality · 1 slot / higher QA</option>
              </select>
              <Button size="sm" variant="outline" disabled={training||busy[e.id]>0||s.agencyCash<e.salary*.35} onClick={()=>act((d,fx)=>P.train(d,fx,e.id))}>{training?"Training until Day "+p.trainingUntil:"Train · "+money(e.salary*.35)}</Button>
              <span className="text-xs text-muted-foreground">{T.ownerTeam(s,e.id)?"Team: "+T.ownerTeam(s,e.id)!.brand:"Available for a client squad"}</span>
            </div></>:<p className="text-xs text-muted-foreground mt-1">{e.skill} · starting skill {e.startingSkill??64}</p>}
        </div>})}
      </div>}
      {tab === "finance" && <><GameSection eyebrow="AGENCY FINANCE" title="Understand your cash runway" icon={<Coins size={20}/>} sub="Receivables differ from paid cash. Payroll and direct project costs reduce reserves."/><BarComparison rows={[{label:"Cash reserves",value:Math.max(0,s.agencyCash),display:money(s.agencyCash)},{label:"Receivables",value:Math.max(0,c.totalBilled-c.totalPaid),display:money(c.totalBilled-c.totalPaid)},{label:"Expenses to date",value:Math.max(0,c.totalDirect+c.totalPayroll),display:money(c.totalDirect+c.totalPayroll)}]}/><Row k="Agency cash" v={money(s.agencyCash)} /><Row k="Daily payroll" v={money(K.dailyPayroll(s))} /><Row k="Billed / paid" v={`${money(c.totalBilled)} / ${money(c.totalPaid)}`} /><Row k="Direct costs" v={money(c.totalDirect)} />
        <div className="max-h-64 overflow-auto">{c.ledger.slice(0, 40).map((x, i) => <div key={i} className="flex justify-between text-xs py-0.5"><span>D{x.day} · {x.what}{x.status === "due" ? " (due)" : ""}</span><span className={x.value < 0 ? "text-destructive" : "text-primary"}>{money(x.value)}</span></div>)}</div></>}
      {tab === "news" && <div className="mt-week-archive">
       <GameSection eyebrow="WEEKLY BUSINESS JOURNAL" title="The Agency Ledger" icon={<FileText size={19}/>} sub="Each edition is assembled from your recorded decisions, real financial changes, delivered campaigns and rival agency actions."/>
       <div className="mt-week-archive-status"><b>Planning Week {s.clock.week}</b><span>Game Day {c.day} · Time advances only when you select End Week</span></div>
       {(s.clock.pending||[]).length>0&&<div className="mt-market-section"><h4><Check size={17}/> Decisions recorded this week</h4>{(c.weekly?.pending||[]).slice(-8).reverse().map(d=><div className="mt-market-line" key={d.id}><span><b>{d.headline}</b><small>{d.detail}</small></span></div>)}</div>}
       {(s.clock.editions||[]).length ? s.clock.editions.map(e=><button type="button" className="mt-week-archive-entry" key={e.id} onClick={()=>onReadEdition?.(e.id)}><span><b>Issue {e.weekCompleted}: Week {e.weekStarted} Begins</b><small>Days {e.dayFrom}–{e.dayTo} · {e.articles.length} reports · {e.rivalsWon} rival wins</small></span><span>READ ↗</span></button>) : <p className="text-sm text-muted-foreground">The first edition is published as soon as you end Week 1.</p>}
      </div>}
      {tab === "rivals" && <>
      <GameSection eyebrow="AUTONOMOUS MARKET" title="Rival Intelligence" icon={<Activity size={19}/>} sub="Rival agencies make their own bids, invest in talent, expand offices and compete for clients as simulated time advances."/>
      <div className="mt-rival-totals"><span>YOUR MARKET SHARE <b>{marketShare(c).player.toFixed(1)}%</b></span><span>RIVAL CONTRACT WINS <b>{c.rivals.reduce((a,r)=>a+(r.wins??0),0)}</b></span><span>OPEN TENDERS <b>{(c.tenders??[]).filter(t=>t.status==="open").length}</b></span></div>
      <RivalLandscape rows={[{name:s.agencyName||"Your agency",rep:c.reputation.overall,specialty:"Your agency",mine:true},...c.rivals.map(r=>({name:r.name,rep:r.rep,specialty:r.special}))]}/>
      {(c.tenders??[]).some(t=>t.status==="open")&&<div className="mt-market-section"><h4><Target size={17}/> Live tenders</h4>{(c.tenders??[]).filter(t=>t.status==="open").map(t=>{const l=c.leads.find(l=>l.id===t.leadId),rv=c.rivals.find(r=>r.id===t.rivalId);return <div key={t.leadId} className="mt-market-line"><span><b>{l?.brand||t.leadId}</b><small>{rv?.name||"Rival"} leading · closes Day {t.deadline}</small></span><strong>{t.deadline-c.day>0?t.deadline-c.day+"d left":"Decision due"}</strong></div>})}</div>}
      {(c.talentOffers??[]).some(t=>t.status==="open")&&<div className="mt-market-section"><h4><Users size={17}/> Employee retention alerts</h4>{(c.talentOffers??[]).filter(t=>t.status==="open").map(o=>{const emp=employees.find(e=>e.id===o.employeeId),rv=c.rivals.find(r=>r.id===o.rivalId);return <div className="mt-retention-offer" key={o.id}><b>{rv?.name} wants to recruit {emp?.name}</b><small>Retention bonus {money(o.bonus)} · Monthly raise {money(o.raise)} · Expires Day {o.expires}</small><div><Button size="sm" disabled={s.agencyCash<o.bonus} onClick={()=>act((d,fx)=>resolveTalentOffer(d,fx,o.id,"retain"))}>Retain employee</Button><Button size="sm" variant="outline" onClick={()=>act((d,fx)=>resolveTalentOffer(d,fx,o.id,"release"))}>Release employee</Button></div></div>})}</div>}
      {c.rivals.map(r=><div key={r.id} className="mt-rival"><div className="mt-rival-head"><b>{r.name}</b><span>{r.focus||"autonomous"} · Tier {r.officeTier??1} HQ</span></div><div className="mt-rival-metrics"><span>Rep <b>{r.rep.toFixed(0)}</b></span><span>Clients <b>{r.clients}</b></span><span>Staff <b>{r.people}</b></span><span>Cash <b>{money(r.cash)}</b></span><span>Share <b>{(marketShare(c).rivals.find(x=>x.id===r.id)?.value??0).toFixed(1)}%</b></span></div><p className="mt-rival-move">{r.lastMove||"Developing strategy and client relationships"}</p></div>)}
      <div className="mt-market-section"><h4><Activity size={17}/> Agency activity feed</h4>{(c.rivalNews??[]).length?(c.rivalNews??[]).slice(0,12).map(event=><div className="mt-market-line" key={event.id}><span><b>{event.message}</b><small>{event.kind.toUpperCase()} · Day {event.day}</small></span></div>):<p className="text-xs text-muted-foreground">Advance game time to see rival agency activity.</p>}</div>
      </>}
      {tab === "partners" && ceoPartners.map((p) => <div key={p.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-3"><div className="text-sm"><b>{p.name}</b><div className="text-xs text-muted-foreground">{p.cap} −{p.discount * 100}% cost · {money(p.monthly)}/30d · {p.risk}</div></div>{c.partners.includes(p.id) ? <span className="text-xs text-primary">Active</span> : <Button size="sm" disabled={s.agencyCash < p.deposit} onClick={() => act((d, f) => K.joinPartner(d, f, p.id))}>{money(p.deposit)}</Button>}</div>)}
      </PhaseScene>
    </div>
  );
}
void ceoRoles;

function PitchBox() {
  const p=useGame(x=>x.ceo!.pitch!);
  const lead=useGame(x=>x.ceo?.leads.find(l=>l.id===p.id));
  const opts={focus:["performance","creative","cost","strategy"],evidence:["research","portfolio"],team:["balanced","specialist","lean"]} as const;
  const prices=(["competitive","balanced","premium"] as const);
  const quote=lead?.pricingAdvice;
  const labels={competitive:"Competitive",balanced:"Balanced",premium:"Premium"} as const;
  return <div className="mt-event-room">
    <GameSection eyebrow="COMPETITIVE PITCH" title={"Boardroom · "+p.id} icon={<BriefcaseBusiness size={22}/>} sub="Prepare your strategy, choose the real fee to submit, then defend your proposal against competitors."/>
    {p.step==="prepare"&&<>
      {(Object.keys(opts) as (keyof typeof opts)[]).map(k=><div key={k}><div className="text-xs capitalize">{k}</div><div className="flex flex-wrap gap-1">{opts[k].map(v=><button key={v} onClick={()=>act(d=>K.setPitch(d,k,v))} className={`rounded-full px-2 py-0.5 text-xs ${p[k]===v?"bg-primary text-primary-foreground":"bg-muted"}`}>{v}</button>)}</div></div>)}
      <div className="mt-3 space-y-2">
        <div className="flex items-center justify-between gap-2"><b className="text-sm">Service fee to submit</b><span className="text-xs text-muted-foreground">{quote?.source==="gemini"?"AI-calibrated proposal":"Budget & cost model"}</span></div>
        <p className="text-xs text-muted-foreground">Client size: {lead?.businessSize||"estimated"} · Media budget: {money(lead?.value??0)} · Delivery scope: {lead?.scope??0} workstreams. Media buying budget is not agency revenue.</p>
        <div className="grid grid-cols-3 gap-2">{prices.map(t=><button key={t} type="button" aria-pressed={p.priceTier===t} onClick={()=>act((d,fx)=>K.applySuggestedFee(d,fx,t))} className={`rounded-lg border p-2 text-left transition-colors ${p.priceTier===t?"border-primary bg-primary/10":"border-border bg-muted/30"}`}>
          <span className="block text-xs font-semibold">{labels[t]}</span>
          <b className="block text-sm">{money(quote?.options[t]??(lead?.fee??0))}</b>
          {quote?.tier===t&&<small className="block text-primary">Recommended</small>}
        </button>)}</div>
        <Row k="Your submitted service fee" v={lead?money(K.pitchFee(lead,p)):"—"}/>
        {quote&&<p className="text-xs text-muted-foreground">Estimated cost: {money(quote.estimatedCost)} · Safe quote floor: {money(quote.feeFloor)}. {quote.rationale}</p>}
        {quote?.preparation?.length>0&&<p className="text-xs text-muted-foreground">Pitch preparation: {quote.preparation.join(" · ")}</p>}
      </div>
      <Button className="w-full" onClick={()=>act(K.presentPitch)}>Submit priced pitch · 600k</Button>
    </>}
    {p.step==="objection"&&<><p className="text-sm">Quoted fee: {lead?money(K.pitchFee(lead,p)):"—"} · Objection: {p.objection}</p><div className="grid grid-cols-2 gap-2">{[["evidence","Show evidence"],["cut","Offer fee cut"],["creative","Show creative"],["promise","Promise results"]].map(([a,t])=><Button key={a} size="sm" variant="outline" onClick={()=>act(d=>K.answerPitch(d,a))}>{t}</Button>)}</div></>}
    {p.step==="result"&&p.result&&<><p className="text-sm">You {p.result.playerScore} vs {p.result.topRival} {p.result.topScore}. {p.result.explanation}</p>{p.result.winner==="player"?<Button className="w-full" onClick={()=>act(K.beginNegotiation)}>Negotiate quoted contract</Button>:<Button className="w-full" variant="outline" onClick={()=>act(K.closePitch)}>Close</Button>}</>}
  </div>;
}
function NegBox() {
  const s = useGame((x) => x); const n = s.ceo!.negotiation!; const l = s.ceo!.leads.find((x) => x.id === n.id)!; const t = K.terms(s, n, l);
  return <div className="mt-event-room"><GameSection eyebrow="CONTRACT NEGOTIATION" title={"Round "+n.round} icon={<Handshake size={22}/>} sub="Price, scope, terms and trust determine whether the client signs."/><Row k="Fee" v={money(n.fee)} /><Row k="Client media budget" v={money(l.value)} /><Row k="Scope / advance / days" v={`${n.scope} / ${n.advance}% / ${n.deadline}`} /><Row k="Forecast margin" v={money(t.margin)} /><Row k="Signing chance" v={`${t.prob}%`} />
    <p className="text-xs text-muted-foreground">Negotiating from the actual fee submitted in your competitive pitch. Changes to fee, scope and payment terms update the margin and signing probability.</p><div className="max-h-24 overflow-auto text-xs text-muted-foreground">{n.notes.map((x, i) => <div key={i}>{x}</div>)}</div>
    {n.status === "open" ? <div className="grid grid-cols-2 gap-2">{[["maintain", "Hold terms"], ["discount", "−9% fee"], ["scope", "Cut scope"], ["bonus", "KPI bonus"], ["advance", "Lower advance"], ["deadline", "+5 days"], ...(n.counter ? [["accept", "Accept counter"]] : []), ["walk", "Walk away"]].map(([a, x]) => <Button key={a} size="sm" variant={a === "accept" ? "default" : "outline"} onClick={() => act((d, f) => K.counter(d, f, a))}>{x}</Button>)}</div>
      : <Button className="w-full" variant="outline" onClick={() => act(K.closeNegotiation)}>Close ({n.status})</Button>}
  </div>;
}