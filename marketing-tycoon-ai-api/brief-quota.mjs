/** Provider HTTP retry metadata and short-lived REAL Gemini scenario cache.
 * No application-side request counting or call ceilings. */
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
