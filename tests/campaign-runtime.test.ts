import test from "node:test";
import assert from "node:assert/strict";
import { defaults, migrate, newCampaign } from "../src/game/state";
import { makeCampaignRuntime, stepCampaignDay } from "../src/game/campaignRuntime";
import { advanceCampaignDay, launch, optimize } from "../src/game/campaign";

const fx = { toast: (_message: string) => {}, log: (_message: string) => {} };
const make = () => {
  const c = newCampaign(0);
  c.briefId = "deterministic-integration-test";
  c.phase = "media";
  c.insight = "awareness";
  c.strategy = {segment:"students", objective:"visits", position:"study"};
  c.creative = "study";
  c.day = 7;
  return c;
};
test("simulated outcomes are deterministic for equal campaign decisions and seed", () => {
  const a = make(), b = make();
  a.media = {paid: 1200000, creator: 900000, promo: 200000, flyer: 100000};
  b.media = {...a.media};
  a.simulation = makeCampaignRuntime(a);
  b.simulation = makeCampaignRuntime(b);
  while (a.simulation.elapsed < a.simulation.duration) {
    stepCampaignDay(a); stepCampaignDay(b);
  }
  assert.deepEqual(a.simulation, b.simulation);
});
test("media spend is finite, capped by reserved amount, and only delivered once", () => {
  const c = make();
  c.media = {paid: 1200000, creator: 800000, promo: 200000, flyer: 0};
  c.simulation = makeCampaignRuntime(c);
  while (stepCampaignDay(c)) {}
  assert.equal(c.simulation.actualMediaSpent, 2200000);
  assert.equal(c.simulation.days.reduce((sum,d)=>sum+d.spend,0), 2200000);
  assert.equal(stepCampaignDay(c),null);
});
test("launch -> daily updates -> optimize -> results in current game state and pays fee once", () => {
  const s = defaults();
  s.campaign = make();
  s.campaign.spent = 500000;
  const cash = s.personalCash;
  launch(s,fx,{paid:1200000,creator:400000,promo:100000,flyer:0});
  assert.equal(s.campaign.phase,"live");
  assert.equal(s.campaign.spent,2200000);
  advanceCampaignDay(s,fx,1);
  assert.equal(s.campaign.simulation?.elapsed,1);
  optimize(s,fx,"refresh");
  assert.equal(s.campaign.phase,"live");
  assert.equal(s.campaign.optimization,"refresh");
  advanceCampaignDay(s,fx,30);
  assert.equal(s.campaign.phase,"results");
  assert.ok(s.campaign.final);
  assert.equal(s.history.length,1);
  assert.equal(s.personalCash,cash+3200000);
  advanceCampaignDay(s,fx,30);
  assert.equal(s.history.length,1);
  assert.equal(s.personalCash,cash+3200000);
});
test("old saves without runtime remain loadable", () => {
  const s=defaults();
  const m=migrate(JSON.parse(JSON.stringify(s)));
  assert.equal(m.campaign.simulation,undefined);
  assert.equal(m.version,2);
});
