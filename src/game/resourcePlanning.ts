/** Agency Resource Planning V6: pure, read-only what-if forecasts.
 * Never advances the clock, charges money, recruits, or changes a saved client squad.
 * Estimates use existing task prerequisites, staffed roles and staffRate; actual CEO
 * simulation remains the source of truth for payroll, delivery and KPI.
 */
import {employeeById} from "./data";
import {currentOffice} from "./city";
import {ownerTeam,talentPool,teamForProject} from "./clientTeams";
import {eligibleForRole,effectiveCapacity,primaryRole,staffRate,taskFit,talentStats,TALENT_FOR_ROLE,TALENT_FUNCTIONS} from "./personnel";
import {quotedSalary,RECRUITMENT_CHANNELS} from "./recruitment";
import type {GameState,Task,Project,TalentFunction,RecruitmentChannel} from "./state";

export type PlannerAction="baseline"|"recruit"|"outsource"|"reallocate"|"upskill";
export type PaidChannel=Exclude<RecruitmentChannel,"organic">;
export interface PlannerChoice {kind:PlannerAction;teamId:string;employeeId?:string;taskKey?:string;projectId?:string;channel?:PaidChannel}
export interface ResourceForecast {
 kind:PlannerAction;teamId:string;cost30:number;upfront:number;monthly:number;
 completionDay:number|null;deadlineDaysLate:number|null;completedTasks:number;totalTasks:number;
 unblockedDays:number;timeline:string;assumptions:string[];targetRole:string;
}
export interface ResourceAdvice {
 teamId:string;brand:string;role:"creative";focus:TalentFunction;missing:boolean;
 pendingTasks:Task[];priorityTask:Task|null;priorityProjectId:string|null;pool:string[];transfer:string[];upskill:string[];
 bestReallocate:string|null;bestUpskill:string|null;hasDesk:boolean;
}
const HORIZON=84;
function unfinished(p:Project){return p.tasks.filter(t=>t.status!=="completed");}
export const daysToApplicants=(s:GameState)=>7-((Math.max(1,s.clock.day)-1)%7);
/** Supply/demand is in task-effort units over four weeks, not headcount. */
export function resourceOverview(s:GameState){
 const active=s.ceo?.projects.filter(p=>p.status==="active")??[];
 const demand=Object.fromEntries(TALENT_FUNCTIONS.map(fn=>[fn.id,0])) as Record<TalentFunction,number>;
 const supply=Object.fromEntries(TALENT_FUNCTIONS.map(fn=>[fn.id,0])) as Record<TalentFunction,number>;
 for(const p of active){
  const days=Math.min(28,Math.max(1,p.duration-p.days));
  for(const task of unfinished(p))if(!task.outsourced){
   const f=TALENT_FOR_ROLE[task.role];
   if(f)demand[f]+=Math.max(0,task.effort-task.progress);
  }
  const squad=teamForProject(s,p);
  if(!squad)continue;
  const projectsSharing=s.ceo?.projects.filter(x=>x.status==="active"&&x.teamId===squad.id).length??1;
  for(const id of squad.memberIds){
   if(effectiveCapacity(s,id)===0)continue;
   const fn=TALENT_FOR_ROLE[primaryRole(id)??""];
   if(!fn)continue;
   // Two slots are concurrency, not a 2x multiplier on work per day.
   supply[fn]+=days*staffRate(s,id,primaryRole(id)!,1).speed/Math.max(1,projectsSharing);
  }
 }
 const future=s.ceo?.clientTeams?.filter(t=>t.status!=="released")??[];
 return {activeProjects:active.length,availablePool:talentPool(s).length,officeFree:Math.max(0,currentOffice(s).capacity-s.staff.length),
  functions:TALENT_FUNCTIONS.map(fn=>({id:fn.id,label:fn.label,demand:Number(demand[fn.id].toFixed(1)),supply:Number(supply[fn.id].toFixed(1)),
   gap:Number(Math.max(0,demand[fn.id]-supply[fn.id]).toFixed(1)),teamsMissing:future.filter(t=>active.some(p=>p.teamId===t.id&&unfinished(p).some(task=>TALENT_FOR_ROLE[task.role]===fn.id&&!t.memberIds.some(id=>eligibleForRole(id,task.role)&&effectiveCapacity(s,id)>0)))).length}))};
}
export function creativeAdvice(s:GameState,teamId:string):ResourceAdvice|null{
 const team=s.ceo?.clientTeams?.find(t=>t.id===teamId&&t.status!=="released");
 if(!team)return null;
 const active=(s.ceo?.projects??[]).filter(p=>p.status==="active"&&p.teamId===teamId);
 const pending=active.flatMap(p=>p.tasks.filter(t=>t.status!=="completed"&&!t.outsourced&&["creative","production"].includes(t.role)));
 const creative=pending.filter(t=>t.role==="creative");
 // If the Creative concept itself is waiting, a Production-only employee does
 // not solve that bottleneck. Task eligibility remains mandatory, even after training.
 const focusTasks=creative.length?creative:pending;
 const canCover=(id:string)=>focusTasks.some(t=>eligibleForRole(id,t.role));
 const callable=creative.filter(t=>t.status==="assigned"||t.status==="backlog");
 const priorityTask=callable.find(t=>active.some(p=>p.tasks.includes(t)&&t.pre.every(k=>p.tasks.some(x=>x.key===k&&x.status==="completed"))))??callable[0]??null;
 const priorityProjectId=priorityTask?active.find(p=>p.tasks.includes(priorityTask))?.id??null:null;
 const highestFit=(id:string)=>Math.max(...focusTasks.filter(t=>eligibleForRole(id,t.role)).map(t=>taskFit(s,id,t.role,t.key)));
 const pool=talentPool(s).filter(id=>effectiveCapacity(s,id)>0&&canCover(id))
  .sort((a,b)=>highestFit(b)-highestFit(a));
 const transfer=(s.ceo?.clientTeams??[]).filter(t=>t.id!==teamId&&t.status==="active").flatMap(t=>t.memberIds)
  .filter(id=>canCover(id)&&effectiveCapacity(s,id)>0&&!(s.ceo?.projects.some(p=>p.status==="active"&&p.tasks.some(t=>t.employee===id&&t.status==="in_progress"))))
  .sort((a,b)=>highestFit(b)-highestFit(a));
 const upskill=team.memberIds.filter(id=>canCover(id)&&effectiveCapacity(s,id)>0&&talentStats(s,id).cre<94&&
  !(s.ceo?.projects.some(p=>p.status==="active"&&p.tasks.some(t=>t.employee===id&&t.status==="in_progress"))))
  .sort((a,b)=>talentStats(s,b).cre-talentStats(s,a).cre);
 return {teamId,brand:team.brand,role:"creative",focus:"cre",missing:creative.some(t=>!team.memberIds.some(id=>eligibleForRole(id,t.role)&&effectiveCapacity(s,id)>0)),
  pendingTasks:pending,priorityTask,priorityProjectId,pool,transfer,upskill,bestReallocate:pool[0]??transfer[0]??null,bestUpskill:upskill[0]??null,
  hasDesk:s.staff.length<currentOffice(s).capacity};
}
interface SimTask {key:string;role:string;effort:number;progress:number;pre:string[];status:Task["status"];employee:string|null;preferredEmployee?:string|null;outsourced:boolean;reviewDay?:number;doneDay?:number}
interface SimProject {id:string;teamId:string;duration:number;days:number;priority:string;tasks:SimTask[];deadlineDay:number}
function deliverySimulation(s:GameState,choice:PlannerChoice):Pick<ResourceForecast,"completionDay"|"deadlineDaysLate"|"completedTasks"|"totalTasks"|"unblockedDays">{
 const target=s.ceo?.clientTeams?.find(t=>t.id===choice.teamId);
 const projects:SimProject[]=(s.ceo?.projects??[]).filter(p=>p.status==="active"&&p.teamId===choice.teamId).map(p=>({
  id:p.id,teamId:choice.teamId,days:p.days,duration:p.duration,priority:p.priority??"normal",deadlineDay:(s.ceo?.day??s.clock.day)+Math.max(0,p.duration-p.days),
  tasks:p.tasks.map(t=>({...t,pre:[...t.pre]}))
 }));
 if(!target||!projects.length)return {completionDay:null,deadlineDaysLate:null,completedTasks:0,totalTasks:0,unblockedDays:0};
 const now=s.ceo?.day??s.clock.day;
 let members=target.memberIds.slice();
 const transferOwner=choice.employeeId?ownerTeam(s,choice.employeeId):null;
 if(choice.kind==="reallocate"&&choice.employeeId&&(!transferOwner||transferOwner.id!==target.id)){
  // Existing in-progress work is never interrupted; the actionable UI enforces this too.
  const busy=s.ceo?.projects.some(p=>p.status==="active"&&p.tasks.some(t=>t.employee===choice.employeeId&&t.status==="in_progress"));
  if(!busy&&effectiveCapacity(s,choice.employeeId)>0&&projects.some(p=>p.tasks.some(t=>eligibleForRole(choice.employeeId!,t.role))))members.push(choice.employeeId);
 }
 const recruitDay=daysToApplicants(s);
 const synthetic="__planner_virtual_creative__";
 const recruited=choice.kind==="recruit";
 const upskill=choice.kind==="upskill"&&!!choice.employeeId&&members.includes(choice.employeeId);
 const skillLift=choice.employeeId&&upskill?choice.employeeId:null;
 const preferredTask=choice.taskKey??projects.flatMap(p=>p.tasks).find(t=>t.role==="creative"&&t.status!=="completed")?.key;
 const preferredProject=choice.projectId??projects.find(p=>p.tasks.some(t=>t.key===preferredTask&&t.role==="creative"&&t.status!=="completed"))?.id;
 let outsourced=false,firstProgress:number|null=null;
 let finishedDay:number|null=null,overdue:number|null=null;
 for(let offset=1;offset<=HORIZON;offset++){
  const day=now+offset;
  const workers=members.filter(id=>!(upskill&&id===skillLift&&offset<=7));
  const capacity:Record<string,number>={};
  for(const id of workers)capacity[id]=0;
  if(recruited&&offset>=recruitDay)capacity[synthetic]=0;
  // Existing in-progress assignments consume slots before any new tasks are allocated.
  for(const p of projects)for(const t of p.tasks)if(t.status==="in_progress"&&t.employee&&t.employee!=="external"&&capacity[t.employee]!==undefined)capacity[t.employee]++;
  for(const p of projects.sort((a,b)=>Number(b.priority==="high")-Number(a.priority==="high")||a.deadlineDay-b.deadlineDay)){
   for(const t of p.tasks){
    if(t.status==="completed")continue;
    if(t.status==="review"){
     if(day>(t.reviewDay??now)){t.status="completed";t.doneDay=day;}
     continue;
    }
    if(t.status==="backlog"&&t.pre.every(k=>p.tasks.some(prev=>prev.key===k&&prev.status==="completed")))t.status="assigned";
    if(t.status==="assigned"&&choice.kind==="outsource"&&!outsourced&&t.key===preferredTask&&t.role==="creative"&&p.id===preferredProject){
     t.status="in_progress";t.employee="external";t.outsourced=true;outsourced=true;
    }
    if(t.status==="assigned"){
     const eligible=workers.filter(id=>eligibleForRole(id,t.role)&&(capacity[id]??0)<effectiveCapacity(s,id));
     if(recruited&&offset>=recruitDay&&t.role==="creative"&&capacity[synthetic]<2)eligible.push(synthetic);
     eligible.sort((a,b)=>{
      const score=(id:string)=>(id===synthetic?84:taskFit(s,id,t.role,t.key))+(id!==synthetic&&primaryRole(id)===t.role?15:0)-(capacity[id]??0)*15;
      return score(b)-score(a);
     });
     const chosen=t.preferredEmployee?eligible.find(id=>id===t.preferredEmployee):eligible[0];
     if(chosen){t.status="in_progress";t.employee=chosen;capacity[chosen]=(capacity[chosen]??0)+1;}
    }
    if(t.status==="in_progress"){
     const id=t.employee;
     if(!id)continue;
     if(upskill&&id===skillLift&&offset<=7)continue;
     const load=id==="external"?1:Math.max(1,capacity[id]??1);
     let speed=id==="external"?1.08:id===synthetic?1.11:staffRate(s,id,t.role,load,t.key).speed;
     if(upskill&&id===skillLift&&offset>7&&["creative","production"].includes(t.role))speed=Math.min(1.55,speed+.07);
     if(t.progress===0&&firstProgress===null&&t.role==="creative")firstProgress=offset;
     t.progress=Math.min(t.effort,t.progress+speed);
     if(t.progress>=t.effort){t.status="review";t.reviewDay=day;}
    }
   }
  }
  if(projects.every(p=>p.tasks.every(t=>t.status==="completed"))){
   finishedDay=day;overdue=Math.max(0,...projects.map(p=>day-p.deadlineDay));break;
  }
 }
 const all=projects.flatMap(p=>p.tasks);
 return {completionDay:finishedDay,deadlineDaysLate:finishedDay===null?null:overdue,
  completedTasks:all.filter(t=>t.status==="completed").length,totalTasks:all.length,unblockedDays:firstProgress??0};
}
export function forecastChoice(s:GameState,choice:PlannerChoice):ResourceForecast{
 const advice=creativeAdvice(s,choice.teamId);
 const channel=RECRUITMENT_CHANNELS.find(c=>c.id===(choice.channel??"journal"))??RECRUITMENT_CHANNELS[2];
 // Representative competent specialist; real applicants still vary and may never match.
 const salary=quotedSalary(86),onboarding=Math.round(salary*.3/10000)*10000;
 const direct=choice.kind==="outsource"&&advice?.priorityTask?
  Math.round(advice.priorityTask.cost*2.1*((s.ceo?.projects.find(p=>p.teamId===choice.teamId&&p.tasks.includes(advice.priorityTask!))?.scope??8)/8)):0;
 const trainingSalary=choice.employeeId?employeeById(choice.employeeId)?.salary??0:0;
 const upfront=choice.kind==="recruit"?channel.fee+onboarding:choice.kind==="outsource"?direct:
  choice.kind==="upskill"?Math.round(trainingSalary*.35):0;
 const monthly=choice.kind==="recruit"?salary:0;
 const sim=deliverySimulation(s,choice);
 const risks:string[]=choice.kind==="recruit"?[
  "Assumes a qualified Creative applicant is found and hired at the next weekly refresh.",
  "One paid campaign per week; role targeting improves supply but does not guarantee expertise.",
  "Requires a free office desk and an active client team."]:choice.kind==="outsource"?[
  "Only the selected Creative task is outsourced; prerequisites must finish first.",
  "External execution does not increase agency headcount."]:choice.kind==="reallocate"?[
  "Staff transfer cannot interrupt in-progress tasks; source team may lose future capacity."]:choice.kind==="upskill"?[
  "Seven-day training makes the specialist unavailable and adds +9 CRE after completion."]:[
  "No action taken; current dedicated client team and task prerequisites remain unchanged."];
 return {...sim,kind:choice.kind,teamId:choice.teamId,upfront,monthly,
  cost30:upfront+monthly,assumptions:risks,targetRole:"creative",
  timeline:sim.completionDay===null?"Blocked or exceeds 84-day planning horizon":sim.deadlineDaysLate!>0?("Late by "+sim.deadlineDaysLate+"d"):("Projected delivery Day "+sim.completionDay)};
}
export function compareCreativeOptions(s:GameState,teamId:string,channel:PaidChannel="journal"){
 const advice=creativeAdvice(s,teamId);
 if(!advice)return null;
 const base=forecastChoice(s,{kind:"baseline",teamId});
 const alternatives:ResourceForecast[]=[
  forecastChoice(s,{kind:"recruit",teamId,channel}),
  forecastChoice(s,{kind:"outsource",teamId,taskKey:advice.priorityTask?.key,projectId:advice.priorityProjectId??undefined}),
  forecastChoice(s,{kind:"reallocate",teamId,employeeId:advice.bestReallocate??undefined}),
  forecastChoice(s,{kind:"upskill",teamId,employeeId:advice.bestUpskill??undefined})
 ];
 return {advice,baseline:base,alternatives:alternatives.map(f=>({
  ...f,daysSaved:base.completionDay!==null&&f.completionDay!==null?base.completionDay-f.completionDay:null,
  viable:f.kind==="recruit"?advice.hasDesk&&creativeAdvice(s,teamId)!.pendingTasks.some(t=>t.role==="creative"):
   f.kind==="outsource"?!!advice.priorityTask:
   f.kind==="reallocate"?!!advice.bestReallocate:
   f.kind==="upskill"?!!advice.bestUpskill:false
 }))};
}
