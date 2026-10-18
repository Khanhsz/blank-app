import http from "node:http";
import {inputCategory,prompt,clientPrompt,validateApproachClient,validateCandidate,GEMINI_SCHEMA,CLIENT_SCENARIO_SCHEMA} from "./scenario.mjs";
import {takeQuotaSlot,secondsUntilUtcMidnight,retryAfterSeconds,getCachedGeminiBrief,saveCachedGeminiBrief} from "./brief-quota.mjs";
import {validatePricingInput,pricePrompt,buildPriceAdvice,PRICING_SCHEMA} from "./pricing.mjs";
import {validateMarketRequest,validateMarketIntelligence,fallbackMarketReport,marketPrompt,MARKET_SCHEMA} from "./company-intelligence.mjs";
import {FINANCE_SCHEMA,financePrompt,validateFinanceCalibration,fallbackFinanceCalibration} from "./finance-calibration.mjs";
import {REVIEW_SCHEMA,validateReviewRequest,reviewPrompt,validateReviewResponse,fallbackReview} from "./freelance-review.mjs";
import {DELIVERABLE_SCHEMA,validateDeliverableRequest,deliverablePrompt,validateDeliverableReview,fallbackDeliverableReview} from "./deliverables.mjs";
const PORT=Number(process.env.PORT||4187);
const ORIGIN=process.env.GAME_ORIGIN||"https://marketing-tycoon-bedroom-play.onrender.com";
const MODEL=process.env.GEMINI_MODEL||"gemini-3.5-flash-lite";
const apiKey=()=>process.env.GEMINI_API_KEY?.trim();
const counter=new Map();
const briefCache=new Map();
const globalCounter={day:"",calls:0};
let financeCache={day:"",report:null};
function counted(key,limit,timeMs){
 const now=Date.now(),p=counter.get(key);
 if(!p||now-p.start>=timeMs){counter.set(key,{start:now,count:1});return true}
 if(p.count>=limit)return false;p.count++;return true;
}
function response(res,code,obj,origin){
 res.writeHead(code,{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store","X-Content-Type-Options":"nosniff",...(origin?{"Access-Control-Allow-Origin":origin,"Vary":"Origin"}:{})});
 res.end(JSON.stringify(obj));
}
function remoteIP(req){return String(req.headers["x-forwarded-for"]||req.socket.remoteAddress||"unknown").split(",")[0].trim().slice(0,80)}
async function readJson(req,max=4096){
 let s="";for await(const part of req){s+=part;if(s.length>max)throw Error("Request body too large")}return JSON.parse(s||"{}");
}

/** Gemini produces fictional evidence; the existing game engine alone decides outcomes. */
async function generateScenario(category,client=null){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),32000);
 try{
  const upstream=await fetch("https://generativelanguage.googleapis.com/v1beta/models/"+encodeURIComponent(MODEL)+":generateContent",{
   method:"POST",
   headers:{"Content-Type":"application/json","x-goog-api-key":apiKey()},
   body:JSON.stringify({
    contents:[{role:"user",parts:[{text:client?clientPrompt(category,client):prompt(category)}]}],
    generationConfig:{responseMimeType:"application/json",responseSchema:client?CLIENT_SCENARIO_SCHEMA:GEMINI_SCHEMA,temperature:.72,maxOutputTokens:4600}
   }),
   signal:controller.signal
  });
  if(!upstream.ok){
   const error=new Error("Gemini upstream HTTP "+upstream.status);
   error.status=upstream.status;
   error.retryAfterSeconds=retryAfterSeconds(upstream.headers.get("Retry-After"));
   throw error;
  }
  const result=await upstream.json();
  const text=result?.candidates?.[0]?.content?.parts?.filter(x=>typeof x.text==="string").map(x=>x.text).join("");
  if(!text)throw Error("Empty Gemini output; finishReason="+String(result?.candidates?.[0]?.finishReason||"unknown"));
  return validateCandidate(JSON.parse(text),category,client);
 }finally{clearTimeout(timer)}
}

/** Gemini only selects the bid strategy and explains it; currency values are server-calculated. */
async function generatePricingAdvice(input){
 const x=validatePricingInput(input);
 if(!apiKey())return buildPriceAdvice(x,null,"rules");
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),32000);
 try{
  const upstream=await fetch("https://generativelanguage.googleapis.com/v1beta/models/"+encodeURIComponent(MODEL)+":generateContent",{
   method:"POST",headers:{"Content-Type":"application/json","x-goog-api-key":apiKey()},
   body:JSON.stringify({
    contents:[{role:"user",parts:[{text:pricePrompt(x)}]}],
    generationConfig:{responseMimeType:"application/json",responseSchema:PRICING_SCHEMA,temperature:.35,maxOutputTokens:800}
   }),signal:controller.signal
  });
  if(!upstream.ok)throw Error("Gemini upstream HTTP "+upstream.status);
  const result=await upstream.json();
  const content=result?.candidates?.[0]?.content?.parts?.filter(p=>typeof p.text==="string").map(p=>p.text).join("");
  if(!content)throw Error("Empty Gemini pricing analysis");
  const reasoning=JSON.parse(content);
  if(!["competitive","balanced","premium"].includes(reasoning.tier)||!["lean","standard","deep"].includes(reasoning.qualificationDepth)||!Array.isArray(reasoning.preparation)||reasoning.preparation.length<2)throw Error("Invalid pricing recommendation");
  return buildPriceAdvice(x,reasoning,"gemini");
 }catch(error){
  console.warn("AI pricing fallback:",String(error?.message||"upstream unavailable").slice(0,120));
  return buildPriceAdvice(x,null,"rules");
 }finally{clearTimeout(timer)}
}

/** Gemini writes bounded macro signals and explanations, never game finances. */
async function generateMarketIntelligence(input){
 if(!apiKey())return fallbackMarketReport(input);
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),30000);
 try{
  const upstream=await fetch("https://generativelanguage.googleapis.com/v1beta/models/"+encodeURIComponent(MODEL)+":generateContent",{
   method:"POST",headers:{"Content-Type":"application/json","x-goog-api-key":apiKey()},
   body:JSON.stringify({contents:[{role:"user",parts:[{text:marketPrompt(input)}]}],
    generationConfig:{responseMimeType:"application/json",responseSchema:MARKET_SCHEMA,temperature:.45,maxOutputTokens:1550}}),
   signal:controller.signal});
  if(!upstream.ok)throw Error("Gemini market HTTP "+upstream.status);
  const json=await upstream.json();
  const text=json?.candidates?.[0]?.content?.parts?.filter(p=>typeof p.text==="string").map(p=>p.text).join("");
  if(!text)throw Error("Empty Gemini market response");
  return validateMarketIntelligence(JSON.parse(text),input.week);
 }catch(error){
  console.warn("Market intelligence fallback:",String(error?.message||"unknown").slice(0,100));
  return fallbackMarketReport(input);
 }finally{clearTimeout(timer)}
}

/** Gemini proposes only narrow sector multipliers; no raw financial values. */
async function generateFinancialCalibration(){
 if(!apiKey())return fallbackFinanceCalibration();
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),28000);
 try{
  const upstream=await fetch("https://generativelanguage.googleapis.com/v1beta/models/"+encodeURIComponent(MODEL)+":generateContent",{
   method:"POST",headers:{"Content-Type":"application/json","x-goog-api-key":apiKey()},
   body:JSON.stringify({contents:[{role:"user",parts:[{text:financePrompt()}]}],
    generationConfig:{responseMimeType:"application/json",responseSchema:FINANCE_SCHEMA,temperature:.25,maxOutputTokens:1550}}),
   signal:controller.signal
  });
  if(!upstream.ok)throw Error("Gemini finance HTTP "+upstream.status);
  const json=await upstream.json();
  const content=json?.candidates?.[0]?.content?.parts?.filter(p=>typeof p.text==="string").map(p=>p.text).join("");
  if(!content)throw Error("Empty calibration");
  return validateFinanceCalibration(JSON.parse(content));
 }catch(error){
  console.warn("Financial calibration fallback:",String(error?.message||"unknown").slice(0,100));
  return fallbackFinanceCalibration();
 }finally{clearTimeout(timer)}
}

/** Generate a grounded explanation for a game outcome that is already final.
 * Gemini is advisory, not an authority over the selection result. */
async function generateFreelanceReview(input){
 if(!apiKey())return fallbackReview(input);
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),16000);
 try{
  const upstream=await fetch("https://generativelanguage.googleapis.com/v1beta/models/"+encodeURIComponent(MODEL)+":generateContent",{
   method:"POST",headers:{"Content-Type":"application/json","x-goog-api-key":apiKey()},
   body:JSON.stringify({contents:[{role:"user",parts:[{text:reviewPrompt(input)}]}],
    generationConfig:{responseMimeType:"application/json",responseSchema:REVIEW_SCHEMA,temperature:.25,maxOutputTokens:450}}),
   signal:controller.signal});
  if(!upstream.ok)throw Error("Gemini review HTTP "+upstream.status);
  const result=await upstream.json();
  const content=result?.candidates?.[0]?.content?.parts?.filter(x=>typeof x.text==="string").map(x=>x.text).join("");
  if(!content)throw Error("Empty Gemini review");
  return validateReviewResponse(JSON.parse(content));
 }catch(err){
  console.warn("Freelancer review fallback:",String(err?.message||"unavailable").slice(0,110));
  return fallbackReview(input);
 }finally{clearTimeout(timer)}
}

/** V4 Gemini client feedback is narrative only; the local engine has already
 * validated every deliverable and can complete the contract offline. */
async function generateDeliverableReview(input){
 if(!apiKey())return fallbackDeliverableReview(input);
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),16000);
 try{
  const upstream=await fetch("https://generativelanguage.googleapis.com/v1beta/models/"+encodeURIComponent(MODEL)+":generateContent",{
   method:"POST",headers:{"Content-Type":"application/json","x-goog-api-key":apiKey()},
   body:JSON.stringify({contents:[{role:"user",parts:[{text:deliverablePrompt(input)}]}],
    generationConfig:{responseMimeType:"application/json",responseSchema:DELIVERABLE_SCHEMA,temperature:.25,maxOutputTokens:1000}}),
   signal:controller.signal});
  if(!upstream.ok)throw Error("Gemini deliverable HTTP "+upstream.status);
  const json=await upstream.json();
  const content=json?.candidates?.[0]?.content?.parts?.filter(x=>typeof x.text==="string").map(x=>x.text).join("");
  if(!content)throw Error("Empty Gemini deliverable response");
  return validateDeliverableReview(JSON.parse(content),input);
 }catch(error){
  console.warn("V4 deliverable review fallback:",String(error?.message||"unavailable").slice(0,110));
  return fallbackDeliverableReview(input);
 }finally{clearTimeout(timer)}
}

const server=http.createServer(async(req,res)=>{
 const allowed=req.headers.origin===ORIGIN||req.headers.origin==="http://localhost:5173";
 if(req.method==="OPTIONS"){
  if(!allowed)return response(res,403,{error:"Origin not allowed"});
  res.writeHead(204,{"Access-Control-Allow-Origin":req.headers.origin,"Access-Control-Allow-Methods":"POST,GET,OPTIONS","Access-Control-Allow-Headers":"Content-Type","Access-Control-Max-Age":"600"});res.end();return;
 }
 if(req.url==="/api/status"&&req.method==="GET")return response(res,200,{available:!!apiKey(),model:MODEL,version:"v4.8",features:["ai-scenario-generator","bedroom-client-approach","agency-pricing-advisor","company-market-intelligence","client-financial-calibration","instant-freelance-application-review","v4-deliverable-client-review"]},allowed?req.headers.origin:null);
 if(req.url==="/api/finance-calibration"&&req.method==="GET"){
  if(!allowed)return response(res,403,{error:"Game origin required"});
  const today=new Date().toISOString().slice(0,10);
  if(financeCache.day===today&&financeCache.report)
   return response(res,200,{calibration:financeCache.report,mode:financeCache.report.source},req.headers.origin);
  if(globalCounter.day!==today){globalCounter.day=today;globalCounter.calls=0}
  // Small shared budget; never block the game if Gemini is unavailable.
  const report=apiKey()&&globalCounter.calls<45?(globalCounter.calls++,await generateFinancialCalibration()):fallbackFinanceCalibration();
  financeCache={day:today,report};
  return response(res,200,{calibration:report,mode:report.source},req.headers.origin);
 }
 if(req.url==="/api/company-market-intelligence"&&req.method==="POST"){
  if(!allowed)return response(res,403,{error:"Game origin required"});
  if(!counted("market:"+remoteIP(req),3,3600000))return response(res,429,{error:"Hourly market insight limit reached."},req.headers.origin);
  let input;
  try{input=validateMarketRequest(await readJson(req,8500))}
  catch{return response(res,400,{error:"Invalid game-market aggregate data"},req.headers.origin)}
  const today=new Date().toISOString().slice(0,10);
  if(globalCounter.day!==today){globalCounter.day=today;globalCounter.calls=0}
  // Lower priority than gameplay briefs: never exhaust the shared Gemini pool.
  let report;
  if(apiKey()&&globalCounter.calls<35){globalCounter.calls++;report=await generateMarketIntelligence(input)}
  else report=fallbackMarketReport(input);
  return response(res,200,{report,mode:report.source,model:report.source==="gemini"?MODEL:null},req.headers.origin);
 }
 if(req.url==="/api/freelance-deliverables-review"&&req.method==="POST"){
  if(!allowed)return response(res,403,{error:"Game origin required"});
  if(!counted("deliverables:"+remoteIP(req),8,3600000))
   return response(res,429,{error:"Review limit reached; the game will use deterministic client feedback."},req.headers.origin);
  let input;
  try{input=validateDeliverableRequest(await readJson(req,12000))}
  catch{return response(res,400,{error:"Invalid game deliverables"},req.headers.origin)}
  const today=new Date().toISOString().slice(0,10);
  if(globalCounter.day!==today){globalCounter.day=today;globalCounter.calls=0}
  const review=apiKey()&&globalCounter.calls<40?(globalCounter.calls++,await generateDeliverableReview(input)):fallbackDeliverableReview(input);
  return response(res,200,{review,mode:review.source,model:review.source==="gemini"?MODEL:null},req.headers.origin);
 }
 if(req.url==="/api/freelance-review"&&req.method==="POST"){
  if(!allowed)return response(res,403,{error:"Game origin required"});
  if(!counted("freelance-review:"+remoteIP(req),10,3600000))
   return response(res,429,{error:"Application review limit reached. The game will use its selection model."},req.headers.origin);
  let input;
  try{input=validateReviewRequest(await readJson(req,3000))}
  catch{return response(res,400,{error:"Invalid fictional applicant review data"},req.headers.origin)}
  const today=new Date().toISOString().slice(0,10);
  if(globalCounter.day!==today){globalCounter.day=today;globalCounter.calls=0}
  // Keep shared quota for briefs and pricing. Rules fallback does not stall the game.
  const review=apiKey()&&globalCounter.calls<42?(globalCounter.calls++,await generateFreelanceReview(input)):fallbackReview(input);
  return response(res,200,{review,mode:review.source,model:review.source==="gemini"?MODEL:null},req.headers.origin);
 }
 if(req.url==="/api/pricing-advice"&&req.method==="POST"){
  if(!allowed)return response(res,403,{error:"Game origin required"});
  if(!counted("pricing:"+remoteIP(req),6,3600000))return response(res,429,{error:"Hourly pricing advice limit reached."},req.headers.origin);
  try{
   const x=validatePricingInput(await readJson(req,4096));
   // Only successful, configured AI calls count against the shared daily quota.
   const today=new Date().toISOString().slice(0,10);
   if(globalCounter.day!==today){globalCounter.day=today;globalCounter.calls=0}
   let advice;
   if(apiKey()&&globalCounter.calls<42){globalCounter.calls++;advice=await generatePricingAdvice(x)}
   else advice=buildPriceAdvice(x,null,"rules");
   return response(res,200,{advice,mode:advice.source,model:advice.source==="gemini"?MODEL:null},req.headers.origin);
  }catch(error){return response(res,400,{error:"Invalid agency pricing request."},req.headers.origin)}
 }
 if(req.url!=="/api/generate-brief"||req.method!=="POST")return response(res,404,{error:"Not found"},allowed?req.headers.origin:null);
 if(!allowed)return response(res,403,{error:"Game origin required"});
 // Validate the selected client and V6 job before charging any Gemini quota.
 let client,category;
 try{
  const body=await readJson(req);
  category=inputCategory(body.category);
  client=validateApproachClient(body.client);
  if(client.sector!==category)throw Error("Client sector mismatch");
 }catch(error){
  console.warn("Gemini brief rejected invalid client/job template:",String(error?.message||"invalid").slice(0,100));
  return response(res,400,{code:"invalid_client_brief",error:"Selected client or freelance job was not accepted by the API. Refresh the game and retry."},req.headers.origin);
 }
 if(!apiKey())return response(res,503,{code:"gemini_not_configured",error:"Gemini API is not configured. An AI-generated client brief is required."},req.headers.origin);
 const cacheKey=JSON.stringify(client);
 const cached=getCachedGeminiBrief(briefCache,cacheKey);
 if(cached)return response(res,200,{scenario:cached,mode:"ai",model:MODEL,cached:true},req.headers.origin);
 const day=new Date().toISOString().slice(0,10);
 if(globalCounter.day!==day){globalCounter.day=day;globalCounter.calls=0}
 if(globalCounter.calls>=50){
  console.warn("Gemini brief paused: internal shared daily limit reached");
  return response(res,429,{code:"local_daily_limit",error:"Marketing Tycoon's shared daily AI call limit is reached.",retryAfterSeconds:secondsUntilUtcMidnight()},req.headers.origin);
 }
 const slot=takeQuotaSlot(counter,"brief:"+remoteIP(req),8,3600000);
 if(!slot.allowed){
  console.warn("Gemini brief paused: internal hourly limit reached");
  return response(res,429,{code:"local_hourly_limit",error:"Marketing Tycoon's hourly brief limit is reached.",retryAfterSeconds:slot.retryAfterSeconds},req.headers.origin);
 }
 globalCounter.calls++;
 try{
  const scenario=await generateScenario(category,client);
  saveCachedGeminiBrief(briefCache,cacheKey,scenario);
  return response(res,200,{scenario,mode:"ai",model:MODEL},req.headers.origin);
 }catch(error){
  const status=error?.status;
  const code=status===429?"gemini_provider_rate_limit":status===404?"gemini_model_unavailable":status===401||status===403?"gemini_credentials_rejected":"gemini_generation_failed";
  // Never log Gemini API keys, IPs or prompt data.
  console.warn("AI scenario failed:",code,String(error?.message||"unknown").slice(0,90));
  const body={code,error:status===429
   ?"Google Gemini is rate-limiting this API key or project. Check the provider quota before retrying."
   :status===404?"The configured Gemini model was not found by Google's API."
   :status===401||status===403?"Google rejected the Gemini API credentials or permissions."
   :"Gemini could not create a valid client context and strategy. Retry when the service is available."};
  if(status===429&&Number.isFinite(error?.retryAfterSeconds))body.retryAfterSeconds=error.retryAfterSeconds;
  return response(res,status===429?429:502,body,req.headers.origin);
 }
});
server.listen(PORT,"0.0.0.0",()=>console.log("Marketing Tycoon AI API listening on",PORT));

/** One-off owner-triggered smoke test; never prints keys or customer prompts. */
if(process.env.AI_SMOKE_TEST_ON_BOOT==="1"&&apiKey()){
 setTimeout(async()=>{
  try{
   const sc=await generateScenario("coffee");
   console.log("AI SMOKE TEST PASS",JSON.stringify({scenarioId:sc.id,insightCount:sc.insightOptions.length,evidenceCount:Object.keys(sc.reports).length,category:sc.aiMeta.category}));
  }catch(e){console.warn("AI SMOKE TEST FAIL",String(e?.message||"unknown"))}
 },1800);
}
