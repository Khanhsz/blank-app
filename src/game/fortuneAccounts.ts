/** Fortune HQ strategic accounts: fictional procurement and agency retainers.
 * Published Fortune ranks are NOT game contracts. Everything here is simulation.
 */
import {CLIENT_DATABASE,CLIENT_BY_ID} from "./clientDatabase";
import type {GameState,FortuneAccount,Lead} from "./state";
import type {Fx} from "./store";

export const FORTUNE_YEAR_DAYS=365;
export const FORTUNE_RFP_WINDOW=90;
export const FORTUNE_CLIENTS=CLIENT_DATABASE.filter(x=>x.fortuneRank!==null);
const INITIAL_RIVAL_OWNERS:Record<string,{agencyId:string;endDay:number}>={
 "f50-1":{agencyId:"atlas",endDay:140},
 "f50-2":{agencyId:"pulse",endDay:220},
 "f50-4":{agencyId:"muse",endDay:180},
 "f50-5":{agencyId:"north",endDay:120},
 "f50-11":{agencyId:"atlas",endDay:310}
};
export function ensureFortuneAccounts(s:GameState):Record<string,FortuneAccount>{
 const accounts=s.ceo?.fortuneAccounts;
 if(!s.ceo)return {};
 if(!accounts||typeof accounts!=="object")s.ceo.fortuneAccounts={};
 const result=s.ceo.fortuneAccounts!;
 for(const firm of FORTUNE_CLIENTS){
  if(result[firm.id])continue;
  const incumbent=INITIAL_RIVAL_OWNERS[firm.id];
  result[firm.id]={clientId:firm.id,ownerAgencyId:incumbent?.agencyId??null,
    startedDay:incumbent?incumbent.endDay-FORTUNE_YEAR_DAYS:null,
    endsDay:incumbent?Math.max(s.ceo.day+1,incumbent.endDay):null};
 }
 return result;
}
export function fortuneOwnerName(s:GameState,account:FortuneAccount):string{
 if(account.ownerAgencyId==="player")return s.agencyName||"Your Agency";
 return s.ceo?.rivals.find(r=>r.id===account.ownerAgencyId)?.name??"Available";
}
export function fortuneRfpStatus(s:GameState,id:string){
 const firm=CLIENT_BY_ID[id],account=s.ceo?ensureFortuneAccounts(s)[id]:null;
 const day=s.ceo?.day??s.clock.day;
 const remaining=Math.max(0,(account?.endsDay??day)-day);
 const owner=remaining>0?account?.ownerAgencyId??null:null;
 return {firm,account,owner,remaining,
  open:!!firm?.fortuneRank&&(!owner||owner!=="player"&&remaining<=FORTUNE_RFP_WINDOW),
  ownerName:account?fortuneOwnerName(s,account):"Available"};
}
export function fortuneConflict(s:GameState,clientId:string,excludingLeadId?:string){
 const firm=CLIENT_BY_ID[clientId],rank=firm?.fortuneRank;
 if(!rank||rank>10||!s.ceo)return null;
 const accounts=ensureFortuneAccounts(s),now=s.ceo.day;
 const conflict=FORTUNE_CLIENTS.find(c=>c.id!==clientId&&c.fortuneRank!==null&&c.fortuneRank<=10&&c.sector===firm.sector&&(
  accounts[c.id]?.ownerAgencyId==="player"&&(accounts[c.id]?.endsDay??0)>now||
  s.ceo!.projects.some(p=>p.status==="active"&&p.clientMasterId===c.id)
 ));
 return conflict?.brand??null;
}
/** Read-only confirmation used at both HQ approach and at signature. */
export function canContractFortune(s:GameState,id:string,leadId?:string){
 const firm=CLIENT_BY_ID[id];
 if(!firm?.fortuneRank||!s.agencyUnlocked||!s.ceo)return {ok:false,reason:"Not a Fortune HQ client."};
 const done=s.history.filter(h=>h.agency).length;
 if(done<3||s.reputation<55)return {ok:false,reason:"Requires three completed agency campaigns and reputation 55."};
 const conflict=fortuneConflict(s,id,leadId);
 if(conflict)return {ok:false,reason:"Top 10 sector exclusivity: your agency already serves "+conflict+"."};
 const status=fortuneRfpStatus(s,id);
 if(status.owner==="player")return {ok:false,reason:"This account is already under your agency's annual retainer."};
 if(status.owner&&status.remaining>FORTUNE_RFP_WINDOW)
  return {ok:false,reason:"Incumbent "+status.ownerName+" holds the account. RFP opens "+(status.remaining-FORTUNE_RFP_WINDOW)+" game days from now."};
 return {ok:true,reason:status.owner?"Incumbent "+status.ownerName+" will defend the renewal RFP.":"Procurement is open."};
}
export function signFortuneAccount(s:GameState,clientId:string,fx:Fx){
 if(!s.ceo)return;
 const account=ensureFortuneAccounts(s)[clientId];
 const displaced=account?.ownerAgencyId&&account.ownerAgencyId!=="player"?fortuneOwnerName(s,account):null;
 if(!account)return;
 account.ownerAgencyId="player";account.startedDay=s.ceo.day;account.endsDay=s.ceo.day+FORTUNE_YEAR_DAYS;
 if(displaced){
  s.ceo.rivalNews??=[];
  s.ceo.rivalNews.unshift({id:"fortune-account-"+clientId+"-"+s.ceo.day,day:s.ceo.day,rivalId:"",
   kind:"loss",message:"Your agency displaced "+displaced+" on the simulated "+CLIENT_BY_ID[clientId].brand+" annual account."});
 }
 fx.log("Fortune HQ retainer secured: "+CLIENT_BY_ID[clientId].brand+" · 365 days");
}
export function advanceFortuneAccounts(s:GameState){
 if(!s.ceo)return;
 for(const account of Object.values(ensureFortuneAccounts(s))){
  if(account.endsDay===null||account.endsDay>s.ceo.day)continue;
  if(account.ownerAgencyId==="player"&&s.ceo.projects.some(p=>p.status==="active"&&p.clientMasterId===account.clientId))continue;
  account.ownerAgencyId=null;account.startedDay=null;account.endsDay=null;
 }
}
