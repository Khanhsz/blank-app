/**
 * Agency proposal pricing. Gemini chooses a strategy and writes a rationale;
 * all amounts are produced and bounded by these deterministic gameplay rules.
 * "Company size" means inferred campaign scale, not verified company revenue.
 */
export const PRICE_TIERS=["competitive","balanced","premium"];
const amount=(n)=>Math.round(n/100000)*100000;
const safeText=(x,max=200)=>typeof x==="string"?x.trim().slice(0,max):"";
const finite=(x,min,max,name)=>{
 if(typeof x!=="number"||!Number.isFinite(x)||x<min||x>max)throw Error("Invalid "+name);
 return x;
};
export function validatePricingInput(raw){
 if(!raw||typeof raw!=="object"||Array.isArray(raw))throw Error("Invalid pricing request");
 const pref=["performance","creative","cost","strategy"].includes(raw.preference)?raw.preference:"performance";
 return {
  leadId:safeText(raw.leadId,90),brand:safeText(raw.brand,80),industry:safeText(raw.industry,90),
  objective:safeText(raw.objective,160),preference:pref,
  mediaBudget:finite(raw.mediaBudget,1000000,10000000000,"media budget"),
  baselineFee:finite(raw.baselineFee,1000000,2000000000,"base fee"),
  scope:finite(raw.scope,1,24,"scope"),
  duration:finite(raw.duration,7,180,"duration"),
  difficulty:finite(raw.difficulty,0,100,"difficulty"),
  target:finite(raw.target,0,100,"KPI target"),
  intensity:finite(raw.intensity,0,1,"intensity"),
  estimatedCost:finite(raw.estimatedCost,0,2000000000,"delivery cost"),
  competitorIndex:finite(raw.competitorIndex,0.6,1.8,"rival index"),
  staffCount:finite(raw.staffCount,0,100,"team size"),
 };
}
export const campaignScale=(budget)=>budget>=1000000000?"national":budget>=400000000?"regional":"growing";
export function priceEnvelope(input){
 const x=validatePricingInput(input);
 const scale=campaignScale(x.mediaBudget);
 const floor=amount(Math.max(x.baselineFee*.72,x.estimatedCost*1.12));
 const ceiling=amount(Math.max(x.baselineFee*1.45,floor*1.15));
 const complexity=Math.max(0,x.scope-7)*.012;
 const urgency=x.duration<28?.035:0;
 const size=scale==="national"?.025:scale==="regional"?.01:0;
 const rival=(x.competitorIndex-1)*.07;
 const intensity=x.intensity>.8?.025:0;
 const anchor=Math.max(floor,Math.min(ceiling,x.baselineFee*(1+complexity+urgency+size+intensity+rival)));
 const competitive=Math.max(floor,amount(anchor*.9));
 const balanced=Math.max(competitive,amount(anchor));
 const premium=Math.max(balanced,Math.min(ceiling,amount(anchor*1.15)));
 const options={competitive,balanced,premium};
 return {scale,floor,ceiling,options,
  risk:x.estimatedCost>competitive?"Cost pressure: competitive pricing may not cover delivery.":"Margins depend on staffing, partner rates and delivery scope."};
}
export function heuristicTier(x){
 if(x.preference==="cost"||x.competitorIndex<.85)return "competitive";
 if(x.scope>=11&&x.difficulty>=65&&x.preference!=="performance")return "premium";
 return "balanced";
}
export const PRICING_SCHEMA={
 type:"OBJECT",
 properties:{
  tier:{type:"STRING",enum:PRICE_TIERS},
  headline:{type:"STRING"},
  rationale:{type:"STRING"},
  preparation:{type:"ARRAY",minItems:2,maxItems:3,items:{type:"STRING"}}
 },
 required:["tier","headline","rationale","preparation"]
};
export function pricePrompt(input){
 const x=validatePricingInput(input),bands=priceEnvelope(x);
 return [
  "You advise a FICTIONAL marketing agency in a management simulation. No external market research or real company data is provided.",
  "Select one of the provided bid strategies for the client's REQUEST FOR PROPOSAL, and explain why. Never claim verified company revenue or market prices.",
  "Return JSON only with tier (competitive|balanced|premium), headline (max 100 chars), rationale (max 400 chars), preparation (2-3 clear actions).",
  "Keep the advice tied to marketing budget, campaign scope, delivery days, required staffing, target KPI and rival pricing pressure.",
  "DO NOT return any money amounts or winning probabilities; those are computed by the game engine.",
  "Lead: "+JSON.stringify({...x,estimatedCompanyScale:bands.scale,allowedFeeOptions:bands.options,estimatedSustainableFloor:bands.floor})
 ].join("\n");
}
export function buildPriceAdvice(input,modelResponse=null,source="rules"){
 const x=validatePricingInput(input),bands=priceEnvelope(x);
 const tier=PRICE_TIERS.includes(modelResponse?.tier)?modelResponse.tier:heuristicTier(x);
 const headline=safeText(modelResponse?.headline,100)||"Price the pitch around the client's budget and delivery workload";
 const rationale=safeText(modelResponse?.rationale,450)||
   "Compare the media budget, scope and delivery costs. Select a sustainable fee before competing with rival agencies.";
 const preparation=Array.isArray(modelResponse?.preparation)?modelResponse.preparation.map(t=>safeText(t,130)).filter(Boolean).slice(0,3):[];
 if(preparation.length<2)preparation.splice(0,preparation.length,
  "Present a KPI measurement plan and evidence-based strategy.",
  "Validate specialist capacity, production dependencies and estimated margin.");
 return {leadId:x.leadId,brand:x.brand,mediaBudget:x.mediaBudget,baselineFee:x.baselineFee,
  companyScale:bands.scale,estimatedCost:x.estimatedCost,feeFloor:bands.floor,feeCeiling:bands.ceiling,
  options:bands.options,tier,recommendedFee:bands.options[tier],headline,rationale,preparation,
  risk:bands.risk,source:source==="gemini"?"gemini":"rules"};
}
