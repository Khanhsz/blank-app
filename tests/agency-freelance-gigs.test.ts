import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {defaults,newCEO,migrate} from "../src/game/state";
import {getFreelanceJob} from "../src/game/freelanceJobTemplates";
import * as Market from "../src/game/freelanceMarket";
import * as Gigs from "../src/game/agencyFreelance";
import {ceoTick} from "../src/game/ceo";
import {joinClientTeam} from "../src/game/clientTeams";
import type {Fx} from "../src/game/store";
const alerts:string[]=[];
const fx:Fx={toast:x=>alerts.push(x),log:()=>{}};
function agency(){
 const s=defaults();
 s.created=true;s.agencyUnlocked=true;s.agencyName="Test Agency";
 s.agencyCash=10_000_000;s.ceo=newCEO(55);s.ceo.day=s.clock.day;
 s.staff=["creator","planner","buyer","researcher","analyst","producer"];
 return s;
}
function offer(s:ReturnType<typeof agency>,templateId="social-pack"){
 const listing=Market.ensureFreelanceBoard(s).listings.find(l=>l.templateId===templateId)!;
 assert.ok(listing,"shared market includes "+templateId);
 assert.equal(Market.applyDefaultFreelanceJob(s,fx,listing.id),true);
 const app=s.freelanceBoard!.applications.at(-1)!;
 assert.equal(app.status,"pending");
 app.status="selected";app.feedback="Client wants to hire the agency";
 return app;
}
function complete(s:ReturnType<typeof agency>,id:string){
 for(let revision=0;revision<4;revision++){
  const g=s.ceo!.agencyGigs!.find(g=>g.id===id)!;
  for(let day=0;day<28&&g.status!=="ready";day++){
   s.ceo!.day++;Gigs.progressAgencyGigsDay(s,fx);
  }
  assert.equal(g.status,"ready","staff produced actual job-specific deliverables");
  assert.ok(g.artifacts.length>0);
  assert.ok(g.artifacts.every(a=>a.version>0&&a.copy.length>40));
  assert.equal(Gigs.submitAgencyGig(s,fx,id),true);
  if(g.status==="paid")return g;
  assert.equal(g.status,"revision");
 }
 throw new Error("Client never finished review");
}
test("Agency uses the existing weekly freelance market, but requires actual hired staff",()=>{
 const s=agency(),market=Market.ensureFreelanceBoard(s);
 assert.equal(market.listings.length,7);
 assert.ok(market.listings.every(l=>l.clientId.startsWith("startup-")||l.clientId.startsWith("sme-")));
 assert.equal(Gigs.agencyGigGate(s,"social-pack"),null);
 const noStaff=agency();noStaff.staff=[];
 assert.match(Gigs.agencyGigGate(noStaff,"social-pack")??"",/Hire/);
 assert.equal(Market.applyDefaultFreelanceJob(noStaff,fx,market.listings[0].id),false);
 const b=Market.ensureFreelanceBoard(s);
 const l=b.listings.find(x=>x.templateId==="social-pack")!;
 assert.equal(Market.applyDefaultFreelanceJob(s,fx,l.id),true);
 assert.equal(s.freelanceCareer?.weeklyHours,0,"CEO business applications never take player solo work hours");
 assert.equal(s.freelanceBoard?.applications[0].status,"pending");
});
test("Agency freelancer selection and employee delegation do not touch bedroom cash, save or campaign",()=>{
 const s=agency();const cash=s.agencyCash,personal=s.personalCash,briefId=s.campaign.briefId;
 const a=offer(s),id="creator";
 assert.ok(Gigs.eligibleGigStaff(s,a.templateId).includes(id));
 assert.equal(Gigs.acceptAgencyGigOffer(s,fx,a.id,"buyer"),false,"wrong specialty is rejected");
 assert.equal(Gigs.acceptAgencyGigOffer(s,fx,a.id,id),true);
 assert.equal(Gigs.acceptAgencyGigOffer(s,fx,a.id,id),false,"cannot sign twice");
 assert.equal(a.status,"accepted");
 assert.equal(s.agencyCash,cash-getFreelanceJob(a.templateId)!.outOfPocket);
 assert.equal(s.personalCash,personal);
 assert.equal(s.campaign.briefId,briefId);
 assert.equal(s.ceo!.agencyGigs?.length,1);
 const g=s.ceo!.agencyGigs![0];
 assert.equal(g.staffId,"creator");
 assert.equal(g.fee,a.proposedFee);
 assert.equal(g.status,"working");
});
test("Hired employee produces existing V6 deliverables, client review, revisions and exactly-once agency cash",()=>{
 const s=agency(),originalPersonal=s.personalCash,cash=s.agencyCash;
 const a=offer(s,"social-pack");
 assert.equal(Gigs.acceptAgencyGigOffer(s,fx,a.id,"creator"),true);
 const g=complete(s,"agency-gig:"+a.id);
 assert.equal(g.status,"paid");
 assert.ok(g.quality>0);
 assert.ok(g.artifacts.every(x=>x.status==="approved"&&x.approvedVersion===x.version));
 const receipt=Math.round(a.proposedFee*(g.quality<78?.85:1));
 assert.equal(s.agencyCash,cash-g.expenses+receipt);
 assert.equal(s.ceo!.totalPaid,receipt);
 assert.equal(s.ceo!.totalBilled,receipt);
 assert.equal(s.ceo!.totalDirect,g.expenses);
 assert.equal(s.personalCash,originalPersonal);
 const ledger=s.ceo!.ledger.filter(x=>x.project===g.id);
 assert.equal(ledger.length,1);
 assert.equal(Gigs.submitAgencyGig(s,fx,g.id),false);
 assert.equal(s.agencyCash,cash-g.expenses+receipt,"no repeat payment");
 const restored=migrate(JSON.parse(JSON.stringify(s)));
 assert.equal(restored.ceo?.agencyGigs?.[0].status,"paid");
 assert.equal(restored.agencyCash,s.agencyCash);
 assert.equal(Gigs.submitAgencyGig(restored,fx,g.id),false,"reload never credits twice");
});
test("Agency gig consumes employee capacity, blocks exclusive client squads, and allows reassignment",()=>{
 const s=agency(),a=offer(s,"social-pack");
 Gigs.acceptAgencyGigOffer(s,fx,a.id,"creator");
 const g=s.ceo!.agencyGigs![0];
 assert.equal(Gigs.eligibleGigStaff(s,"social-pack").includes("creator"),true,"one of two capacity slots still available");
 // Existing team must not be permitted to borrow a member doing external gig work.
 s.ceo!.clientTeams=[{id:"test-team",clientId:"other-client",brand:"Other",memberIds:[],projectIds:[],leadId:null,status:"forming",createdDay:1}];
 joinClientTeam(s,fx,"test-team","creator");
 assert.deepEqual(s.ceo!.clientTeams[0].memberIds,[]);
 assert.equal(Gigs.reassignAgencyGig(s,fx,g.id,"buyer"),false,"wrong specialty");
 assert.equal(Gigs.reassignAgencyGig(s,fx,g.id,"producer"),true,"production specialists can back up creative work");
 assert.equal(g.staffId,"producer");
 assert.equal(Gigs.reassignAgencyGig(s,fx,g.id,"planner"),false,"wrong role");
});
test("Agency side gig work advances on CEO's existing simulation clock, and public offers refresh",()=>{
 const s=agency();const a=offer(s,"social-pack");Gigs.acceptAgencyGigOffer(s,fx,a.id,"creator");
 ceoTick(s,fx,7);
 const g=s.ceo!.agencyGigs![0];
 assert.ok(g.workHours>0||g.status==="ready","employee worked on the CEO weekly tick");
 assert.ok(g.laborCost>0,"staff labor is attributed to margin, not charged twice");
 assert.equal(s.clock.day,s.ceo!.day);
 Market.advanceFreelanceBoard(s,1,fx);
 assert.equal(s.freelanceBoard!.listings.filter(l=>l.postedWeek===2).length,7);
});
test("CEO Side Gigs tab renders employee assignment, deliverable approval and finance",()=>{
 const view=readFileSync("src/components/game/AgencyFreelanceDesk.tsx","utf8");
 const panels=readFileSync("src/components/game/Panels.tsx","utf8");
 const routes=readFileSync("src/game/workflowNavigation.ts","utf8");
 assert.match(view,/Apply as Agency/);
 assert.match(view,/Accept & Delegate/);
 assert.match(view,/Submit to Client Review/);
 assert.match(view,/Employee Delivery Board/);
 assert.match(view,/End Week/);
 assert.match(panels,/tab==="side-gigs"&&<AgencyFreelanceDesk/);
 assert.match(routes,/"side-gigs"/);
});
