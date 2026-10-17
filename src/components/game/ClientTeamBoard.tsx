/** CEO Workforce: progressively disclose client teams, talent, and campaign operations.
 * Project simulation, payroll, staffing exclusivity and saves remain in game state.
 */
import {useState} from "react";
import {ArrowLeft,ArrowRight,AlertTriangle,BriefcaseBusiness,CheckCircle2,ChevronRight,ClipboardList,Search,UserPlus,Users,UserRound,Wallet} from "lucide-react";
import {Button} from "@/components/ui/button";
import {useGame,act} from "@/game/store";
import {ceoRoles,employeeById,money} from "@/game/data";
import {recruitmentFee} from "@/game/recruitment";
import * as K from "@/game/ceo";
import * as P from "@/game/personnel";
import * as T from "@/game/clientTeams";
import {currentOffice} from "@/game/city";
import type {ClientTeam,GameState} from "@/game/state";

const labels:Record<string,string>={forming:"Needs staffing",active:"Active",closing:"Ready to release",released:"Released","needs-staff":"Needs staffing",critical:"Deadline risk",attention:"Action needed","on-track":"On track",completed:"Completed"};
const nice=(status:string)=>labels[status]??status;
function canHire(s:GameState,id:string){
 const applicant=s.recruitment?.week===s.clock.week?s.recruitment.candidates.find(e=>e.id===id):undefined;
 const legacy=!id.startsWith("recruit-")?employeeById(id):undefined;
 const e=applicant??legacy,c=s.ceo;
 const cost=applicant?recruitmentFee(applicant):e?.salary??0;
 return !!e&&!!c&&!s.staff.includes(id)&&s.agencyCash>=cost&&s.staff.length<currentOffice(s).capacity&&
  (c.talentMarket?.[id]?.untilDay??0)<=c.day;
}
function staffBusy(s:GameState,id:string){
 return !!s.ceo?.projects.some(p=>p.status==="active"&&p.tasks.some(t=>t.employee===id&&t.status==="in_progress"));
}
function RoleName({role}:{role:string}){return <>{ceoRoles[role]??role}</>;}
function TeamHealth({team}:{team:ClientTeam}){
 const s=useGame(x=>x),health=T.teamNeeds(s,team);
 return <span className={"mt-work-status mt-work-"+health.status}>{nice(health.status)}</span>;
}
function TeamOverview({teams,onTeam,onPool}:{teams:ClientTeam[];onTeam:(id:string)=>void;onPool:()=>void}){
 const s=useGame(x=>x);
 const active=teams.filter(t=>t.status!=="released");
 const flagged=active.filter(t=>["critical","attention","needs-staff"].includes(T.teamNeeds(s,t).status));
 return <div className="mt-work-flow">
  <div className="mt-work-section-head"><h3>Client teams</h3><span>{active.length} accounts</span></div>
  {flagged.length>0&&<div className="mt-work-alert"><AlertTriangle size={17}/><div><b>{flagged.length} team{flagged.length>1?"s":""} need attention</b><p>Open a client to resolve staffing or delivery risk.</p></div></div>}
  {active.length?active.map(t=>{
    const h=T.teamNeeds(s,t),coverage=T.teamCoverage(s,t),campaigns=h.projects.length;
    const issue=h.missing.length?"Missing: "+h.missing.slice(0,2).map(r=>ceoRoles[r]??r).join(", "):
     h.overloaded.length?"High fatigue / workload":
     h.unavailable.length?"Specialist currently in training":
     h.remaining!==null&&h.remaining<=7?"Deadline in "+h.remaining+" days":"Team is ready for delivery";
    return <button type="button" key={t.id} className="mt-work-team-card" onClick={()=>onTeam(t.id)} aria-label={"Manage "+t.brand+" client team"}>
     <div className="mt-work-team-main">
      <div><h4>{t.brand}</h4><span>{t.memberIds.length} members · {campaigns} active campaign{campaigns===1?"":"s"}</span></div>
      <div className="mt-work-card-state"><TeamHealth team={t}/><ChevronRight size={18}/></div>
     </div>
     <div className="mt-work-readiness"><span>Readiness</span><strong>{coverage.readiness}%</strong></div>
     <div className="mt-work-meter"><span style={{width:coverage.readiness+"%"}}/></div>
     <p className={h.status==="on-track"?"mt-work-positive":"mt-work-problem"}>{issue}</p>
    </button>;
   }):<div className="mt-work-empty"><Users size={28}/><h3>No client teams yet</h3><p>After winning a pitch and signing a contract, your client gets a dedicated squad.</p><Button variant="outline" size="sm" onClick={onPool}>View available talent</Button></div>}
  {teams.some(t=>t.status==="released")&&<details className="mt-work-advanced"><summary>Released teams ({teams.filter(t=>t.status==="released").length})</summary>
   <div className="mt-work-archive">{teams.filter(t=>t.status==="released").map(t=><div key={t.id}>{t.brand} · Closed</div>)}</div>
  </details>}
 </div>;
}
function TeamDetail({team,onBack,onEmployee,onDelivery,onRecruit}:{team:ClientTeam;onBack:()=>void;onEmployee:(id:string)=>void;onDelivery:(id:string)=>void;onRecruit:()=>void}){
 const s=useGame(x=>x),health=T.teamNeeds(s,team),plan=T.staffingPlan(s,team),stats=T.teamCoverage(s,team);
 const pool=T.talentPool(s),teams=(s.ceo?.clientTeams??[]).filter(t=>t.id!==team.id&&t.status!=="released"&&t.memberIds.length>0);
 const [newMember,setNewMember]=useState("");
 const [fromTeam,setFromTeam]=useState(""),[fromEmployee,setFromEmployee]=useState("");
 const canStaff=team.status!=="closing"&&team.status!=="released";
 const candidate=(s.recruitment?.candidates??[]).find(e=>!s.staff.includes(e.id)&&plan.needs.missing.some(role=>P.eligibleForRole(e.id,role)));
 return <div className="mt-work-flow">
  <button className="mt-work-back" onClick={onBack}><ArrowLeft size={16}/> All client teams</button>
  <div className="mt-work-detail-title"><div><small>CLIENT WORKFORCE</small><h3>{team.brand}</h3><p>Dedicated team · {team.memberIds.length} assigned · {stats.readiness}% readiness</p></div><TeamHealth team={team}/></div>
  {health.warnings.length>0&&<div className="mt-work-alert"><AlertTriangle size={18}/><div><b>Staffing attention</b><p>{health.warnings.join(" · ")}</p></div></div>}
  {canStaff&&<section className="mt-work-section">
   <div className="mt-work-section-head"><h4>Smart staffing</h4><span>Suggested next step</span></div>
   <p className="mt-work-hint">{plan.hint}</p>
   <div className="mt-work-cta">
    <Button size="sm" disabled={!plan.next} onClick={()=>act((d,fx)=>T.autoAssembleTeam(d,fx,team.id))}><Users size={15}/> Auto-staff from pool</Button>
    {plan.next&&<Button size="sm" variant="outline" onClick={()=>act((d,fx)=>T.joinClientTeam(d,fx,team.id,plan.next!.id))}>Add {employeeById(plan.next.id)?.name}</Button>}
   </div>
   {!plan.next&&plan.needs.missing.length>0&&<div className="mt-work-next-step"><span>Uncovered: {plan.needs.missing.slice(0,3).map(r=>ceoRoles[r]??r).join(" · ")}</span>
    <div className="mt-work-cta">
     {candidate&&<Button size="sm" disabled={!canHire(s,candidate.id)} onClick={()=>act((d,fx)=>{
      K.hire(d,fx,candidate.id);
      if(d.staff.includes(candidate.id))T.joinClientTeam(d,fx,team.id,candidate.id);
     })}>Hire & assign {candidate.name} · {money(recruitmentFee(candidate))}</Button>}
     <Button size="sm" variant="outline" onClick={onRecruit}><UserPlus size={15}/> Browse talent</Button>
    </div>
    <small>Outsource eligible work from Campaign Delivery if staffing is unavailable.</small>
   </div>}
  </section>}
  <section className="mt-work-section">
   <div className="mt-work-section-head"><h4>Team roster</h4><span>{team.memberIds.length} specialists</span></div>
   {team.memberIds.length?team.memberIds.map(id=>{
    const e=employeeById(id),p=P.profile(s,id),lead=id===team.leadId;
    return <button key={id} type="button" className="mt-work-person-row" onClick={()=>onEmployee(id)}>
     <span className="mt-work-avatar"><UserRound size={17}/></span>
     <span className="mt-work-person-text"><b>{e?.name??id}{lead?" · Lead":""}</b><small>{e?.role??P.primaryRole(id)} · Skill {Math.round(p.skill)}</small></span>
     <span className="mt-work-person-meta">{p.trainingUntil&&p.trainingUntil>s.ceo!.day?"Training":staffBusy(s,id)?"Working":"Ready"}</span><ChevronRight size={17}/>
    </button>;
   }):<p className="mt-work-muted">No members yet. Use Auto-staff or recruit a specialist to get started.</p>}
   {canStaff&&<div className="mt-work-add-row"><select aria-label={"Assign talent to "+team.brand} value={newMember} onChange={e=>setNewMember(e.target.value)}>
    <option value="">Select available employee</option>{pool.filter(id=>P.effectiveCapacity(s,id)>0).map(id=><option key={id} value={id}>{employeeById(id)?.name} · {employeeById(id)?.role}</option>)}
   </select><Button size="sm" disabled={!newMember} onClick={()=>{act((d,fx)=>T.joinClientTeam(d,fx,team.id,newMember));setNewMember("");}}>Add member</Button></div>}
  </section>
  <section className="mt-work-section">
   <div className="mt-work-section-head"><h4>Campaigns</h4><span>Operations</span></div>
   {team.projectIds.map(id=>{
    const p=s.ceo?.projects.find(p=>p.id===id);
    if(!p)return null;
    const done=p.tasks.filter(t=>t.status==="completed").length;
    return <div key={id} className="mt-work-project-row"><div><b>{p.brand}</b><small>{p.status==="completed"?"Completed":p.days+" / "+p.duration+" days"} · {done}/{p.tasks.length} tasks</small></div>
      <Button size="sm" variant="outline" onClick={()=>onDelivery(id)}>Campaign delivery <ArrowRight size={14}/></Button></div>;
   })}
  </section>
  {team.status==="closing"&&<div className="mt-work-alert"><CheckCircle2 size={18}/><div><b>Delivery completed</b><p>Release team members back to the available talent pool when the contract ends.</p><Button size="sm" onClick={()=>act((d,fx)=>T.releaseClientTeam(d,fx,team.id))}>Release squad</Button></div></div>}
  {canStaff&&<details className="mt-work-advanced"><summary>Advanced team management</summary>
   <div className="mt-work-flow">
    <p className="mt-work-muted">Change the client lead, return idle members to the pool, or safely transfer a member from another account.</p>
    {team.memberIds.map(id=><div key={id} className="mt-work-advanced-row"><span>{employeeById(id)?.name}{team.leadId===id?" · Current lead":""}</span>
      <Button size="sm" variant="outline" disabled={team.leadId===id} onClick={()=>act((d,fx)=>T.changeClientLead(d,fx,team.id,id))}>Make lead</Button>
      <Button size="sm" variant="outline" disabled={staffBusy(s,id)} onClick={()=>act((d,fx)=>T.leaveClientTeam(d,fx,team.id,id))}>Release</Button>
     </div>)}
    {teams.length>0&&<div className="mt-work-transfer"><b>Transfer from another client</b>
      <select aria-label="Source client team" value={fromTeam} onChange={e=>{setFromTeam(e.target.value);setFromEmployee("");}}>
        <option value="">Choose source team</option>{teams.map(t=><option value={t.id} key={t.id}>{t.brand}</option>)}
      </select><select aria-label="Source employee" value={fromEmployee} onChange={e=>setFromEmployee(e.target.value)}>
       <option value="">Choose idle employee</option>{teams.find(t=>t.id===fromTeam)?.memberIds.filter(id=>!staffBusy(s,id)).map(id=><option value={id} key={id}>{employeeById(id)?.name}</option>)}
      </select><Button size="sm" disabled={!fromTeam||!fromEmployee} onClick={()=>{act((d,fx)=>T.transferClientMember(d,fx,fromTeam,team.id,fromEmployee));setFromEmployee("");}}>Transfer employee</Button>
    </div>}
   </div>
  </details>}
 </div>;
}
function CampaignDelivery({team,projectId,onBack}:{team:ClientTeam;projectId:string;onBack:()=>void}){
 const s=useGame(x=>x),p=s.ceo?.projects.find(x=>x.id===projectId);
 if(!p)return <Button variant="outline" onClick={onBack}>Back to client</Button>;
 return <div className="mt-work-flow">
  <button className="mt-work-back" onClick={onBack}><ArrowLeft size={16}/> {team.brand} team</button>
  <div className="mt-work-detail-title"><div><small>PROJECT DELIVERY / CAMPAIGN OPERATIONS</small><h3>{p.brand} Campaign</h3><p>{p.days}/{p.duration} days elapsed · {p.tasks.filter(t=>t.status==="completed").length}/{p.tasks.length} completed</p></div><ClipboardList size={23}/></div>
  <p className="mt-work-muted">Task assignment and outsourcing live here, separately from the team roster. Automatic task allocation stays inside this client squad.</p>
  {p.tasks.map(task=>{
   const assignable=p.status==="active"&&["backlog","assigned"].includes(task.status);
   const ready=task.pre.every(k=>p.tasks.some(t=>t.key===k&&t.status==="completed"));
   const candidates=team.memberIds.filter(id=>P.eligibleForRole(id,task.role));
   return <section key={task.key} className="mt-work-task">
    <div className="mt-work-section-head"><b>{task.label}</b><span>{task.status.replaceAll("_"," ")}</span></div>
    <div className="mt-work-meter"><span style={{width:Math.min(100,Math.round(task.progress/Math.max(1,task.effort)*100))+"%"}}/></div>
    <p className="mt-work-muted">{task.employee?task.employee==="external"?"External partner":employeeById(task.employee)?.name:
     task.preferredEmployee?"Preferred: "+(employeeById(task.preferredEmployee)?.name??task.preferredEmployee):"Assigned automatically when dependencies are ready"}</p>
    {assignable&&<div className="mt-work-cta"><select aria-label={"Assign "+task.label} value={task.preferredEmployee??""} onChange={e=>act((d,fx)=>P.assignSpecialist(d,fx,p.id,task.key,e.target.value||null))}>
     <option value="">Auto inside team</option>{candidates.map(id=><option key={id} value={id}>{employeeById(id)?.name}</option>)}
    </select>{ready&&!task.outsourced&&<Button size="sm" variant="outline" onClick={()=>act((d,fx)=>K.outsourceTeamTask(d,fx,p.id,task.key))}>Outsource · {money(Math.round(task.cost*2.1*p.scope/8))}</Button>}</div>}
   </section>;
  })}
 </div>;
}
function EmployeeDetail({id,onBack,onTeam}:{id:string;onBack:()=>void;onTeam:(teamId:string)=>void}){
 const s=useGame(x=>x),e=employeeById(id),hired=s.staff.includes(id),p=P.profile(s,id),owner=T.ownerTeam(s,id),busy=staffBusy(s,id);
 const applicant=s.recruitment?.candidates.find(e=>e.id===id);
 const [selectedTeam,setSelectedTeam]=useState("");
 const teams=(s.ceo?.clientTeams??[]).filter(t=>t.status!=="released"&&t.status!=="closing");
 if(!e)return null;
 const training=!!p.trainingUntil&&p.trainingUntil>(s.ceo?.day??0);
 return <div className="mt-work-flow">
  <button className="mt-work-back" onClick={onBack}><ArrowLeft size={16}/> Workforce</button>
  <div className="mt-work-detail-title"><div><small>EMPLOYEE PROFILE</small><h3>{e.name}</h3><p>{e.role}</p></div><span className="mt-work-avatar"><UserRound size={21}/></span></div>
  <div className="mt-work-employee-stats"><span><small>Skill</small><b>{Math.round(applicant?.startingSkill??p.skill)}/100</b></span><span><small>Morale</small><b>{Math.round(applicant?.startingMorale??p.morale)}%</b></span><span><small>Fatigue</small><b>{Math.round(applicant?.startingFatigue??p.fatigue)}%</b></span><span><small>Salary / mo</small><b>{money(e.salary)}</b></span></div>
  <section className="mt-work-section"><div className="mt-work-section-head"><h4>Current assignment</h4></div>
   <p>{owner?"Dedicated to "+owner.brand:hired?"Available to join any client squad":"Not hired"}</p>
   {training&&<p className="mt-work-hint">Training through Day {p.trainingUntil}; unavailable for staffing until complete.</p>}
   {owner&&<Button size="sm" variant="outline" onClick={()=>onTeam(owner.id)}>Open client team</Button>}
   {!hired&&<Button disabled={!canHire(s,id)} onClick={()=>act((d,fx)=>K.hire(d,fx,id))}>Hire · {money(applicant?recruitmentFee(applicant):e.salary)}</Button>}
   {hired&&!owner&&teams.length>0&&<div className="mt-work-add-row">
    <select aria-label="Assign employee to client" value={selectedTeam} onChange={evt=>setSelectedTeam(evt.target.value)}>
     <option value="">Assign to a client</option>{teams.map(t=><option value={t.id} key={t.id}>{t.brand}</option>)}
    </select><Button size="sm" disabled={!selectedTeam||training} onClick={()=>{act((d,fx)=>T.joinClientTeam(d,fx,selectedTeam,id));setSelectedTeam("");}}>Assign</Button>
   </div>}
  </section>
  {hired&&<section className="mt-work-section"><div className="mt-work-section-head"><h4>Development</h4><span>Optional controls</span></div>
    <label className="mt-work-field">Delivery focus <select value={p.focus} aria-label={"Delivery focus for "+e.name} onChange={evt=>act((d,fx)=>P.setWorkStyle(d,fx,id,evt.target.value as import("@/game/state").WorkStyle))}>
      <option value="balanced">Balanced · normal pace</option><option value="speed">Speed · faster, lower QA</option><option value="quality">Quality · careful, lower capacity</option>
    </select></label>
    <Button size="sm" variant="outline" disabled={training||busy||s.agencyCash<e.salary*.35} onClick={()=>act((d,fx)=>P.train(d,fx,id))}>{training?"Training in progress":"Train for 7 days · "+money(Math.round(e.salary*.35))}</Button>
    {busy&&<p className="mt-work-muted">Complete the employee's active task before training or moving them to another client.</p>}
   </section>}
 </div>;
}
function TalentPool({onEmployee}:{onEmployee:(id:string)=>void}){
 const s=useGame(x=>x);
 const [filter,setFilter]=useState<"available"|"assigned"|"recruit">("available");
 const [query,setQuery]=useState("");
 const staff=s.staff.map(id=>employeeById(id)).filter((e):e is NonNullable<typeof e>=>!!e);
 const offers=s.recruitment?.week===s.clock.week?(s.recruitment?.candidates??[]):[];
 const items=(filter==="recruit"?offers:staff).filter(e=>{
  const hired=s.staff.includes(e.id),owner=T.ownerTeam(s,e.id);
  const match=filter==="recruit"?!hired:filter==="assigned"?hired&&!!owner:hired&&!owner;
  return match&&(e.name+" "+e.role+" "+P.primaryRole(e.id)).toLowerCase().includes(query.trim().toLowerCase());
 });
 return <div className="mt-work-flow">
  <div className="mt-work-section-head"><h3>Talent pool</h3><span>{s.staff.length}/{currentOffice(s).capacity} employed · {money(K.dailyPayroll(s))}/day</span></div>
  <p className="mt-work-muted">Recruitment shortlist · Week {s.clock.week}. New applicants arrive when you End Week; hires keep their salary and development progress.</p>
  <div className="mt-work-filter" role="tablist" aria-label="Filter workforce">
   {(["available","assigned","recruit"] as const).map(f=><button key={f} type="button" role="tab" aria-selected={filter===f} className={filter===f?"active":""} onClick={()=>setFilter(f)}>{f==="available"?"Available ("+T.talentPool(s).length+")":f==="assigned"?"Assigned":"Recruit"}</button>)}
  </div>
  <label className="mt-work-search"><Search size={17}/><input aria-label="Search employees" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search employee or role"/></label>
  {items.length?items.map(e=>{
   const hired=s.staff.includes(e.id),owner=T.ownerTeam(s,e.id),p=P.profile(s,e.id),training=!!p.trainingUntil&&p.trainingUntil>(s.ceo?.day??0);
   return <div className="mt-work-person-row" key={e.id}>
    <span className="mt-work-avatar"><UserRound size={17}/></span>
    <button type="button" className="mt-work-person-text" onClick={()=>onEmployee(e.id)}><b>{e.name}</b><small>{e.role} · Skill {Math.round(p.skill)}</small></button>
    <span className="mt-work-person-meta">{owner?owner.brand:training?"Training":hired?"Available":money(recruitmentFee(e))+" hire fee"}</span>
    {hired?<button aria-label={"View "+e.name} onClick={()=>onEmployee(e.id)} className="mt-work-row-next"><ChevronRight size={17}/></button>:
     <Button size="sm" disabled={!canHire(s,e.id)} onClick={()=>act((d,fx)=>K.hire(d,fx,e.id))}>Hire</Button>}
   </div>;
  }):<div className="mt-work-empty"><Search size={24}/><b>No employees found</b><p>{filter==="available"?"Use Recruit to review this week’s applicants or release an idle employee from a client.":"Change your filter or wait for the next in-game week."}</p></div>}
 </div>;
}
export function ClientTeamBoard(){
 const s=useGame(x=>x),teams=s.ceo?.clientTeams??[],active=teams.filter(t=>t.status!=="released");
 const [section,setSection]=useState<"teams"|"pool">("teams");
 const [teamId,setTeamId]=useState<string|null>(null),[personId,setPersonId]=useState<string|null>(null),[deliveryId,setDeliveryId]=useState<string|null>(null);
 const team=active.find(t=>t.id===teamId);
 const assigned=new Set(active.flatMap(t=>t.memberIds));
 const alerts=active.filter(t=>["critical","attention","needs-staff"].includes(T.teamNeeds(s,t).status)).length;
 const change=(section:"teams"|"pool")=>{setSection(section);setTeamId(null);setPersonId(null);setDeliveryId(null);};
 return <div className="mt-workforce">
  <header className="mt-work-header"><div><small>AGENCY / PEOPLE & DELIVERY</small><h2>Workforce</h2><p>One client, one dedicated team. Manage staffing decisions without micromanaging every task.</p></div><Users size={23}/></header>
  <div className="mt-work-metrics">
   <span><b>{active.length}</b><small>Client teams</small></span>
   <span><b>{T.talentPool(s).length}</b><small>Available staff</small></span>
   <span><b>{alerts}</b><small>Teams to review</small></span>
  </div>
  <div className="mt-work-filter" role="tablist" aria-label="Workforce sections">
   <button type="button" role="tab" aria-selected={section==="teams"} className={section==="teams"?"active":""} onClick={()=>change("teams")}>Client teams</button>
   <button type="button" role="tab" aria-selected={section==="pool"} className={section==="pool"?"active":""} onClick={()=>change("pool")}>Talent pool</button>
  </div>
  {personId?<EmployeeDetail key={personId} id={personId} onBack={()=>setPersonId(null)} onTeam={id=>{setPersonId(null);setTeamId(id);setSection("teams");}}/>:
   deliveryId&&team?<CampaignDelivery key={deliveryId} team={team} projectId={deliveryId} onBack={()=>setDeliveryId(null)}/>:
   team&&section==="teams"?<TeamDetail key={team.id} team={team} onBack={()=>setTeamId(null)} onEmployee={setPersonId} onDelivery={setDeliveryId} onRecruit={()=>change("pool")}/>:
   section==="pool"?<TalentPool onEmployee={setPersonId}/>:
   <TeamOverview teams={teams} onTeam={setTeamId} onPool={()=>change("pool")}/>}
  <div className="mt-work-footnote"><BriefcaseBusiness size={14}/> Staff can belong to only one active client team. Payroll, training, campaign deadlines and task progress still use the existing game engine.</div>
 </div>;
}
