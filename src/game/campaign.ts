// Freelance campaign loop — direct port of surveyQuality / scoreModel / finalize from V3.1.
import { AGENCY_REQ, COWORK_COST, clamp, creatives, hash, insights, money, optimizations, researchOptions, scenarios, surveyCosts, upgrades, type Channel, type UpgradeId } from "./data";
import { newCampaign, type Campaign, type GameState, type ScoreResult } from "./state";
import type { Fx } from "./store";
import { ceoInit, ceoMigrateLegacy } from "./ceo";
import {getClient} from "./clientDatabase";

export const scenarioOf = (c: Campaign) => c.aiScenario ?? scenarios[c.scenarioIndex % scenarios.length];
/** A brief specifies the actual deadline; stages are suggested windows, not fixed gates. */
export function scheduleOf(c: Campaign) {
  const weeks=Math.max(2,Math.ceil(scenarioOf(c).days/7));
  const planningWeeks=Math.max(1,Math.floor(weeks*0.34));
  const launchWeek=weeks===2?2:Math.floor(weeks/2)+1;
  const executingWeeks=Math.max(0,launchWeek-1-planningWeeks);
  const started=c.startedDay??1;
  return {weeks,planningWeeks,executingWeeks,plannedLaunchDay:started+(launchWeek-1)*7,endDay:started+scenarioOf(c).days,expectedLiveWeeks:Math.max(1,Math.ceil((scenarioOf(c).days-(launchWeek-1)*7)/7))};
}
export const phaseOf=(c:Campaign)=>c.phase==="brief"?"brief":["research","survey","validation","strategy"].includes(c.phase)?"planning":["creative","media"].includes(c.phase)?"executing":c.phase;
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
  const base = Math.round(30 + q * 42 + hash(c.scenarioIndex * 9 + (c.survey?.sample ?? 0) + (c.aiScenario?.aiMeta?.seed ?? 0)) * 9);
  return { primary: clamp(base, 22, 82), other: clamp(Math.round((100 - base) * 0.58), 8, 58), quality: Math.round(q * 100), reason: c.aiScenario ? "Survey signals require interpretation. Compare your research evidence." : insights.find((x) => x.id === sc.trueInsight)?.title ?? "" };
}

export function scoreModel(s: GameState, c: Campaign, mode: "final" | "interim" = "final"): ScoreResult {
  const sc = scenarioOf(c);
  const fit = { insight: +(c.insight === sc.trueInsight), segment: +(c.strategy.segment === sc.trueSegment), position: +(c.strategy.position === sc.truePosition), objective: +(c.strategy.objective === sc.trueObjective), creative: +(c.creative === sc.trueCreative) };
  const research = c.research.reduce((a, id) => a + (researchOptions.find((x) => x.id === id)?.quality ?? 0), 0);
  let qual = 0.46 + 0.055 * Math.min(3, research) + 0.11 * surveyQuality(s, c) + 0.12 * fit.insight + 0.11 * fit.segment + 0.08 * fit.position + 0.085 * fit.objective + 0.11 * fit.creative - Math.max(0, (c.day-(c.startedDay??1)) - 7) * 0.012;
  if (s.upgrades.includes("creative")) qual += 0.025;
  const j=c.journey;
  if(j?.diagnosis){
    const category=sc.trueInsight==="awareness"?"discover":["trust","style","value"].includes(sc.trueInsight)?"hesitate":"convert";
    qual+=j.diagnosis===category?0.025:-0.012;
  }
  if(j?.approach){
    const focus:Channel=j.approach==="reach"?"paid":j.approach==="proof"?"creator":"promo";
    const allocated=Object.values(c.media).reduce((a,b)=>a+b,0);
    if(allocated>0)qual+=c.media[focus]/allocated>0.26?0.025:-0.014;
  }
  let eff = (Object.entries(c.media) as [Channel, number][]).reduce((t, [k, v]) => t + v * (sc.channel[k] ?? 0.7), 0);
  if (s.upgrades.includes("influencer")) eff += c.media.creator * 0.05;
  if (s.upgrades.includes("media")) eff += c.media.paid * 0.045;
  if (mode === "interim") eff *= 0.49;
  const optBonus = mode === "final" ? ({ refresh: fit.creative ? 3 : 5, retarget: c.media.paid > 0 ? 6 : 0, promo: c.media.promo > 0 ? 3 : 1, hold: 0 } as Record<string, number>)[c.optimization ?? ""] ?? 0 : 0;
  const seed = hash(c.scenarioIndex * 13 + (c.survey?.sample ?? 0) + c.research.length * 7 + (c.aiScenario?.aiMeta?.seed ?? 0)) * 5 - 2.5;
  const pct = Math.round(clamp((eff / 1e6) * 5.6 * qual - (mode === "final" ? 9 : 6) + optBonus + seed, -12, 85));
  const total = Object.values(c.media).reduce((a, b) => a + b, 0);
  return { pct, outcome: Math.round(sc.baseline * (1 + pct / 100)), adReach: Math.round((total / 1000) * 11.2 * qual * (mode === "interim" ? 0.51 : 1)), quality: Math.round(qual * 100), fit, performance: pct >= sc.target ? "target" : pct >= sc.target * 0.7 ? "near" : "under" };
}

// ---- Actions: three brief-driven phases, resolved by the shared weekly clock ----
export const acceptBrief=(s:GameState,fx:Fx)=>{
 const c=s.campaign;if(c.phase!=="brief"||(!c.legacyBrief&&(!c.catalogClientId||!c.aiScenario?.aiPlanning)))return;
 c.startedDay=s.clock.day;c.day=s.clock.day;c.phase="planning";
 fx.log("Accepted brief from "+scenarioOf(c).brand+" · "+scheduleOf(c).weeks+" week schedule");
};
export function addResearch(s:GameState,fx:Fx,id:string){
 const c=s.campaign,r=researchOptions.find(x=>x.id===id);
 if(!r||phaseOf(c)!=="planning"||c.research.includes(id))return;
 if(!canPay(s,r.cost))return fx.toast("Not enough campaign budget for research");
 c.research.push(id);c.spent+=r.cost;fx.log("Research: "+r.title+" ("+money(r.cost)+")");
}
export const toSurvey=(_s:GameState)=>{};
export function runSurvey(s:GameState,fx:Fx,sv:{audience:string;sample:number;question:string}){
 const c=s.campaign,cost=surveyCosts[sv.sample];
 if(phaseOf(c)!=="planning"||c.survey||cost===undefined||!canPay(s,cost))return;
 c.survey={...sv};c.spent+=cost;fx.log("Survey of "+sv.sample+" people · "+money(cost));
}
export const toValidation=(_s:GameState)=>{};
export function confirmInsight(s:GameState,fx:Fx,id:string){
 if(phaseOf(s.campaign)!=="planning")return;
 s.campaign.insight=id;fx.log("Insight hypothesis: "+(insights.find(x=>x.id===id)?.title??id));
}
export function confirmStrategy(s:GameState,fx:Fx,st:Campaign["strategy"]){
 const c=s.campaign;if(phaseOf(c)!=="planning"||!c.insight)return fx.toast("Choose an insight hypothesis first");
 c.strategy={...st};c.phase="executing";fx.log("Strategy approved; production phase begins");
}
export function confirmCreative(s:GameState,fx:Fx,id:string){
 const c=s.campaign,k=creatives.find(x=>x.id===id);
 if(phaseOf(c)!=="executing"||!k||c.creative)return;
 if(!canPay(s,k.cost))return fx.toast("Insufficient campaign budget");
 c.creative=k.id;c.spent+=k.cost;c.productionReadyDay=s.clock.day+7;
 fx.log("Production booked: "+k.title+" · ready after End Week");
}
export function bookMedia(s:GameState,fx:Fx,media:Record<Channel,number>){
 const c=s.campaign,total=Object.values(media).reduce((a,b)=>a+b,0);
 if(phaseOf(c)!=="executing"||c.mediaBooked||total<500000||!canPay(s,total))return fx.toast("Check media allocation and remaining budget");
 c.media={...media};c.spent+=total;c.mediaBooked=true;fx.log("Media booked: "+money(total));
}
export function launch(s:GameState,fx:Fx,legacyMedia?:Record<Channel,number>){
 const c=s.campaign;
 if(legacyMedia&&!c.mediaBooked)bookMedia(s,fx,legacyMedia);
 if(phaseOf(c)!=="executing"||!c.mediaBooked||!c.creative)return fx.toast("Approve creative and book media before launch");
 if(s.clock.day<(c.productionReadyDay??s.clock.day))return fx.toast("Production still underway. End the week to deliver assets.");
 if(s.clock.day>=scheduleOf(c).endDay)return fx.toast("The client's campaign window has closed");
 c.phase="live";c.actualLaunchDay=s.clock.day;c.liveMetrics=null;
 fx.log("Campaign launched on game day "+s.clock.day);
}
export function optimize(s:GameState,fx:Fx,choice:string){
 const c=s.campaign,o=optimizations.find(x=>x.id===choice);
 if(phaseOf(c)!=="live"||!o)return;
 if(c.lastOptimizationWeek===s.clock.week)return fx.toast("One optimization decision per campaign each week.");
 if(!canPay(s,o.cost))return fx.toast("Remaining budget too low — hold the plan.");
 c.spent+=o.cost;c.optimization=choice;c.lastOptimizationWeek=s.clock.week;
 fx.log("Live optimization committed: "+o.title+" · effect evaluated on End Week");
}
export function progressFreelanceWeek(s:GameState,fx:Fx){
 if(s.agencyUnlocked)return;
 const c=s.campaign;if(["brief","results"].includes(c.phase))return;
 c.day=s.clock.day;
 const schedule=scheduleOf(c);
 if(phaseOf(c)==="live"){
  c.liveWeeks=(c.liveWeeks??0)+1;
  const predicted=scoreModel(s,c,"final");
  const delivered=Math.min(1,(c.liveWeeks??0)/schedule.expectedLiveWeeks);
  const uplift=Math.round(predicted.pct*delivered);
  const reach=Math.round(predicted.adReach*delivered);
  c.liveMetrics={...predicted,pct:uplift,adReach:reach,outcome:Math.round(scenarioOf(c).baseline*(1+uplift/100))};
  c.weeklyResults=[...(c.weeklyResults??[]),{week:s.clock.week-1,reach,uplift,decision:c.optimization??"hold"}];
 }
 if(s.clock.day>=schedule.endDay){
  if(phaseOf(c)!=="live")fx.log("Missed campaign launch deadline — client will assess undelivered work");
  finalize(s,fx);
 }
}
export function finalize(s:GameState,fx:Fx){
 const c=s.campaign,sc=scenarioOf(c);if(c.final)return;
 const theoretical=scoreModel(s,c,"final"),schedule=scheduleOf(c);
 const delivered=Math.min(1,(c.liveWeeks??0)/schedule.expectedLiveWeeks);
 const pct=Math.round(clamp(theoretical.pct*delivered-(1-delivered)*20,-30,85));
 const r={...theoretical,pct,outcome:Math.round(sc.baseline*(1+pct/100)),adReach:Math.round(theoretical.adReach*delivered),performance:pct>=sc.target?"target" as const:pct>=sc.target*0.7?"near" as const:"under" as const};
 const qualityScore=clamp(Math.round(34+r.quality*.34+pct*.55+(r.fit.insight+r.fit.segment+r.fit.objective)*3),15,99);
 const rep=clamp(Math.round(6+qualityScore/6),6,25),xp=clamp(Math.round(4+qualityScore/12),5,13);
 s.personalCash+=sc.fee;s.reputation+=rep;s.expertise+=xp;c.day=s.clock.day;
 c.final={...r,qualityScore,rep,xp};c.phase="results";if(c.journey)c.journey.step="report";
 s.history.push({brand:sc.brand,outcome:pct,score:qualityScore,spent:c.spent,rep,xp,scenarioIndex:c.scenarioIndex,agency:false});
 fx.log("Campaign closed: "+pct+"% KPI · "+Math.round(delivered*100)+"% flight delivered");
 if(!s.cityUnlocked){s.cityUnlocked=true;fx.toast("Marketing City unlocked — new opportunities await");}
 else fx.toast("Campaign reviewed — portfolio updated");
}
/** Freelance begins by APPROACHING a real catalog entry (fictional startup/SME).
 * No scenario or fabricated market insight is unlocked until Gemini returns.
 */
export function chooseFreelanceClient(s:GameState,fx:Fx,clientId:string):boolean{
 if(s.agencyUnlocked||s.campaign.phase!=="brief")return false;
 const client=getClient(clientId);
 if(!client||client.segment==="bigcorp")return false;
 const c=s.campaign;
 c.catalogClientId=client.id;
 c.legacyBrief=false;
 c.aiScenario=null;
 c.aiStatus="pending";c.aiError=null;
 c.briefId=newCampaign(c.scenarioIndex,s.clock.day).briefId;
 c.journey={step:"brief",questions:[],diagnosis:null,confidence:0,approach:null,message:"",pitchedCreative:null,pitchFeedback:null,pitchCount:0,mediaPlan:null,review:null};
 fx.log("Approached "+client.segment+" client "+client.brand+" from bedroom · Gemini discovery requested");
 fx.toast("Approaching "+client.brand+" · Gemini preparing the client context");
 return true;
}
export function retryFreelanceApproach(s:GameState,fx:Fx){
 const c=s.campaign;
 if(s.agencyUnlocked||c.phase!=="brief"||!c.catalogClientId||c.aiScenario||c.aiStatus!=="error")return;
 c.aiStatus="pending";c.aiError=null;
 fx.log("Retrying Gemini client approach · "+c.catalogClientId);
}
export function nextClient(s:GameState,fx:Fx){
 if(s.agencyUnlocked||s.campaign.phase!=="results"||(s.campaign.journey&&!s.campaign.journey.review))return fx.toast("Complete the Client Review before requesting another brief.");
 const next=(s.campaign.scenarioIndex+1)%3;
 s.campaign=newCampaign(next,s.clock.day);
 fx.log("Ready to approach a new client from the bedroom at Week "+s.clock.week);
 fx.toast("Choose a Startup or SME to approach from your bedroom computer.");
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
  ceoInit(s); if(s.ceo){s.ceo.day=s.clock.day;s.ceo.weekly=s.clock;} ceoMigrateLegacy(s, fx);
  fx.log(`FOUNDED ${s.agencyName}. Startup capital 5,000,000đ.`); fx.toast("You are now Agency CEO");
}

/** AI only supplies a bounded fictional scenario; deterministic game rules keep the outcome. */
export function activateAIBrief(s:GameState,fx:Fx,sc:import("./data").Scenario){
 if(s.agencyUnlocked||s.campaign.phase!=="brief")return false;
 if(!sc?.id?.startsWith("ai-")||!sc.aiMeta||!["awareness","value","location","trust","style"].includes(sc.trueInsight))return false;
 if(!s.campaign.catalogClientId||sc.aiMeta.clientId!==s.campaign.catalogClientId)return false;
 if(!sc.aiPlanning?.context||!sc.aiPlanning?.insight||!sc.aiPlanning?.strategy||!sc.clientAnswers?.audience)return false;
 if(getClient(s.campaign.catalogClientId)?.brand!==sc.brand)return false;
 if(!Number.isFinite(sc.budget)||sc.budget<8000000||sc.budget>16000000)return false;
 if(!Array.isArray(sc.insightOptions)||sc.insightOptions.length!==5)return false;
 s.campaign.aiScenario=structuredClone(sc);
 fx.log("AI Dynamic Brief: "+sc.brand+" · "+sc.aiMeta.category);
 fx.toast("New fictional AI client brief ready: "+sc.brand);
 return true;
}
