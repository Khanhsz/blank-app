export const BEDROOM_JOBS={
  "social-pack": {
    "tier": "gig",
    "fee": 700000,
    "mediaBudget": 0,
    "days": 4,
    "hours": 12,
    "revisions": 2,
    "deliverables": "5 branded social posts",
    "successMetric": "Approved deliverables"
  },
  "social-audit": {
    "tier": "gig",
    "fee": 600000,
    "mediaBudget": 0,
    "days": 3,
    "hours": 8,
    "revisions": 1,
    "deliverables": "Channel audit and recommendations",
    "successMetric": "Approved audit"
  },
  "content-calendar": {
    "tier": "gig",
    "fee": 1000000,
    "mediaBudget": 0,
    "days": 5,
    "hours": 16,
    "revisions": 2,
    "deliverables": "Two-week content calendar",
    "successMetric": "Client-approved calendar"
  },
  "short-video": {
    "tier": "gig",
    "fee": 1500000,
    "mediaBudget": 0,
    "days": 5,
    "hours": 20,
    "revisions": 2,
    "deliverables": "5 edited short videos",
    "successMetric": "Client-approved video assets"
  },
  "meta-setup": {
    "tier": "project",
    "fee": 1200000,
    "mediaBudget": 2000000,
    "days": 7,
    "hours": 20,
    "revisions": 2,
    "deliverables": "Meta Ads setup and tracking",
    "successMetric": "Correct setup, not guaranteed sales"
  },
  "audience-research": {
    "tier": "project",
    "fee": 2000000,
    "mediaBudget": 0,
    "days": 8,
    "hours": 24,
    "revisions": 2,
    "deliverables": "Audience research and insight report",
    "successMetric": "Evidence-backed recommendations"
  },
  "content-sprint": {
    "tier": "project",
    "fee": 3200000,
    "mediaBudget": 1200000,
    "days": 10,
    "hours": 28,
    "revisions": 2,
    "deliverables": "Cross-platform content sprint",
    "successMetric": "Approved channel assets"
  },
  "mini-launch": {
    "tier": "campaign",
    "fee": 4500000,
    "mediaBudget": 3200000,
    "days": 21,
    "hours": 40,
    "revisions": 2,
    "deliverables": "Local mini campaign",
    "successMetric": "Measured local results"
  }
};
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
 const short=t.slice(0,max);return short.replace(/\s+\S*$/,"").trim()||short;
};
const number=(v,min,max,label)=>{if(typeof v!=="number"||!Number.isFinite(v)||v<min||v>max)throw Error("Invalid "+label);return v};
export function validateCandidate(raw,category="coffee",clientContext=null){
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
 const budget=number(raw.budget,clientContext?0:8000000,16000000,"budget");
 const target=number(raw.target,15,38,"target");
 const baseline=number(raw.baseline,15,120,"baseline");
 const fee=Math.round(budget*.4/100000)*100000;
 const categoryClean=only(category,CATEGORIES,"category");
 const selected=clientContext?validateApproachClient(clientContext):null;
 const aiPlanning=selected?{
  context:string(raw.aiPlanning?.context,650,"market context"),
  insight:string(raw.aiPlanning?.insight,500,"AI insight hypothesis"),
  strategy:string(raw.aiPlanning?.strategy,650,"AI strategy recommendation")
 }:undefined;
 const clientAnswers=selected?Object.fromEntries(CLIENT_ANSWERS.map(id=>[id,string(raw.clientAnswers?.[id],440,"client answer "+id)])):undefined;
 const digest=createHash("sha256").update(JSON.stringify({raw,categoryClean,selected: selected?.id??null})).digest("hex");
 return {
  id:"ai-"+digest.slice(0,12),
  brand:selected?.brand??string(raw.brand,72,"brand"),industry:selected?.industry??string(raw.industry,85,"industry"),contact:string(raw.contact,90,"contact"),
  budget:selected?BEDROOM_JOBS[selected.jobTemplateId].mediaBudget:Math.round(budget/100000)*100000,
  fee:selected?BEDROOM_JOBS[selected.jobTemplateId].fee:fee,
  days:selected?BEDROOM_JOBS[selected.jobTemplateId].days:14,
  ...(selected?{jobMeta:{templateId:selected.jobTemplateId,...BEDROOM_JOBS[selected.jobTemplateId],serviceFee:BEDROOM_JOBS[selected.jobTemplateId].fee}}:{}),
  baseline,target,metric:string(raw.metric,60,"metric"),unit:string(raw.unit,30,"unit"),
  summary:string(raw.summary,190,"summary"),client:string(raw.client,420,"client"),
  ...truth,channel,reports,insightOptions,aiPlanning,clientAnswers,
  aiMeta:{category:categoryClean,clientId:selected?.id??null,seed:parseInt(digest.slice(0,8),16)%1000000,label:"Fictional Gemini-generated client approach"}
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

/** Only sandbox Startup/SME catalog entries are valid bedroom approach clients.
 * These figures are fictional simulation inputs, not verified business data.
 */
export function validateApproachClient(raw){
 if(!raw||typeof raw!=="object")throw Error("Missing selected client");
 const id=string(raw.id,45,"client id");
 const match=/^(startup|sme)-(coffee|beauty|fashion|education|tech|fitness|food)-[0-3]$/.exec(id);
 if(!match)throw Error("Only startup and SME catalog clients can be approached from the bedroom");
 if(raw.segment!==match[1]||raw.sector!==match[2])throw Error("Client category mismatch");
 const brand=string(raw.brand,72,"catalog brand");
 const description=string(raw.description,190,"catalog challenge");
 const industry=string(raw.industry,85,"catalog industry");
 const marketingBudgetVnd=number(raw.marketingBudgetVnd,1000000,100000000000,"fictional annual marketing budget");
 const jobTemplateId=raw.jobTemplateId===undefined?"social-pack":only(raw.jobTemplateId,Object.keys(BEDROOM_JOBS),"job template");
 return {id,segment:match[1],sector:match[2],brand,industry,description,marketingBudgetVnd,jobTemplateId};
}
export const CLIENT_ANSWERS=["audience","barrier","success","constraint"];
export function clientPrompt(category,client){
 const c=validateApproachClient(client);
 return [
 prompt(category).replace("exactly these top-level fields:", "the listed top-level fields PLUS aiPlanning and clientAnswers:").replace("channel, reports, insightOptions.", "channel, reports, insightOptions, aiPlanning, clientAnswers."),
 "IMPORTANT: This is NOT a random incoming client. The player explicitly approached a client from their bedroom workstation.",
 "Selected fictional company: "+JSON.stringify(c)+". The fictional client brand MUST equal "+JSON.stringify(c.brand)+".",
 "LOCKED FREELANCER JOB TEMPLATE: "+JSON.stringify(BEDROOM_JOBS[c.jobTemplateId])+". Job ID: "+c.jobTemplateId+".",
 "This is a solo freelancer commission, not a full-service agency. Do not add nationwide launch, KOL network, or complex research unless within specified deliverables.",
 "No promise of revenue lift for content deliverables. The score measures deliverables, brief fit, revision limits and timely handover.",
 "The client's yearly marketing budget is NOT the freelancer fee. Set budget equal to the template mediaBudget, or zero; the server overwrites fee, media spend and schedule.",
 "Also return aiPlanning {context,insight,strategy} and clientAnswers {audience,barrier,success,constraint}.",
 "aiPlanning.context must be a plausible market/business situation with meaningful competitive tension, not a real-data claim.",
 "aiPlanning.insight must be a thoughtful human motivation or friction HYPOTHESIS with a falsifiable assumption; do not reveal enum trueInsight or guarantee validity.",
 "aiPlanning.strategy must articulate target audience, desired change, defensible proposition and direction to test, without revealing scoring key or forcing one selectable option.",
 "clientAnswers represent fictional replies from the selected client. They must be specific, not generic templates, with plausible concerns, KPIs, scope and time constraints.",
 "All context and evidence are invented within the game and never public market research. Never imply a real survey, citation or external verification.",
 "Do not fabricate live customer response; this is an offline model-produced fictional discovery."
 ].join("\n");
}
export const CLIENT_SCENARIO_SCHEMA={
 ...GEMINI_SCHEMA,
 properties:{...GEMINI_SCHEMA.properties,
  aiPlanning:{type:"OBJECT",properties:{
   context:{type:"STRING"},insight:{type:"STRING"},strategy:{type:"STRING"}
  },required:["context","insight","strategy"]},
  clientAnswers:{type:"OBJECT",properties:{
   audience:{type:"STRING"},barrier:{type:"STRING"},success:{type:"STRING"},constraint:{type:"STRING"}
  },required:CLIENT_ANSWERS}
 },
 required:[...GEMINI_SCHEMA.required,"aiPlanning","clientAnswers"]
};
