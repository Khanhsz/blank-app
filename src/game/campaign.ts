// Freelance campaign loop — direct port of surveyQuality / scoreModel / finalize from V3.1.
import { AGENCY_REQ, COWORK_COST, clamp, creatives, hash, insights, money, optimizations, researchOptions, scenarios, surveyCosts, upgrades, type Channel, type UpgradeId } from "./data";
import { newCampaign, type Campaign, type GameState, type ScoreResult } from "./state";
import type { Fx } from "./store";
import { ceoInit, ceoMigrateLegacy } from "./ceo";

export const scenarioOf = (c: Campaign) => scenarios[c.scenarioIndex % scenarios.length];
export const playerMoney = (s: GameState) => (s.agencyUnlocked ? s.agencyCash : s.personalCash);
const canPay = (s: GameState, v: number) => s.campaign.spent + v <= scenarioOf(s.campaign).budget;

export function surveyQuality(s: GameState, c: Campaign = s.campaign) {
  if (!c.survey) return 0;
  const sc = scenarioOf(c);
  return clamp(
    (c.survey.sample === 120 ? 0.35 : c.survey.sample === 60 ? 0.25 : 0.08) +
      (c.survey.audience === sc.trueSegment ? 0.43 : c.survey.audience === "everyone" ? 0.07 : 0.15) +
      (c.survey.question === "barrier" ? 0.2 : 0.04) + (s.upgrades.includes("research") ? 0.1 : 0),
    0.1, 1,
  );
}

export function surveyResults(s: GameState) {
  const c = s.campaign, sc = scenarioOf(c), q = surveyQuality(s);
  const base = Math.round(30 + q * 42 + hash(c.scenarioIndex * 9 + (c.survey?.sample ?? 0)) * 9);
  return { primary: clamp(base, 22, 82), other: clamp(Math.round((100 - base) * 0.58), 8, 58), quality: Math.round(q * 100), reason: insights.find((x) => x.id === sc.trueInsight)?.title ?? "" };
}

export function scoreModel(s: GameState, c: Campaign, mode: "final" | "interim" = "final"): ScoreResult {
  const sc = scenarioOf(c);
  const fit = { insight: +(c.insight === sc.trueInsight), segment: +(c.strategy.segment === sc.trueSegment), position: +(c.strategy.position === sc.truePosition), objective: +(c.strategy.objective === sc.trueObjective), creative: +(c.creative === sc.trueCreative) };
  const research = c.research.reduce((a, id) => a + (researchOptions.find((x) => x.id === id)?.quality ?? 0), 0);
  let qual = 0.46 + 0.055 * Math.min(3, research) + 0.11 * surveyQuality(s, c) + 0.12 * fit.insight + 0.11 * fit.segment + 0.08 * fit.position + 0.085 * fit.objective + 0.11 * fit.creative - Math.max(0, c.day - 7) * 0.012;
  if (s.upgrades.includes("creative")) qual += 0.025;
  let eff = (Object.entries(c.media) as [Channel, number][]).reduce((t, [k, v]) => t + v * (sc.channel[k] ?? 0.7), 0);
  if (s.upgrades.includes("influencer")) eff += c.media.creator * 0.05;
  if (s.upgrades.includes("media")) eff += c.media.paid * 0.045;
  if (mode === "interim") eff *= 0.49;
  const optBonus = mode === "final" ? ({ refresh: fit.creative ? 3 : 5, retarget: c.media.paid > 0 ? 6 : 0, promo: c.media.promo > 0 ? 3 : 1, hold: 0 } as Record<string, number>)[c.optimization ?? ""] ?? 0 : 0;
  const seed = hash(c.scenarioIndex * 13 + (c.survey?.sample ?? 0) + c.research.length * 7) * 5 - 2.5;
  const pct = Math.round(clamp((eff / 1e6) * 5.6 * qual - (mode === "final" ? 9 : 6) + optBonus + seed, -12, 85));
  const total = Object.values(c.media).reduce((a, b) => a + b, 0);
  return { pct, outcome: Math.round(sc.baseline * (1 + pct / 100)), adReach: Math.round((total / 1000) * 11.2 * qual * (mode === "interim" ? 0.51 : 1)), quality: Math.round(qual * 100), fit, performance: pct >= sc.target ? "target" : pct >= sc.target * 0.7 ? "near" : "under" };
}

// ---- Actions (all mutate a draft inside act()) ----
export const acceptBrief = (s: GameState, fx: Fx) => { if (s.campaign.phase !== "brief") return; s.campaign.phase = "research"; fx.log("Accepted brief from " + scenarioOf(s.campaign).brand); };

export function addResearch(s: GameState, fx: Fx, id: string) {
  const c = s.campaign, r = researchOptions.find((x) => x.id === id);
  if (!r || c.phase !== "research" || c.research.includes(id)) return;
  if (!canPay(s, r.cost)) return fx.toast("Not enough client budget left");
  c.research.push(id); c.spent += r.cost; c.day += r.days; fx.log(`Research: ${r.title} (${money(r.cost)})`);
}
export const toSurvey = (s: GameState) => { if (s.campaign.phase === "research" && s.campaign.research.length) s.campaign.phase = "survey"; };
export function runSurvey(s: GameState, fx: Fx, sv: { audience: string; sample: number; question: string }) {
  const c = s.campaign, cost = surveyCosts[sv.sample];
  if (c.phase !== "survey" || c.survey || !canPay(s, cost)) return;
  c.survey = { ...sv }; c.spent += cost; c.day += 2; fx.log(`Survey of ${sv.sample} people · ${money(cost)}`);
}
export const toValidation = (s: GameState) => { if (s.campaign.survey) s.campaign.phase = "validation"; };
export function confirmInsight(s: GameState, fx: Fx, id: string) { if (s.campaign.phase !== "validation") return; s.campaign.insight = id; s.campaign.phase = "strategy"; fx.log("Insight hypothesis: " + insights.find((x) => x.id === id)?.title); }
export function confirmStrategy(s: GameState, fx: Fx, st: Campaign["strategy"]) { if (s.campaign.phase !== "strategy") return; s.campaign.strategy = { ...st }; s.campaign.phase = "creative"; fx.log("Strategy locked"); }
export function confirmCreative(s: GameState, fx: Fx, id: string) {
  const c = s.campaign, k = creatives.find((x) => x.id === id);
  if (c.phase !== "creative" || !k) return;
  if (!canPay(s, k.cost)) return fx.toast("Not enough client budget left");
  c.creative = k.id; c.spent += k.cost; c.day += 2; c.phase = "media"; fx.log(`Produced concept: ${k.title} (${money(k.cost)})`);
}
export function launch(s: GameState, fx: Fx, media: Record<Channel, number>) {
  const c = s.campaign, total = Object.values(media).reduce((a, b) => a + b, 0);
  if (c.phase !== "media" || total < 500000 || total > scenarioOf(c).budget - c.spent) return;
  c.media = { ...media }; c.spent += total; c.day = Math.max(c.day, 7); c.phase = "live"; c.liveMetrics = scoreModel(s, c, "interim");
  fx.log(`Campaign live! Media ${money(total)}`);
}
export function optimize(s: GameState, fx: Fx, choice: string) {
  const c = s.campaign, o = optimizations.find((x) => x.id === choice);
  if (c.phase !== "live" || !o) return;
  if (!canPay(s, o.cost)) return fx.toast("Remaining budget too low — hold the plan.");
  c.spent += o.cost; c.optimization = choice; c.phase = "results"; finalize(s, fx);
}
export function finalize(s: GameState, fx: Fx) {
  const c = s.campaign, sc = scenarioOf(c);
  if (c.final) return;
  const r = scoreModel(s, c, "final");
  const qualityScore = clamp(Math.round(34 + r.quality * 0.34 + r.pct * 0.55 + (r.fit.insight + r.fit.segment + r.fit.objective) * 3), 15, 99);
  const rep = clamp(Math.round(6 + qualityScore / 6), 6, 25), xp = clamp(Math.round(4 + qualityScore / 12), 5, 13);
  s.personalCash += sc.fee; s.reputation += rep; s.expertise += xp; c.day = sc.days;
  c.final = { ...r, qualityScore, rep, xp }; c.phase = "results";
  s.history.push({ brand: sc.brand, outcome: r.pct, score: qualityScore, spent: c.spent, rep, xp, scenarioIndex: c.scenarioIndex, agency: false });
  fx.log(`Delivered results: ${r.pct}% KPI, +${rep} REP, +${xp} XP`);
  if (!s.cityUnlocked) { s.cityUnlocked = true; fx.toast("Marketing City unlocked — new opportunities await"); fx.log("UNLOCKED: Marketing City"); }
  else fx.toast("Campaign closed — portfolio updated");
}
export function nextClient(s: GameState, fx: Fx) {
  if (s.agencyUnlocked || s.campaign.phase !== "results") return;
  const next = (s.campaign.scenarioIndex + 1) % 3;
  s.campaign = newCampaign(next); fx.log("New brief from " + scenarios[next].brand); fx.toast("New brief: " + scenarios[next].brand);
}
export function buyUpgrade(s: GameState, fx: Fx, id: UpgradeId | "cowork") {
  const item = id === "cowork" ? { cost: COWORK_COST, name: "Coworking Membership" } : upgrades[id];
  if (!item || s.upgrades.includes(id) || playerMoney(s) < item.cost) return;
  if (s.agencyUnlocked) s.agencyCash -= item.cost; else s.personalCash -= item.cost;
  s.upgrades.push(id); if (id === "cowork") s.expertise += 1;
  fx.log("Unlocked city service: " + item.name); fx.toast("Unlocked: " + item.name);
}
export const agencyReqs = (s: GameState) => [
  { name: "Complete 3 campaigns", ok: s.history.length >= AGENCY_REQ.campaigns, num: `${s.history.length}/3` },
  { name: "Reputation 38+", ok: s.reputation >= AGENCY_REQ.reputation, num: `${s.reputation}/38` },
  { name: "Expertise 18+", ok: s.expertise >= AGENCY_REQ.expertise, num: `${s.expertise}/18` },
  { name: "Personal cash 8M", ok: s.personalCash >= AGENCY_REQ.cash, num: `${(s.personalCash / 1e6).toFixed(1)}/8M` },
];
export const canOpenAgency = (s: GameState) => agencyReqs(s).every((r) => r.ok);
export function createAgency(s: GameState, fx: Fx, name: string) {
  if (!canOpenAgency(s) || s.agencyUnlocked) return;
  s.agencyName = name.trim() || "Northstar Studio"; s.personalCash -= 8000000; s.agencyCash = 5000000; s.agencyUnlocked = true; s.scene = "office";
  ceoInit(s); ceoMigrateLegacy(s, fx);
  fx.log(`FOUNDED ${s.agencyName}. Startup capital 5,000,000đ.`); fx.toast("You are now Agency CEO");
}