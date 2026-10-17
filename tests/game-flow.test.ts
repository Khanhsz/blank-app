import {scenarios} from "../src/game/data";
import test from "node:test";
import assert from "node:assert/strict";
import {defaults,migrate} from "../src/game/state";
import * as C from "../src/game/campaign";
import * as K from "../src/game/ceo";
import {endWeek,acknowledgeEdition} from "../src/game/weekly";
import {departmentMetrics} from "../src/game/functions";
import * as J from "../src/game/journey";
import type {Fx} from "../src/game/store";

const fx:Fx={toast:()=>{},log:()=>{}};
function runCampaign(s:ReturnType<typeof defaults>){
  assert.equal(s.campaign.phase,"brief");
  C.acceptBrief(s,fx);
  assert.equal(s.campaign.phase,"planning");
  C.addResearch(s,fx,"audit");C.addResearch(s,fx,"reviews");C.addResearch(s,fx,"interview");
  assert.ok(s.campaign.research.length>=2);
  C.runSurvey(s,fx,{audience:C.scenarioOf(s.campaign).trueSegment,sample:60,question:"barrier"});
  assert.ok(s.campaign.survey);
  C.confirmInsight(s,fx,C.scenarioOf(s.campaign).trueInsight);
  C.confirmStrategy(s,fx,{segment:C.scenarioOf(s.campaign).trueSegment,objective:C.scenarioOf(s.campaign).trueObjective,position:C.scenarioOf(s.campaign).truePosition});
  assert.equal(s.campaign.phase,"executing");
  C.confirmCreative(s,fx,C.scenarioOf(s.campaign).trueCreative);
  const available=C.scenarioOf(s.campaign).budget-s.campaign.spent;
  C.bookMedia(s,fx,{paid:Math.floor(available*.44),creator:Math.floor(available*.40),promo:Math.floor(available*.12),flyer:available-Math.floor(available*.44)-Math.floor(available*.40)-Math.floor(available*.12)});
  assert.equal(s.campaign.phase,"executing");
  // Production is not instantly live; a shared weekly turn must complete.
  assert.ok(!s.campaign.actualLaunchDay);
  const first=endWeek(s,fx)!;assert.ok(first);acknowledgeEdition(s,first.id);
  C.launch(s,fx);
  assert.equal(s.campaign.phase,"live");
  C.optimize(s,fx,"hold");
  assert.equal(s.campaign.phase,"live");
  const second=endWeek(s,fx)!;assert.ok(second);acknowledgeEdition(s,second.id);
  assert.equal(s.campaign.phase,"results");
  assert.ok(s.campaign.final);
  J.submitReview(s,fx,"kpi","insight","validate");
  assert.ok(s.campaign.journey?.review);
}
test("freelance campaign, city unlock and rewards are preserved",()=>{
 const s=defaults();s.created=true;
 const start=s.personalCash;runCampaign(s);
 assert.equal(s.cityUnlocked,true);
 assert.equal(s.history.length,1);
 assert.ok(s.reputation>0);
 assert.ok(s.personalCash>start);
});
test("three campaigns unlock actual CEO mode; employee time and data survive migration",()=>{
 const s=defaults();s.created=true;
 for(let i=0;i<3;i++){runCampaign(s);if(i<2)C.nextClient(s,fx);}
 assert.equal(s.history.length,3);
 assert.equal(C.canOpenAgency(s),true);
 C.createAgency(s,fx,"Test Studio");
 assert.equal(s.agencyUnlocked,true);
 assert.ok(s.ceo);assert.equal(s.scene,"office");
 assert.equal(s.ceo!.day,s.clock.day,"founding agency must not reset Week 1");
 assert.equal(departmentMetrics(s).length,8);
 const startingDay=s.ceo!.day;const c=s.ceo!;
 K.hire(s,fx,"researcher");
 assert.ok(s.staff.includes("researcher"));
 K.ceoTick(s,fx,3);
 assert.equal(c.day,startingDay+3);
 assert.ok(c.totalPayroll>0);
 const restored=migrate(JSON.parse(JSON.stringify(s)));
 assert.equal(restored.staff.length,s.staff.length);
 assert.equal(restored.ceo?.day,c.day);
 assert.equal(restored.history.length,3);
 assert.equal(restored.campaign.phase,"results");
});
test("old saves receive new optional character attributes and world progress safely",()=>{
 const old=defaults() as any;
 delete old.world;
 delete old.character.hairstyle;
 delete old.character.accessory;
 const out=migrate(old);
 assert.deepEqual(out.world,{visited:[],contacts:[],leasedOffices:[]});
 assert.equal(out.character.name,"Alex");
 assert.equal(out.campaign.phase,"brief");
});


test("AI-generated evidence, insight options and correct outcome survive local save",()=>{
 const s=defaults();s.created=true;
 const sample={...scenarios[0],id:"ai-example123",brand:"AI Example Bakery",industry:"F&B",trueInsight:"trust",trueSegment:"students",trueCreative:"story",budget:12000000,fee:4800000,insightOptions:["awareness","value","location","trust","style"].map(id=>({id,title:"Test "+id,desc:"Distinct hypothesis "+id})),aiMeta:{category:"food",seed:78234,label:"Fictional AI-generated training scenario"},reports:{audit:"Competitor comparison data indicates uncertainty about value.",reviews:"Customers report poor trust before the first purchase.",industry:"Category demand remains broadly stable.",interview:"Prospects repeatedly mention insufficient trust and ask for testimonials."}};
 assert.equal(C.activateAIBrief(s,fx,sample),true);
 assert.equal(C.scenarioOf(s.campaign).brand,"AI Example Bakery");
 C.acceptBrief(s,fx);C.addResearch(s,fx,"reviews");C.toSurvey(s);
 C.runSurvey(s,fx,{audience:"students",sample:60,question:"barrier"});
 assert.equal(C.surveyResults(s).reason.includes("trust"),false);
 C.toValidation(s);C.confirmInsight(s,fx,"trust");
 assert.equal(C.scoreModel(s,s.campaign).fit.insight,1);
 const restored=migrate(JSON.parse(JSON.stringify(s)));
 assert.equal(C.scenarioOf(restored.campaign).id,"ai-example123");
 assert.equal(C.scenarioOf(restored.campaign).insightOptions?.length,5);
 assert.equal(restored.campaign.phase,"planning");
});
test("AI brief cannot overwrite campaign already in progress",()=>{
 const s=defaults();s.created=true;
 C.acceptBrief(s,fx);
 const sample={...scenarios[0],id:"ai-something",aiMeta:{category:"coffee",seed:1,label:"Fictional"},insightOptions:["awareness","value","location","trust","style"].map(id=>({id,title:id,desc:id+" detail"}))};
 assert.equal(C.activateAIBrief(s,fx,sample),false);
 assert.equal(s.campaign.aiScenario,null);
});

test("brief deadlines, optimization and agency functions share one calendar",()=>{
 const s=defaults();s.created=true;
 const startDay=s.clock.day;
 C.acceptBrief(s,fx);C.confirmInsight(s,fx,"awareness");
 C.confirmStrategy(s,fx,{segment:"students",objective:"visits",position:"study"});
 C.confirmCreative(s,fx,"study");C.bookMedia(s,fx,{paid:1500000,creator:1000000,promo:0,flyer:0});
 // Week 1 production; launch only in Week 2.
 C.launch(s,fx);assert.equal(s.campaign.phase,"executing");
 const w1=endWeek(s,fx)!;assert.equal(s.clock.day,startDay+7);
 acknowledgeEdition(s,w1.id);C.launch(s,fx);assert.equal(s.campaign.phase,"live");
 C.optimize(s,fx,"retarget");C.optimize(s,fx,"refresh");
 assert.equal(s.campaign.optimization,"retarget","only one optimization per week");
 const w2=endWeek(s,fx)!;
 assert.equal(s.campaign.phase,"results");assert.equal(s.campaign.liveWeeks,1);
 assert.equal(s.campaign.weeklyResults?.length,1);
 J.submitReview(s,fx,"kpi","media","repair");
 acknowledgeEdition(s,w2.id);C.nextClient(s,fx);
 assert.equal(s.campaign.startedDay,s.clock.day,"next brief starts on the current global day");
});
