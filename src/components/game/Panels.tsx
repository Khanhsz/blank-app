import { useState } from "react";
import {BriefcaseBusiness,Coins,FlaskConical,Target,Clapperboard,ChartNoAxesCombined,Handshake,Users,FileText,Activity,ShieldCheck,Check} from "lucide-react";
import {AnimatedGauge,BarComparison,CampaignTimeline,DecisionCard,FeedbackStrip,GameSection,GameStat,PhaseScene,CEOOverview,RivalLandscape} from "./GameVisuals";
import { Button } from "@/components/ui/button";
import {AutomaticBriefNotice,AutomaticBriefWaiting} from "./AIBriefLauncher";
import { act, useGame } from "@/game/store";
import * as C from "@/game/campaign";
import * as K from "@/game/ceo";
import {tenderFor,marketShare,resolveTalentOffer} from "@/game/rivalAI";
import { ceoPartners, ceoRoles, creatives, employees, insights, mediaChannels, money, objectives, optimizations, positions, researchOptions, segments, surveyCosts, upgrades, BRAND_HQ_REP, type Channel, type UpgradeId } from "@/game/data";
import { PHASES, PHASE_LABEL } from "@/game/state";
import {findCityLot,findOffice,currentOffice,cityRival,cityClient,leaseOffice} from "@/game/city";

const Choice = ({ on, onClick, title, sub }: { on?: boolean; onClick: () => void; title: string; sub?: string }) => (
  <DecisionCard active={on} onClick={onClick} title={title} description={sub}/>
);
const Row = ({ k, v }: { k: string; v: React.ReactNode }) => <div className="flex justify-between border-b border-border py-1.5 text-sm"><span className="text-muted-foreground">{k}</span><b>{v}</b></div>;

export function CampaignWorkspace() {
  const s = useGame((x) => x);
  const c = s.campaign, sc = C.scenarioOf(c);
  const [sv, setSv] = useState({ audience: "students", sample: 60, question: "barrier" });
  const [ins, setIns] = useState<string | null>(null);
  const [st, setSt] = useState(c.strategy);
  const [cr, setCr] = useState<string | null>(null);
  const [media, setMedia] = useState<Record<Channel, number>>({ paid: 0, creator: 0, promo: 0, flyer: 0 });
  if (s.agencyUnlocked) return <p className="text-sm text-muted-foreground">Your team now runs all campaigns. Open the CEO Command Center.</p>;
  if(c.phase==="brief"&&(c.aiStatus==="pending"||c.aiStatus==="generating"))return <AutomaticBriefWaiting/>;
  const left = sc.budget - c.spent;
  const idx = PHASES.indexOf(c.phase);
  return (
    <div className="mt-campaign-stage">
      <CampaignTimeline phase={c.phase}/>
      <div className="mt-campaign-hero"><div className="mt-eyebrow">{sc.industry} / Day {c.day} of {sc.days}</div><h2>{sc.brand}</h2><p>Real decisions shape your results. Plan, execute and deliver your first marketing campaign.</p></div>
      <div className="mt-campaign-stats"><GameStat label="BUDGET REMAINING" value={money(left)} icon={<Coins size={17}/>}/><GameStat label="PERFORMANCE TARGET" value={"+"+sc.target+"%"} icon={<Target size={17}/>} sub={sc.metric}/></div>
      <PhaseScene phase={c.phase}>
      {c.phase === "brief" && <><GameSection eyebrow="NEW CLIENT OPPORTUNITY" title="Your first assignment" sub="Review the challenge before accepting the brief." icon={<FileText size={19}/> }><p className="mt-client-quote">“{sc.client}” — {sc.contact}</p></GameSection><AutomaticBriefNotice campaign={c}/><Button id="accept-first-brief" data-testid="accept-first-brief" className="w-full" onClick={() => act(C.acceptBrief)}>Accept brief</Button></>}
      {c.phase === "research" && <><GameSection eyebrow="DISCOVERY" title="Evidence before instinct" icon={<FlaskConical size={19}/>} sub="Research improves reliability but spends time and money."/><div className="mt-research-choices">{researchOptions.map((r) => <Choice key={r.id} on={c.research.includes(r.id)} onClick={() => act((d, f) => C.addResearch(d, f, r.id))} title={`${r.title} · ${money(r.cost)} · ${r.days}d`} sub={c.research.includes(r.id) ? sc.reports[r.id] : r.description} />)}</div><AnimatedGauge label="Evidence collected" percent={c.research.length*100/Math.max(1,researchOptions.length)}/>
        <Button className="w-full" disabled={!c.research.length} onClick={() => act(C.toSurvey)}>Continue to survey</Button></>}
      {c.phase === "survey" && (!c.survey ? <><GameSection eyebrow="CONSUMER INTELLIGENCE" title="Design the survey" icon={<Users size={19}/>} sub="Sample size and question selection affect survey quality."/>
        <div className="text-xs font-semibold">Audience</div><div className="grid grid-cols-2 gap-2">{segments.map((g) => <Choice key={g.id} on={sv.audience === g.id} onClick={() => setSv({ ...sv, audience: g.id })} title={g.title} />)}</div>
        <div className="text-xs font-semibold">Sample size</div><div className="grid grid-cols-3 gap-2">{[20, 60, 120].map((n) => <Choice key={n} on={sv.sample === n} onClick={() => setSv({ ...sv, sample: n })} title={`${n}`} sub={money(surveyCosts[n])} />)}</div>
        <div className="text-xs font-semibold">Question</div><div className="grid grid-cols-2 gap-2"><Choice on={sv.question === "barrier"} onClick={() => setSv({ ...sv, question: "barrier" })} title="Why not visit/buy?" /><Choice on={sv.question === "like"} onClick={() => setSv({ ...sv, question: "like" })} title="Do you like us?" /></div>
        <Button className="w-full" onClick={() => act((d, f) => C.runSurvey(d, f, sv))}>Run survey</Button></> : (() => { const r = C.surveyResults(s); return <><div className="rounded-xl bg-muted p-3 text-sm"><b>{r.primary}%</b> cite “{r.reason}” · data quality {r.quality}%</div><Button className="w-full" onClick={() => act(C.toValidation)}>Validate insight</Button></>; })())}
      {c.phase === "validation" && <><GameSection eyebrow="VALIDATION" title="Find the insight" icon={<ShieldCheck size={19}/>} sub="The strongest insight must be supported by the evidence you collected." />{(sc.insightOptions??insights).map((i) => <Choice key={i.id} on={ins === i.id} onClick={() => setIns(i.id)} title={i.title} sub={i.desc} />)}<Button className="w-full" disabled={!ins} onClick={() => act((d, f) => C.confirmInsight(d, f, ins!))}>Confirm insight</Button></>}
      {c.phase === "strategy" && <><GameSection eyebrow="PLANNING" title="Choose your strategic direction" icon={<Target size={19}/>} sub="Segment, objectives and positioning determine the campaign fit." />{([["Segment", segments, "segment"], ["Objective", objectives, "objective"], ["Positioning", positions, "position"]] as const).map(([lbl, list, key]) => <div key={key}><div className="mb-1 text-xs font-semibold">{lbl}</div><div className="grid grid-cols-2 gap-2">{list.map((o) => <Choice key={o.id} on={st[key] === o.id} onClick={() => setSt({ ...st, [key]: o.id })} title={o.title} />)}</div></div>)}
        <Button className="w-full" onClick={() => act((d, f) => C.confirmStrategy(d, f, st))}>Lock strategy</Button></>}
      {c.phase === "creative" && <><GameSection eyebrow="PRODUCTION" title="Build the big idea" icon={<Clapperboard size={19}/>} sub="Choose a creative concept that works for both budget and strategy." />{creatives.map((k) => <Choice key={k.id} on={cr === k.id} onClick={() => setCr(k.id)} title={`${k.title} · ${money(k.cost)}`} sub={`${k.subtitle} — ${k.desc}`} />)}<Button className="w-full" disabled={!cr} onClick={() => act((d, f) => C.confirmCreative(d, f, cr!))}>Produce concept</Button></>}
      {c.phase === "media" && (() => { const tot = Object.values(media).reduce((a, b) => a + b, 0); return <><GameSection eyebrow="MEDIA PLANNING" title="Spend where it matters" icon={<ChartNoAxesCombined size={19}/>} sub="Compare how each channel shares your campaign budget."/><BarComparison rows={mediaChannels.map(m=>({label:m.title,value:media[m.id],display:money(media[m.id])}))} max={Math.max(1,left)}/>
        {mediaChannels.map((m) => <div key={m.id}><div className="flex justify-between text-sm"><span>{m.title}</span><b>{money(media[m.id])}</b></div><input type="range" className="w-full accent-primary" min={0} max={left} step={100000} value={media[m.id]} onChange={(e) => setMedia({ ...media, [m.id]: +e.target.value })} /></div>)}
        <Row k="Allocated" v={`${money(tot)} / ${money(left)}`} />
        <Button className="w-full" disabled={tot < 500000 || tot > left} onClick={() => act((d, f) => C.launch(d, f, media))}>Launch campaign</Button></>; })()}
      {c.phase === "live" && c.liveMetrics && <><GameSection eyebrow="LIVE CAMPAIGN" title="Monitor and optimize" icon={<Activity size={19}/>} sub="Every day is simulated from your real game choices. No separate simulation screen."/>
        <div className="rounded-lg border border-border bg-card p-3 space-y-2">
          <div className="flex items-center justify-between gap-3"><div className="text-sm font-semibold">Campaign delivery</div><div className="text-xs text-muted-foreground">Day {c.simulation?.elapsed ?? 0} / {c.simulation?.duration ?? "?"}</div></div>
          <AnimatedGauge label="Delivery progress" percent={c.simulation ? c.simulation.elapsed / Math.max(1, c.simulation.duration) * 100 : 0} tone="teal"/>
          <p className="text-xs text-muted-foreground">Simulated figures for gameplay. Client media is reserved on launch and spent day by day; it is not charged twice.</p>
        </div>
        <div className="mt-campaign-stats">
          <GameStat label="MODELED REACH" value={c.liveMetrics.adReach.toLocaleString()}/>
          <GameStat label="OBSERVED UPLIFT" value={c.liveMetrics.pct + "%"}/>
          <GameStat label="ACTUAL MEDIA SPEND" value={money(c.simulation?.actualMediaSpent ?? 0)}/>
          <GameStat label="AWARENESS INDEX" value={((c.simulation?.awareness ?? .06)*100).toFixed(1)+"%"}/>
        </div>
        <AnimatedGauge label="Progress toward target" percent={c.liveMetrics.pct / Math.max(1, sc.target) * 100} tone="teal"/>
        {!!c.simulation?.days.length && <div className="rounded-lg border border-border bg-card p-3">
          <div className="mb-3 text-xs font-semibold">Daily KPI uplift (%)</div>
          <div className="flex h-28 items-end gap-1 overflow-x-auto border-b border-border pb-1">
            {c.simulation.days.map((d) => <div key={d.day} className="flex min-w-5 flex-1 flex-col justify-end gap-1 text-center" title={`Day ${d.day}: ${d.impressions.toLocaleString()} impressions, ${d.clicks} clicks, ${d.incremental} incremental ${sc.unit}, ${money(d.spend)} media`}>
              <div className="w-full rounded-t-sm bg-primary/75" style={{height: Math.max(4, Math.min(100, Math.abs(d.upliftPct) / Math.max(1, sc.target * 1.8) * 100))+"%"}}></div>
              <span className="text-[9px] text-muted-foreground">{d.day}</span>
            </div>)}
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span>Clicks: {c.simulation.days.reduce((a,d)=>a+d.clicks,0).toLocaleString()}</span>
            <span>Impressions: {c.simulation.days.reduce((a,d)=>a+d.impressions,0).toLocaleString()}</span>
            <span>Incremental {sc.unit}: {c.simulation.days.reduce((a,d)=>a+d.incremental,0)}</span>
          </div>
          {c.simulation.days.at(-1)?.event && <p className="mt-2 text-xs">Market event: {c.simulation.days.at(-1)?.event}</p>}
        </div>}
        <div className="grid grid-cols-2 gap-2">
          <Button onClick={() => act((d,f)=>C.advanceCampaignDay(d,f,1))}>Run next day →</Button>
          <Button variant="outline" onClick={() => act((d,f)=>C.advanceCampaignDay(d,f,30))}>Finish delivery</Button>
        </div>
        <div className="mt-3 space-y-2">
          <p className="text-xs font-semibold">One optimization during live delivery (affects future days)</p>
          {c.optimization
            ? <p className="rounded-lg bg-muted p-3 text-sm">Chosen: {optimizations.find(o=>o.id===c.optimization)?.title ?? c.optimization}</p>
            : (c.simulation?.elapsed ?? 0) < 1
              ? <p className="text-xs text-muted-foreground">Run at least one delivery day to unlock optimization.</p>
              : optimizations.map((o) => <Choice key={o.id} onClick={() => act((d, f) => C.optimize(d, f, o.id))} title={`${o.title} · ${money(o.cost)}`} sub={o.desc} />)}
        </div>
      </>}
      {c.phase === "results" && c.final && <><GameSection eyebrow="CAMPAIGN COMPLETE" title="The verdict" icon={<Check size={20}/>} sub="Results are recorded in your career history."/><AnimatedGauge label="Target achievement" percent={c.final.pct/Math.max(1,sc.target)*100} tone="sage"/><Row k="Final KPI" v={`${c.final.outcome} ${sc.unit}`} /><Row k="Uplift" v={`${c.final.pct}% (target +${sc.target}%)`} />{c.simulation && <><Row k="Campaign delivery days" v={c.simulation.elapsed + " / " + c.simulation.duration} /><Row k="Media delivered" v={money(c.simulation.actualMediaSpent)} /><Row k="Channel spending" v="Committed budget, no double billing" /></>}<Row k="Fee earned" v={money(sc.fee)} /><Row k="Reward" v={`+${c.final.rep} REP · +${c.final.xp} XP`} />
        <FeedbackStrip tone="positive">Campaign delivered. Reputation, fee and expertise have been recorded.</FeedbackStrip><p className="text-sm text-muted-foreground">Visit the Networking Café or Brand HQ in the city for your next brief.</p></>}
      </PhaseScene>
    </div>
  );
}

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
    const activeNegotiation=!!(s.ceo?.negotiation||s.ceo?.pitch);
    const opportunityOpen=status==="new"||status==="renewal";
    const qualifyAffordable=s.agencyCash>=180000;
    const canPitch=status==="qualified"&&s.agencyCash>=500000&&!activeNegotiation;
    const scope=l.duration+" days · "+l.scope+" workstreams";
    return <div className="mt-city-building-panel">
      <div className="mt-location-identity"><span className="mt-location-eyebrow">CORPORATE CLIENT HQ · {lot.district}</span><h3>{l.brand}</h3><p>{l.industry} · {l.origin}</p></div>
      <div className="mt-client-status"><span>ACCOUNT STATUS</span><strong>{s.agencyUnlocked?status.replaceAll("_"," ").toUpperCase():"FUTURE OPPORTUNITY"}</strong></div>
      <p className="mt-client-brief">{l.desc}</p>
      {tender?.status==="open"&&<div className="mt-ai-tender-notice"><b>LIVE COMPETITIVE TENDER</b><span>Closes Day {tender.deadline} · Current Day {s.ceo?.day} · Rival bids are active</span></div>}
      <div className="mt-location-stat-grid"><GameStat label="CAMPAIGN BUDGET" value={money(l.value)}/><GameStat label="AGENCY FEE" value={money(l.fee)}/><GameStat label="DIFFICULTY" value={Math.round(l.difficulty)+"/100"}/></div>
      <div className="mt-location-fact"><b>Client requirements</b><p>{l.objective} · {scope}. Preferred capability: {l.pref}. You will compete with other agencies in the city.</p></div>
      {!s.agencyUnlocked?<FeedbackStrip>This is a potential corporate client. Found your own agency to qualify their lead and compete for the account.</FeedbackStrip>:
       <div className="mt-client-actions">
        {opportunityOpen&&<Button className="w-full" disabled={!qualifyAffordable} onClick={()=>act((d,fx)=>K.qualify(d,fx,l.id))}>Qualify opportunity · 180,000đ</Button>}
        {status==="qualified"&&<Button className="w-full" disabled={!canPitch} onClick={()=>act((d,fx)=>K.startPitch(d,fx,l.id))}>Prepare competitive pitch · 500,000đ</Button>}
        {status==="qualified"&&activeNegotiation&&<FeedbackStrip>Finish your ongoing pitch or negotiation before beginning another.</FeedbackStrip>}
        {!["new","renewal","qualified"].includes(status)&&<FeedbackStrip tone={status==="signed"?"positive":"neutral"}>{status==="signed"?"Contract signed — your staff manage delivery in Agency HQ.":status==="lost"?"This opportunity was won by a rival.":status==="declined"?"You previously declined this account.":status==="pitch"||status==="pitch_won"||status==="negotiating"?"This account is progressing through the boardroom.":"Check the active pipeline for this account."}</FeedbackStrip>}
        <Button variant="outline" className="w-full" onClick={()=>onOpen("ceo")}>Open CEO deal pipeline →</Button>
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
      <Button className="w-full" disabled={locked || s.campaign.phase !== "results"} onClick={() => act(C.nextClient)}>Request a new client brief</Button>
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

const TABS = ["inbox", "pipeline", "projects", "people", "finance", "rivals", "news", "partners"] as const;
export function CEOCommandCenter({onReadEdition}:{onReadEdition?:(id:string)=>void}) {
  const s = useGame((x) => x);
  const [tab, setTab] = useState<(typeof TABS)[number]>("inbox");
  const c = s.ceo; if (!c) return null;
  const busy = K.capacity(c), open = K.openIssues(c);
  return (
    <div className="mt-ceo-stage">
      <div className="mt-ceo-heading"><div><small>AGENCY HQ / EXECUTIVE OFFICE</small><h2>{s.agencyName||"Agency Command"}</h2></div><span className="mt-ceo-status">MANUAL · WEEK {c.weekly?.week??1} <span/></span></div>
      <CEOOverview cash={money(s.agencyCash)} work={c.projects.filter(p=>p.status==="active").length} day={c.day} issues={open.length}/>
      <div className="mt-ceo-tabs" role="tablist" aria-label="CEO sections">{TABS.map(t => <button key={t} type="button" role="tab" aria-selected={tab===t} className={"mt-ceo-tab "+(tab===t?"active":"")} onClick={()=>setTab(t)}>{t}{t==="inbox"&&open.length>0?<b>{open.length}</b>:null}</button>)}</div>
      <PhaseScene phase={tab}>
      {tab === "inbox" && (open.length ? open.map((i) => <div key={i.id} className="mt-escalation"><div className="text-xs text-muted-foreground">Day {i.day} · {i.type}</div><p className="text-sm">{i.message}</p><div className="mt-2 flex flex-wrap gap-2">{i.choices.map((ch) => <Button key={ch} size="sm" variant="outline" className="capitalize" onClick={() => act((d, f) => K.resolveIssue(d, f, i.id, ch))}>{ch}</Button>)}</div></div>) : <p className="text-sm text-muted-foreground">Inbox clear. Staff are working autonomously — check the pipeline for new deals.</p>)}
      {tab === "pipeline" && <>
        {c.pitch && <PitchBox />}
        {c.negotiation && <NegBox />}
        {!c.pitch && !c.negotiation && c.leads.map((l) => <div key={l.id} className="mt-deal"><div className="flex justify-between"><b>{l.brand}</b><span className="text-xs capitalize text-primary">{l.status.replace("_", " ")}</span></div><p className="text-xs text-muted-foreground">{l.desc}</p><Row k="Service fee" v={money(l.fee)} /><Row k="Rivals" v={l.rivalIds.join(", ")} />{l.insightKnown && <Row k="Client priority" v={l.pref} />}{tenderFor(c,l.id)?.status==="open"&&<Row k="Tender deadline" v={"Day "+tenderFor(c,l.id)!.deadline}/>}
          <div className="mt-2 flex gap-2">{["new", "renewal"].includes(l.status) && <Button size="sm" onClick={() => act((d, f) => K.qualify(d, f, l.id))}>Qualify · 180k</Button>}{l.status === "qualified" && <Button size="sm" onClick={() => act((d, f) => K.startPitch(d, f, l.id))}>Prepare pitch · 500k</Button>}{["new", "qualified", "renewal"].includes(l.status) && <Button size="sm" variant="ghost" onClick={() => act((d) => K.decline(d, l.id))}>Decline</Button>}</div></div>)}
      </>}
      {tab === "projects" && (c.projects.length ? c.projects.map((p) => <div key={p.id} className="mt-project"><div className="flex justify-between"><b>{p.brand}</b><span className="text-xs">{p.status === "active" ? `Day ${p.days}/${p.duration}` : `Done · KPI ${p.kpi}%`}</span></div>
        <AnimatedGauge label="Workstreams completed" percent={p.tasks.filter(t=>t.status==="completed").length/Math.max(1,p.tasks.length)*100} tone="sage"/>{p.tasks.map((t) => <div key={t.key} className="mt-1.5"><div className="flex justify-between text-xs"><span>{t.label}</span><span className="text-muted-foreground">{t.status.replace("_", " ")}{t.employee ? ` · ${employees.find((e) => e.id === t.employee)?.name ?? t.employee}` : ""}</span></div><div className="h-1.5 rounded-full bg-muted"><div className="h-full rounded-full bg-accent-foreground transition-all" style={{ width: `${(t.progress / t.effort) * 100}%` }} /></div></div>)}</div>) : <p className="text-sm text-muted-foreground">No active projects. Win a pitch in the pipeline.</p>)}
      {tab === "people" && employees.map((e) => { const h = s.staff.includes(e.id); return <div key={e.id} className="mt-employee"><div><b className="text-sm">{e.name}</b><div className="text-xs text-muted-foreground">{e.role} · {money(e.salary)}/mo{h ? ` · workload ${busy[e.id] || 0}/2` : ""}</div></div>{h ? <span className="text-xs text-primary">On team</span> : <Button size="sm" disabled={s.agencyCash < e.salary||(c.talentMarket?.[e.id]?.untilDay??0)>c.day} onClick={() => act((d, f) => K.hire(d, f, e.id))}>{(c.talentMarket?.[e.id]?.untilDay??0)>c.day?"Under rival offer":"Hire"}</Button>}</div>; })}
      {tab === "finance" && <><GameSection eyebrow="AGENCY FINANCE" title="Understand your cash runway" icon={<Coins size={20}/>} sub="Receivables differ from paid cash. Payroll and direct project costs reduce reserves."/><BarComparison rows={[{label:"Cash reserves",value:Math.max(0,s.agencyCash),display:money(s.agencyCash)},{label:"Receivables",value:Math.max(0,c.totalBilled-c.totalPaid),display:money(c.totalBilled-c.totalPaid)},{label:"Expenses to date",value:Math.max(0,c.totalDirect+c.totalPayroll),display:money(c.totalDirect+c.totalPayroll)}]}/><Row k="Agency cash" v={money(s.agencyCash)} /><Row k="Daily payroll" v={money(K.dailyPayroll(s))} /><Row k="Billed / paid" v={`${money(c.totalBilled)} / ${money(c.totalPaid)}`} /><Row k="Direct costs" v={money(c.totalDirect)} />
        <div className="max-h-64 overflow-auto">{c.ledger.slice(0, 40).map((x, i) => <div key={i} className="flex justify-between text-xs py-0.5"><span>D{x.day} · {x.what}{x.status === "due" ? " (due)" : ""}</span><span className={x.value < 0 ? "text-destructive" : "text-primary"}>{money(x.value)}</span></div>)}</div></>}
      {tab === "news" && <div className="mt-week-archive">
       <GameSection eyebrow="WEEKLY BUSINESS JOURNAL" title="The Agency Ledger" icon={<FileText size={19}/>} sub="Each edition is assembled from your recorded decisions, real financial changes, delivered campaigns and rival agency actions."/>
       <div className="mt-week-archive-status"><b>Planning Week {c.weekly?.week??1}</b><span>Game Day {c.day} · Time advances only when you select End Week</span></div>
       {(c.weekly?.pending||[]).length>0&&<div className="mt-market-section"><h4><Check size={17}/> Decisions recorded this week</h4>{(c.weekly?.pending||[]).slice(-8).reverse().map(d=><div className="mt-market-line" key={d.id}><span><b>{d.headline}</b><small>{d.detail}</small></span></div>)}</div>}
       {(c.weekly?.editions||[]).length ? c.weekly!.editions.map(e=><button type="button" className="mt-week-archive-entry" key={e.id} onClick={()=>onReadEdition?.(e.id)}><span><b>Issue {e.weekCompleted}: Week {e.weekStarted} Begins</b><small>Days {e.dayFrom}–{e.dayTo} · {e.articles.length} reports · {e.rivalsWon} rival wins</small></span><span>READ ↗</span></button>) : <p className="text-sm text-muted-foreground">The first edition is published as soon as you end Week 1.</p>}
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
  const p = useGame((x) => x.ceo!.pitch!);
  const opts = { focus: ["performance", "creative", "cost", "strategy"], evidence: ["research", "portfolio"], team: ["balanced", "specialist", "lean"], price: ["standard", "premium", "discount"] } as const;
  return <div className="mt-event-room"><GameSection eyebrow="COMPETITIVE PITCH" title={"Boardroom · "+p.id} icon={<BriefcaseBusiness size={22}/>} sub="Evidence, creative angle, team and pricing change your chance of winning."/>
    {p.step === "prepare" && <>{(Object.keys(opts) as (keyof typeof opts)[]).map((k) => <div key={k}><div className="text-xs capitalize">{k}</div><div className="flex flex-wrap gap-1">{opts[k].map((v) => <button key={v} onClick={() => act((d) => K.setPitch(d, k, v))} className={`rounded-full px-2 py-0.5 text-xs ${p[k] === v ? "bg-primary text-primary-foreground" : "bg-muted"}`}>{v}</button>)}</div></div>)}<Button className="w-full" onClick={() => act(K.presentPitch)}>Present pitch · 600k</Button></>}
    {p.step === "objection" && <><p className="text-sm">Objection: {p.objection}</p><div className="grid grid-cols-2 gap-2">{[["evidence", "Show evidence"], ["cut", "Offer fee cut"], ["creative", "Show creative"], ["promise", "Promise results"]].map(([a, t]) => <Button key={a} size="sm" variant="outline" onClick={() => act((d) => K.answerPitch(d, a))}>{t}</Button>)}</div></>}
    {p.step === "result" && p.result && <><p className="text-sm">You {p.result.playerScore} vs {p.result.topRival} {p.result.topScore}. {p.result.explanation}</p>{p.result.winner === "player" ? <Button className="w-full" onClick={() => act(K.beginNegotiation)}>Negotiate contract</Button> : <Button className="w-full" variant="outline" onClick={() => act(K.closePitch)}>Close</Button>}</>}
  </div>;
}
function NegBox() {
  const s = useGame((x) => x); const n = s.ceo!.negotiation!; const l = s.ceo!.leads.find((x) => x.id === n.id)!; const t = K.terms(s, n, l);
  return <div className="mt-event-room"><GameSection eyebrow="CONTRACT NEGOTIATION" title={"Round "+n.round} icon={<Handshake size={22}/>} sub="Price, scope, terms and trust determine whether the client signs."/><Row k="Fee" v={money(n.fee)} /><Row k="Scope / advance / days" v={`${n.scope} / ${n.advance}% / ${n.deadline}`} /><Row k="Forecast margin" v={money(t.margin)} /><Row k="Signing chance" v={`${t.prob}%`} />
    <div className="max-h-24 overflow-auto text-xs text-muted-foreground">{n.notes.map((x, i) => <div key={i}>{x}</div>)}</div>
    {n.status === "open" ? <div className="grid grid-cols-2 gap-2">{[["maintain", "Hold terms"], ["discount", "−9% fee"], ["scope", "Cut scope"], ["bonus", "KPI bonus"], ["advance", "Lower advance"], ["deadline", "+5 days"], ...(n.counter ? [["accept", "Accept counter"]] : []), ["walk", "Walk away"]].map(([a, x]) => <Button key={a} size="sm" variant={a === "accept" ? "default" : "outline"} onClick={() => act((d, f) => K.counter(d, f, a))}>{x}</Button>)}</div>
      : <Button className="w-full" variant="outline" onClick={() => act(K.closeNegotiation)}>Close ({n.status})</Button>}
  </div>;
}