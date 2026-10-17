/**
 * Freelance campaign day-by-day runtime. This is an adapter INTO the existing
 * campaign/scoreModel loop, not a second game, economy, or simulation UI.
 * Synthetic game coefficients: NOT verified media benchmarks.
 */
import { clamp, scenarios, type Channel } from "./data";
import type { Campaign, CampaignRuntime, CampaignDayMetric } from "./state";

const CHANNELS: Channel[] = ["paid", "creator", "promo", "flyer"];
const profile: Record<Channel, { cpm: number; ctr: number; intent: number }> = {
  paid: { cpm: 46000, ctr: .019, intent: .043 },
  creator: { cpm: 58000, ctr: .015, intent: .060 },
  promo: { cpm: 72000, ctr: .014, intent: .065 },
  flyer: { cpm: 28000, ctr: .008, intent: .061 },
};
const fnv = (input: string) => {
  let h = 2166136261;
  for (const char of input) { h ^= char.charCodeAt(0); h = Math.imul(h, 16777619); }
  return h >>> 0;
};
const rand = (seed: number, day: number, salt: string) => fnv(seed + "|" + day + "|" + salt) / 4294967296;
const scenario = (c: Campaign) => c.aiScenario ?? scenarios[c.scenarioIndex % scenarios.length];

/** Existing decisions become input parameters; hidden true fit stays hidden. */
export function decisionFit(c: Campaign): number {
  const s = scenario(c);
  return clamp(.55 +
    (c.strategy.segment === s.trueSegment ? .19 : 0) +
    (c.insight === s.trueInsight ? .14 : 0) +
    (c.creative === s.trueCreative ? .13 : 0) +
    (c.strategy.position === s.truePosition ? .10 : 0) +
    (c.strategy.objective === s.trueObjective ? .10 : 0) +
    (c.research.length ? Math.min(3, c.research.length) * .025 : 0) +
    (c.survey?.question === "barrier" ? .025 : 0), .35, 1.32);
}

export function makeCampaignRuntime(c: Campaign): CampaignRuntime {
  const committed = CHANNELS.reduce((sum, channel) => sum + (c.media[channel] || 0), 0);
  const s = scenario(c);
  return {
    seed: fnv(c.briefId + "|" + c.scenarioIndex),
    duration: Math.max(5, Math.min(21, s.days - c.day + 2)),
    elapsed: 0,
    committedMedia: committed,
    actualMediaSpent: 0,
    awareness: .06,
    adstock: 0,
    days: [],
  };
}

/**
 * Purely advance a single explicit in-game day. No wall-clock timers or API calls.
 * Media committed on launch remains reserved in c.spent; actual spend is tracked
 * separately to avoid double billing the same budget.
 */
export function stepCampaignDay(c: Campaign): CampaignDayMetric | null {
  const sim = c.simulation;
  if (!sim || sim.elapsed >= sim.duration) return null;
  const s = scenario(c);
  const nextDay = sim.elapsed + 1;
  const fit = decisionFit(c);
  const fatigue = clamp(1 - nextDay * .013 + (c.optimization === "refresh" ? .17 : 0), .62, 1.15);
  const competitor = rand(sim.seed, nextDay, "rival");
  const shock = competitor < .15 ? .84 : competitor > .88 ? 1.12 : 1;
  const event = shock < 1 ? "Đối thủ tăng khuyến mãi, hiệu suất thị trường suy giảm" :
    shock > 1 ? "Nhu cầu thị trường tăng, khách hàng phản hồi tốt hơn" : null;
  const channelSpent = { paid: 0, creator: 0, promo: 0, flyer: 0 };
  let impressions = 0, clicks = 0, incremental = 0;
  const remainingDays = sim.duration - sim.elapsed;

  for (const channel of CHANNELS) {
    const committedChannel = Math.max(0, c.media[channel] || 0);
    const spentBefore = sim.days.reduce((sum, d) => sum + d.channelSpent[channel], 0);
    const remaining = Math.max(0, committedChannel - spentBefore);
    const spend = remainingDays === 1 ? remaining : Math.min(remaining, Math.floor(remaining / remainingDays));
    channelSpent[channel] = spend;
    const p = profile[channel];
    const channelAffinity = clamp(s.channel[channel] ?? 1, .4, 1.4);
    const saturation = 1 / (1 + sim.adstock * .045);
    const quality = fit * channelAffinity * shock;
    const imp = Math.max(0, Math.floor(spend / p.cpm * 1000 * (.82 + .34 * rand(sim.seed, nextDay, channel + "auction"))));
    const ctr = clamp(p.ctr * quality * fatigue * saturation * (.93 + .15 * rand(sim.seed, nextDay, channel + "interest")), .001, .25);
    const clk = Math.max(0, Math.round(imp * ctr * (.85 + .30 * rand(sim.seed, nextDay, channel + "click"))));
    const retarget = c.optimization === "retarget" && channel === "paid" ? 1.23 : 1;
    const promotion = c.optimization === "promo" && channel === "promo" ? 1.28 : 1;
    const conversionRate = clamp(p.intent * (.54 + .50 * fit) * retarget * promotion * (.85 + .30 * rand(sim.seed, nextDay, channel + "conv")), .002, .28);
    const conv = Math.max(0, Math.min(clk, Math.round(clk * conversionRate * (.75 + .50 * rand(sim.seed, nextDay, channel + "sales")))));
    impressions += imp;
    clicks += clk;
    incremental += conv;
  }

  const spend = CHANNELS.reduce((sum, k) => sum + channelSpent[k], 0);
  sim.actualMediaSpent = Math.min(sim.committedMedia, sim.actualMediaSpent + spend);
  sim.adstock = sim.adstock * .72 + impressions / 23000;
  sim.awareness = clamp(sim.awareness + (1 - sim.awareness) * (impressions / 650000) * (.35 + .45 * fit) - .001, 0, .95);
  // Small earned awareness effect; never a fictional ROAS or product revenue.
  incremental += Math.floor(sim.awareness * 3 * (.7 + .6 * rand(sim.seed, nextDay, "organic")));
  const dayNumber = c.day + 1;
  const currentDays = [...sim.days, { incremental }].length;
  const totalIncrement = sim.days.reduce((sum, d) => sum + d.incremental, 0) + incremental;
  const weekly = s.metric.toLowerCase().includes("/week");
  const effectiveIncrement = totalIncrement / currentDays * (weekly ? 7 : 1);
  // Demand indices are a different measurement scale from conversions.
  const modeledIncrement = s.metric.toLowerCase().includes("index")
    ? sim.awareness * 22 * fit : effectiveIncrement;
  const upliftPct = clamp(Math.round(modeledIncrement / Math.max(1, s.baseline) * 100), -15, 250);
  const metric: CampaignDayMetric = {
    day: nextDay, calendarDay: dayNumber, spend, impressions, clicks, incremental,
    reach: Math.round(impressions * .7), awareness: Math.round(sim.awareness * 1000) / 10,
    upliftPct, event, channelSpent,
  };
  sim.days.push(metric);
  sim.elapsed = nextDay;
  c.day = dayNumber;
  return metric;
}

export function aggregateRuntime(c: Campaign) {
  const sim = c.simulation;
  if (!sim) return null;
  const total = (key: "spend" | "impressions" | "clicks" | "incremental" | "reach") =>
    sim.days.reduce((acc, d) => acc + d[key], 0);
  return {
    ...sim,
    impressions: total("impressions"),
    clicks: total("clicks"),
    incremental: total("incremental"),
    reach: total("reach"),
    mediaSpend: total("spend"),
    lastUplift: sim.days.at(-1)?.upliftPct ?? 0,
    ctr: total("impressions") ? 100 * total("clicks") / total("impressions") : 0,
  };
}
