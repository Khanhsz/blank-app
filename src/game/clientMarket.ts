/** Bridge from the canonical client database to the existing game loops. */
import {getClient,agencyLeadForClient,scenarioForClient,type ClientSegment} from "./clientDatabase";
import type {GameState,Lead} from "./state";
import type {Fx} from "./store";
import {marketCompany} from "./companyMarket";

export function approachCatalogClient(s:GameState,fx:Fx,clientId:string):boolean{
 const client=getClient(clientId),ceo=s.ceo;
 if(!client||!s.agencyUnlocked||!ceo)return false;
 const duplicate=ceo.leads.some(x=>x.clientMasterId===clientId&&
  ["new","prospecting","discovery","nurturing","qualified","pitch","shortlisted","pitch_won","negotiating","signed","renewal"].includes(x.status));
 if(duplicate){fx.toast("This company already has an open lead or signed opportunity.");return false;}
 if(ceo.leads.length>=150){fx.toast("Client pipeline limit reached. Resolve open opportunities first.");return false;}
 const seed=agencyLeadForClient(client);
 const live=marketCompany(s,clientId);
 if(live){
  const momentum=Math.max(.75,Math.min(1.3,Math.pow(live.simulatedAnnualRevenue/Math.max(1,live.baselineAnnualRevenue),.45)));
  seed.value=Math.round(seed.value*momentum);
  seed.fee=Math.round(seed.fee*momentum);
  seed.desc+=" Current modeled business growth: "+live.totalGrowthPct.toFixed(1)+"%; game budget adjusted to match.";
 }
 const suffix=ceo.day+"-"+(++ceo.seq);
 const lead:Lead={...seed,id:"approach-"+clientId+"-"+suffix,status:"prospecting",source:"outbound",relationship:seed.trust,outreachAttempts:0};
 ceo.leads.unshift(lead);
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
export function isOpenCatalogLead(s:GameState,clientId:string):boolean{
 return !!s.ceo?.leads.some(l=>l.clientMasterId===clientId&&
  ["new","qualified","pitch","pitch_won","negotiating","signed","renewal"].includes(l.status));
}
