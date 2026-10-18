/** Bridge from the canonical client database to the existing game loops. */
import {getClient,agencyLeadForClient,scenarioForClient,type ClientSegment} from "./clientDatabase";
import type {GameState,Lead} from "./state";
import type {Fx} from "./store";
import {marketCompany,currentMarketingBudgetVnd} from "./companyMarket";
import {canContractFortune,isGameFortune50} from "./fortuneAccounts";
import {focusDeal} from "./acquisition";

/** Unlocks premium RFPs after proven AGENCY delivery, not freelancer wins. */
export function bigCorpAccess(s:GameState){
 const completed=s.history.filter(x=>x.agency).length;
 const requiredCampaigns=3,requiredReputation=55;
 return {completed,requiredCampaigns,reputation:s.reputation,requiredReputation,
  unlocked:s.agencyUnlocked&&completed>=requiredCampaigns&&s.reputation>=requiredReputation};
}
export const canApproachSegment=(s:GameState,segment:ClientSegment)=>s.agencyUnlocked&&(segment!=="bigcorp"||bigCorpAccess(s).unlocked);

export function approachCatalogClient(s:GameState,fx:Fx,clientId:string,channel:"marketplace"|"hq"="marketplace"):boolean{
 const client=getClient(clientId),ceo=s.ceo;
 if(!client||!s.agencyUnlocked||!ceo)return false;
 const isFortune=isGameFortune50(s,clientId);
 if(isFortune&&channel!=="hq"){
  fx.toast("Fortune 50 accounts can only be approached by visiting Corporate HQ in the city.");return false;
 }
 if(channel==="hq"&&!isFortune)return false;
 if(isFortune){
  const check=canContractFortune(s,clientId);
  if(!check.ok){fx.toast(check.reason);return false;}
 }
 if(!canApproachSegment(s,client.segment)){
  fx.toast("Big Corp opportunities unlock after 3 completed agency campaigns and 55 reputation.");
  return false;
 }
 const duplicate=ceo.leads.some(x=>x.clientMasterId===clientId&&
  ["new","prospecting","discovery","nurturing","qualified","pitch","shortlisted","pitch_won","negotiating","signed","renewal"].includes(x.status));
 if(duplicate){fx.toast("This company already has an open lead or signed opportunity.");return false;}
 if(ceo.leads.length>=150){fx.toast("Client pipeline limit reached. Resolve open opportunities first.");return false;}
 const currentBudget=currentMarketingBudgetVnd(s,client);
 const seed=agencyLeadForClient({...client,marketingBudgetVnd:currentBudget});
 if(isFortune){
  seed.duration=365;
  seed.fee=Math.round(Math.min(1_800_000_000,Math.max(280_000_000,seed.value*.38))/100000)*100000;
  seed.origin="In-game Fortune 50 · onsite HQ procurement";
  seed.desc+=" Dynamic Fortune 50 annual contract. Service fee invoiced for 365 days, media spend separate.";
 }
 const live=marketCompany(s,clientId);
 if(live){
  seed.desc+=" Current modeled business growth: "+live.totalGrowthPct.toFixed(1)+"%; annual marketing spend and proposed campaign budget reflect market changes.";
 }
 const suffix=ceo.day+"-"+(++ceo.seq);
 const lead:Lead={...seed,id:"approach-"+clientId+"-"+suffix,status:"prospecting",source:"outbound",relationship:seed.trust,outreachAttempts:0,
  ...(isFortune?{contractType:"annual-retainer" as const,hqApproach:true}:{} )};
 ceo.leads.unshift(lead);
 focusDeal(s,lead.id);
 fx.log("Prospected "+client.brand+" · "+client.segment+" · "+client.sector+" · "+(client.fortuneRank?"Fortune 50 demo":"fictional client"));
 fx.toast("Prospect added: "+client.brand+". Choose an outreach strategy in Deal Room.");
 return true;
}
/** Contract-specific brief, not a separate engine; existing KPI and weekly
 * simulation run on the established Campaign object. */
export function contractBrief(clientId:string,contract:{value:number;fee:number;days:number;target:number}){
 const client=getClient(clientId);
 if(!client)return null;
 const brief=scenarioForClient(client);
 return {...brief,budget:contract.value,fee:contract.fee,days:contract.days,target:contract.target};
}
export const approachFortuneAtHQ=(s:GameState,fx:Fx,clientId:string)=>approachCatalogClient(s,fx,clientId,"hq");
export function isOpenCatalogLead(s:GameState,clientId:string):boolean{
 return !!s.ceo?.leads.some(l=>l.clientMasterId===clientId&&
  ["new","prospecting","discovery","nurturing","qualified","pitch","shortlisted","pitch_won","negotiating","signed","renewal"].includes(l.status));
}

