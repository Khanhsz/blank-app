/**
 * Quota accounting for AI-generated briefs.
 * A rejected or malformed client request must never spend an AI request slot.
 * Successful Gemini scenarios may be reused briefly, but no static/fake brief is produced.
 */
export function takeQuotaSlot(slots,key,limit,windowMs,now=Date.now()){
 const prior=slots.get(key);
 if(!prior||now-prior.start>=windowMs){
  slots.set(key,{start:now,count:1});
  return {allowed:true,retryAfterSeconds:0};
 }
 if(prior.count>=limit)return {allowed:false,retryAfterSeconds:Math.max(1,Math.ceil((prior.start+windowMs-now)/1000))};
 prior.count++;
 return {allowed:true,retryAfterSeconds:0};
}
export function secondsUntilUtcMidnight(now=Date.now()){
 const day=new Date(now).toISOString().slice(0,10);
 return Math.max(1,Math.ceil((Date.parse(day+"T00:00:00Z")+86400000-now)/1000));
}
export function retryAfterSeconds(header,now=Date.now()){
 if(typeof header!=="string"||!header.trim())return null;
 const seconds=Number(header.trim());
 if(Number.isFinite(seconds)&&seconds>=0)return Math.max(1,Math.ceil(seconds));
 const date=Date.parse(header);
 return Number.isFinite(date)&&date>now?Math.ceil((date-now)/1000):null;
}
export function getCachedGeminiBrief(cache,key,now=Date.now()){
 const entry=cache.get(key);
 if(!entry)return null;
 if(now>=entry.expiresAt){cache.delete(key);return null}
 return entry.scenario;
}
export function saveCachedGeminiBrief(cache,key,scenario,now=Date.now()){
 // Bounded memory: these are fictional catalog-client briefs only.
 if(cache.size>=60){
  const first=cache.keys().next();
  if(!first.done)cache.delete(first.value);
 }
 cache.set(key,{scenario,expiresAt:now+20*60*1000});
}
