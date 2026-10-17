// Agency CEO simulation — port of ceoTick/ceoDay/ceoProgressProject/pitch/negotiation from V3.1.
import { ceoPartners, ceoRoles, ceoTalent, ceoTaskDefs, clamp, employeeById, employees, money, scenarios } from "./data";
import { newCampaign, newCEO, type CEO, type GameState, type Lead, type Negotiation, type Project, type Task } from "./state";
import type { Fx } from "./store";
import { scoreModel } from "./campaign";
import { ceoRand } from "./data";

export const SECONDS_PER_DAY = 2.2;
const OVERHEAD = 160000;

export function ceoInit(s: GameState): CEO | null {
  if (!s.agencyUnlocked) return null;
  if (!s.ceo) s.ceo = newCEO(s.reputation);
  return s.ceo;
}
const lead = (c: CEO, id: string) => c.leads.find((l) => l.id === id);
const proj = (c: CEO, id: string) => c.projects.find((p) => p.id === id);
const rival = (c: CEO, id: string) => c.rivals.find((r) => r.id === id);
function ledger(c: CEO, what: string, value: number, l = "", status: "paid" | "due" = "paid") {
  c.ledger.unshift({ day: c.day, what, value, lead: l, status }); c.ledger = c.ledger.slice(0, 150);
}
function issue(c: CEO, fx: Fx, type: string, project: string, message: string, choices: string[]) {
  if (c.inbox.some((i) => i.type === type && i.project === project && i.status === "open")) return;
  c.inbox.unshift({ id: "issue-" + ++c.seq, type, project, message, choices, status: "open", day: c.day });
  if (c.pauseOnIssue && ["capacity", "deadline", "bad-margin", "renewal", "cash"].includes(type)) c.speed = 0;
  fx.toast("CEO inbox · " + message);
}
export const openIssues = (c: CEO | null) => c?.inbox.filter((i) => i.status === "open") ?? [];

export function capacity(c: CEO) {
  const busy: Record<string, number> = {};
  for (const p of c.projects) if (p.status === "active") for (const t of p.tasks) if (t.status === "in_progress" && t.employee) busy[t.employee] = (busy[t.employee] || 0) + 1;
  return busy;
}
const wage = (id: string) => (employeeById(id)?.salary ?? 3000000) / 30;
export const dailyPayroll = (s: GameState) => s.staff.reduce((a, id) => a + wage(id), 0);
function available(s: GameState, c: CEO, role: string) { const id = ceoTalent[role], busy = capacity(c); return s.staff.includes(id) && (busy[id] || 0) < 2 ? id : null; }
const partnerFor = (key: string) => (key === "research" ? "research" : key === "creative" ? "production" : key === "media" || key === "kol" ? "media" : null);
function taskCost(c: CEO, t: Task, p: Project) {
  let base = t.cost * (p.scope / 8); const pid = partnerFor(t.key);
  if (pid && c.partners.includes(pid)) base *= 1 - (ceoPartners.find((x) => x.id === pid)?.discount ?? 0);
  return Math.round(base);
}
function schedulePayment(c: CEO, p: Project, amount: number, delay: number, what: string) {
  const value = Math.round(amount); c.totalBilled += value; ledger(c, what, value, p.brand, "due");
  const e = c.ledger[0]; e.due = c.day + delay; e.project = p.id; p.paymentCount++;
}

/** Called by the shared game clock. Returns number of simulated days. */
export function ceoTick(s: GameState, fx: Fx, days: number) {
  const c = ceoInit(s); if (!c || !c.speed) return;
  for (let i = 0; i < days; i++) { ceoDay(s, c, fx); if (!c.speed) break; }
}

export function ceoDay(s: GameState, c: CEO, fx: Fx) {
  c.day++;
  const pay = dailyPayroll(s); s.agencyCash -= pay; c.totalPayroll += pay; ledger(c, "Daily payroll", -pay, "agency");
  s.agencyCash -= OVERHEAD; ledger(c, "Office overhead", -OVERHEAD, "agency");
  const active = c.projects.filter((p) => p.status === "active");
  for (const ap of active) { ap.payrollAllocated = (ap.payrollAllocated || 0) + pay / active.length; ap.overheadAllocated = (ap.overheadAllocated || 0) + OVERHEAD / active.length; }
  if (c.day % 30 === 0) for (const pid of c.partners) { const sp = ceoPartners.find((x) => x.id === pid)!; s.agencyCash -= sp.monthly; ledger(c, "Partner retainer · " + sp.name, -sp.monthly, "agency"); }
  for (const p of c.projects) if (p.status === "active") { p.days++; progressProject(s, c, p, fx); }
  for (const x of c.ledger) if (x.status === "due" && (x.due ?? 0) <= c.day) { x.status = "paid"; s.agencyCash += x.value; c.totalPaid += x.value; issue(c, fx, "payment", x.lead + x.day, `Received ${money(x.value)} from ${x.lead}`, ["acknowledge"]); }
  if (c.day % 8 === 0) for (const r of c.rivals) {
    const bias = (r.people - r.clients * 2) / 70, u = ceoRand(r.id + c.day);
    if (u < 0.45 + bias) { r.clients++; r.cash += Math.round(1500000 * r.price); r.rep = clamp(r.rep + 0.35, 20, 99); }
    else if (u > 0.84) { r.clients = Math.max(1, r.clients - 1); r.rep = clamp(r.rep - 0.8, 20, 99); }
    if (r.cash > 15000000 && u < 0.19) { r.people++; r.cash -= 9000000; }
    r.aggression = clamp(r.aggression + (ceoRand(c.day + r.name) - 0.5) * 0.03, 0.3, 0.95);
  }
  if (s.agencyCash < 0) issue(c, fx, "cash", "agency", "Agency cash flow is negative — improve liquidity.", ["finance"]);
}

function progressProject(s: GameState, c: CEO, p: Project, fx: Fx) {
  const busy = capacity(c);
  for (const t of p.tasks) {
    if (t.status === "backlog" && t.pre.every((k) => p.tasks.find((q) => q.key === k)?.status === "completed")) { t.status = "assigned"; t.assignedDay = c.day; }
    if (t.status === "assigned") {
      const m = available(s, c, t.role);
      if (m) { t.employee = m; t.status = "in_progress"; t.startedDay = c.day; }
      else if (!t.outsourced) { issue(c, fx, "capacity", p.id, `No ${ceoRoles[t.role]} free for ${p.brand}. Outsource or hire.`, ["outsource", "wait"]); continue; }
    }
    if (t.status === "in_progress") {
      const fit = t.employee === ceoTalent[t.role] || t.outsourced, load = busy[t.employee ?? ""] || 0, skill = fit ? 1.12 : 0.58;
      const pid = partnerFor(t.key), boost = pid && c.partners.includes(pid) ? 1.08 : 1;
      t.progress = Number(Math.min(t.effort, t.progress + (skill * boost) / (load > 1 ? 1.5 : 1)).toFixed(2));
      if (t.progress >= t.effort) {
        t.progress = t.effort; t.status = "review"; t.reviewDay = c.day;
        t.quality = clamp(Math.round(57 + 18 * (fit ? 1 : 0) + 10 * ceoRand(p.id + t.key) + p.pitchQuality * 0.1 - (load > 1 ? 12 : 0) - (p.days > p.duration ? 10 : 0)), 20, 98);
      }
    } else if (t.status === "review" && c.day > (t.reviewDay ?? 0)) {
      if (t.quality < 61 && !t.revised) { t.revised = true; t.progress = t.effort * 0.4; t.status = "in_progress"; t.quality += 10; }
      else { t.status = "completed"; t.doneDay = c.day; const cost = taskCost(c, t, p); p.direct += cost; c.totalDirect += cost; s.agencyCash -= cost; ledger(c, "Delivery cost · " + t.label, -cost, p.brand); applyTask(p, t); }
    }
  }
  if (p.days > p.duration - 6 && !p.deadlineIssue && p.tasks.some((t) => t.status !== "completed")) { p.deadlineIssue = true; issue(c, fx, "deadline", p.id, `Deadline risk on ${p.brand}. Extend or add resources.`, ["extend", "outsource"]); }
  if (p.days >= p.duration * 0.55 && !p.midpoint) { p.midpoint = true; schedulePayment(c, p, p.fee * 0.3, 2, "Mid-project milestone"); }
  if (p.tasks.every((t) => t.status === "completed") && p.days >= Math.max(10, Math.floor(p.duration * 0.6))) finishProject(s, c, p, fx);
}

function applyTask(p: Project, t: Task) {
  const co = p.campaign, sc = scenarios[p.scenarioIndex];
  if (t.key === "research") { co.research = ["audit", "reviews", "interview"]; co.survey = { audience: sc.trueSegment, sample: 120, question: "barrier" }; co.insight = t.quality >= 64 ? sc.trueInsight : "value"; co.phase = "strategy"; }
  if (t.key === "strategy") { co.strategy = { segment: t.quality >= 65 ? sc.trueSegment : "everyone", objective: sc.trueObjective, position: t.quality >= 65 ? sc.truePosition : "budget" }; co.phase = "creative"; }
  if (t.key === "creative") { co.creative = t.quality >= 68 ? sc.trueCreative : "discount"; co.phase = "media"; }
  if (t.key === "media") { const b = sc.budget; co.media = { paid: Math.round(b * 0.46), creator: Math.round(b * 0.34), promo: Math.round(b * 0.13), flyer: Math.round(b * 0.07) }; co.spent = b; co.phase = "live"; p.mediaSpent = Math.round(p.adBudget * 0.88); p.mediaReserved = p.adBudget - p.mediaSpent; }
  if (t.key === "kol") { p.kolQuality = t.quality; p.mediaSpent = Math.min(p.adBudget, p.mediaSpent + Math.round(p.adBudget * 0.06)); p.mediaReserved = p.adBudget - p.mediaSpent; }
  if (t.key === "analytics") { p.reportQuality = t.quality; co.optimization = "retarget"; co.phase = "results"; }
}

function finishProject(s: GameState, c: CEO, p: Project, fx: Fx) {
  p.status = "completed"; p.completedDay = c.day;
  const score = scoreModel(s, p.campaign, "final"), overdue = Math.max(0, p.days - p.duration);
  p.kpi = clamp(Math.round(score.pct - overdue * 1.7 + (p.kolQuality || 60) / 20), -20, 90);
  p.quality = Math.round(p.tasks.reduce((v, t) => v + t.quality, 0) / p.tasks.length);
  p.margin = Math.round(p.fee - p.direct - (p.payrollAllocated || 0) - (p.overheadAllocated || 0));
  if (p.bonus && p.kpi >= p.target) schedulePayment(c, p, p.bonus, 10, "Earned KPI performance bonus");
  p.clientTrust = clamp(48 + p.kpi * 0.35 + p.quality * 0.12 - overdue * 2, 10, 95);
  c.history.unshift({ id: p.id, brand: p.brand, kpi: p.kpi, profit: p.margin, quality: p.quality, day: c.day });
  s.history.push({ brand: p.brand, outcome: p.kpi, score: p.quality, spent: p.mediaSpent, rep: Math.round(p.clientTrust / 15), xp: 7, scenarioIndex: p.scenarioIndex, agency: true });
  s.reputation += Math.round((p.clientTrust - 55) / 11); s.expertise += 7; c.reputation.overall = s.reputation;
  c.reputation.industries[p.industry] = clamp((c.reputation.industries[p.industry] || 45) + (p.clientTrust >= 60 ? 4 : -4), 0, 100);
  c.reputation.reliability = clamp(c.reputation.reliability + (p.days <= p.duration ? 3 : -5), 0, 100);
  c.reputation.performance = clamp(c.reputation.performance + (p.kpi >= p.target ? 4 : -4), 0, 100);
  c.reputation.creative = clamp(c.reputation.creative + (p.quality >= 70 ? 3 : -2), 0, 100);
  schedulePayment(c, p, p.fee * 0.4, 7, "Final milestone — payment due");
  issue(c, fx, "renewal", p.id, `${p.brand} wrapped (${p.kpi >= 0 ? "+" : ""}${p.kpi}% KPI, margin ${money(p.margin)}). Renew?`, ["renew", "close"]);
  fx.log(`CEO: completed ${p.brand}; ${p.kpi}% KPI`);
}

/** When the agency is founded mid-campaign, the open freelance campaign is handed to the team (V3.1 ceoMigrateLegacy). */
export function ceoMigrateLegacy(s: GameState, fx: Fx) {
  const c = ceoInit(s); if (!c || c.legacyCampaignMigration === 1) return;
  c.legacyCampaignMigration = 1;
  const old = s.campaign; if (!old || old.phase === "results" || old.final) return;
  const sc = scenarios[old.scenarioIndex % scenarios.length];
  const prog = ["brief", "research", "survey", "validation", "strategy", "creative", "media", "live", "results"].indexOf(old.phase);
  const done: Record<string, boolean> = { account: prog >= 1, research: prog >= 4, strategy: prog >= 5, creative: prog >= 6, media: prog >= 7, kol: prog >= 7, analytics: prog >= 8 };
  const tasks: Task[] = ceoTaskDefs.map((t) => ({ ...t, status: done[t.key] ? "completed" : "backlog", progress: done[t.key] ? t.effort : 0, quality: done[t.key] ? 76 : 0, employee: done[t.key] ? "legacy" : null, outsourced: false }));
  const p: Project = { id: "legacy-" + ++c.seq, leadId: "legacy", brand: sc.brand, adBudget: sc.budget, fee: sc.fee, bonus: 0, scope: 2, duration: Math.max(14, sc.days), industry: sc.industry, days: Math.max(0, old.day - 1), status: "active", scenarioIndex: old.scenarioIndex, startedDay: c.day, target: sc.target, pitchQuality: 70, mediaSpent: Math.min(sc.budget, old.spent), mediaReserved: Math.max(0, sc.budget - old.spent), direct: 0, campaign: structuredClone(old), tasks, paymentCount: 0, legacy: true, clientTrust: 60 };
  c.projects.push(p); schedulePayment(c, p, sc.fee * 0.3, 0, "Migrated client advance");
  const e = c.ledger[0]; e.status = "paid"; c.totalPaid += e.value; s.agencyCash += e.value;
  fx.log(`Handed ${sc.brand} campaign to the agency team. Founder no longer executes tasks.`);
}

// ---------- CEO decisions ----------
export function hire(s: GameState, fx: Fx, id: string) {
  const e = employees.find((x) => x.id === id);
  if (!e || s.staff.includes(id) || s.agencyCash < e.salary) return;
  s.staff.push(id); fx.log(`Hired ${e.name} — ${e.role}`); fx.toast(`${e.name} joined the team`);
}
export function setSpeed(s: GameState, speed: number) { const c = ceoInit(s); if (c) c.speed = speed; }
export function qualify(s: GameState, fx: Fx, id: string) {
  const c = ceoInit(s)!, l = lead(c, id); if (!l || !["new", "renewal"].includes(l.status)) return;
  if (s.agencyCash < 180000) return fx.toast("Not enough cash to qualify this lead");
  s.agencyCash -= 180000; ledger(c, "Lead qualification cost", -180000, l.brand); l.status = "qualified"; l.insightKnown = true; c.day++; fx.log("Qualified opportunity · " + l.brand);
}
export function decline(s: GameState, id: string) { const l = lead(ceoInit(s)!, id); if (l && ["new", "qualified", "renewal"].includes(l.status)) l.status = "declined"; }
export function startPitch(s: GameState, fx: Fx, id: string) {
  const c = ceoInit(s)!, l = lead(c, id); if (!l || l.status !== "qualified") return;
  if (s.agencyCash < 500000) return fx.toast("Need at least 500,000đ for pitch preparation");
  s.agencyCash -= 500000; ledger(c, "Pitch team preparation", -500000, l.brand); l.status = "pitch";
  c.pitch = { id, focus: "performance", price: "standard", team: "balanced", evidence: "research", step: "prepare", quality: 0, objection: null, result: null };
}
export function setPitch(s: GameState, key: "focus" | "price" | "team" | "evidence", v: string) { const p = ceoInit(s)!.pitch; if (p?.step === "prepare") p[key] = v; }
export function presentPitch(s: GameState) {
  const c = ceoInit(s)!, p = c.pitch, l = p && lead(c, p.id); if (!l || !p || p.step !== "prepare") return;
  const cap = s.staff.length * 13 + Math.min(10, s.upgrades.length * 2);
  const evidence = p.evidence === "research" ? 11 : 5, focus = p.focus === l.pref ? 17 : 8;
  const team = p.team === "specialist" && s.staff.length >= 4 ? 12 : p.team === "balanced" ? 8 : 5;
  const scale = p.price === "discount" ? -2 : p.price === "premium" ? 4 : 8;
  p.quality = clamp(27 + focus + evidence + team + cap * 0.31 + scale + s.reputation / 12 - l.difficulty * 0.17, 15, 98);
  p.step = "objection";
  p.objection = l.pref === "cost" ? "The CFO demands a fee cut of at least 10%." : l.pref === "creative" ? "The Brand Director doubts your creative differentiation." : "The Marketing Director wants clearer KPIs and measurement.";
  s.agencyCash -= 600000; ledger(c, "Pitch presentation & materials", -600000, l.brand); c.day += 2;
}
export function answerPitch(s: GameState, answer: string) {
  const c = ceoInit(s)!, p = c.pitch, l = p && lead(c, p.id); if (!l || !p || p.step !== "objection") return;
  p.quality += answer === "evidence" ? (l.pref === "performance" ? 10 : 4) : answer === "cut" ? (l.pref === "cost" ? 9 : 2) : answer === "creative" ? (l.pref === "creative" ? 10 : 3) : answer === "promise" ? 5 : 0;
  const comps = l.rivalIds.map((id) => {
    const r = rival(c, id)!, fit = l.pref === "performance" ? r.performance : l.pref === "creative" ? r.creative : l.pref === "cost" ? 95 / r.price : r.strategy;
    return { id, name: r.name, evaluation: clamp(r.rep * 0.26 + fit * 0.44 + Math.min(18, r.people * 0.25) + Math.round((1.3 - r.price) * 13) + ceoRand(l.id + r.id + c.day) * 6, 0, 99) };
  });
  const playerEval = clamp(p.quality + ceoRand("pitch" + l.id + c.day) * 5, 0, 99);
  const top = comps.sort((a, b) => b.evaluation - a.evaluation)[0];
  const winner = playerEval > top.evaluation ? "player" : top.id;
  p.result = { winner, playerScore: Math.round(playerEval), topRival: top.name, topScore: Math.round(top.evaluation), explanation: winner === "player" ? "Your proposal fits the client's criteria better — move to contract negotiation." : "A rival offered stronger capability, experience or commercial terms." };
  p.step = "result"; l.status = winner === "player" ? "pitch_won" : "lost";
  if (winner !== "player") { const rv = rival(c, winner)!; rv.clients++; rv.rep = clamp(rv.rep + 1, 0, 100); l.lostTo = rv.name; } else l.relationship += 6;
}
export function closePitch(s: GameState) { const c = ceoInit(s)!; if (c.pitch?.step === "result" && c.pitch.result?.winner !== "player") c.pitch = null; }
export function beginNegotiation(s: GameState) {
  const c = ceoInit(s)!, l = c.pitch && lead(c, c.pitch.id); if (!l || l.status !== "pitch_won") return;
  l.status = "negotiating"; c.negotiation = { id: l.id, round: 1, fee: l.fee, scope: l.scope, advance: 30, deadline: l.duration, bonus: 0, trust: l.relationship, notes: ["Pitch won. Contract negotiation begins."], status: "open", counter: null };
}
export function forecast(s: GameState, n: Pick<Negotiation, "fee" | "scope" | "deadline">) {
  const base = ceoTaskDefs.reduce((v, t) => v + t.cost, 0) * (n.scope / 8), payroll = dailyPayroll(s) * n.deadline, overhead = n.deadline * OVERHEAD;
  const outsourcing = ceoTaskDefs.filter((t) => !s.staff.includes(ceoTalent[t.role])).reduce((a, t) => a + t.cost * 2.1, 0);
  return { margin: Math.round(n.fee - base - payroll - overhead - outsourcing), payroll: Math.round(payroll), direct: Math.round(base + outsourcing), overhead };
}
export function terms(s: GameState, n: Negotiation, l: Lead) {
  return { margin: forecast(s, n).margin, prob: clamp(Math.round(58 + (n.trust - 50) * 0.65 - ((n.fee - l.fee) / l.fee) * 70 + (n.advance - 30) / 5 + Math.min(8, (n.deadline - l.duration) * 1.2) - (n.scope - l.scope) * 3), 8, 94) };
}
export function counter(s: GameState, fx: Fx, action: string) {
  const c = ceoInit(s)!, n = c.negotiation; if (!n || n.status !== "open") return; const l = lead(c, n.id)!;
  if (action === "walk") { n.status = "walked"; l.status = "declined"; n.notes.push("Agency walked away to protect capacity."); return; }
  if (action === "accept" && n.counter) { Object.assign(n, n.counter); n.counter = null; return sign(s, fx); }
  if (action === "maintain") { n.trust -= 5; n.notes.push("Held current terms; client needs more business reasons."); }
  if (action === "discount") { n.fee = Math.round(n.fee * 0.91); n.trust += 5; n.notes.push("Cut fee 9% — margin shrinks."); }
  if (action === "scope") { n.scope = Math.max(4, n.scope - 2); n.trust += 1; n.notes.push("Cut 2 deliverables, kept price."); }
  if (action === "bonus") { n.fee = Math.round(n.fee * 0.94); n.bonus += Math.round(l.fee * 0.1); n.trust += 3; n.notes.push("Fixed fee −6%, added KPI-risk bonus."); }
  if (action === "advance") { n.advance = Math.max(10, n.advance - 10); n.trust += 4; n.notes.push("Lowered advance payment; cash-flow risk rises."); }
  if (action === "deadline") { n.deadline += 5; n.trust -= 2; n.notes.push("Proposed +5 days delivery time."); }
  n.round++; c.day++;
  const ch = terms(s, n, l), roll = ceoRand(l.id + "neg" + n.round + action + Math.round(n.fee / 1e6));
  if (roll < ch.prob / 100 && n.round >= 3) return sign(s, fx);
  if (n.round >= 5 || n.trust < 20) { n.status = "lost"; l.status = "lost"; n.notes.push("No agreement; client went another way."); rival(c, l.rivalIds[0])!.clients++; return; }
  n.counter = { fee: Math.round(n.fee * 0.94), scope: n.scope, advance: Math.min(n.advance, 25), deadline: n.deadline };
  n.notes.push(`Round ${n.round}: ${l.stakeholder} asks for −6% fee and max 25% advance.`);
}
export function sign(s: GameState, fx: Fx) {
  const c = ceoInit(s)!, n = c.negotiation; if (!n || n.status !== "open") return; const l = lead(c, n.id)!;
  if (forecast(s, n).margin < 0 && n.round < 3) { issue(c, fx, "bad-margin", l.id, `Proposal risks a loss: ${l.brand}.`, ["review"]); return; }
  n.status = "signed"; l.status = "signed";
  const p: Project = { id: "project-" + ++c.seq, leadId: l.id, brand: l.brand, adBudget: l.value, fee: n.fee, bonus: n.bonus, scope: n.scope, duration: n.deadline, industry: l.industry, days: 0, status: "active", scenarioIndex: l.scenario, startedDay: c.day, target: l.target, pitchQuality: c.pitch?.quality || 65, mediaSpent: 0, mediaReserved: l.value, direct: 0, campaign: newCampaign(l.scenario), tasks: ceoTaskDefs.map((t) => ({ ...t, status: "backlog", progress: 0, quality: 0, employee: null, outsourced: false })), paymentCount: 0 };
  c.projects.push(p); schedulePayment(c, p, (n.fee * n.advance) / 100, 0, "Contract advance");
  const e = c.ledger[0]; e.status = "paid"; c.totalPaid += e.value; s.agencyCash += e.value;
  fx.log(`Signed ${l.brand} · service fee ${money(n.fee)}`); issue(c, fx, "signed", p.id, `Signed ${l.brand}. The team runs the campaign from tomorrow.`, ["acknowledge"]);
  c.pitch = null;
}
export function closeNegotiation(s: GameState) { const c = ceoInit(s)!; if (c.negotiation && c.negotiation.status !== "open") { c.negotiation = null; c.pitch = null; } }
export function resolveIssue(s: GameState, fx: Fx, id: string, choice: string) {
  const c = ceoInit(s)!, i = c.inbox.find((x) => x.id === id); if (!i || i.status !== "open") return; const p = proj(c, i.project);
  if (i.type === "capacity" && p && choice === "outsource") {
    const t = p.tasks.find((x) => x.status === "assigned" && !x.employee);
    if (t) { const fee = Math.round(t.cost * 2.1 * (p.scope / 8)); if (s.agencyCash < fee) return fx.toast("Not enough cash to outsource: " + money(fee));
      s.agencyCash -= fee; p.direct += fee; c.totalDirect += fee; ledger(c, "Outsourced specialist · " + t.label, -fee, p.brand); t.outsourced = true; t.employee = "external"; t.status = "in_progress"; t.startedDay = c.day; t.cost = 0; }
  }
  if (i.type === "deadline" && p) { if (choice === "extend") { p.duration += 6; p.clientTrust = (p.clientTrust || 50) - 4; } else if (choice === "outsource") { p.tasks.filter((t) => t.status === "in_progress").forEach((t) => (t.progress = Math.min(t.effort, t.progress + 1.2))); s.agencyCash -= 850000; ledger(c, "Emergency delivery support", -850000, p.brand); } }
  if (i.type === "renewal" && p) { const ld = lead(c, p.leadId); if (choice === "renew" && ld && (p.clientTrust ?? 0) >= 55) { c.leads.push({ ...ld, id: ld.id + "-renew-" + c.day, status: "renewal", fee: Math.round(ld.fee * 0.88), value: Math.round(ld.value * 0.85), relationship: Math.round(p.clientTrust ?? 55), duration: Math.max(20, ld.duration - 3), scope: Math.max(5, ld.scope - 2) }); fx.toast("Renewal opportunity added to Pipeline"); } else if (choice === "renew") fx.toast("Client isn't satisfied enough to renew."); }
  i.status = "resolved"; i.resolution = choice;
  if (c.speed === 0 && openIssues(c).every((x) => !["capacity", "deadline", "bad-margin", "renewal", "cash"].includes(x.type))) c.speed = 1;
}
export function joinPartner(s: GameState, fx: Fx, id: string) {
  const c = ceoInit(s)!, p = ceoPartners.find((v) => v.id === id); if (!p || c.partners.includes(id) || s.agencyCash < p.deposit) return;
  s.agencyCash -= p.deposit; ledger(c, "Strategic partnership · " + p.name, -p.deposit, "agency"); c.partners.push(id); fx.toast("Partnership signed: " + p.name);
}