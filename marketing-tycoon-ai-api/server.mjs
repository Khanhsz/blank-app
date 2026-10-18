import http from "node:http";
import {inputCategory,prompt,clientPrompt,validateApproachClient,validateCandidate,GEMINI_SCHEMA,CLIENT_SCENARIO_SCHEMA} from "./scenario.mjs";
import {validatePricingInput,pricePrompt,buildPriceAdvice,PRICING_SCHEMA} from "./pricing.mjs";
import {validateMarketRequest,validateMarketIntelligence,fallbackMarketReport,marketPrompt,MARKET_SCHEMA} from "./company-intelligence.mjs";
const PORT=Number(process.env.PORT||4187);
const ORIGIN=process.env.GAME_ORIGIN||"https://marketing-tycoon-bedroom-play.onrender.com";
const MODEL=process.env.GEMINI_MODEL||"gemini-3.5-flash-lite";
const apiKey=()=>process.env.GEMINI_API_KEY?.trim();
const counter=new Map();
const globalCounter={day:"",calls:0};
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
  if(!upstream.ok)throw Error("Gemini upstream HTTP "+upstream.status);
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

const server=http.createServer(async(req,res)=>{
 const allowed=req.headers.origin===ORIGIN||req.headers.origin==="http://localhost:5173";
 if(req.method==="OPTIONS"){
  if(!allowed)return response(res,403,{error:"Origin not allowed"});
  res.writeHead(204,{"Access-Control-Allow-Origin":req.headers.origin,"Access-Control-Allow-Methods":"POST,GET,OPTIONS","Access-Control-Allow-Headers":"Content-Type","Access-Control-Max-Age":"600"});res.end();return;
 }
 if(req.url==="/api/status"&&req.method==="GET")return response(res,200,{available:!!apiKey(),model:MODEL,version:"v4.7",features:["ai-scenario-generator","bedroom-client-approach","agency-pricing-advisor","company-market-intelligence"]},allowed?req.headers.origin:null);
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
 if(req.url==="/api/pricing-advice"&&req.method==="POST"){
  if(!allowed)return response(res,403,{error:"Game origin required"});
  if(!counted("pricing:"+remoteIP(req),6,3600000))return response(res,429,{error:"Hourly pricing advice limit reached."},req.headers.origin);
  try{
   const x=validatePricingInput(await readJson(req,4096));
   // Only successful, configured AI calls count against the shared daily quota.
   const today=new Date().toISOString().slice(0,10);
   if(globalCounter.day!==today){globalCounter.day=today;globalCounter.calls=0}
   let advice;
   if(apiKey()&&globalCounter.calls<50){globalCounter.calls++;advice=await generatePricingAdvice(x)}
   else advice=buildPriceAdvice(x,null,"rules");
   return response(res,200,{advice,mode:advice.source,model:advice.source==="gemini"?MODEL:null},req.headers.origin);
  }catch(error){return response(res,400,{error:"Invalid agency pricing request."},req.headers.origin)}
 }
 if(req.url!=="/api/generate-brief"||req.method!=="POST")return response(res,404,{error:"Not found"},allowed?req.headers.origin:null);
 if(!allowed)return response(res,403,{error:"Game origin required"});
 if(!apiKey())return response(res,503,{error:"Gemini API is not configured. The client approach cannot proceed until GEMINI_API_KEY is available."},req.headers.origin);
 if(!counted(remoteIP(req),8,3600000))return response(res,429,{error:"Gemini hourly budget reached. Retry your selected client after the quota resets."},req.headers.origin);
 const day=new Date().toISOString().slice(0,10);
 if(globalCounter.day!==day){globalCounter.day=day;globalCounter.calls=0}
 if(globalCounter.calls>=50)return response(res,429,{error:"Daily Gemini usage budget reached. Retry your selected client later."},req.headers.origin);
 globalCounter.calls++;
 try{
  const body=await readJson(req);
  const category=inputCategory(body.category);
  const client=validateApproachClient(body.client);
  if(client.sector!==category)throw Error("Client sector mismatch");
  const scenario=await generateScenario(category,client);
  return response(res,200,{scenario,mode:"ai",model:MODEL},req.headers.origin);
 }catch(error){console.warn("AI scenario failed:",error?.message?.slice(0,160));return response(res,502,{error:"Gemini could not create a valid context, insight and strategy for this client. Retry the approach."},req.headers.origin)}
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
