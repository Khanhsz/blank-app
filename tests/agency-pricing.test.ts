import test from "node:test";
import assert from "node:assert/strict";
import {defaults,newCEO,migrate} from "../src/game/state";
import {qualify,startPitch,pitchFee,applySuggestedFee,setPitch,beginNegotiation} from "../src/game/ceo";
import {pricingContext,pricingFingerprint,validatedAdvice} from "../src/game/pricingAdvisor";
import type {Fx} from "../src/game/store";

const fx:Fx={toast:()=>{},log:()=>{}};
const agency=()=>{
 const s=defaults();s.created=true;s.agencyUnlocked=true;s.cityUnlocked=true;
 s.agencyCash=1000000000;s.reputation=80;s.ceo=newCEO(80);return s;
};
test("AI pricing input uses actual media budget, staff cost and existing rival price indices",()=>{
 const s=agency(),l=s.ceo!.leads.find(x=>x.id==="orion")!;
 const x=pricingContext(s,l);
 assert.equal(x.mediaBudget,l.value);
 assert.equal(x.businessSize,l.businessSize);
 assert.equal(x.baselineFee,l.fee);
 assert.equal(x.scope,l.scope);
 assert.equal(x.duration,l.duration);
 assert.ok(x.estimatedCost>0);
 assert.ok(x.competitorIndex>=.6&&x.competitorIndex<=1.8);
 assert.ok(pricingFingerprint(x).includes(l.id));
});
test("proposal may be chosen in preparation; winning negotiation starts at selected quote",()=>{
 const s=agency(),l=s.ceo!.leads.find(x=>x.id==="sora")!;
 qualify(s,fx,l.id);startPitch(s,fx,l.id);
 assert.equal(s.ceo!.pitch?.step,"prepare");
 const x=pricingContext(s,l);
 l.pricingAdvice=validatedAdvice({
  leadId:l.id,brand:l.brand,mediaBudget:l.value,baselineFee:l.fee,
  companyScale:"growing",estimatedCost:x.estimatedCost,feeFloor:30000000,feeCeiling:62000000,
  options:{competitive:34000000,balanced:43000000,premium:55000000},
  tier:"balanced",recommendedFee:43000000,headline:"Bounded fee",rationale:"Capacity and scope",
  preparation:["Audit deliverables","Prepare ROI forecast"],risk:"Variable costs",source:"gemini"
 },x);
 applySuggestedFee(s,fx,"premium");
 const pitch=s.ceo!.pitch!;
 assert.equal(pitchFee(l,pitch),55000000);
 assert.equal(pitch.bidFee,55000000);
 l.status="pitch_won";beginNegotiation(s);
 assert.equal(s.ceo!.negotiation?.fee,55000000);
 const restored=migrate(JSON.parse(JSON.stringify(s)));
 assert.equal(restored.ceo?.negotiation?.fee,55000000);
 assert.equal(restored.ceo?.leads.find(x=>x.id===l.id)?.pricingAdvice?.recommendedFee,43000000);
});
test("player preset overrides previous AI quote and invalid recommendation is rejected",()=>{
 const s=agency(),l=s.ceo!.leads.find(x=>x.id==="sora")!;
 qualify(s,fx,l.id);startPitch(s,fx,l.id);
 const context=pricingContext(s,l);
 assert.throws(()=>validatedAdvice({
  leadId:l.id,baselineFee:l.fee,mediaBudget:l.value,feeFloor:30000000,feeCeiling:60000000,
  options:{competitive:34000000,balanced:43000000,premium:70000000},
  tier:"premium",recommendedFee:70000000,rationale:"",preparation:[],source:"gemini"
 },context),/Invalid fee alternatives/);
 l.pricingAdvice=validatedAdvice({
  leadId:l.id,brand:l.brand,mediaBudget:l.value,baselineFee:l.fee,
  companyScale:"growing",estimatedCost:context.estimatedCost,feeFloor:30000000,feeCeiling:70000000,
  options:{competitive:34000000,balanced:43000000,premium:55000000},
  tier:"balanced",recommendedFee:43000000,headline:"A quote",rationale:"Financially viable",
  preparation:["Review fees","Confirm capacity"],risk:"",source:"rules"
 },context);
 applySuggestedFee(s,fx,"balanced");
 assert.equal(s.ceo!.pitch!.bidFee,43000000);
 setPitch(s,"price","discount");
 assert.equal(s.ceo!.pitch!.bidFee,undefined);
 assert.equal(pitchFee(l,s.ceo!.pitch!),Math.round(l.fee*.92));
});
