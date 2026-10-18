/** Client finance calibration: Gemini proposes narrow adjustments only.
 * All amounts and tier boundaries stay in the deterministic game engine.
 */
import {CLIENT_BY_ID,FINANCIAL_BANDS,SECTORS,type ClientMaster,type ClientSector,type ClientSegment} from "./clientDatabase";
import type {GameState} from "./state";

export interface FinanceAdjustment{
 sector:ClientSector;startup:number;sme:number;bigcorp:number;marketing:number;reason:string;
}
export interface FinanceCalibration{
 version:1;source:"gemini"|"rules";adjustments:FinanceAdjustment[];
}
const bounds=(n:number,min:number,max:number)=>Math.max(min,Math.min(max,n));
const safeFactor=(n:unknown)=>typeof n==="number"&&Number.isFinite(n)?bounds(n,.85,1.15):1;
const rounding=(n:number)=>Math.round(n/100000)*100000;
export function ruleCalibration():FinanceCalibration{
 return {version:1,source:"rules",adjustments:SECTORS.map(x=>({
  sector:x.id,startup:1,sme:1,bigcorp:1,marketing:1,reason:"Bounded game baseline."
 }))};
}
export function validatedCalibration(raw:unknown):FinanceCalibration{
 if(!raw||typeof raw!=="object")throw Error("Missing finance calibration");
 const data=raw as Partial<FinanceCalibration>;
 if(data.version!==1||!["gemini","rules"].includes(data.source??"")||!Array.isArray(data.adjustments)||data.adjustments.length!==SECTORS.length)
  throw Error("Invalid financial calibration header");
 const seen=new Set<string>();
 const adjustments=data.adjustments.map(a=>{
  if(!a||!SECTORS.some(s=>s.id===a.sector)||seen.has(a.sector))throw Error("Invalid finance sector");
  seen.add(a.sector);
  if(["startup","sme","bigcorp","marketing"].some(k=>typeof a[k as ClientSegment|"marketing"]!=="number"||!Number.isFinite(a[k as ClientSegment|"marketing"])))
   throw Error("Invalid financial multiplier");
  return {sector:a.sector,startup:safeFactor(a.startup),sme:safeFactor(a.sme),
   bigcorp:safeFactor(a.bigcorp),marketing:safeFactor(a.marketing),reason:typeof a.reason==="string"?a.reason.slice(0,120):""};
 });
 return {version:1,source:data.source!,adjustments};
}
export function calibratedClient(s:GameState,client:ClientMaster):ClientMaster{
 const original=CLIENT_BY_ID[client.id]??client;
 const factor=s.financeCalibration?.adjustments?.find(x=>x.sector===original.sector);
 if(!factor)return original;
 const revenueFactor=safeFactor(factor[original.segment]);
 const marketingFactor=safeFactor(factor.marketing);
 if(original.basis!=="simulated")return {...original,marketingBudgetVnd:rounding(original.marketingBudgetVnd*marketingFactor)};
 const band=FINANCIAL_BANDS[original.segment],baseRevenue=original.annualRevenueVnd??band.revenueMinVnd;
 const annualRevenueVnd=rounding(bounds(baseRevenue*revenueFactor,band.revenueMinVnd,band.revenueMaxVnd));
 return {...original,annualRevenueVnd,marketingBudgetVnd:rounding(original.marketingBudgetVnd*annualRevenueVnd/baseRevenue*marketingFactor)};
}
