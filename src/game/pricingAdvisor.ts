/** Read-only AI pricing intelligence. Client and game rules remain authoritative. */
import {forecast} from "./ceo";
import type {GameState,Lead,PricingAdvice} from "./state";

const API="https://marketing-tycoon-ai-api.onrender.com";
export interface PricingContext{
 leadId:string;brand:string;industry:string;objective:string;preference:"performance"|"creative"|"cost"|"strategy";businessSize?:"small"|"medium"|"large"|"enterprise";
 mediaBudget:number;baselineFee:number;scope:number;duration:number;difficulty:number;target:number;intensity:number;
 estimatedCost:number;competitorIndex:number;staffCount:number;
}
export function pricingContext(s:GameState,l:Lead):PricingContext{
 const estimate=forecast(s,{fee:l.fee,scope:l.scope,deadline:l.duration});
 const rivals=l.rivalIds.map(id=>s.ceo?.rivals.find(r=>r.id===id)?.price).filter((n):n is number=>typeof n==="number"&&Number.isFinite(n));
 const index=rivals.length?rivals.reduce((a,b)=>a+b,0)/rivals.length:1;
 return {
  leadId:l.id,brand:l.brand,industry:l.industry,objective:l.objective,preference:l.pref,businessSize:l.businessSize,
  mediaBudget:l.value,baselineFee:l.fee,scope:l.scope,duration:l.duration,
  difficulty:l.difficulty,target:l.target,intensity:l.intensity,
  estimatedCost:Math.min(2000000000,Math.max(0,Math.round(l.fee-estimate.margin))),
  competitorIndex:Math.max(.6,Math.min(1.8,index)),staffCount:s.staff.length
 };
}
export const pricingFingerprint=(x:PricingContext)=>JSON.stringify([
 x.leadId,x.mediaBudget,x.baselineFee,x.scope,x.duration,x.businessSize,x.objective,x.preference,x.difficulty,x.target,x.intensity,x.estimatedCost,x.competitorIndex,x.staffCount
]);
export function validatedAdvice(raw:unknown,x:PricingContext):PricingAdvice{
 if(!raw||typeof raw!=="object")throw Error("Invalid pricing advice");
 const a=raw as PricingAdvice;
 const num=(n:number)=>typeof n==="number"&&Number.isFinite(n)&&n>=0&&n<=3000000000;
 if(a.leadId!==x.leadId||a.mediaBudget!==x.mediaBudget||a.baselineFee!==x.baselineFee)throw Error("Advice no longer matches this client");
 if(!a.options||!num(a.feeFloor)||!num(a.feeCeiling)||a.feeFloor>a.feeCeiling)throw Error("Invalid fee guardrails");
 const {competitive,balanced,premium}=a.options;
 if(![competitive,balanced,premium].every(num)||competitive<a.feeFloor||
    competitive>balanced||balanced>premium||premium>a.feeCeiling)throw Error("Invalid fee alternatives");
 if(!["competitive","balanced","premium"].includes(a.tier)||a.recommendedFee!==a.options[a.tier])throw Error("Invalid AI strategy");
 if(!["gemini","rules"].includes(a.source)||typeof a.rationale!=="string"||!Array.isArray(a.preparation))throw Error("Invalid pricing explanation");
 if(a.recommendedFee<Math.max(0,x.estimatedCost*.8))throw Error("Price is below viable delivery cost");
 return {...a,contextKey:pricingFingerprint(x)};
}
export async function requestPricingAdvice(x:PricingContext,signal?:AbortSignal):Promise<PricingAdvice>{
 const r=await fetch(API+"/api/pricing-advice",{
  method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(x),signal
 });
 const data=await r.json().catch(()=>null) as {advice?:unknown;error?:string}|null;
 if(!r.ok)throw new Error(data?.error||"Pricing API unavailable");
 return validatedAdvice(data?.advice,x);
}
