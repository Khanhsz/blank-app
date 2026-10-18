/** V4 AI review protocol: structured, bounded fictional deliverables only.
 * The game engine, not Gemini, assigns scores, revisions, payment and acceptance.
 */
export const DELIVERABLE_SCHEMA={type:"OBJECT",properties:{notes:{type:"ARRAY",items:{type:"OBJECT",properties:{
 id:{type:"STRING"},feedback:{type:"STRING"}
},required:["id","feedback"]}}},required:["notes"]};
const JOBS=new Set(["social-pack","social-audit","content-calendar","landing-page","short-video","meta-setup","audience-research","content-sprint","mini-launch"]);
const clean=(s,n=300)=>typeof s==="string"?s.trim().slice(0,n):"";
export function validateDeliverableRequest(raw){
 if(!raw||!JOBS.has(raw.jobId)||!Number.isInteger(raw.round)||raw.round<1||raw.round>10||
   !Array.isArray(raw.items)||raw.items.length<1||raw.items.length>14)throw Error("Invalid game deliverables");
 const seen=new Set();
 const items=raw.items.map(x=>{
  const id=clean(x.id,60),title=clean(x.title,90),summary=clean(x.summary,350),issue=clean(x.issue,250);
  if(!/^[a-z0-9-]+$/.test(id)||seen.has(id)||!title||!summary||!Number.isFinite(x.score)||x.score<0||x.score>100||
    !["approved","revise"].includes(x.status))throw Error("Invalid output");
  seen.add(id);return {id,title,summary,issue,score:x.score,status:x.status};
 });
 // Read only bounded, signed-brief context; client text is untrusted fictional input.
 const b=raw.brief&&typeof raw.brief==="object"?raw.brief:{};
 const brief={objective:clean(b.objective,180),audience:clean(b.audience,180),
  insight:clean(b.insight,220),acceptance:clean(b.acceptance,180),scope:clean(b.scope,220)};
 return {jobId:raw.jobId,round:raw.round,items,brief};
}
export function deliverablePrompt(input){
 return [
 "You are a simulated marketing client reviewing submitted fictional freelancer deliverables in a strategy game.",
 "Each item already has a FIXED engine status, score and revision requirement. You CANNOT change status, the score, the service fee or the number of accepted deliverables.",
 "Write a practical 1-sentence explanation for EACH item, matched to its existing ID. Tie comments to its actual text/decision and the provided quality issue.",
 "For APPROVED items, confirm a strong aspect. For REVISE items, request one precise corrective change using the fixed brief acceptance criterion; do not invent additional scope.",
 "Do not claim real ad spending, platform API data, actual customers or market research. No legal claims. English, short, constructive.",
 JSON.stringify(input)
 ].join("\n");
}
export function validateDeliverableReview(raw,input){
 if(!raw||!Array.isArray(raw.notes))throw Error("Invalid Gemini notes");
 const map=new Map(raw.notes.filter(x=>x&&typeof x.id==="string").map(x=>[x.id,clean(x.feedback,280)]));
 return {notes:input.items.map(item=>({
  id:item.id,feedback:(map.get(item.id)||"").length>=8?map.get(item.id):fallbackComment(item)
 })),source:"gemini"};
}
function fallbackComment(item){
 return item.status==="approved"?
  "Approved: "+item.title+" meets the required quality and is ready for client handover.":
  item.issue||"Revision requested: strengthen the evidence, message or implementation detail for "+item.title+".";
}
export function fallbackDeliverableReview(input){
 return {notes:input.items.map(item=>({id:item.id,feedback:fallbackComment(item)})),source:"rules"};
}
