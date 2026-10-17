import test from "node:test";
import assert from "node:assert/strict";
import {defaults,migrate} from "../src/game/state";
import * as C from "../src/game/campaign";
import * as K from "../src/game/ceo";
import type {Fx} from "../src/game/store";

const fx:Fx={toast:()=>{},log:()=>{}};
function runCampaign(s:ReturnType<typeof defaults>){
  assert.equal(s.campaign.phase,"brief");
  C.acceptBrief(s,fx);
  assert.equal(s.campaign.phase,"research");
  C.addResearch(s,fx,"audit");C.addResearch(s,fx,"reviews");C.addResearch(s,fx,"interview");
  assert.ok(s.campaign.research.length>=2);
  C.toSurvey(s);assert.equal(s.campaign.phase,"survey");
  C.runSurvey(s,fx,{audience:"students",sample:60,question:"barrier"});
  C.toValidation(s);assert.equal(s.campaign.phase,"validation");
  C.confirmInsight(s,fx,"awareness");assert.equal(s.campaign.phase,"strategy");
  C.confirmStrategy(s,fx,{segment:"students",objective:"visits",position:"study"});
  assert.equal(s.campaign.phase,"creative");
  C.confirmCreative(s,fx,"study");assert.equal(s.campaign.phase,"media");
  C.launch(s,fx,{paid:1800000,creator:1500000,promo:500000,flyer:250000});
  assert.equal(s.campaign.phase,"live");
  assert.ok(s.campaign.liveMetrics);
  C.optimize(s,fx,"hold");assert.equal(s.campaign.phase,"results");
  assert.ok(s.campaign.final);
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
 assert.deepEqual(out.world,{visited:[],contacts:[]});
 assert.equal(out.character.name,"Alex");
 assert.equal(out.campaign.phase,"brief");
});
