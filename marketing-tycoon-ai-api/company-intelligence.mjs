/** Safe Gemini business intelligence protocol. No confidential client data or
 * financial truth is sent to AI. AI does NOT directly write revenue/rankings.
 * Input: seven aggregate game-world sectors. Output: bounded scenario signals.
 */
export const SECTORS=["coffee","beauty","fashion","education","tech","fitness","food"];
export const MARKET_SCHEMA={
 type:"OBJECT",properties:{
  headline:{type:"STRING"},summary:{type:"STRING"},
  signals:{type:"ARRAY",items:{type:"OBJECT",properties:{
   sector:{type:"STRING",enum:SECTORS},momentum:{type:"NUMBER"},reason:{type:"STRING"}
  },required:["sector","momentum","reason"]}}
 },required:["headline","summary","signals"]
};
const range=(x,min,max)=>Math.max(min,Math.min(max,x));
const plain=(s,n)=>typeof s==="string"?s.trim().slice(0,n):"";
export function validateMarketRequest(raw){
 if(!raw||typeof raw!=="object"||!Number.isInteger(raw.week)||raw.week<1||raw.week>15000||!Array.isArray(raw.sectors)||raw.sectors.length!==7)throw Error("Invalid market request");
 const sectors=raw.sectors.map(x=>{
  if(!x||!SECTORS.includes(x.sector))throw Error("Unknown sector");
  const fields=["clientCount","averageGrowth","averageAwareness","campaignCount"];
  if(fields.some(k=>!Number.isFinite(x[k])||x[k]<-10||x[k]>100000))throw Error("Invalid industry metrics");
  return {sector:x.sector,clientCount:Math.round(x.clientCount),averageGrowth:range(x.averageGrowth,-5,5),
   averageAwareness:range(x.averageAwareness,0,100),campaignCount:Math.round(x.campaignCount)};
 });
 if(new Set(sectors.map(x=>x.sector)).size!==7)throw Error("Duplicate market sectors");
 const recent=Array.isArray(raw.recent)?raw.recent.slice(0,6).filter(x=>SECTORS.includes(x?.sector)&&["player","rival"].includes(x.actor)&&Number.isFinite(x.impact)).map(x=>({sector:x.sector,actor:x.actor,impact:range(x.impact,-2,2)})):[];
 return {week:raw.week,sectors,recent};
}
export function validateMarketIntelligence(raw,week){
 if(!raw||typeof raw!=="object"||!Array.isArray(raw.signals))throw Error("Invalid intelligence response");
 const seen=new Set();
 const signals=raw.signals.map(x=>{
  if(!x||!SECTORS.includes(x.sector)||seen.has(x.sector)||!Number.isFinite(x.momentum))throw Error("Invalid AI sector signal");
  seen.add(x.sector);
  return {sector:x.sector,momentum:range(x.momentum,-.65,.65),reason:plain(x.reason,140)};
 });
 if(signals.length!==7)throw Error("Incomplete industry signal set");
 const headline=plain(raw.headline,115),summary=plain(raw.summary,350);
 if(headline.length<8||summary.length<24)throw Error("Insufficient market explanation");
 return {week,headline,summary,signals,source:"gemini"};
}
export function fallbackMarketReport(input){
 const sectors=input.sectors.map(x=>({
  sector:x.sector,momentum:range(Math.round(x.averageGrowth*.20*100)/100,-.35,.35),
  reason:"Rule-based outlook from simulated recent growth; not a real economic forecast."
 }));
 return {week:input.week,headline:"Game market pulse: companies adapt to marketing competition",
  summary:"Revenue and brand awareness are modeled using the game economy. Rival campaigns and your completed client projects can shift next-period demand. No live corporate financial data was fetched.",
  signals:sectors,source:"rules"};
}
export function marketPrompt(input){
 return [
  "You are a business simulation analyst for a FICTIONAL marketing tycoon game. These are game-world aggregate sector metrics, not live corporate disclosures.",
  "Return one JSON object with headline, summary, and signals for EXACTLY seven sectors: "+SECTORS.join(", ")+".",
  "For each sector choose a modest signed market momentum between -0.65 and 0.65 percentage points per GAME WEEK and one short reason.",
  "Consider modeled growth, brand awareness and competition. Avoid implausible shocks, predictions of actual Fortune 500 rankings, real-world factual claims, and private data.",
  "Marketing campaigns have bounded direct effects computed by the game engine. AI momentum is applied only to FUTURE weeks. It cannot directly edit company revenue, user cash or official Fortune rankings.",
  "A reason must explain an industry mechanism such as consumer demand, competitive pricing or distribution. Keep text concise, plain English.",
  JSON.stringify(input)
 ].join("\n");
}
