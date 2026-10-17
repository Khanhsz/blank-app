/** Agency V3: exclusive client squads. A staff member belongs to at most ONE
 * non-released client team, regardless of their task capacity.
 *
 * Project tasks retain the existing CEO economics, prerequisites and weekly clock.
 */
import {ceoTaskDefs,employeeById,clamp} from "./data";
import {eligibleForRole,employeeReadiness,effectiveCapacity,primaryRole} from "./personnel";
import type {ClientTeam,GameState,Project,Task} from "./state";
import type {Fx} from "./store";

export const TEAM_SIZE_TARGET=6;
export const TEAM_ROLES=[
 {id:"account",label:"Client Lead",note:"Brief, scope, stakeholder communication"},
 {id:"strategy",label:"Planning Lead",note:"Research, insight and strategic planning"},
 {id:"creative",label:"Creative Lead",note:"Big Idea, content and production"},
 {id:"media",label:"Media Lead",note:"Distribution, creator buying and analytics"},
] as const;
export const clientKey=(brand:string)=>brand.trim().normalize("NFKD").toLowerCase().replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")||"unknown-client";
export const teamIdFor=(brand:string)=>"squad-"+clientKey(brand);
export const teamForProject=(s:GameState,p:Project)=>s.ceo?.clientTeams?.find(t=>t.id===p.teamId)??null;
export const ownerTeam=(s:GameState,employeeId:string)=>s.ceo?.clientTeams?.find(t=>t.status!=="released"&&t.memberIds.includes(employeeId))??null;
export const talentPool=(s:GameState)=>s.staff.filter(id=>!ownerTeam(s,id));

function makeTeam(p:Project,day:number):ClientTeam{
 return {id:teamIdFor(p.brand),clientId:clientKey(p.brand),brand:p.brand,memberIds:[],projectIds:[],leadId:null,status:"forming",createdDay:day};
}
/** Repair old saves and remove cross-client active assignments without losing progress.
 * Earlier-started projects take precedence; if a staff member was serving two
 * clients, the later client's unfinished task returns to the staffing queue.
 */
export function reconcileClientTeams(s:GameState){
 const c=s.ceo;if(!c||!s.agencyUnlocked)return;
 const migrating=!Array.isArray(c.clientTeams)||c.clientTeams.length===0;
 c.clientTeams??=[];
 const all=c.clientTeams;
 const active=c.projects.filter(p=>p.status==="active").sort((a,b)=>a.startedDay-b.startedDay||a.id.localeCompare(b.id));
 for(const p of active){
  const id=teamIdFor(p.brand);
  let team=all.find(t=>t.id===id);
  if(!team){team=makeTeam(p,c.day);all.push(team);}
  if(team.status==="released"){team.status="forming";team.memberIds=[];team.leadId=null;}
  p.teamId=id;
  if(!team.projectIds.includes(p.id))team.projectIds.push(p.id);
 }
 // Migrating a save without squads: preserve staffed work wherever possible.
 const owner=new Map<string,string>();
 for(const team of all){
  if(team.status==="released")continue;
  team.memberIds=team.memberIds.filter(id=>{
   if(!s.staff.includes(id)||owner.has(id))return false;
   owner.set(id,team.id);return true;
  });
 }
 if(migrating)for(const p of active){
  const team=teamForProject(s,p)!;
  for(const t of p.tasks){
   const employee=t.employee;
   if(employee&&s.staff.includes(employee)&&!owner.has(employee)){
    team.memberIds.push(employee);owner.set(employee,team.id);
   }
  }
 }
 for(const p of active){
  const team=teamForProject(s,p)!;
  for(const t of p.tasks){
   if(t.preferredEmployee&&!team.memberIds.includes(t.preferredEmployee))t.preferredEmployee=null;
   if(t.employee&&s.staff.includes(t.employee)&&!team.memberIds.includes(t.employee)&&t.status==="in_progress"){
    t.status="assigned";t.employee=null;t.startedDay=undefined;
   }
  }
 }
 for(const team of all){
  if(team.status==="released")continue;
  team.projectIds=team.projectIds.filter(pid=>c.projects.some(p=>p.id===pid));
  const isActive=team.projectIds.some(pid=>c.projects.some(p=>p.id===pid&&p.status==="active"));
  if(!isActive)team.status="closing";
  else team.status=team.memberIds.length?"active":"forming";
  if(team.leadId&&!team.memberIds.includes(team.leadId))team.leadId=null;
 }
}
export function startClientTeam(s:GameState,p:Project):ClientTeam{
 if(!s.ceo)throw Error("CEO required for a client team");
 s.ceo.clientTeams??=[];
 const id=teamIdFor(p.brand);
 let team=s.ceo.clientTeams.find(t=>t.id===id);
 if(!team){team=makeTeam(p,s.ceo.day);s.ceo.clientTeams.push(team);}
 if(team.status==="released"){team.status="forming";team.memberIds=[];team.leadId=null;}
 if(!team.projectIds.includes(p.id))team.projectIds.push(p.id);
 p.teamId=team.id;
 if(team.status==="closing")team.status=team.memberIds.length?"active":"forming";
 return team;
}
export function joinClientTeam(s:GameState,fx:Fx,teamId:string,employeeId:string){
 const team=s.ceo?.clientTeams?.find(t=>t.id===teamId);
 if(!team||team.status==="released"||team.status==="closing"||!s.staff.includes(employeeId))return;
 if(team.memberIds.includes(employeeId))return;
 const other=ownerTeam(s,employeeId);
 if(other)return fx.toast(employeeById(employeeId)?.name+" is dedicated to "+other.brand+". Release or transfer first.");
 team.memberIds.push(employeeId);team.status="active";
 if(!team.leadId)team.leadId=employeeId;
 fx.log(employeeById(employeeId)?.name+" joined dedicated client team "+team.brand);
}
export function leaveClientTeam(s:GameState,fx:Fx,teamId:string,employeeId:string){
 const team=s.ceo?.clientTeams?.find(t=>t.id===teamId);
 if(!team||!team.memberIds.includes(employeeId))return;
 const active=s.ceo?.projects.some(p=>p.status==="active"&&p.teamId===teamId&&p.tasks.some(t=>t.employee===employeeId&&t.status==="in_progress"));
 if(active)return fx.toast("Finish the in-progress assignment before releasing this member.");
 team.memberIds=team.memberIds.filter(id=>id!==employeeId);
 if(team.leadId===employeeId)team.leadId=team.memberIds[0]??null;
 for(const p of s.ceo?.projects??[])if(p.teamId===teamId&&p.status==="active"){
  for(const t of p.tasks)if(t.preferredEmployee===employeeId)t.preferredEmployee=null;
 }
 if(!team.memberIds.length&&team.status==="active")team.status="forming";
 fx.log(employeeById(employeeId)?.name+" returned to the talent pool from "+team.brand);
}
export function changeClientLead(s:GameState,fx:Fx,teamId:string,employeeId:string){
 const team=s.ceo?.clientTeams?.find(t=>t.id===teamId);
 if(!team||!team.memberIds.includes(employeeId))return;
 team.leadId=employeeId;
 fx.log(employeeById(employeeId)?.name+" is now client lead for "+team.brand);
}
export function releaseClientTeam(s:GameState,fx:Fx,teamId:string){
 const team=s.ceo?.clientTeams?.find(t=>t.id===teamId);
 if(!team||team.status==="released")return;
 if(s.ceo?.projects.some(p=>p.status==="active"&&p.teamId===teamId))return fx.toast("Finish all active campaigns for this client before releasing the team.");
 const n=team.memberIds.length;
 team.memberIds=[];team.leadId=null;team.status="released";
 fx.log("Released "+n+" team members from "+team.brand+" to the talent pool");
}
export function transferClientMember(s:GameState,fx:Fx,fromId:string,toId:string,employeeId:string){
 if(fromId===toId)return;
 const from=s.ceo?.clientTeams?.find(t=>t.id===fromId);
 const to=s.ceo?.clientTeams?.find(t=>t.id===toId);
 if(!from||!to||!from.memberIds.includes(employeeId)||to.status==="released"||to.status==="closing")return;
 const busy=s.ceo?.projects.some(p=>p.status==="active"&&p.teamId===fromId&&p.tasks.some(t=>t.employee===employeeId&&t.status==="in_progress"));
 if(busy)return fx.toast("Finish in-progress work before a client-to-client handover.");
 leaveClientTeam(s,fx,fromId,employeeId);
 joinClientTeam(s,fx,toId,employeeId);
}
export function autoAssembleTeam(s:GameState,fx:Fx,teamId:string){
 const team=s.ceo?.clientTeams?.find(t=>t.id===teamId);
 if(!team||team.status==="released"||team.status==="closing")return;
 const outstanding=new Set(ceoTaskDefs.map(t=>t.role));
 while(team.memberIds.length<TEAM_SIZE_TARGET){
  const pool=talentPool(s).filter(id=>effectiveCapacity(s,id)>0);
  if(!pool.length)break;
  const candidates=pool.map(id=>{
   const covers=[...outstanding].filter(role=>eligibleForRole(id,role));
   const specialist=primaryRole(id);
   const roleBoost=TEAM_ROLES.some(r=>r.id===specialist)?2:0;
   return{id,covers,score:covers.length*50+roleBoost+employeeReadiness(s,id)*.18};
  }).sort((a,b)=>b.score-a.score);
  const best=candidates[0];
  if(!best||!best.covers.length)break;
  joinClientTeam(s,fx,team.id,best.id);
  for(const role of best.covers)outstanding.delete(role);
  if(!outstanding.size)break;
 }
 if(!team.memberIds.length)fx.toast("No unassigned employees. Recruit staff or resolve an existing client team's capacity.");
}
export function teamCoverage(s:GameState,team:ClientTeam){
 const taskRoles=[...new Set(ceoTaskDefs.map(x=>x.role))];
 const staffed=taskRoles.filter(r=>team.memberIds.some(id=>eligibleForRole(id,r)&&effectiveCapacity(s,id)>0));
 const missing=taskRoles.filter(r=>!staffed.includes(r));
 const ready=team.memberIds.filter(id=>effectiveCapacity(s,id)>0).length;
 const sum=team.memberIds.reduce((v,id)=>v+employeeReadiness(s,id),0);
 return {staffed,missing,ready,readiness:team.memberIds.length?Math.round(sum/team.memberIds.length):0,
  coverage:Math.round(100*staffed.length/taskRoles.length)};
}
export function canRunTask(s:GameState,p:Project,t:Task,employeeId:string){
 const team=teamForProject(s,p);
 return !!team&&team.status==="active"&&team.memberIds.includes(employeeId)&&
  s.staff.includes(employeeId)&&eligibleForRole(employeeId,t.role)&&effectiveCapacity(s,employeeId)>0;
}
