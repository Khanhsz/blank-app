import test from "node:test";
import assert from "node:assert/strict";
import {buildPriceAdvice,priceEnvelope,pricePrompt,validatePricingInput,PRICE_TIERS} from "./pricing.mjs";
const sample={leadId:"orion",brand:"Orion",industry:"Electronics",objective:"Qualified leads",preference:"performance",
 mediaBudget:2400000000,baselineFee:190000000,scope:12,duration:36,difficulty:72,target:16,intensity:.9,estimatedCost:94000000,competitorIndex:1.12,staffCount:7};
test("pricing uses campaign budget scale and cost floor",()=>{
 const a=buildPriceAdvice(sample,{tier:"balanced",rationale:"Risk and scope matter",preparation:["Audit scope","Plan measurement"]},"gemini");
 assert.equal(a.companyScale,"national");
 assert.equal(a.recommendedFee,a.options.balanced);
 assert.ok(a.options.competitive>=a.feeFloor);
 assert.ok(a.options.premium>=a.options.balanced);
 assert.equal(a.source,"gemini");
});
test("untrusted Gemini amounts never set a tender fee",()=>{
 const a=buildPriceAdvice(sample,{tier:"premium",recommendedFee:999999999999999,headline:"Premium plan",preparation:["Verify strategy","Cost delivery"]},"gemini");
 assert.equal(a.recommendedFee,a.options.premium);
 assert.ok(a.recommendedFee<=a.feeCeiling);
});
test("different scales and budgets produce different bounded recommendations",()=>{
 const small=buildPriceAdvice({...sample,mediaBudget:260000000,baselineFee:42000000,scope:7,estimatedCost:15000000});
 assert.equal(small.companyScale,"growing");
 assert.ok(small.recommendedFee<buildPriceAdvice(sample).recommendedFee);
});
test("business scale is independent of marketing budget and changes the fee recommendation",()=>{
 const enterprise=buildPriceAdvice({...sample,businessSize:"enterprise"},null,"rules");
 const small=buildPriceAdvice({...sample,businessSize:"small"},null,"rules");
 assert.equal(enterprise.companyScale,small.companyScale);
 assert.equal(enterprise.businessSize,"enterprise");
 assert.equal(small.businessSize,"small");
 assert.ok(enterprise.options.balanced>small.options.balanced);
});
test("invalid numbers are rejected and offline fallback remains playable",()=>{
 assert.throws(()=>validatePricingInput({...sample,mediaBudget:Infinity}),/Invalid media budget/);
 assert.throws(()=>validatePricingInput({...sample,estimatedCost:-1}),/Invalid delivery cost/);
 assert.ok(PRICE_TIERS.includes(buildPriceAdvice(sample).tier));
 assert.ok(pricePrompt(sample).includes("FICTIONAL"));
 assert.ok(priceEnvelope(sample).floor>0);
});
