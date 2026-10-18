import {useState} from "react";
import {Coins,FlaskConical,LockKeyhole,ShieldCheck,Sparkles,Zap} from "lucide-react";
import {act,useGame} from "@/game/store";
import {money} from "@/game/data";
import {applyCheat,setSandboxCheats} from "@/game/sandboxCheats";
import "@/sandbox-cheats.css";

export function SandboxCheatConsole({open,onOpenChange}:{open:boolean;onOpenChange:(open:boolean)=>void}){
 const s=useGame(x=>x),[rawAmount,setRawAmount]=useState("10000000"),[code,setCode]=useState("");
 const cheats=s.sandboxCheats,enabled=cheats?.enabled===true;
 function run(cmd:string,amount?:number){act((draft,fx)=>{applyCheat(draft,fx,cmd,amount);});}
 function customCash(){
  const parsed=rawAmount.trim();
  if(!/^\d+$/.test(parsed)){run("CASH",NaN);return;}
  run("CASH",Number(parsed));
 }
 const cash=s.agencyUnlocked?s.agencyCash:s.personalCash;
 return <section className="mt-cheat-console" aria-label="Sandbox Cheat Console">
  <button className="mt-cheat-trigger" type="button" aria-expanded={open} onClick={()=>onOpenChange(!open)}>
   <span><FlaskConical size={19}/><b>Sandbox Cheat Console</b><small>Money boosts · MAX stats · Employee buffs</small></span>
   <strong>{open?"−":"+"}</strong>
  </button>
  {open&&<div className="mt-cheat-body">
   <p className="mt-cheat-note"><ShieldCheck size={16}/> Optional single-player sandbox. All effects are saved in this browser and do not represent earned campaign revenue. Export your save first if you want a clean backup.</p>
   <div className="mt-cheat-toggle">
    <span><b>Enable Sandbox Cheats</b><small>{enabled?"Active · this save is marked as sandbox":"Off · normal progression is unchanged"}</small></span>
    <button type="button" aria-pressed={enabled} className={enabled?"active":""}
     onClick={()=>act((d,fx)=>{setSandboxCheats(d,fx,!enabled);})}>{enabled?"Enabled ✓":"Enable cheats"}</button>
   </div>
   <div className="mt-cheat-balances">
    <div><small>{s.agencyUnlocked?"AGENCY CASH":"PERSONAL CASH"}</small><b>{money(cash)}</b></div>
    <div><small>REPUTATION</small><b>{s.reputation}/100</b></div>
    <div><small>EXPERTISE</small><b>{s.expertise}</b></div>
    {s.agencyUnlocked&&<div><small>STAFF</small><b>{s.staff.length}</b></div>}
   </div>
   <div className="mt-cheat-section">
    <h4><Coins size={18}/> Add game money</h4>
    <div className="mt-cheat-grid">
     <button disabled={!enabled} type="button" onClick={()=>run("MONEY10M")}><b>+10,000,000 ₫</b><small>Quick cash</small></button>
     <button disabled={!enabled} type="button" onClick={()=>run("MONEY100M")}><b>+100,000,000 ₫</b><small>Big cash injection</small></button>
     <button disabled={!enabled} type="button" onClick={()=>run("MONEY1B")}><b>+1,000,000,000 ₫</b><small>Tycoon funds</small></button>
    </div>
    <form className="mt-cheat-custom" onSubmit={e=>{e.preventDefault();customCash();}}>
     <label htmlFor="mt-cheat-cash">Custom amount (VND)</label>
     <input id="mt-cheat-cash" type="text" inputMode="numeric" placeholder="e.g. 50000000" value={rawAmount} onChange={e=>setRawAmount(e.target.value)} maxLength={13}/>
     <button type="submit" disabled={!enabled}>Add Cash</button>
    </form>
   </div>
   <div className="mt-cheat-section">
    <h4><Zap size={18}/> Player & agency buffs</h4>
    <div className="mt-cheat-grid">
     <button disabled={!enabled} type="button" onClick={()=>run("REP100")}><b>MAX Reputation</b><small>Reputation 100/100</small></button>
     <button disabled={!enabled} type="button" onClick={()=>run("EXP100")}><b>MAX Expertise</b><small>Expertise 100/100</small></button>
     <button disabled={!enabled} type="button" onClick={()=>run("BOOST")}><b>Career Boost</b><small>+25 rep · +25 expertise · +20 staff</small></button>
     <button disabled={!enabled||!s.staff.length} type="button" onClick={()=>run("STAFFMAX")}><b>MAX Employees</b><small>All functions 100 · morale 100 · fatigue 0</small></button>
     <button className="mt-cheat-max" disabled={!enabled} type="button" onClick={()=>run("ALLMAX")}><Sparkles size={17}/><b>ALL MAX + 100M ₫</b><small>All player and staff buffs + cash</small></button>
    </div>
   </div>
   <form className="mt-cheat-code" onSubmit={e=>{e.preventDefault();run(code);}}>
    <label htmlFor="mt-cheat-code-input">Or enter a cheat code</label>
    <div><input id="mt-cheat-code-input" value={code} onChange={e=>setCode(e.target.value)} placeholder="MONEY1B / REP100 / ALLMAX" maxLength={24} autoComplete="off"/>
    <button type="submit" disabled={!enabled||!code.trim()}>Activate</button></div>
    <small>Codes: MONEY10M, MONEY100M, MONEY1B, REP100, EXP100, BOOST, STAFFMAX, ALLMAX. Shortcut: Alt + Shift + M.</small>
   </form>
   <div className="mt-cheat-footer"><LockKeyhole size={15}/><span>Used <b>{cheats?.uses??0}</b> times · total credited <b>{money(cheats?.cashGranted??0)}</b>. Disabling the console does not undo applied buffs.</span></div>
  </div>}
 </section>;
}
