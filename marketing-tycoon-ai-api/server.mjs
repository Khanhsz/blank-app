import http from "node:http";
import {inputCategory,prompt,validateCandidate} from "./scenario.mjs";
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
const server=http.createServer(async(req,res)=>{
 const allowed=req.headers.origin===ORIGIN||req.headers.origin==="http://localhost:5173";
 if(req.method==="OPTIONS"){
  if(!allowed)return response(res,403,{error:"Origin not allowed"});
  res.writeHead(204,{"Access-Control-Allow-Origin":req.headers.origin,"Access-Control-Allow-Methods":"POST,GET,OPTIONS","Access-Control-Allow-Headers":"Content-Type","Access-Control-Max-Age":"600"});res.end();return;
 }
 if(req.url==="/api/status"&&req.method==="GET")return response(res,200,{available:!!apiKey(),model:MODEL,version:"v4.5",kind:"ai-scenario-generator"},allowed?req.headers.origin:null);
 if(req.url!=="/api/generate-brief"||req.method!=="POST")return response(res,404,{error:"Not found"},allowed?req.headers.origin:null);
 if(!allowed)return response(res,403,{error:"Game origin required"});
 if(!apiKey())return response(res,503,{error:"AI mode isn't configured yet. Built-in briefs remain playable. Add GEMINI_API_KEY to the AI API Render service."},req.headers.origin);
 if(!counted(remoteIP(req),4,3600000))return response(res,429,{error:"Hourly AI limit reached. Try later or use built-in briefs."},req.headers.origin);
 const day=new Date().toISOString().slice(0,10);
 if(globalCounter.day!==day){globalCounter.day=day;globalCounter.calls=0}
 if(globalCounter.calls>=50)return response(res,429,{error:"Daily AI budget reached. Built-in briefs remain playable."},req.headers.origin);
 globalCounter.calls++;
 try{
  const body=await readJson(req);
  const category=inputCategory(body.category);
  const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),25000);
  let upstream;
  try{
   upstream=await fetch("https://generativelanguage.googleapis.com/v1beta/models/"+encodeURIComponent(MODEL)+":generateContent",{
    method:"POST",
    headers:{"Content-Type":"application/json","x-goog-api-key":apiKey()},
    body:JSON.stringify({contents:[{role:"user",parts:[{text:prompt(category)}]}],generationConfig:{responseMimeType:"application/json",temperature:.91,maxOutputTokens:2600}}),
    signal:controller.signal
   });
  }finally{clearTimeout(timeout)}
  if(!upstream.ok){console.warn("Gemini request failed",upstream.status);return response(res,502,{error:upstream.status===429?"AI quota reached. Use a built-in brief for now.":"AI unavailable. Built-in briefs remain playable."},req.headers.origin)}
  const result=await upstream.json();
  const text=result?.candidates?.[0]?.content?.parts?.filter(x=>typeof x.text==="string").map(x=>x.text).join("");
  if(!text)throw Error("Empty AI scenario");
  const scenario=validateCandidate(JSON.parse(text),category);
  return response(res,200,{scenario,mode:"ai",model:MODEL},req.headers.origin);
 }catch(error){console.warn("AI scenario failed:",error?.message?.slice(0,160));return response(res,502,{error:"Couldn't validate the AI brief. Retry or use a built-in campaign."},req.headers.origin)}
});
server.listen(PORT,"0.0.0.0",()=>console.log("Marketing Tycoon AI API listening on",PORT));
