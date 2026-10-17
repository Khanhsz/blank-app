import test from "node:test";
import assert from "node:assert/strict";
import {ceoTaskDefs,scenarios} from "../src/game/data";
import {newCampaign,defaults,newCEO,migrate,type Project} from "../src/game/state";
import {acceptBrief,agencyReqs,finalize,scoreModel,scenarioOf} from "../src/game/campaign";
import {acknowledgeEdition,endWeek} from "../src/game/weekly";
import {ceoDay} from "../src/game/ceo";
import type {Fx} from "../src/game/store";

const fx:Fx={toast:()=>{},log:()=>{}};
const playable=()=>{const s=defaults();s.created=true;s.campaign.aiStatus="fallback";return s};

test("no launch pays nothing, gives no free XP/reputation and cannot unlock city or agency",()=>{
  const s=playable(),before=s.personalCash;
  acceptBrief(s,fx);
  const w1=endWeek(s,fx)!;acknowledgeEdition(s,w1.id);
  const w2=endWeek(s,fx)!;acknowledgeEdition(s,w2.id);
  assert.equal(s.campaign.phase,"results");
  assert.equal(s.campaign.final?.feePaid,0);
  assert.equal(s.campaign.final?.deliveryRatio,0);
  assert.equal(s.personalCash,before);
  assert.equal(s.reputation,0);
  assert.equal(s.expertise,0);
  assert.equal(s.cityUnlocked,false);
  assert.equal(agencyReqs(s)[0].num,"0/3");
  assert.equal(s.history[0].feePaid,0);
  const restored=migrate(JSON.parse(JSON.stringify(s)));
  assert.equal(restored.campaign.final?.feePaid,0);
  assert.equal(agencyReqs(restored)[0].num,"0/3");
});

test("underperforming delivered campaign earns contracted service fee but no reputation farming",()=>{
  const s=playable(),c=s.campaign,sc=scenarioOf(c);
  c.phase="live";c.day=15;s.clock.day=15;c.liveWeeks=1;c.actualLaunchDay=8;
  c.mediaBooked=true;c.media={paid:600000,creator:0,promo:0,flyer:0};c.spent=600000;
  const before=s.personalCash;
  finalize(s,fx);
  assert.equal(c.final?.performance,"under");
  assert.equal(c.final?.deliveryRatio,1);
  assert.equal(c.final?.feePaid,sc.fee);
  assert.equal(s.personalCash-before,sc.fee);
  assert.ok(c.final!.rep<=0);
  assert.equal(s.history[0].feePaid,sc.fee);
  assert.equal(s.cityUnlocked,true);
});

test("late launch prorates compensation by completed live flight, not booked budget",()=>{
  const s=playable(),c=s.campaign;
  c.aiScenario={...scenarios[0],days:28};
  c.phase="live";c.startedDay=1;c.liveWeeks=1;c.actualLaunchDay=22;s.clock.day=29;c.day=29;
  c.mediaBooked=true;c.media={paid:2000000,creator:1000000,promo:0,flyer:0};c.spent=3000000;
  const before=s.personalCash;
  finalize(s,fx);
  assert.equal(c.final?.deliveryRatio,.5);
  assert.equal(c.final?.feePaid,Math.round(c.aiScenario.fee*.5));
  assert.equal(s.personalCash-before,c.final?.feePaid);
});

function agencyWithMedia(adBudget:number){
  const s=playable();
  s.agencyUnlocked=true;s.cityUnlocked=true;s.ceo=newCEO(55);
  s.agencyCash=5000000000;
  const sc=scenarios[3],campaign=newCampaign(3);
  campaign.phase="executing";
  campaign.insight=sc.trueInsight;
  campaign.creative=sc.trueCreative;
  campaign.strategy={segment:sc.trueSegment,objective:sc.trueObjective,position:sc.truePosition};
  const p:Project={
    id:"test-media",leadId:"orion",brand:sc.brand,adBudget,fee:sc.fee,bonus:0,
    scope:12,duration:30,industry:sc.industry,days:1,status:"active",scenarioIndex:3,
    startedDay:1,target:sc.target,pitchQuality:75,mediaSpent:0,mediaReserved:adBudget,
    direct:0,campaign,tasks:ceoTaskDefs.map(t=>({...t,
      status:((t.key==="media"||t.key==="kol")?"review":"completed") as Project["tasks"][number]["status"],
      progress:t.effort,quality:80,employee:"legacy",outsourced:false,reviewDay:0
    })),paymentCount:0
  };
  s.ceo.projects.push(p);
  ceoDay(s,s.ceo,fx);
  return {s,p};
}
test("agency media uses negotiated client budget for actual spend and proportional reach",()=>{
  const small=agencyWithMedia(100000000);
  const large=agencyWithMedia(2400000000);
  for(const {p} of [small,large]){
    const sum=Object.values(p.campaign.media).reduce((a,b)=>a+b,0);
    assert.equal(sum,p.mediaSpent);
    assert.equal(p.mediaSpent,Math.round(p.adBudget*.94));
    assert.equal(p.mediaReserved,p.adBudget-p.mediaSpent);
    assert.equal(p.campaign.spent,p.mediaSpent);
    assert.equal(p.campaign.mediaBudget,p.adBudget);
  }
  const a=scoreModel(small.s,small.p.campaign);
  const b=scoreModel(large.s,large.p.campaign);
  assert.equal(a.pct,b.pct,"percentage KPI must compare to the client media budget, not auto-cap on high raw spend");
  assert.ok(a.pct<85,"national budget alone cannot force the maximum score");
  assert.ok(b.adReach>a.adReach*20,"larger contracted campaign can reach a bigger audience");
});

test("freelance media keeps original raw spend scoring and legacy saves are compatible",()=>{
  const s=playable(),c=s.campaign;
  c.media={paid:1500000,creator:500000,promo:0,flyer:0};
  const baseline=scoreModel(s,c);
  assert.ok(Number.isFinite(baseline.pct));
  assert.ok(Number.isFinite(baseline.adReach));
  assert.equal(c.mediaBudget,undefined);
  const legacy=migrate(JSON.parse(JSON.stringify(s)));
  assert.equal(scoreModel(legacy,legacy.campaign).pct,baseline.pct);
});
