/** Automatically enriches qualified bids with Gemini, using deterministic
 * pricing in the game immediately. No menu, opt-in, or user-triggered API call.
 * It is deliberately outside React components so closing the CEO panel does
 * not cancel the strategy advice.
 */
import {act,getState} from "./store";
import {ensureLocalPricing,pricingContext,pricingFingerprint,requestPricingAdvice} from "./pricingAdvisor";

const attempts=new Set<string>();

export function prepareAgencyPricing(){
 const state=getState(),c=state.ceo;
 if(!state.agencyUnlocked||!c)return;
 // Pre-price high-priority prospects before their Qualify button is pressed,
 // so Gemini can calibrate diligence depth and cost, not only the eventual bid.
 // Keep requests bounded to preserve the existing Gemini free-tier limits.
 const leads=c.pitch?.step==="prepare"
  ? c.leads.filter(l=>l.id===c.pitch!.id)
  : [...c.leads.filter(l=>l.status==="qualified").slice(0,3),
     ...c.leads.filter(l=>["new","renewal"].includes(l.status)).slice(0,3)];
 for(const lead of leads){
  if(!["new","renewal","qualified","pitch"].includes(lead.status))continue;
  const context=pricingContext(state,lead),fingerprint=pricingFingerprint(context);
  // Older saves and newly qualified accounts must have a real quote before
  // any network request, even on an offline/free-tier browser.
  if(lead.pricingAdvice?.contextKey!==fingerprint){
   act(d=>{
    const target=d.ceo?.leads.find(l=>l.id===lead.id);
    if(target){
     const advice=ensureLocalPricing(d,target),p=d.ceo?.pitch;
     if(p?.id===target.id&&p.step==="prepare"&&!p.priceSelected){
      p.priceTier=advice.tier;p.bidFee=advice.recommendedFee;
      p.price=advice.tier==="competitive"?"discount":advice.tier==="premium"?"premium":"standard";
     }
    }
   });
  }
  const requestKey=lead.id+":"+fingerprint;
  if(attempts.has(requestKey))continue;
  attempts.add(requestKey);
  void requestPricingAdvice(context).then(advice=>{
   const live=getState(),target=live.ceo?.leads.find(l=>l.id===lead.id);
   if(!target||!["new","renewal","qualified","pitch"].includes(target.status)||
       pricingFingerprint(pricingContext(live,target))!==fingerprint)return;
   act(d=>{
    const l=d.ceo?.leads.find(x=>x.id===lead.id);
    if(!l)return;
    l.pricingAdvice=advice;
    // A paid qualification fee stays frozen in Lead.qualifyFeePaid even if
    // this AI response arrives after the player has already qualified.
   // The founder's manual override is final; otherwise upgrade the
    // automatically prepared bid before it is presented.
    const p=d.ceo?.pitch;
    if(p?.id===l.id&&p.step==="prepare"&&!p.priceSelected){
     p.priceTier=advice.tier;p.bidFee=advice.recommendedFee;
     p.price=advice.tier==="competitive"?"discount":advice.tier==="premium"?"premium":"standard";
    }
   });
  }).catch(()=>{ /* local proposal remains the valid mandatory quote */ });
 }
}
