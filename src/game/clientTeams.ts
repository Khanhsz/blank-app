/** Agency V3: exclusive client squads. A staff member belongs to at most ONE
 * non-released client team, regardless of their task capacity.
 *
 * Project tasks retain the existing CEO economics, prerequisites and weekly clock.
 */
import {ceoTaskDefs,employeeById,clamp} from "./data";
import {eligibleForRole,employeeReadiness,effectiveCapacity,primaryRole,taskFit,talentStats,TALENT_FUNCTIONS,TALENT_FOR_ROLE} from "./personnel";
import type {ClientTeam,GameState,Project,Task,TalentFunction} from "./state";
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
/** Workforce planning is a pure, deterministic layer above the existing game.
 * Recommendations never assign members of another client's dedicated team.
 */
export const WORKFORCE_GROUPS=[
 {id:"client",label:"Account & Operations",roles:["account","operations"]},
 {id:"planning",label:"Research & Strategy",roles:["research","strategy"]},
 {id:"studio",label:"Creative & Production",roles:["creative","production"]},
 {id:"growth",label:"Media & Analytics",roles:["media","kol","analytics"]},
] as const;
/** Visible function coverage based on real staffed talent; one specialist still
 * cannot serve two separate clients simultaneously.
 */
export function functionCoverage(s:GameState,team:ClientTeam){
 return TALENT_FUNCTIONS.map(fn=>{
  const ids=team.memberIds.filter(id=>effectiveCapacity(s,id)>0&&TALENT_FOR_ROLE[primaryRole(id)??""]===fn.id);
  const strong=ids.length?Math.max(...ids.map(id=>talentStats(s,id)[fn.id])):0;
  return {id:fn.id as TalentFunction,label:fn.label,score:strong,staffed:ids.length,weak:!ids.length||strong<55};
 });
}
export function projectProgress(p:Project):number{
 const max=p.tasks.reduce((v,t)=>v+t.effort,0);
 if(!max)return 100;
 const progress=p.tasks.reduce((v,t)=>v+(t.status==="completed"?t.effort:t.status==="review"?t.effort*.95:Math.min(t.effort,t.progress)),0);
 return Math.round(100*progress/max);
}
export function teamNeeds(s:GameState,team:ClientTeam){
 const projects=(s.ceo?.projects??[]).filter(p=>p.teamId===team.id&&p.status==="active");
 const pending=projects.flatMap(p=>p.tasks.filter(t=>t.status!=="completed"&&!t.outsourced));
 const required=[...new Set(pending.map(t=>t.role))];
 const busy:Record<string,number>={};
 for(const p of (s.ceo?.projects??[]).filter(p=>p.status==="active"))for(const t of p.tasks){
  if(t.status==="in_progress"&&t.employee&&t.employee!=="external")busy[t.employee]=(busy[t.employee]??0)+1;
 }
 const canCover=(id:string,role:string)=>eligibleForRole(id,role)&&effectiveCapacity(s,id)>0;
 const missing=required.filter(role=>!team.memberIds.some(id=>canCover(id,role)));
 const overloaded=team.memberIds.filter(id=>{
  const fatigue=s.personnel[id]?.fatigue??0;
  return fatigue>=72||(busy[id]??0)>effectiveCapacity(s,id);
 });
 const unavailable=team.memberIds.filter(id=>effectiveCapacity(s,id)===0);
 const remaining=projects.length?Math.min(...projects.map(p=>Math.max(0,p.duration-p.days))):null;
 const capabilities=functionCoverage(s,team);
 const requiredFunctions=new Set(required.map(role=>TALENT_FOR_ROLE[role]));
 const weakFunctions=capabilities.filter(g=>requiredFunctions.has(g.id)&&g.weak);
 const warnings:string[]=[];
 if(missing.length)warnings.push(missing.length+" uncovered workstream"+(missing.length>1?"s":""));
 if(weakFunctions.length)warnings.push("Weak "+weakFunctions.map(g=>g.id.toUpperCase()).join(" / ")+" coverage");
 if(overloaded.length)warnings.push(overloaded.length+" overworked specialist"+(overloaded.length>1?"s":""));
 if(unavailable.length)warnings.push(unavailable.length+" unavailable specialist"+(unavailable.length>1?"s":""));
 if(remaining!==null&&remaining<=7&&pending.length)warnings.push("Deadline in "+remaining+" days");
 const status=team.status==="closing"?"completed":
  missing.length&&remaining!==null&&remaining<=7?"critical":team.status==="forming"?"needs-staff":
  missing.length||weakFunctions.length||overloaded.length||unavailable.length?"attention":"on-track";
 return {projects,pending,required,missing,busy,overloaded,unavailable,remaining,warnings,status,capabilities,weakFunctions};
}
export function staffingPlan(s:GameState,team:ClientTeam){
 const needs=teamNeeds(s,team);
 const wanted=new Set(needs.missing);
 const absentGroups=WORKFORCE_GROUPS.filter(g=>!team.memberIds.some(id=>g.roles.some(role=>eligibleForRole(id,role)&&effectiveCapacity(s,id)>0)));
 const ranked=talentPool(s).filter(id=>effectiveCapacity(s,id)>0).map(id=>{
  const relevant=needs.missing.filter(role=>eligibleForRole(id,role));
  const groups=absentGroups.filter(g=>g.roles.some(role=>eligibleForRole(id,role)));
  const fits=needs.pending.filter(t=>eligibleForRole(id,t.role)).map(t=>taskFit(s,id,t.role,t.key));
  const improvement=needs.weakFunctions.reduce((sum,f)=>{
   const v=talentStats(s,id)[f.id];return sum+(TALENT_FOR_ROLE[primaryRole(id)??""]===f.id?Math.max(0,v-f.score)*.9:0);
  },0);
  const leadBonus=team.leadId===null&&primaryRole(id)==="account"?30:0;
  const readiness=employeeReadiness(s,id),fatigue=s.personnel[id]?.fatigue??0;
  return {id,roles:relevant,groups:groups.map(g=>g.label),fit:fits.length?Math.round(Math.max(...fits)):0,
   score:relevant.length*110+groups.length*40+improvement+leadBonus+readiness*.24-fatigue*.3+(fits.length?Math.max(...fits)*.4:0)};
 }).filter(x=>x.roles.length||x.groups.length||x.fit>0&&needs.weakFunctions.some(f=>TALENT_FOR_ROLE[primaryRole(x.id)??""]===f.id))
  .sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id));
 const unavailablePool=talentPool(s).filter(id=>effectiveCapacity(s,id)===0);
 const recruitment=[...wanted].flatMap(role=>ceoTaskDefs.filter(t=>t.role===role)).map(t=>t.role);
 return {needs,ranked,unavailablePool,recruitment:[...new Set(recruitment)],next:ranked[0]??null,
  hint:ranked[0]?"Assign "+(employeeById(ranked[0].id)?.name??"available specialist")+" (best task fit "+ranked[0].fit+"/100) to strengthen "+
    (ranked[0].roles[0]??ranked[0].groups[0]??"team delivery")+".":needs.missing.length?"Recruit, upskill or outsource "+needs.missing[0]+" work.":
    needs.weakFunctions.length?"Upskill or recruit stronger "+needs.weakFunctions.map(f=>f.id.toUpperCase()).join(" / ")+" coverage.":"Your dedicated team covers current project work."};
}
export function autoAssembleTeam(s:GameState,fx:Fx,teamId:string){
 const team=s.ceo?.clientTeams?.find(t=>t.id===teamId);
 if(!team||team.status==="released"||team.status==="closing")return;
 let allocated=0;
 while(team.memberIds.length<TEAM_SIZE_TARGET){
  const suggestion=staffingPlan(s,team).next;
  if(!suggestion)break;
  joinClientTeam(s,fx,teamId,suggestion.id);
  allocated++;
 }
 if(!allocated)fx.toast("No eligible unassigned specialists. Recruit, train, or outsource critical work.");
}
export function teamCoverage(s:GameState,team:ClientTeam){
 const taskRoles=[...new Set(ceoTaskDefs.map(x=>x.role))];
 const staffed=taskRoles.filter(r=>team.memberIds.some(id=>eligibleForRole(id,r)&&effectiveCapacity(s,id)>0));
 const missing=taskRoles.filter(r=>!staffed.includes(r));
 const ready=team.memberIds.filter(id=>effectiveCapacity(s,id)>0).length;
 const sum=team.memberIds.reduce((v,id)=>v+employeeReadiness(s,id),0);
 const functions=functionCoverage(s,team);
 return {staffed,missing,ready,readiness:team.memberIds.length?Math.round(sum/team.memberIds.length):0,
  coverage:Math.round(100*staffed.length/taskRoles.length),functions};
}
export function canRunTask(s:GameState,p:Project,t:Task,employeeId:string){
 const team=teamForProject(s,p);
 return !!team&&team.status==="active"&&team.memberIds.includes(employeeId)&&
  s.staff.includes(employeeId)&&eligibleForRole(employeeId,t.role)&&effectiveCapacity(s,employeeId)>0;
}
