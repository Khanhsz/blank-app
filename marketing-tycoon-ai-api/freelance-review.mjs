/** Gemini evaluates already-scored simulated freelancer applications.
 * It cannot award, reject, change fees, or fabricate extra applicants.
 * Only anonymous, bounded game-world metrics reach the model.
 */
export const REVIEW_SCHEMA={type:"OBJECT",properties:{
 feedback:{type:"STRING"},strength:{type:"STRING"},concern:{type:"STRING"}
},required:["feedback","strength","concern"]};
const SECTORS=["coffee","beauty","fashion","education","tech","fitness","food"];
const JOBS=["social-pack","social-audit","content-calendar","short-video","meta-setup","audience-research","content-sprint","mini-launch"];
const clamp=(n,low,high)=>Math.max(low,Math.min(high,n));
const short=(v,n)=>typeof v==="string"?v.trim().slice(0,n):"";
export function validateReviewRequest(raw){
 if(!raw||typeof raw!=="object"||!SECTORS.includes(raw.sector)||!JOBS.includes(raw.jobId)||
  !["startup","sme"].includes(raw.segment)||typeof raw.selected!=="boolean")throw Error("Invalid review request");
 const fields=["score","strongestRival","proposedFee","jobFee","npcCount"];
 if(fields.some(x=>!Number.isFinite(raw[x])))throw Error("Invalid review metrics");
 if(raw.score<0||raw.score>100||raw.strongestRival<0||raw.strongestRival>100||
   raw.proposedFee<100000||raw.proposedFee>10000000||raw.jobFee<100000||raw.jobFee>10000000||
   raw.npcCount<0||raw.npcCount>6)throw Error("Unbounded review metrics");
 return {sector:raw.sector,jobId:raw.jobId,segment:raw.segment,selected:raw.selected,
  score:clamp(raw.score,0,100),strongestRival:clamp(raw.strongestRival,0,100),
  proposedFee:Math.round(raw.proposedFee),jobFee:Math.round(raw.jobFee),npcCount:Math.round(raw.npcCount)};
}
export function reviewPrompt(x){
 return [
 "You are the hiring reviewer of a FICTIONAL Startup/SME on a marketing freelancer job board in a strategy game.",
 "The game engine has already completed fair, deterministic applicant selection using skills, portfolio, proposal, fee, reputation and availability.",
 "The result is FIXED: "+(x.selected?"SELECTED: give an offer-acceptance explanation.":"REJECTED: give actionable feedback.") ,
 "DO NOT change the result, quote a new price, claim to have contacted a real company or make up measured client data.",
 "Explain the fit briefly, grounded in the sector, job scope, applicant's fit score, strongest NPC score, quoted fee and competition.",
 "Reply in short and plain English. 1–2 sentences in feedback, plus short strength and concern fields. Keep feedback below 260 characters.",
 JSON.stringify(x)
 ].join("\n");
}
export function validateReviewResponse(raw){
 if(!raw||typeof raw!=="object")throw Error("Invalid Gemini review");
 const feedback=short(raw.feedback,260),strength=short(raw.strength,100),concern=short(raw.concern,100);
 if(feedback.length<12||strength.length<3||concern.length<3)throw Error("Incomplete review");
 return {feedback,strength,concern,source:"gemini"};
}
export function fallbackReview(x){
 return {feedback:x.selected
  ?"Your proposal fits the client's project needs and pricing. You have received an offer; accept it to begin work."
  :x.score<x.strongestRival-8
   ?"The client chose a stronger specialist portfolio and delivery fit. Gain experience in this category and apply again."
   :"Another freelancer was selected after competitive review. Your application remains on record; build relevant portfolio evidence.",
  strength:"Your application was evaluated against the posted job scope.",
  concern:x.selected?"Confirm the project scope before starting.":"Improve job-specific experience and portfolio.",
  source:"rules"};
}
