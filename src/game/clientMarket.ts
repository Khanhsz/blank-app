/** Bridge from the canonical client database to the existing game loops. */
import {getClient,agencyLeadForClient,scenarioForClient,type ClientSegment} from "./clientDatabase";
import type {GameState,Lead} from "./state";
import type {Fx} from "./store";

export function approachCatalogClient(s:GameState,fx:Fx,clientId:string):boolean{
 const client=getClient(clientId),ceo=s.ceo;
 if(!client||!s.agencyUnlocked||!ceo)return false;
 const duplicate=ceo.leads.some(x=>x.clientMasterId===clientId&&
  ["new","qualified","pitch","pitch_won","negotiating","signed","renewal"].includes(x.status));
 if(duplicate){fx.toast("This company already has an open lead or signed opportunity.");return false;}
 if(ceo.leads.length>=150){fx.toast("Client pipeline limit reached. Resolve open opportunities first.");return false;}
 const seed=agencyLeadForClient(client);
 const suffix=ceo.day+"-"+(++ceo.seq);
 const lead:Lead={...seed,id:"approach-"+clientId+"-"+suffix,status:"new",relationship:seed.trust};
 ceo.leads.unshift(lead);
 fx.log("Prospected "+client.brand+" · "+client.segment+" · "+client.sector+" · "+(client.fortuneRank?"Fortune 50 demo":"fictional client"));
 fx.toast("Client lead added to Pipeline: "+client.brand);
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
