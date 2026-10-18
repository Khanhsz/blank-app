/** Optional local-save sandbox cheats for single-player Marketing Tycoon.
 * No remote server state, rankings, real transactions or unlock bypasses.
 * Ledger records agency injections as NON-CLIENT CAPITAL, never fake billable revenue.
 */
import {money} from "./data";
import {defaultProfile} from "./personnel";
import type {GameState,SandboxCheatState,TalentFunction} from "./state";
import type {Fx} from "./store";

const MAX_BALANCE=1_000_000_000_000;
export const SANDBOX_MAX_BALANCE=MAX_BALANCE;
export const CASH_PRESETS={
 MONEY10M:10_000_000,
 MONEY100M:100_000_000,
 MONEY1B:1_000_000_000
} as const;
export type CheatCode=keyof typeof CASH_PRESETS|"REP100"|"EXP100"|"BOOST"|"STAFFMAX"|"ALLMAX";
const STATS:TalentFunction[]=["acc","str","cre","med"];
const clamp=(n:number)=>Math.max(0,Math.min(100,Math.round(n)));
const status=(s:GameState):SandboxCheatState=>s.sandboxCheats??(s.sandboxCheats={enabled:false,uses:0,cashGranted:0});

export function setSandboxCheats(s:GameState,fx:Fx,enabled:boolean){
 if(!s.created)return false;
 const state=status(s);
 state.enabled=!!enabled;
 fx.log(enabled?"Sandbox cheats enabled for this save":"Sandbox cheats disabled for this save");
 fx.toast(enabled?"Sandbox cheats enabled · cash and buffs are permanent in this save.":"Sandbox cheats disabled.");
 return true;
}
function credit(s:GameState,amount:number){
 if(!Number.isSafeInteger(amount)||amount<=0||amount>MAX_BALANCE)return 0;
 const key=s.agencyUnlocked?"agencyCash":"personalCash";
 const current=Number(s[key]);
 if(!Number.isFinite(current))return 0;
 const actual=Math.min(amount,Math.max(0,Math.floor(MAX_BALANCE-current)));
 if(actual<=0)return 0;
 s[key]=current+actual;
 if(s.agencyUnlocked&&s.ceo){
  s.ceo.ledger.unshift({
   day:s.ceo.day,what:"Sandbox capital injection · cheat (non-client income)",
   value:actual,lead:"sandbox",status:"paid"
  });
  s.ceo.ledger=s.ceo.ledger.slice(0,150);
 }
 return actual;
}
function buffStaff(s:GameState,maximum:boolean){
 for(const id of s.staff){
  const p=s.personnel[id]??(s.personnel[id]=defaultProfile(id));
  p.skill=clamp(maximum?100:p.skill+20);
  p.attributes??=defaultProfile(id).attributes;
  for(const k of STATS)p.attributes![k]=clamp(maximum?100:(p.attributes![k]??50)+20);
  p.morale=clamp(maximum?100:p.morale+20);
  p.fatigue=maximum?0:Math.max(0,p.fatigue-35);
 }
}
function record(s:GameState,fx:Fx,code:string,cash:number,detail:string){
 const record=status(s);
 record.uses=Math.min(1_000_000,record.uses+1);
 record.cashGranted=Math.min(Number.MAX_SAFE_INTEGER,record.cashGranted+cash);
 record.lastCommand=code;record.lastDay=s.clock.day;
 fx.log("Sandbox cheat "+code+" · "+detail);
 fx.toast("Cheat activated · "+detail);
}
/** All cheat commands are fixed allow-listed IDs, no scripting/eval and no server API calls. */
export function applyCheat(s:GameState,fx:Fx,command:string,customAmount?:number){
 const current=status(s);
 if(!s.created||!current.enabled)return fx.toast("Enable Sandbox Cheats in Settings first."),false;
 const code=command.trim().toUpperCase();
 if(code in CASH_PRESETS||code==="CASH"){
  const amount=code==="CASH"?customAmount:CASH_PRESETS[code as keyof typeof CASH_PRESETS];
  if(!Number.isSafeInteger(amount)||!amount||amount<1||amount>MAX_BALANCE)
   return fx.toast("Enter a positive whole-number VND amount of at most 1 trillion."),false;
  const added=credit(s,amount);
  if(added<=0)return fx.toast("This wallet reached the sandbox cash ceiling."),false;
  record(s,fx,code,added,"+"+money(added)+" to "+(s.agencyUnlocked?"Agency Cash":"Personal Cash"));
  return true;
 }
 if(!(["REP100","EXP100","BOOST","STAFFMAX","ALLMAX"] as string[]).includes(code))
  return fx.toast("Unknown cheat code. Use a listed preset."),false;
 if(code==="STAFFMAX"&&!s.staff.length)return fx.toast("Hire at least one employee before using STAFFMAX."),false;
 if(code==="REP100"||code==="ALLMAX")s.reputation=100;
 if(code==="EXP100"||code==="ALLMAX")s.expertise=100;
 if(code==="BOOST"){
  s.reputation=clamp(s.reputation+25);s.expertise=clamp(s.expertise+25);
 }
 if(["STAFFMAX","ALLMAX","BOOST"].includes(code))buffStaff(s,code!=="BOOST");
 // CEO profile mirrors the player rep; keep executive and public reputation coherent.
 if(s.ceo&&(code==="REP100"||code==="ALLMAX"||code==="BOOST"))s.ceo.reputation.overall=s.reputation;
 let granted=0;
 if(code==="ALLMAX")granted=credit(s,100_000_000);
 record(s,fx,code,granted,code==="ALLMAX"
   ?"MAX reputation, MAX expertise, MAX staff + "+money(granted)+" sandbox capital"
   :code==="REP100"?"Reputation 100/100"
   :code==="EXP100"?"Expertise 100/100"
   :code==="STAFFMAX"?"Employee skills, morale and 4 talent functions MAX"
   :"Reputation +25, expertise +25 and staff +20");
 return true;
}
