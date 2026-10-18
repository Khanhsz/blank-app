import {scenarios} from "../src/game/data";
import test from "node:test";
import assert from "node:assert/strict";
import {defaults,migrate,newCampaign,newCEO,type Project} from "../src/game/state";
import * as C from "../src/game/campaign";
import * as K from "../src/game/ceo";
import {endWeek,acknowledgeEdition} from "../src/game/weekly";
import {TALENT_FUNCTIONS} from "../src/game/personnel";
import * as J from "../src/game/journey";
import type {Fx} from "../src/game/store";
import {seedApproachedClient} from "./helpers/approachedClient";
import {getClient} from "../src/game/clientDatabase";

const fx:Fx={toast:()=>{},log:()=>{}};
function runCampaign(s:ReturnType<typeof defaults>){
  assert.equal(s.campaign.phase,"brief");
  seedApproachedClient(s);
  C.acceptBrief(s,fx);
  assert.equal(s.campaign.phase,"planning");
  C.addResearch(s,fx,"audit");C.addResearch(s,fx,"reviews");C.addResearch(s,fx,"interview");
  assert.ok(s.campaign.research.length>=2);
  C.runSurvey(s,fx,{audience:"students",sample:60,question:"barrier"});
  assert.ok(s.campaign.survey);
  C.confirmInsight(s,fx,"awareness");
  C.confirmStrategy(s,fx,{segment:"students",objective:"visits",position:"study"});
  assert.equal(s.campaign.phase,"executing");
  C.confirmCreative(s,fx,"study");
  C.bookMedia(s,fx,{paid:1800000,creator:1500000,promo:500000,flyer:250000});
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
 assert.equal(TALENT_FUNCTIONS.length,4);
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
test("founding an agency mid-brief starts without an auto-inherited Mây Corner Coffee contract",()=>{
 const s=defaults();s.created=true;
 for(let i=0;i<3;i++){runCampaign(s);if(i<2)C.nextClient(s,fx);}
 assert.equal(C.canOpenAgency(s),true);
 C.nextClient(s,fx); // A new freelancer brief happens to be unaccepted.
 assert.equal(s.campaign.phase,"brief");
 const oldClient=scenarios[s.campaign.scenarioIndex].brand;
 const freelancerHistory=s.history.length,week=s.clock.week;
 C.createAgency(s,fx,"No Starter Client");
 assert.equal(s.agencyUnlocked,true);
 assert.equal(s.agencyCash,5000000,"founding must not grant an uncontracted customer advance");
 assert.deepEqual(s.ceo?.projects,[],"no automatic client projects");
 assert.deepEqual(s.ceo?.clientTeams,[],"no preassigned client squad");
 assert.equal(s.ceo?.leads.some(l=>l.brand===oldClient),false);
 assert.equal(s.history.length,freelancerHistory,"freelancer achievements stay in history");
 assert.equal(s.clock.week,week);
 const restored=migrate(JSON.parse(JSON.stringify(s)));
 assert.equal(restored.ceo?.projects.length,0);
});

test("old saves remove only synthetic ACTIVE legacy clients and release their team",()=>{
 const s=defaults();s.created=true;s.agencyUnlocked=true;s.agencyCash=6200000;
 s.ceo=newCEO(65);s.staff=["creator"];s.ceo.day=22;s.clock.day=22;
 const carry:Project={
  id:"legacy-7",leadId:"legacy",brand:"Mây Corner Coffee",adBudget:8000000,fee:3200000,bonus:0,scope:2,duration:14,
  industry:"Coffee",days:0,status:"active",scenarioIndex:0,startedDay:22,target:25,pitchQuality:70,
  mediaSpent:0,mediaReserved:8000000,direct:0,campaign:newCampaign(0,22),tasks:[],paymentCount:0,legacy:true
 };
 s.ceo.projects=[carry];
 s.ceo.clientTeams=[{id:"squad-may-corner-coffee",brand:carry.brand,clientId:"may-corner-coffee",
   memberIds:["creator"],leadId:"creator",projectIds:[carry.id],status:"active",createdDay:22}];
 s.ceo.inbox=[{id:"legacy-issue",type:"capacity",project:carry.id,message:"Missing staff",choices:["acknowledge"],status:"open",day:22}];
 s.ceo.ledger.push({day:22,what:"Migrated client advance",value:960000,lead:carry.brand,status:"paid"});
 const migrated=migrate(JSON.parse(JSON.stringify(s)));
 assert.equal(migrated.ceo?.projects.length,0);
 assert.equal(migrated.ceo?.clientTeams?.length,0);
 assert.equal(migrated.ceo?.inbox.length,0);
 assert.equal(migrated.staff.includes("creator"),true,"released employees remain hired");
 assert.equal(migrated.agencyCash,s.agencyCash,"old save funds are not rewritten retroactively");
 assert.equal(migrated.ceo?.ledger.length,1,"old financial audit records remain");
 assert.equal(migrate(JSON.parse(JSON.stringify(migrated))).ceo?.projects.length,0);
});

test("an intentionally signed Mây Coffee project is never deleted by save cleanup",()=>{
 const s=defaults();s.created=true;s.agencyUnlocked=true;
 s.ceo=newCEO(52);s.ceo.day=s.clock.day;
 const signed:Project={id:"project-8",leadId:"deal-128",brand:"Mây Corner Coffee",
  adBudget:7000000,fee:4000000,bonus:0,scope:5,duration:21,industry:"Coffee",
  days:2,status:"active",scenarioIndex:0,startedDay:1,target:20,pitchQuality:75,
  mediaSpent:0,mediaReserved:7000000,direct:0,campaign:newCampaign(0),tasks:[],paymentCount:0};
 s.ceo.projects.push(signed);
 const restored=migrate(JSON.parse(JSON.stringify(s)));
 assert.equal(restored.ceo?.projects.length,1);
 assert.equal(restored.ceo?.projects[0].id,signed.id);
 assert.equal(restored.ceo?.clientTeams?.length,1);
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
 C.chooseFreelanceClient(s,fx,"startup-food-0");
 const sample={...scenarios[0],id:"ai-example123",brand:getClient("startup-food-0")!.brand,industry:"Food",trueInsight:"trust",trueSegment:"students",trueCreative:"story",budget:12000000,fee:4800000,
 insightOptions:["awareness","value","location","trust","style"].map(id=>({id,title:"Test "+id,desc:"Distinct hypothesis "+id})),
 aiMeta:{category:"food",seed:78234,label:"Fictional AI-generated test scenario",clientId:"startup-food-0"},
 aiPlanning:{context:"A test company has poor trust.",insight:"Some consumers require credible proof.",strategy:"Test creator evidence before scaling spend."},
 clientAnswers:{audience:"Nearby shoppers",barrier:"Trust",success:"Growth",constraint:"Limited time"},
 reports:{audit:"Competitor comparison data indicates uncertainty about value.",reviews:"Customers report poor trust before the first purchase.",industry:"Category demand remains broadly stable.",interview:"Prospects repeatedly mention insufficient trust and ask for testimonials."}};
 assert.equal(C.activateAIBrief(s,fx,sample),true);
 assert.equal(C.scenarioOf(s.campaign).brand,getClient("startup-food-0")!.brand);
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
 seedApproachedClient(s);
 C.acceptBrief(s,fx);
 const sample={...scenarios[0],id:"ai-something",aiMeta:{category:"coffee",seed:1,label:"Fictional"},insightOptions:["awareness","value","location","trust","style"].map(id=>({id,title:id,desc:id+" detail"}))};
 const original=s.campaign.aiScenario;
 assert.equal(C.activateAIBrief(s,fx,sample),false);
 assert.deepEqual(s.campaign.aiScenario,original,"late AI result may not replace an in-progress client");
});

test("brief deadlines, optimization and agency functions share one calendar",()=>{
 const s=defaults();s.created=true;
 const startDay=s.clock.day;
 seedApproachedClient(s);
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
