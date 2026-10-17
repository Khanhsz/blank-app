import {useState} from "react";
import {ArrowRight,CheckCircle2,Clock3,Users,UserPlus,UserRoundX,ShieldCheck,Building2,AlertTriangle,ArrowLeftRight} from "lucide-react";
import {Button} from "@/components/ui/button";
import {useGame,act} from "@/game/store";
import {ceoTaskDefs,employeeById,employees,money} from "@/game/data";
import * as K from "@/game/ceo";
import * as P from "@/game/personnel";
import * as T from "@/game/clientTeams";
import type {ClientTeam} from "@/game/state";

function StaffPicker({team}:{team:ClientTeam}){
 const s=useGame(x=>x),pool=T.talentPool(s);
 const [choice,setChoice]=useState("");
 const opts=pool.filter(id=>s.staff.includes(id));
 return <div className="mt-squad-staffing">
  <div className="mt-squad-staffing-header"><b>Add a dedicated specialist</b><span>{pool.length} employees unassigned</span></div>
  {opts.length?<div className="mt-squad-inline">
   <select aria-label={"Add employee to "+team.brand} value={choice} onChange={e=>setChoice(e.target.value)}>
    <option value="">Choose available talent...</option>
    {opts.map(id=><option key={id} value={id}>{employeeById(id)?.name} · {employeeById(id)?.role} · skill {Math.round(P.profile(s,id).skill)}</option>)}
   </select>
   <Button size="sm" disabled={!choice} onClick={()=>{act((d,fx)=>T.joinClientTeam(d,fx,team.id,choice));setChoice("");}}><UserPlus size={14}/> Add</Button>
  </div>:<p className="text-xs text-muted-foreground">Talent pool empty. Recruit in People or release a member from another client after a safe handover.</p>}
 </div>;
}

function TeamProject({projectId,team}:{projectId:string;team:ClientTeam}){
 const s=useGame(x=>x),p=s.ceo?.projects.find(x=>x.id===projectId);
 if(!p)return null;
 const unfinished=p.tasks.filter(t=>t.status!=="completed").length;
 return <div className="mt-squad-project">
  <div className="mt-squad-project-head"><div><b>{p.brand} · Campaign</b><span>{p.status==="completed"?"Campaign completed":p.days+"/"+p.duration+" days elapsed"}</span></div>
   <span className="mt-squad-state">{unfinished} tasks remaining</span></div>
  <div className="mt-squad-task-list">
   {p.tasks.map(task=>{
    const assignable=task.status==="backlog"||task.status==="assigned";
    const ready=task.pre.every(k=>p.tasks.some(o=>o.key===k&&o.status==="completed"));
    const candidates=team.memberIds.filter(id=>P.eligibleForRole(id,task.role));
    return <div key={task.key} className="mt-squad-task">
     <div className="mt-squad-task-head"><b>{task.label}</b><span>{task.status.replaceAll("_"," ")}</span></div>
     <div className="mt-squad-progress"><span style={{width:Math.round(task.progress/Math.max(1,task.effort)*100)+"%"}}/></div>
     <div className="mt-squad-task-detail">
      {task.employee?<span>{task.employee==="external"?"External partner":employeeById(task.employee)?.name??task.employee}</span>:
       <span>{task.preferredEmployee?"Preferred: "+(employeeById(task.preferredEmployee)?.name??task.preferredEmployee):"Unassigned · "+task.role}</span>}
      {p.status==="active"&&assignable&&<select aria-label={"Assign "+task.label} value={task.preferredEmployee??""} onChange={e=>act((d,fx)=>P.assignSpecialist(d,fx,p.id,task.key,e.target.value||null))}>
       <option value="">Auto inside team</option>{candidates.map(id=><option key={id} value={id}>{employeeById(id)?.name}</option>)}
      </select>}
     </div>
     {p.status==="active"&&assignable&&ready&&!task.outsourced&&<Button size="sm" variant="outline" onClick={()=>act((d,fx)=>K.outsourceTeamTask(d,fx,p.id,task.key))}>Outsource · {money(Math.round(task.cost*2.1*p.scope/8))}</Button>}
    </div>;
   })}
  </div>
 </div>;
}

function TeamCard({team}:{team:ClientTeam}){
 const s=useGame(x=>x);
 const stats=T.teamCoverage(s,team);
 const completed=team.projectIds.every(id=>s.ceo?.projects.find(p=>p.id===id)?.status==="completed");
 const [transferId,setTransferId]=useState("");
 const [fromId,setFromId]=useState("");
 const fromTeams=(s.ceo?.clientTeams??[]).filter(t=>t.id!==team.id&&t.status!=="released"&&t.memberIds.length>0);
 return <article className="mt-squad-card">
  <header className="mt-squad-card-head">
   <div><small>DEDICATED CLIENT TEAM</small><h3>{team.brand}</h3>
    <p>{team.memberIds.length} assigned · {stats.coverage}% skill coverage · {stats.readiness}% readiness</p></div>
   <span className={"mt-squad-state "+(team.status==="active"?"is-active":"")}>{team.status.replaceAll("_"," ")}</span>
  </header>
  <div className="mt-squad-summary">
    <span>Members <b>{team.memberIds.length}</b></span>
    <span>Available <b>{stats.ready}</b></span>
    <span>Missing roles <b>{stats.missing.length}</b></span>
    <span>Active campaigns <b>{team.projectIds.filter(id=>s.ceo?.projects.some(p=>p.id===id&&p.status==="active")).length}</b></span>
  </div>
  {team.status!=="released"&&<>
   <div className="mt-squad-section">
    <div className="mt-squad-section-title"><b>Squad roster</b><span>Exclusive to {team.brand}</span></div>
    {team.memberIds.length?team.memberIds.map(id=>{
      const e=employeeById(id),busy=!!s.ceo?.projects.some(p=>p.teamId===team.id&&p.status==="active"&&p.tasks.some(t=>t.employee===id&&t.status==="in_progress"));
      return <div key={id} className="mt-squad-member">
       <div><b>{e?.name??id}{id===team.leadId?" · Client Lead":""}</b><span>{e?.role} · skill {Math.round(P.profile(s,id).skill)} · {P.profile(s,id).focus}</span></div>
       <div className="mt-squad-actions">
        {id!==team.leadId&&<Button size="sm" variant="outline" onClick={()=>act((d,fx)=>T.changeClientLead(d,fx,team.id,id))}>Lead</Button>}
        <Button size="sm" variant="outline" disabled={busy} title={busy?"Complete assigned work before handover":"Return to talent pool"} onClick={()=>act((d,fx)=>T.leaveClientTeam(d,fx,team.id,id))}><UserRoundX size={14}/></Button>
       </div>
      </div>;
    }):<p className="text-xs text-muted-foreground">No employees assigned. Work cannot begin until you assemble this squad or outsource the required services.</p>}
   </div>
   {team.status!=="closing"&&<>
    <StaffPicker team={team}/>
    <div className="mt-squad-buttons">
     <Button variant="outline" size="sm" disabled={T.talentPool(s).length===0} onClick={()=>act((d,fx)=>T.autoAssembleTeam(d,fx,team.id))}><Users size={15}/> Auto Assemble</Button>
    </div>
    {!!stats.missing.length&&<p className="mt-squad-warning"><AlertTriangle size={14}/> Skill gaps: {stats.missing.map(r=>r==="kol"?"KOL":r).join(", ")}. Hire, train within this squad, or outsource eligible tasks.</p>}
    {!!fromTeams.length&&<details className="mt-squad-transfer"><summary><ArrowLeftRight size={14}/> Transfer a member from another client</summary>
     <p>Only idle members can move. Their unfinished tasks remain with the previous client.</p>
     <div className="mt-squad-inline"><select aria-label="Source client team" value={fromId} onChange={e=>{setFromId(e.target.value);setTransferId("");}}>
      <option value="">From client...</option>{fromTeams.map(t=><option key={t.id} value={t.id}>{t.brand}</option>)}
     </select><select aria-label="Member to transfer" value={transferId} onChange={e=>setTransferId(e.target.value)}>
      <option value="">Employee...</option>{fromTeams.find(t=>t.id===fromId)?.memberIds.map(id=><option key={id} value={id}>{employeeById(id)?.name}</option>)}</select>
      <Button size="sm" disabled={!fromId||!transferId} onClick={()=>{act((d,fx)=>T.transferClientMember(d,fx,fromId,team.id,transferId));setTransferId("");}}><ArrowRight size={15}/></Button>
     </div>
    </details>}
   </>}
  </>}
  {team.status==="closing"&&<div className="mt-squad-closing"><CheckCircle2 size={18}/><div><b>Delivery completed</b><p>Keep the team for this client’s next contract, or release everyone to the talent pool.</p></div>
   <Button size="sm" onClick={()=>act((d,fx)=>T.releaseClientTeam(d,fx,team.id))}>Release team</Button></div>}
  {team.status==="released"&&<p className="mt-squad-released">Squad closed · all former members are available for new client work.</p>}
  {team.projectIds.map(pid=><TeamProject key={pid} projectId={pid} team={team}/>)}
 </article>;
}

export function ClientTeamBoard({onPeople}:{onPeople:()=>void}){
 const s=useGame(x=>x);
 const teams=s.ceo?.clientTeams??[];
 const active=teams.filter(t=>t.status!=="released");
 const reserved=new Set(active.flatMap(t=>t.memberIds));
 return <div className="mt-squad-board">
  <div className="mt-squad-hero"><div><small>AGENCY V3 · CLIENT SQUADS</small><h2>Dedicated Client Teams</h2><p>Every client has its own team. No employee can deliver two clients' campaigns simultaneously.</p></div><Building2 size={27}/></div>
  <div className="mt-squad-summary">
   <span>Client teams <b>{active.length}</b></span><span>Assigned staff <b>{reserved.size}</b></span>
   <span>Talent pool <b>{T.talentPool(s).length}</b></span><span>Payroll / day <b>{money(K.dailyPayroll(s))}</b></span>
  </div>
  <section className="mt-squad-pool">
   <div className="mt-squad-section-title"><b>Available Talent Pool</b><Button size="sm" variant="outline" onClick={onPeople}><UserPlus size={14}/> Recruit</Button></div>
   <p>Only these employees can be added to a new client squad.</p>
   <div className="mt-squad-pool-pills">{T.talentPool(s).length?T.talentPool(s).map(id=><span key={id}>{employeeById(id)?.name??id} · {P.primaryRole(id)}</span>):<span>No unassigned employees</span>}</div>
  </section>
  {active.length?active.map(team=><TeamCard key={team.id} team={team}/>):<div className="mt-squad-empty"><ShieldCheck size={25}/><b>No client squads yet</b><p>Qualify a lead, win a competitive pitch and sign a contract. Team Builder unlocks automatically when the first project is signed.</p></div>}
  {teams.some(t=>t.status==="released")&&<details className="mt-squad-archive"><summary>Previously released teams ({teams.filter(t=>t.status==="released").length})</summary>{teams.filter(t=>t.status==="released").map(team=><TeamCard key={team.id} team={team}/>)}</details>}
 </div>;
}
