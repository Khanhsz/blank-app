import test from "node:test";
import assert from "node:assert/strict";
import {defaults,newCEO,migrate,newCampaign,type GameState,type Lead,type Project} from "../src/game/state";
import {ceoLeadDefs,ceoTaskDefs} from "../src/game/data";
import {agencyLeadForClient} from "../src/game/clientDatabase";
import {approachCatalogClient} from "../src/game/clientMarket";
import {hire,startPitch,submitPitchRevision} from "../src/game/ceo";
import {startClientTeam,joinClientTeam} from "../src/game/clientTeams";
import * as A from "../src/game/acquisition";
import type {Fx} from "../src/game/store";
const fx:Fx={toast:()=>{},log:()=>{}};
function game(){const s=defaults();s.agencyUnlocked=true;s.created=true;s.cityUnlocked=true;s.agencyCash=400000000;s.reputation=72;s.ceo=newCEO(72);s.ceo.day=s.clock.day;return s;}
function lead(s:GameState,id:string){return s.ceo!.leads.find(l=>l.id===id)!;}
function getAgencyLead(s:GameState,id="sme-beauty-2"){assert.equal(approachCatalogClient(s,fx,id),true);return s.ceo!.leads.find(l=>l.clientMasterId===id)!;}
test("P0 Growth Desk: outbound prospecting is not an automatically qualified tender",()=>{
 const s=game(),l=getAgencyLead(s);
 assert.equal(l.status,"prospecting");assert.equal(l.source,"outbound");
 assert.equal(l.discovery,undefined);
 A.makeOutreach(s,fx,l.id,"personal");
 assert.ok(["discovery","nurturing"].includes(l.status));
 assert.equal(l.outreachAttempts,1);
 assert.equal(A.expectedPipelineValue(s)>0,true);
});
test("P0: discovery collects BANT evidence and refuses Go before three answers",()=>{
 const s=game(),l=s.ceo!.leads[0];
 A.openDiscovery(s,fx,l.id);
 assert.equal(l.status,"discovery");
 A.askDiscovery(s,fx,l.id,"need");A.askDiscovery(s,fx,l.id,"budget");
 A.decideOpportunity(s,fx,l.id,"pursue");
 assert.equal(l.status,"discovery");
 A.askDiscovery(s,fx,l.id,"authority");
 assert.equal(l.discovery?.confidence,66);
 A.decideOpportunity(s,fx,l.id,"pursue");
 assert.equal(l.status,"qualified");
 assert.equal(l.qualifyFeePaid,undefined,"basic discovery is free");
 assert.equal(l.insightKnown,true);
 assert.equal(l.discovery?.decision,"pursue");
});
test("P0: research is optional, uses the qualification price quote, records cash and confidence",()=>{
 const s=game(),l=s.ceo!.leads[0];A.openDiscovery(s,fx,l.id);A.askDiscovery(s,fx,l.id,"budget");
 const cash=s.agencyCash;
 A.deepenDiscovery(s,fx,l.id);
 assert.ok(s.agencyCash<cash);
 assert.ok((l.qualifyFeePaid??0)>0);
 assert.ok((l.discovery?.confidence??0)>22);
 const after=s.agencyCash;A.deepenDiscovery(s,fx,l.id);assert.equal(s.agencyCash,after);
});
test("P2: nurture and No Bid preserve the client relationship and time dependency",()=>{
 const s=game(),l=s.ceo!.leads[0];A.openDiscovery(s,fx,l.id);
 for(const q of ["need","budget","timing"] as const)A.askDiscovery(s,fx,l.id,q);
 A.decideOpportunity(s,fx,l.id,"nurture");
 assert.equal(l.status,"nurturing");
 const until=l.nurtureUntil!;
 A.nurtureRelationship(s,fx,l.id,"check-in");assert.equal(l.status,"nurturing");
 s.ceo!.day=until;
 A.nurtureRelationship(s,fx,l.id,"check-in");assert.equal(l.status,"discovery");
 A.decideOpportunity(s,fx,l.id,"no-bid");assert.equal(l.status,"declined");
 assert.ok(A.relationship(s.ceo!,l).notes.length>0);
});
test("P1: multiple client proposals persist independently as per-deal sessions",()=>{
 const s=game();const a=s.ceo!.leads[0],b=s.ceo!.leads[1];a.status="qualified";b.status="qualified";
 A.focusDeal(s,a.id);A.updateProposal(s,fx,a.id,{approach:"creative"});startPitch(s,fx,a.id);
 assert.equal(s.ceo!.pitch?.id,a.id);
 s.ceo!.pitch!.step="objection";
 A.focusDeal(s,b.id);assert.equal(s.ceo!.pitch,null);
 A.updateProposal(s,fx,b.id,{approach:"strategy"});startPitch(s,fx,b.id);
 assert.equal(s.ceo!.pitch?.id,b.id);assert.equal(A.activeDealCount(s.ceo!),2);
 A.focusDeal(s,a.id);
 assert.equal(s.ceo!.pitch?.id,a.id);assert.equal(s.ceo!.pitch?.step,"objection");
 assert.equal(a.proposal?.approach,"creative");
 const restored=migrate(JSON.parse(JSON.stringify(s)));
 assert.equal(restored.ceo?.dealSessions?.[b.id]?.pitch?.id,b.id);
 assert.equal(restored.ceo?.pitch?.id,a.id);
});
test("P1: proposal decisions change merit and skill/cost-based delivery forecasts",()=>{
 const s=game(),l=getAgencyLead(s,"sme-tech-1");
 l.status="qualified";
 const p=A.defaultProposal(l);
 const m1=A.proposalMerit(s,l,p);
 const bad={...p,approach:"creative" as const,delivery:"specialist" as const};
 const m2=A.proposalMerit(s,l,bad);
 assert.ok(m1>m2,"correct strategic fit and delivery feasibility affect score");
 const f=A.opportunityForecast(s,l,l.fee,p);
 assert.ok(f.cost>0&&f.team.coverage===0);
 assert.ok(f.outsourcing>0&&f.risk>0);
 assert.ok(A.estimatedWinProbability(s,l)>0);
});
test("P1: proposal staffing never borrows a person from a different signed client",()=>{
 const s=game();hire(s,fx,"creator");hire(s,fx,"creator2");
 const l=getAgencyLead(s,"sme-education-1");
 const p:Project={id:"one",leadId:"existing",brand:"An existing client",adBudget:12000000,fee:40000000,bonus:0,scope:7,duration:30,
 industry:"Fashion",days:0,status:"active",scenarioIndex:1,startedDay:1,target:16,pitchQuality:65,mediaSpent:0,mediaReserved:10000000,direct:0,
 campaign:newCampaign(1),tasks:[],paymentCount:0};
 s.ceo!.projects.push(p);const team=startClientTeam(s,p);joinClientTeam(s,fx,team.id,"creator");
 assert.equal(A.projectedTeam(s,l).selected.includes("creator"),false);
 assert.equal(A.projectedTeam(s,l).selected.includes("creator2"),true);
 l.status="qualified";A.updateProposal(s,fx,l.id,{selectedTalentIds:["creator","creator2"]});
 assert.equal(l.proposal?.selectedTalentIds.includes("creator"),false);
});
test("P1: submitting a bounded pitch revision produces one definitive final result",()=>{
 const s=game(),l=getAgencyLead(s,"sme-beauty-1");
 l.status="shortlisted";A.focusDeal(s,l.id);
 l.proposal=A.defaultProposal(l);
 s.ceo!.pitch={id:l.id,focus:l.pref,price:"standard",team:"balanced",evidence:"research",step:"revision",quality:65,objection:"Please revise",result:null,proposal:l.proposal,revisionCount:0};
 submitPitchRevision(s,fx,"improve");
 assert.equal(s.ceo!.pitch.step,"result");
 assert.equal(s.ceo!.pitch.revisionCount,1);
 assert.ok(["pitch_won","lost"].includes(l.status));
});
test("P2: successful contracts create CRM history and one fictional referral without forging a signed deal",()=>{
 const s=game(),l=getAgencyLead(s,"sme-food-1");
 l.status="signed";
 const p:Project={id:"done-1",leadId:l.id,brand:l.brand,clientMasterId:l.clientMasterId,adBudget:20000000,fee:30000000,bonus:0,
 scope:7,duration:28,industry:l.industry,days:28,status:"completed",scenarioIndex:2,startedDay:1,target:15,pitchQuality:75,
 mediaSpent:18000000,mediaReserved:0,direct:6000000,campaign:newCampaign(2),tasks:[],paymentCount:2,clientTrust:84,kpi:24,quality:82};
 const old=s.ceo!.leads.length;A.onProjectCompleted(s,fx,p);
 assert.equal(s.ceo!.leads.length,old+1);
 const referral=s.ceo!.leads[0];assert.equal(referral.source,"referral");
 assert.equal(referral.status,"new");assert.equal(referral.referralFrom,l.brand);
 assert.ok(referral.segment==="sme"||referral.segment==="startup");
 assert.equal(A.relationship(s.ceo!,l).wins,1);
 const saved=migrate(JSON.parse(JSON.stringify(s)));
 assert.equal(saved.ceo!.leads[0].source,"referral");
 assert.equal(saved.ceo!.clientRelationships?.[l.clientMasterId!]?.wins,1);
});
test("P2: low-trust delivery does not create a guaranteed referral",()=>{
 const s=game(),l=getAgencyLead(s,"sme-fashion-3");
 const p:Project={id:"unsatisfactory",leadId:l.id,brand:l.brand,clientMasterId:l.clientMasterId,adBudget:18000000,fee:22000000,bonus:0,
 scope:5,duration:30,industry:l.industry,days:31,status:"completed",scenarioIndex:1,startedDay:1,target:15,pitchQuality:50,
 mediaSpent:16000000,mediaReserved:0,direct:7000000,campaign:newCampaign(1),tasks:[],paymentCount:2,clientTrust:45,kpi:3,quality:48};
 const count=s.ceo!.leads.length;A.onProjectCompleted(s,fx,p);
 assert.equal(s.ceo!.leads.length,count);
 assert.equal(A.relationship(s.ceo!,l).wins,1);
});
