import {createHash} from "node:crypto";
const INSIGHTS=["awareness","value","location","trust","style"];
const SEGMENTS=["students","youngpros","genz","everyone"];
const POSITIONS=["study","budget","proof","style"];
const CREATIVE=["study","story","creator","discount"];
const OBJECTIVES=["visits","leads","sales","views"];
const CHANNELS=["paid","creator","promo","flyer"];
const EVIDENCE=["audit","reviews","industry","interview"];
export const CATEGORIES=["coffee","fashion","beauty","education","fitness","tech","food"];
const only=(v,choices,label)=>{if(!choices.includes(v))throw Error("Invalid "+label);return v};
const string=(v,max=350,label="text")=>{
 if(typeof v!=="string"||!v.trim())throw Error("Missing or invalid "+label+" ("+(typeof v==="string"?v.trim().length:"not-string")+")");
 const t=v.trim();if(t.length<=max)return t;
 const short=t.slice(0,max);return short.replace(/\\s+\\S*$/,"").trim()||short;
};
const number=(v,min,max,label)=>{if(typeof v!=="number"||!Number.isFinite(v)||v<min||v>max)throw Error("Invalid "+label);return v};
export function validateCandidate(raw,category="coffee"){
 if(!raw||typeof raw!=="object")throw Error("Invalid output");
 const truth={
  trueInsight:only(raw.trueInsight,INSIGHTS,"insight"),
  trueSegment:only(raw.trueSegment,SEGMENTS,"segment"),
  truePosition:only(raw.truePosition,POSITIONS,"position"),
  trueCreative:only(raw.trueCreative,CREATIVE,"creative"),
  trueObjective:only(raw.trueObjective,OBJECTIVES,"objective")
 };
 const reports={};for(const id of EVIDENCE)reports[id]=string(raw.reports?.[id],430,"report."+id);
 if(!Array.isArray(raw.insightOptions)||raw.insightOptions.length!==INSIGHTS.length)throw Error("Exactly 5 insight hypotheses needed");
 const seen=new Set();const insightOptions=raw.insightOptions.map(v=>{
  const id=only(v?.id,INSIGHTS,"insight option");if(seen.has(id))throw Error("Duplicate insight");seen.add(id);
  return {id,title:string(v.title,90,"insight title "+id),desc:string(v.desc,190,"insight description "+id)};
 });if(seen.size!==INSIGHTS.length)throw Error("Missing insight");
 const channel={};for(const id of CHANNELS)channel[id]=number(raw.channel?.[id],.65,1.45,"channel");
 const budget=number(raw.budget,8000000,16000000,"budget");
 const target=number(raw.target,15,38,"target");
 const baseline=number(raw.baseline,15,120,"baseline");
 const fee=Math.round(budget*.4/100000)*100000;
 const categoryClean=only(category,CATEGORIES,"category");
 const digest=createHash("sha256").update(JSON.stringify({raw,categoryClean})).digest("hex");
 return {
  id:"ai-"+digest.slice(0,12),
  brand:string(raw.brand,72,"brand"),industry:string(raw.industry,85,"industry"),contact:string(raw.contact,90,"contact"),
  budget:Math.round(budget/100000)*100000,fee,days:14,
  baseline,target,metric:string(raw.metric,60,"metric"),unit:string(raw.unit,30,"unit"),
  summary:string(raw.summary,190,"summary"),client:string(raw.client,420,"client"),
  ...truth,channel,reports,insightOptions,
  aiMeta:{category:categoryClean,seed:parseInt(digest.slice(0,8),16)%1000000,label:"Fictional AI-generated training scenario"}
 };
}
export function inputCategory(v){return CATEGORIES.includes(v)?v:"coffee"}
export function prompt(category){
 return [
 "You are the scenario designer for Marketing Tycoon, a strategy game. Create one internally consistent fictional marketing client in English.",
 "Category: "+category+". All businesses, interviews and findings are imaginary, NOT real studies. Do not fabricate citations. No adult or unsuitable products.",
 "Return ONLY a JSON object with exactly these top-level fields:",
 "brand, industry, contact, budget, baseline, target, metric, unit, summary, client, trueInsight, trueSegment, truePosition, trueCreative, trueObjective, channel, reports, insightOptions.",
 "Fields: brand is a fictional business name; contact is a fictional name and job; client is the first-person client brief with a business challenge and no explicit answer.",
 "budget integer from 8000000 to 16000000 VND; baseline integer 15–120; target number 15–38; metric and unit short strings; 14-day freelancer assignment.",
 "Truth enum values: trueInsight=awareness|value|location|trust|style; trueSegment=students|youngpros|genz|everyone;",
 "truePosition=study|budget|proof|style; trueCreative=study|story|creator|discount; trueObjective=visits|leads|sales|views.",
 "channel is object with numeric keys paid,creator,promo,flyer; each value between 0.65 and 1.45. Values represent channel effectiveness.",
 "reports is object with four distinct fictional evidence findings as strings: audit, reviews, industry, interview.",
 "A true problem is supported by TWO or more of these findings; competing hypotheses plausible but distinguishable. Industry finding is broad, not a source citation.",
 "insightOptions MUST contain exactly five objects, one per id awareness,value,location,trust,style, each with id,title,desc strings.",
 "Titles and descriptions should be brand-specific, realistic and non-trivial. Do not directly label which hypothesis is correct.",
 "Each choice needs a meaningful trade-off under the existing game rules; ensure the true creative and channel effectiveness fit the fictional problem.",
 "Return valid JSON only, no markdown fences."
 ].join("\n");
}


/** JSON schema enforces valid Gemini shape before business-logic validation. */
export const GEMINI_SCHEMA={
 type:"OBJECT",
 properties:{
  brand:{type:"STRING",description:"Short fictional brand name; not empty"},
  industry:{type:"STRING",description:"Industry or product category"},
  contact:{type:"STRING",description:"Client contact name and title"},
  budget:{type:"INTEGER",description:"Integer VND budget between 8000000 and 16000000"},
  baseline:{type:"NUMBER",description:"Positive baseline performance measure 15 to 120"},
  target:{type:"NUMBER",description:"Percentage uplift target 15 to 38"},
  metric:{type:"STRING",description:"Business KPI name, e.g. visits/week"},
  unit:{type:"STRING",description:"Short unit label, e.g. visits"},
  summary:{type:"STRING",description:"Short client challenge"},
  client:{type:"STRING",description:"Realistic first-person brief with a tension, not the solution"},
  trueInsight:{type:"STRING",enum:INSIGHTS},
  trueSegment:{type:"STRING",enum:SEGMENTS},
  truePosition:{type:"STRING",enum:POSITIONS},
  trueCreative:{type:"STRING",enum:CREATIVE},
  trueObjective:{type:"STRING",enum:OBJECTIVES},
  channel:{type:"OBJECT",properties:{
   paid:{type:"NUMBER"},creator:{type:"NUMBER"},promo:{type:"NUMBER"},flyer:{type:"NUMBER"}
  },required:CHANNELS},
  reports:{type:"OBJECT",properties:{
   audit:{type:"STRING",description:"Fictional competitor evidence"},
   reviews:{type:"STRING",description:"Fictional review evidence"},
   industry:{type:"STRING",description:"Broad fictional category context"},
   interview:{type:"STRING",description:"Fictional customer interview evidence"}
  },required:EVIDENCE},
  insightOptions:{type:"ARRAY",minItems:5,maxItems:5,items:{type:"OBJECT",properties:{
   id:{type:"STRING",enum:INSIGHTS},title:{type:"STRING"},desc:{type:"STRING"}
  },required:["id","title","desc"]}}
 },
 required:["brand","industry","contact","budget","baseline","target","metric","unit","summary","client","trueInsight","trueSegment","truePosition","trueCreative","trueObjective","channel","reports","insightOptions"]
};
