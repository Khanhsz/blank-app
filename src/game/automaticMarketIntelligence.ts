/** Asynchronous Gemini enrichment. Only sector-level game aggregates leave
 * the browser; the server owns GEMINI_API_KEY. No personal information.
 * Market ticks run deterministically even if this API sleeps or is offline.
 */
import {act,getState} from "./store";
import {marketIntelligencePayload,applyGeminiMarketIntelligence} from "./companyMarket";
import type {MarketSector} from "./state";
const API="https://marketing-tycoon-ai-api.onrender.com";
const attempts=new Set<number>();
const VALID=new Set(["coffee","beauty","fashion","education","tech","fitness","food"]);
function defaultReport(payload:ReturnType<typeof marketIntelligencePayload>){
 return {week:payload.week,headline:"Game market pulse · rules engine",
 summary:"Client business conditions evolve as agencies run campaigns and competition changes. This is an in-game simulation, not a live company financial forecast.",
 source:"rules" as const,signals:payload.sectors.map(x=>({sector:x.sector,momentum:Math.max(-.35,Math.min(.35,Math.round(x.averageGrowth*.2*100)/100)),reason:"Deterministic sector trend from game activity."}))};
}
export async function requestMarketIntelligence(payload:ReturnType<typeof marketIntelligencePayload>){
 const controller=new AbortController();
 const timeout=setTimeout(()=>controller.abort(),33000);
 try{
  const res=await fetch(API+"/api/company-market-intelligence",{method:"POST",
   headers:{"Content-Type":"application/json"},body:JSON.stringify(payload),signal:controller.signal});
  if(!res.ok)throw Error("Market API unavailable");
  const data=await res.json() as {report?:{week:number;headline:string;summary:string;source:string;
   signals:{sector:string;momentum:number;reason:string}[]}};
  const r=data.report;
  if(!r||r.week!==payload.week||!["gemini","rules"].includes(r.source)||
    typeof r.headline!=="string"||typeof r.summary!=="string"||!Array.isArray(r.signals)||
    r.signals.length!==7||new Set(r.signals.map(x=>x.sector)).size!==7||
    r.signals.some(x=>!VALID.has(x.sector)||!Number.isFinite(x.momentum)||typeof x.reason!=="string"))throw Error("Invalid market insight");
  return {week:r.week,headline:r.headline.slice(0,115),summary:r.summary.slice(0,350),
   source:r.source as "gemini"|"rules",signals:r.signals.map(x=>({sector:x.sector as MarketSector,
    momentum:Math.max(-.65,Math.min(.65,x.momentum)),reason:x.reason.slice(0,140)}))};
 }finally{clearTimeout(timeout)}
}
export function prepareMarketIntelligence(){
 const s=getState(),m=s.companyMarket;
 if(!s.created||!m||m.lastWeek<4||m.lastWeek%4!==0||m.intelligence.lastWeek>=m.lastWeek)return;
 const week=m.lastWeek;if(attempts.has(week))return;
 attempts.add(week);
 const payload=marketIntelligencePayload(s);
 void requestMarketIntelligence(payload).catch(()=>defaultReport(payload)).then(report=>{
  // A stale response cannot retroactively mutate a simulated business week.
  const latest=getState().companyMarket;
  if(!latest||latest.lastWeek!==week||latest.intelligence.lastWeek>=week)return;
  act(d=>{applyGeminiMarketIntelligence(d,report)});
 });
}
