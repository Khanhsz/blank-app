import { useState } from "react";
import { Button } from "@/components/ui/button";
import { act, useGame } from "@/game/store";
import * as C from "@/game/campaign";
import * as K from "@/game/ceo";
import { ceoPartners, ceoRoles, creatives, employees, insights, mediaChannels, money, objectives, optimizations, positions, researchOptions, segments, surveyCosts, upgrades, BRAND_HQ_REP, type Channel, type UpgradeId } from "@/game/data";
import { PHASES, PHASE_LABEL } from "@/game/state";

const Choice = ({ on, onClick, title, sub }: { on?: boolean; onClick: () => void; title: string; sub?: string }) => (
  <button onClick={onClick} className={`w-full rounded-xl border p-3 text-left transition ${on ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/50"}`}>
    <div className="text-sm font-semibold">{title}</div>{sub && <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>}
  </button>
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
  const left = sc.budget - c.spent;
  const idx = PHASES.indexOf(c.phase);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1">{PHASES.map((p, i) => <span key={p} className={`rounded-full px-2 py-0.5 text-[11px] ${i <= idx ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{PHASE_LABEL[p]}</span>)}</div>
      <div><div className="text-xs uppercase tracking-widest text-primary">{sc.industry} · Day {c.day}/{sc.days}</div><h3 className="font-display text-2xl">{sc.brand}</h3>
        <Row k="Client budget left" v={money(left)} /><Row k="Target" v={`+${sc.target}% ${sc.metric}`} /></div>
      {c.phase === "brief" && <><p className="rounded-xl bg-muted p-3 text-sm italic">“{sc.client}” — {sc.contact}</p><Button id="accept-first-brief" data-testid="accept-first-brief" className="w-full" onClick={() => act(C.acceptBrief)}>Accept brief</Button></>}
      {c.phase === "research" && <>{researchOptions.map((r) => <Choice key={r.id} on={c.research.includes(r.id)} onClick={() => act((d, f) => C.addResearch(d, f, r.id))} title={`${r.title} · ${money(r.cost)} · ${r.days}d`} sub={c.research.includes(r.id) ? sc.reports[r.id] : r.description} />)}
        <Button className="w-full" disabled={!c.research.length} onClick={() => act(C.toSurvey)}>Continue to survey</Button></>}
      {c.phase === "survey" && (!c.survey ? <>
        <div className="text-xs font-semibold">Audience</div><div className="grid grid-cols-2 gap-2">{segments.map((g) => <Choice key={g.id} on={sv.audience === g.id} onClick={() => setSv({ ...sv, audience: g.id })} title={g.title} />)}</div>
        <div className="text-xs font-semibold">Sample size</div><div className="grid grid-cols-3 gap-2">{[20, 60, 120].map((n) => <Choice key={n} on={sv.sample === n} onClick={() => setSv({ ...sv, sample: n })} title={`${n}`} sub={money(surveyCosts[n])} />)}</div>
        <div className="text-xs font-semibold">Question</div><div className="grid grid-cols-2 gap-2"><Choice on={sv.question === "barrier"} onClick={() => setSv({ ...sv, question: "barrier" })} title="Why not visit/buy?" /><Choice on={sv.question === "like"} onClick={() => setSv({ ...sv, question: "like" })} title="Do you like us?" /></div>
        <Button className="w-full" onClick={() => act((d, f) => C.runSurvey(d, f, sv))}>Run survey</Button></> : (() => { const r = C.surveyResults(s); return <><div className="rounded-xl bg-muted p-3 text-sm"><b>{r.primary}%</b> cite “{r.reason}” · data quality {r.quality}%</div><Button className="w-full" onClick={() => act(C.toValidation)}>Validate insight</Button></>; })())}
      {c.phase === "validation" && <>{insights.map((i) => <Choice key={i.id} on={ins === i.id} onClick={() => setIns(i.id)} title={i.title} sub={i.desc} />)}<Button className="w-full" disabled={!ins} onClick={() => act((d, f) => C.confirmInsight(d, f, ins!))}>Confirm insight</Button></>}
      {c.phase === "strategy" && <>{([["Segment", segments, "segment"], ["Objective", objectives, "objective"], ["Positioning", positions, "position"]] as const).map(([lbl, list, key]) => <div key={key}><div className="mb-1 text-xs font-semibold">{lbl}</div><div className="grid grid-cols-2 gap-2">{list.map((o) => <Choice key={o.id} on={st[key] === o.id} onClick={() => setSt({ ...st, [key]: o.id })} title={o.title} />)}</div></div>)}
        <Button className="w-full" onClick={() => act((d, f) => C.confirmStrategy(d, f, st))}>Lock strategy</Button></>}
      {c.phase === "creative" && <>{creatives.map((k) => <Choice key={k.id} on={cr === k.id} onClick={() => setCr(k.id)} title={`${k.title} · ${money(k.cost)}`} sub={`${k.subtitle} — ${k.desc}`} />)}<Button className="w-full" disabled={!cr} onClick={() => act((d, f) => C.confirmCreative(d, f, cr!))}>Produce concept</Button></>}
      {c.phase === "media" && (() => { const tot = Object.values(media).reduce((a, b) => a + b, 0); return <>
        {mediaChannels.map((m) => <div key={m.id}><div className="flex justify-between text-sm"><span>{m.title}</span><b>{money(media[m.id])}</b></div><input type="range" className="w-full accent-primary" min={0} max={left} step={100000} value={media[m.id]} onChange={(e) => setMedia({ ...media, [m.id]: +e.target.value })} /></div>)}
        <Row k="Allocated" v={`${money(tot)} / ${money(left)}`} />
        <Button className="w-full" disabled={tot < 500000 || tot > left} onClick={() => act((d, f) => C.launch(d, f, media))}>Launch campaign</Button></>; })()}
      {c.phase === "live" && c.liveMetrics && <><Row k="Interim reach" v={c.liveMetrics.adReach.toLocaleString()} /><Row k="Interim KPI" v={`${c.liveMetrics.pct}%`} />
        {optimizations.map((o) => <Choice key={o.id} onClick={() => act((d, f) => C.optimize(d, f, o.id))} title={`${o.title} · ${money(o.cost)}`} sub={o.desc} />)}</>}
      {c.phase === "results" && c.final && <><Row k="Final KPI" v={`${c.final.outcome} ${sc.unit}`} /><Row k="Uplift" v={`${c.final.pct}% (target +${sc.target}%)`} /><Row k="Fee earned" v={money(sc.fee)} /><Row k="Reward" v={`+${c.final.rep} REP · +${c.final.xp} XP`} />
        <p className="text-sm text-muted-foreground">Visit the Networking Café or Brand HQ in the city for your next brief.</p></>}
    </div>
  );
}

export function LocationPanel({ id, onOpen }: { id: string; onOpen: (p: "campaign" | "ceo") => void }) {
  const s = useGame((x) => x);
  const [name, setName] = useState("");
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
    if (s.agencyUnlocked) return <Button className="w-full" onClick={() => onOpen("ceo")}>Enter CEO Command Center</Button>;
    return <div className="space-y-2">{C.agencyReqs(s).map((r) => <Row key={r.name} k={(r.ok ? "Done · " : "Locked · ") + r.name} v={r.num} />)}
      <input className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm" placeholder="Agency name" value={name} onChange={(e) => setName(e.target.value)} disabled={!C.canOpenAgency(s)} />
      <Button className="w-full" disabled={!C.canOpenAgency(s)} onClick={() => act((d, f) => C.createAgency(d, f, name))}>Found agency · 8,000,000đ</Button></div>;
  }
  return null;
}

const TABS = ["inbox", "pipeline", "projects", "people", "finance", "rivals", "partners"] as const;
export function CEOCommandCenter() {
  const s = useGame((x) => x);
  const [tab, setTab] = useState<(typeof TABS)[number]>("inbox");
  const c = s.ceo; if (!c) return null;
  const busy = K.capacity(c), open = K.openIssues(c);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1">{TABS.map((t) => <button key={t} onClick={() => setTab(t)} className={`rounded-full px-3 py-1 text-xs capitalize ${tab === t ? "bg-foreground text-background" : "bg-muted"}`}>{t}{t === "inbox" && open.length ? ` (${open.length})` : ""}</button>)}</div>
      {tab === "inbox" && (open.length ? open.map((i) => <div key={i.id} className="rounded-xl border border-border bg-card p-3"><div className="text-xs text-muted-foreground">Day {i.day} · {i.type}</div><p className="text-sm">{i.message}</p><div className="mt-2 flex flex-wrap gap-2">{i.choices.map((ch) => <Button key={ch} size="sm" variant="outline" className="capitalize" onClick={() => act((d, f) => K.resolveIssue(d, f, i.id, ch))}>{ch}</Button>)}</div></div>) : <p className="text-sm text-muted-foreground">Inbox clear. Staff are working autonomously — check the pipeline for new deals.</p>)}
      {tab === "pipeline" && <>
        {c.pitch && <PitchBox />}
        {c.negotiation && <NegBox />}
        {!c.pitch && !c.negotiation && c.leads.map((l) => <div key={l.id} className="rounded-xl border border-border bg-card p-3"><div className="flex justify-between"><b>{l.brand}</b><span className="text-xs capitalize text-primary">{l.status.replace("_", " ")}</span></div><p className="text-xs text-muted-foreground">{l.desc}</p><Row k="Service fee" v={money(l.fee)} /><Row k="Rivals" v={l.rivalIds.join(", ")} />{l.insightKnown && <Row k="Client priority" v={l.pref} />}
          <div className="mt-2 flex gap-2">{["new", "renewal"].includes(l.status) && <Button size="sm" onClick={() => act((d, f) => K.qualify(d, f, l.id))}>Qualify · 180k</Button>}{l.status === "qualified" && <Button size="sm" onClick={() => act((d, f) => K.startPitch(d, f, l.id))}>Prepare pitch · 500k</Button>}{["new", "qualified", "renewal"].includes(l.status) && <Button size="sm" variant="ghost" onClick={() => act((d) => K.decline(d, l.id))}>Decline</Button>}</div></div>)}
      </>}
      {tab === "projects" && (c.projects.length ? c.projects.map((p) => <div key={p.id} className="rounded-xl border border-border bg-card p-3"><div className="flex justify-between"><b>{p.brand}</b><span className="text-xs">{p.status === "active" ? `Day ${p.days}/${p.duration}` : `Done · KPI ${p.kpi}%`}</span></div>
        {p.tasks.map((t) => <div key={t.key} className="mt-1.5"><div className="flex justify-between text-xs"><span>{t.label}</span><span className="text-muted-foreground">{t.status.replace("_", " ")}{t.employee ? ` · ${employees.find((e) => e.id === t.employee)?.name ?? t.employee}` : ""}</span></div><div className="h-1.5 rounded-full bg-muted"><div className="h-full rounded-full bg-accent-foreground transition-all" style={{ width: `${(t.progress / t.effort) * 100}%` }} /></div></div>)}</div>) : <p className="text-sm text-muted-foreground">No active projects. Win a pitch in the pipeline.</p>)}
      {tab === "people" && employees.map((e) => { const h = s.staff.includes(e.id); return <div key={e.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-3"><div><b className="text-sm">{e.name}</b><div className="text-xs text-muted-foreground">{e.role} · {money(e.salary)}/mo{h ? ` · workload ${busy[e.id] || 0}/2` : ""}</div></div>{h ? <span className="text-xs text-primary">On team</span> : <Button size="sm" disabled={s.agencyCash < e.salary} onClick={() => act((d, f) => K.hire(d, f, e.id))}>Hire</Button>}</div>; })}
      {tab === "finance" && <><Row k="Agency cash" v={money(s.agencyCash)} /><Row k="Daily payroll" v={money(K.dailyPayroll(s))} /><Row k="Billed / paid" v={`${money(c.totalBilled)} / ${money(c.totalPaid)}`} /><Row k="Direct costs" v={money(c.totalDirect)} />
        <div className="max-h-64 overflow-auto">{c.ledger.slice(0, 40).map((x, i) => <div key={i} className="flex justify-between text-xs py-0.5"><span>D{x.day} · {x.what}{x.status === "due" ? " (due)" : ""}</span><span className={x.value < 0 ? "text-destructive" : "text-primary"}>{money(x.value)}</span></div>)}</div></>}
      {tab === "rivals" && c.rivals.map((r) => <div key={r.id} className="rounded-xl border border-border bg-card p-3 text-sm"><b>{r.name}</b> <span className="text-xs text-muted-foreground">{r.type}</span><div className="text-xs">Rep {r.rep.toFixed(0)} · Clients {r.clients} · Staff {r.people}</div></div>)}
      {tab === "partners" && ceoPartners.map((p) => <div key={p.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-3"><div className="text-sm"><b>{p.name}</b><div className="text-xs text-muted-foreground">{p.cap} −{p.discount * 100}% cost · {money(p.monthly)}/30d · {p.risk}</div></div>{c.partners.includes(p.id) ? <span className="text-xs text-primary">Active</span> : <Button size="sm" disabled={s.agencyCash < p.deposit} onClick={() => act((d, f) => K.joinPartner(d, f, p.id))}>{money(p.deposit)}</Button>}</div>)}
    </div>
  );
}
void ceoRoles;

function PitchBox() {
  const p = useGame((x) => x.ceo!.pitch!);
  const opts = { focus: ["performance", "creative", "cost", "strategy"], evidence: ["research", "portfolio"], team: ["balanced", "specialist", "lean"], price: ["standard", "premium", "discount"] } as const;
  return <div className="space-y-2 rounded-xl border border-primary bg-card p-3"><b>Pitch · {p.id}</b>
    {p.step === "prepare" && <>{(Object.keys(opts) as (keyof typeof opts)[]).map((k) => <div key={k}><div className="text-xs capitalize">{k}</div><div className="flex flex-wrap gap-1">{opts[k].map((v) => <button key={v} onClick={() => act((d) => K.setPitch(d, k, v))} className={`rounded-full px-2 py-0.5 text-xs ${p[k] === v ? "bg-primary text-primary-foreground" : "bg-muted"}`}>{v}</button>)}</div></div>)}<Button className="w-full" onClick={() => act(K.presentPitch)}>Present pitch · 600k</Button></>}
    {p.step === "objection" && <><p className="text-sm">Objection: {p.objection}</p><div className="grid grid-cols-2 gap-2">{[["evidence", "Show evidence"], ["cut", "Offer fee cut"], ["creative", "Show creative"], ["promise", "Promise results"]].map(([a, t]) => <Button key={a} size="sm" variant="outline" onClick={() => act((d) => K.answerPitch(d, a))}>{t}</Button>)}</div></>}
    {p.step === "result" && p.result && <><p className="text-sm">You {p.result.playerScore} vs {p.result.topRival} {p.result.topScore}. {p.result.explanation}</p>{p.result.winner === "player" ? <Button className="w-full" onClick={() => act(K.beginNegotiation)}>Negotiate contract</Button> : <Button className="w-full" variant="outline" onClick={() => act(K.closePitch)}>Close</Button>}</>}
  </div>;
}
function NegBox() {
  const s = useGame((x) => x); const n = s.ceo!.negotiation!; const l = s.ceo!.leads.find((x) => x.id === n.id)!; const t = K.terms(s, n, l);
  return <div className="space-y-2 rounded-xl border border-primary bg-card p-3"><b>Negotiation · round {n.round}</b><Row k="Fee" v={money(n.fee)} /><Row k="Scope / advance / days" v={`${n.scope} / ${n.advance}% / ${n.deadline}`} /><Row k="Forecast margin" v={money(t.margin)} /><Row k="Signing chance" v={`${t.prob}%`} />
    <div className="max-h-24 overflow-auto text-xs text-muted-foreground">{n.notes.map((x, i) => <div key={i}>{x}</div>)}</div>
    {n.status === "open" ? <div className="grid grid-cols-2 gap-2">{[["maintain", "Hold terms"], ["discount", "−9% fee"], ["scope", "Cut scope"], ["bonus", "KPI bonus"], ["advance", "Lower advance"], ["deadline", "+5 days"], ...(n.counter ? [["accept", "Accept counter"]] : []), ["walk", "Walk away"]].map(([a, x]) => <Button key={a} size="sm" variant={a === "accept" ? "default" : "outline"} onClick={() => act((d, f) => K.counter(d, f, a))}>{x}</Button>)}</div>
      : <Button className="w-full" variant="outline" onClick={() => act(K.closeNegotiation)}>Close ({n.status})</Button>}
  </div>;
}