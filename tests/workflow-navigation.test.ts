import test from "node:test";
import assert from "node:assert/strict";
import {defaults,newCEO,newCampaign,type Project} from "../src/game/state";
import {startClientTeam} from "../src/game/clientTeams";
import {approachCatalogClient} from "../src/game/clientMarket";
import {chooseFreelanceClient} from "../src/game/campaign";
import {focusDeal} from "../src/game/acquisition";
import {startPitch} from "../src/game/ceo";
import {newWorkforceView,workforceForDeal,workstationHint} from "../src/game/workflowNavigation";
import type {Fx} from "../src/game/store";
const fx:Fx={log:()=>{},toast:()=>{}};

test("approaching a client focuses its exact deal and preserves the previous active pitch",()=>{
 const s=defaults();s.created=true;s.agencyUnlocked=true;s.ceo=newCEO(50);
 s.agencyCash=50e6;
 const previous=s.ceo.leads[0];previous.status="qualified";
 focusDeal(s,previous.id);startPitch(s,fx,previous.id);
 assert.ok(s.ceo.pitch);s.ceo.pitch!.step="objection";
 const pitch=structuredClone(s.ceo.pitch);
 assert.equal(approachCatalogClient(s,fx,"startup-coffee-0"),true);
 assert.equal(s.ceo.activeDealId,s.ceo.leads[0].id);
 assert.equal(s.ceo.leads[0].clientMasterId,"startup-coffee-0");
 assert.equal(s.ceo.pitch,null);
 assert.deepEqual(s.ceo.dealSessions?.[previous.id]?.pitch,pitch);
 const active=s.ceo.activeDealId;
 assert.equal(approachCatalogClient(s,fx,"startup-coffee-0"),false);
 assert.equal(s.ceo.activeDealId,active,"failed approach keeps the current deal");
 focusDeal(s,previous.id);
 assert.deepEqual(s.ceo.pitch,pitch,"the old pitch resumes with its objection intact");
});

test("a signed contract opens its client squad even when another team was previously viewed",()=>{
 const s=defaults();s.agencyUnlocked=true;s.ceo=newCEO(70);
 const project=(id:string,brand:string):Project=>({id,leadId:id,brand,adBudget:20e6,fee:30e6,bonus:0,
  scope:7,duration:30,industry:"Tech",days:0,status:"active",scenarioIndex:3,startedDay:1,target:16,
  pitchQuality:70,mediaSpent:0,mediaReserved:20e6,direct:0,campaign:newCampaign(3),tasks:[],paymentCount:0});
 const a=project("deal-a","Client A"),b=project("deal-b","Client B");
 s.ceo.projects.push(a,b);const ta=startClientTeam(s,a),tb=startClientTeam(s,b);
 const before=JSON.stringify(s),view=workforceForDeal(s,b.leadId);
 assert.equal(view.section,"teams");assert.equal(view.teamId,tb.id);assert.notEqual(view.teamId,ta.id);
 assert.equal(view.deliveryId,null);assert.equal(view.personId,null);
 assert.equal(JSON.stringify(s),before,"navigation cannot alter staffing, payroll or project state");
 assert.deepEqual(workforceForDeal(s,"missing-deal"),{...newWorkforceView(),section:"teams"});
});

test("bedroom entry describes the accepted job through final payment without changing its state",()=>{
 const s=defaults();s.created=true;
 assert.match(workstationHint(s).title,/next freelance job/);
 chooseFreelanceClient(s,fx,"startup-coffee-0");
 assert.match(workstationHint(s).title,/preparing/);
 s.campaign.aiStatus="error";assert.match(workstationHint(s).title,/retry/);
 s.campaign.aiStatus="ready";
 const v=s.campaign.freelanceJob!.v4!;
 const titles={brief:/awarded/,workspace:/deliverables/,board:/Confirm/,revision:/revisions/,ready:/ready/,paid:/received/};
 for(const [step,title] of Object.entries(titles)){
  v.step=step as typeof v.step;
  const before=JSON.stringify(s);
  assert.match(workstationHint(s).title,title);
  assert.equal(JSON.stringify(s),before);
 }
});
