/** Gemini can suggest narrow fictional sector adjustments, NEVER prices,
 * external financial facts, Fortune revenue or arbitrary VND values.
 * The game owns all baseline ranges and rejects unsafe model output.
 */
export const FINANCE_SECTORS=["coffee","beauty","fashion","education","tech","fitness","food"];
const LIMIT=.15;
export const FINANCE_SCHEMA={
 type:"OBJECT",properties:{adjustments:{type:"ARRAY",minItems:7,maxItems:7,
  items:{type:"OBJECT",properties:{
   sector:{type:"STRING",enum:FINANCE_SECTORS},
   startup:{type:"NUMBER"},sme:{type:"NUMBER"},bigcorp:{type:"NUMBER"},
   marketing:{type:"NUMBER"},reason:{type:"STRING"}
  },required:["sector","startup","sme","bigcorp","marketing","reason"]}}},
 required:["adjustments"]
};
const bound=(x)=>Math.round(Math.min(1+LIMIT,Math.max(1-LIMIT,x))*1000)/1000;
export function validateFinanceCalibration(raw){
 if(!raw||!Array.isArray(raw.adjustments)||raw.adjustments.length!==7)throw Error("Expected seven financial adjustment groups");
 const seen=new Set();
 const adjustments=raw.adjustments.map(x=>{
  if(!x||!FINANCE_SECTORS.includes(x.sector)||seen.has(x.sector))throw Error("Invalid sector");
  seen.add(x.sector);
  for(const key of ["startup","sme","bigcorp","marketing"]){
   if(typeof x[key]!=="number"||!Number.isFinite(x[key])||x[key]<.5||x[key]>1.5)throw Error("Invalid model factor");
  }
  return {sector:x.sector,startup:bound(x.startup),sme:bound(x.sme),
   bigcorp:bound(x.bigcorp),marketing:bound(x.marketing),
   reason:typeof x.reason==="string"?x.reason.trim().slice(0,120):""};
 });
 return {version:1,source:"gemini",adjustments};
}
export function fallbackFinanceCalibration(){
 return {version:1,source:"rules",adjustments:FINANCE_SECTORS.map(sector=>({
  sector,startup:1,sme:1,bigcorp:1,marketing:1,reason:"Bounded fictional business-size baseline."
 }))};
}
export const financePrompt=()=>[
 "You are balancing a fictional Vietnam-centered marketing agency tycoon game. No actual company earnings or marketing spend data is provided.",
 "Startup revenue is already conservatively modeled at 0.35–2.5 billion VND/year; SME at 4–55 billion VND/year; fictional Big Corp at 10–80 trillion VND/year.",
 "Estimate SMALL sector-specific corrections around these baselines, using only economics of scale, purchase frequency, margins and business model differences.",
 "For each EXACTLY once: "+FINANCE_SECTORS.join(", ")+".",
 "Return adjustments array with sector and numeric startup, sme, bigcorp, marketing MULTIPLIERS (not amounts) each BETWEEN 0.85 and 1.15, and one brief reason.",
 "Do not invent sources, quote actual corporate data, classify legal SMEs, or alter any published Fortune revenue. The engine clamps each value and contract pricing remains separate.",
 "Return JSON only."
].join("\n");
