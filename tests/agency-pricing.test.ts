import test from "node:test";
import assert from "node:assert/strict";
import {defaults,newCEO,migrate} from "../src/game/state";
import {qualify,startPitch,pitchFee,presentPitch,applySuggestedFee,setPitch,beginNegotiation} from "../src/game/ceo";
import {pricingContext,pricingFingerprint,validatedAdvice,qualificationQuote} from "../src/game/pricingAdvisor";
import {qualificationFee} from "../marketing-tycoon-ai-api/pricing.mjs";
import {readFileSync} from "node:fs";
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
 assert.equal(s.ceo!.pitch?.bidFee,l.pricingAdvice?.recommendedFee,"pitch starts with a real automatically calculated quote");
 assert.equal(s.ceo!.pitch?.priceSelected,false);
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
 assert.equal(s.ceo!.pitch!.bidFee,l.pricingAdvice.options.competitive);
 assert.equal(s.ceo!.pitch!.priceSelected,true);
 assert.equal(pitchFee(l,s.ceo!.pitch!),l.pricingAdvice.options.competitive);
});

test("every qualification instantly produces pricing, and pitch submits a real fee without an extra Analyze click",()=>{
 const s=agency(),l=s.ceo!.leads.find(x=>x.id==="orion")!;
 assert.equal(l.pricingAdvice,undefined);
 qualify(s,fx,l.id);
 assert.equal(l.pricingAdvice?.source,"rules");
 assert.ok(l.pricingAdvice!.recommendedFee>0);
 assert.equal(l.pricingAdvice!.mediaBudget,l.value);
 startPitch(s,fx,l.id);
 const bid=s.ceo!.pitch!;
 assert.equal(bid.bidFee,l.pricingAdvice!.recommendedFee);
 presentPitch(s);
 assert.equal(bid.step,"objection");
 assert.equal(bid.bidFee,l.pricingAdvice!.recommendedFee);
 assert.ok(s.agencyCash<1000000000);
});
test("pricing is integrated into pitch decisions instead of a separate optional feature",()=>{
 const code=readFileSync("src/components/game/Panels.tsx","utf8");
 assert.ok(code.includes("Submit priced pitch"));
 assert.ok(code.includes("applySuggestedFee"));
 assert.ok(!code.includes("AI Pricing Desk"));
 assert.ok(!code.includes("Analyze and recommend fee"));
});
test("old prepared pitches without bidFee automatically become priced before submission",()=>{
 const s=agency(),l=s.ceo!.leads.find(x=>x.id==="sora")!;
 qualify(s,fx,l.id);startPitch(s,fx,l.id);
 delete s.ceo!.pitch!.bidFee;
 delete s.ceo!.pitch!.priceTier;
 const saved=migrate(JSON.parse(JSON.stringify(s)));
 const p=saved.ceo!.pitch!;
 presentPitch(saved);
 assert.equal(p.step,"objection");
 assert.equal(p.bidFee,saved.ceo!.leads.find(x=>x.id===l.id)!.pricingAdvice!.recommendedFee);
});

test("Qualify charges exact displayed risk-weighted fee and stores payment in the agency ledger and save",()=>{
 const s=agency(),l=s.ceo!.leads.find(x=>x.id==="orion")!;
 const before=s.agencyCash,quote=qualificationQuote(s,l);
 assert.ok(quote.fee>180000);
 qualify(s,fx,l.id);
 assert.equal(l.status,"qualified");
 assert.equal(l.qualifyFeePaid,quote.fee);
 assert.equal(l.qualifyDepthPaid,quote.depth);
 assert.equal(s.agencyCash,before-quote.fee);
 assert.equal(s.ceo!.ledger[0].value,-quote.fee);
 assert.ok(s.ceo!.ledger[0].what.includes("Lead qualification"));
 const after=s.agencyCash;
 qualify(s,fx,l.id);
 assert.equal(s.agencyCash,after,"cannot pay for the same qualified lead twice");
 const restored=migrate(JSON.parse(JSON.stringify(s)));
 assert.equal(restored.ceo?.leads.find(x=>x.id===l.id)?.qualifyFeePaid,quote.fee);
});
test("insufficient funds prevent lead qualification without partial charges",()=>{
 const s=agency(),l=s.ceo!.leads.find(x=>x.id==="sora")!;
 const quote=qualificationQuote(s,l);
 s.agencyCash=quote.fee-1;
 const ledgerSize=s.ceo!.ledger.length;
 qualify(s,fx,l.id);
 assert.equal(l.status,"new");
 assert.equal(s.agencyCash,quote.fee-1);
 assert.equal(s.ceo!.ledger.length,ledgerSize);
});
test("Gemini picks diligence depth while the game calculates the exact charge and freezes paid fees",()=>{
 const s=agency(),l=s.ceo!.leads.find(x=>x.id==="sora")!;
 const x=pricingContext(s,l),fromGemini=validatedAdvice({
   ...l,leadId:l.id,brand:l.brand,mediaBudget:l.value,baselineFee:l.fee,
   feeFloor:20000000,feeCeiling:80000000,options:{competitive:25000000,balanced:39000000,premium:55000000},
   tier:"balanced",recommendedFee:39000000,companyScale:"growing",estimatedCost:x.estimatedCost,
   qualificationDepth:"deep",qualificationFee:999999999,
   headline:"Complex stakeholder approvals",rationale:"Requires validation",preparation:["Interview stakeholders","Verify media quotes"],risk:"",
   source:"gemini"
 },x);
 assert.equal(fromGemini.qualificationFee,qualificationFee(x,"deep"));
 l.pricingAdvice=fromGemini;
 const quote=qualificationQuote(s,l);
 assert.equal(quote.depth,"deep");
 assert.equal(quote.fee,qualificationFee(x,"deep"));
 qualify(s,fx,l.id);
 assert.equal(l.qualifyFeePaid,quote.fee);
 // The next Gemini analysis may change strategic advice but cannot change a past charge.
 l.pricingAdvice=validatedAdvice({...fromGemini,qualificationDepth:"lean"},x);
 assert.equal(l.qualifyFeePaid,quote.fee);
});
test("Client HQ deep-links to Growth Desk; free discovery and optional priced diligence are not bypassed",()=>{
 const panels=readFileSync("src/components/game/Panels.tsx","utf8");
 const desk=readFileSync("src/components/game/GrowthDesk.tsx","utf8");
 const acquisition=readFileSync("src/game/acquisition.ts","utf8");
 assert.ok(panels.includes("Open {l.brand} in Growth Desk"));
 assert.ok(panels.includes("A.focusDeal(d,l.id)"));
 assert.ok(!panels.includes("Qualify opportunity ·"));
 assert.ok(desk.includes("qualificationQuote(s,l).fee"));
 assert.ok(desk.includes("Optional deeper research"));
 assert.ok(acquisition.includes("qualificationQuote(s,l)"));
 assert.ok(acquisition.includes('l.status="qualified"'));
 assert.ok(!desk.includes("Qualify · 180k"));
});
