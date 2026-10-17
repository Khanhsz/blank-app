/** Staff V2: deterministic, persistent human-capital simulation.
 * The existing CEO project/task engine remains the single source of project truth.
 */
import {ceoTalent,clamp,employees,employeeById,money} from "./data";
import type {Fx} from "./store";
import type {GameState,PersonnelProfile,WorkStyle,Task} from "./state";
import type {FunctionId} from "./functions";

export const ROLE_IDS=["account","research","strategy","creative","production","media","kol","analytics","operations"] as const;
export const FUNCTION_FOR_ROLE:Record<string,FunctionId>={account:"account",research:"research",strategy:"strategy",creative:"creative",production:"production",media:"media",kol:"media",analytics:"data",operations:"operations"};
const BACKUP_ROLES:Record<string,string[]>={account:["operations"],research:["strategy"],strategy:["research"],creative:["production"],production:["creative","kol"],media:["analytics"],kol:["production"],analytics:["media"],operations:["account","analytics"]};
export function primaryRole(id:string):string|null{
 const candidate=employeeById(id);
 if(!candidate)return null;
 return candidate.specialty??Object.entries(ceoTalent).find(([,staffId])=>staffId===id)?.[0]??null;
}
export function specialistCandidates(role:string):string[]{
 return employees.filter(e=>primaryRole(e.id)===role).map(e=>e.id);
}
export function eligibleForRole(id:string,role:string):boolean{
 const assigned=primaryRole(id);
 return !!assigned&&(assigned===role||BACKUP_ROLES[role]?.includes(assigned));
}
export function candidatesForRole(role:string):string[]{
 return employees.filter(e=>eligibleForRole(e.id,role)).sort((a,b)=>Number(primaryRole(b.id)===role)-Number(primaryRole(a.id)===role)).map(e=>e.id);
}
export function defaultProfile(id:string):PersonnelProfile{
 const e=employeeById(id);
 return {skill:e?.startingSkill??64,morale:78,fatigue:0,xp:0,focus:"balanced"};
}
export function profile(s:GameState,id:string):PersonnelProfile{
 return s.personnel[id]??defaultProfile(id);
}
export function effectiveCapacity(s:GameState,id:string):number{
 const p=profile(s,id);
 if(p.trainingUntil!==undefined&&p.trainingUntil>(s.ceo?.day??s.clock.day))return 0;
 return p.focus==="quality"?1:2;
}
export function employeeReadiness(s:GameState,id:string):number{
 const p=profile(s,id);
 return Math.round(clamp(p.skill*.55+p.morale*.35+(100-p.fatigue)*.10,0,100));
}
export function leadFor(s:GameState,role:string):string|null{
 const id=s.teamLeads[FUNCTION_FOR_ROLE[role]??role];
 return id&&s.staff.includes(id)&&primaryRole(id)===role?id:null;
}
export function staffRate(s:GameState,id:string,role:string,load:number):{speed:number;quality:number}{
 if(id==="external")return {speed:1.07,quality:0};
 const p=profile(s,id),primary=primaryRole(id)===role;
 const skills=primary?1:0.72;
 const skill=clamp((p.skill-64)/100,-0.35,0.36);
 const fatigue=clamp(p.fatigue/100,0,1);
 const morale=(p.morale-75)/250;
 const lead=leadFor(s,role);
 const mentorship=lead&&lead!==id?0.065:lead===id?0.085:0;
 const focusSpeed=p.focus==="speed"?0.18:p.focus==="quality"?-0.13:0;
 const focusQuality=p.focus==="quality"?8:p.focus==="speed"?-5:0;
 const speed=clamp((.91+skill+morale+mentorship+focusSpeed)*skills*(1-fatigue*.32)/(load>1?1.25:1),.32,1.55);
 const quality=skill*24+morale*18+mentorship*45+focusQuality-fatigue*.2+(primary?2:-6);
 return {speed,quality};
}
export function updatePersonnelDay(s:GameState){
 if(!s.ceo)return;
 const day=s.ceo.day;
 const busy:Record<string,number>={};
 for(const p of s.ceo.projects.filter(p=>p.status==="active"))for(const t of p.tasks){
  if(t.status==="in_progress"&&t.employee&&s.staff.includes(t.employee))busy[t.employee]=(busy[t.employee]??0)+1;
 }
 for(const id of s.staff){
  const p=s.personnel[id]??(s.personnel[id]=defaultProfile(id));
  if(p.trainingUntil!==undefined&&day>=p.trainingUntil){
   p.skill=clamp(p.skill+(p.pendingSkill??8),20,100);p.morale=clamp(p.morale+4,0,100);
   delete p.trainingUntil;delete p.pendingSkill;
  }
  const n=busy[id]??0;
  p.fatigue=clamp(p.fatigue+(n>=2?2.4:n===1?0.8:-2.6),0,100);
  p.morale=clamp(p.morale+(n>=2?-0.55:n===1?-0.08:+.24),20,100);
 }
}
export function recordDelivery(s:GameState,task:Task){
 if(!task.employee||!s.staff.includes(task.employee))return;
 const p=s.personnel[task.employee]??(s.personnel[task.employee]=defaultProfile(task.employee));
 p.xp+=4;
 if(p.xp>=20){p.xp-=20;p.skill=clamp(p.skill+2,20,100);}
 p.morale=clamp(p.morale+(task.quality>=80?2:task.quality<60?-2:1),20,100);
}
export function setWorkStyle(s:GameState,fx:Fx,id:string,style:WorkStyle){
 const c=s.ceo;if(!c||!s.staff.includes(id)||!["balanced","speed","quality"].includes(style))return;
 const p=s.personnel[id]??(s.personnel[id]=defaultProfile(id));
 if(p.lastFocusWeek===s.clock.week){fx.toast("Work style can be changed once per week.");return;}
 if(style==="quality"&&c.projects.some(pr=>pr.status==="active"&&pr.tasks.filter(t=>t.status==="in_progress"&&t.employee===id).length>1)){
  fx.toast("Finish or reassign a task before reducing capacity to one slot.");return;
 }
 p.focus=style;p.lastFocusWeek=s.clock.week;
 fx.log(employeeById(id)?.name+" switched to "+style+" delivery focus");
}
export function train(s:GameState,fx:Fx,id:string){
 const c=s.ceo,e=employeeById(id);
 if(!c||!e||!s.staff.includes(id))return;
 const p=s.personnel[id]??(s.personnel[id]=defaultProfile(id));
 if(p.trainingUntil&&p.trainingUntil>c.day)return fx.toast("Training is already underway.");
 if(c.projects.some(pr=>pr.status==="active"&&pr.tasks.some(t=>t.employee===id&&t.status==="in_progress")))return fx.toast("This employee is delivering a task. Finish the assignment before training.");
 const cost=Math.round(e.salary*.35);
 if(s.agencyCash<cost)return fx.toast("Insufficient training budget: "+money(cost));
 s.agencyCash-=cost;c.ledger.unshift({day:c.day,what:"Staff training · "+e.name,value:-cost,lead:"agency",status:"paid"});
 p.trainingUntil=c.day+7;p.pendingSkill=9;
 fx.log(e.name+" started a 7-day upskilling program");
}
export function promoteLead(s:GameState,fx:Fx,id:string){
 if(!s.ceo||!s.staff.includes(id))return;
 const role=primaryRole(id);if(!role)return;
 const fn=FUNCTION_FOR_ROLE[role],p=profile(s,id);
 if(p.skill<65)return fx.toast("Specialist skill 65+ required for team leadership.");
 if(s.teamLeads[fn]===id){delete s.teamLeads[fn];fx.log(employeeById(id)?.name+" stepped down as "+fn+" team lead");return;}
 s.teamLeads[fn]=id;
 fx.log(employeeById(id)?.name+" appointed "+fn+" team lead");
}
export function assignSpecialist(s:GameState,fx:Fx,projectId:string,taskKey:string,employeeId:string|null){
 const c=s.ceo,p=c?.projects.find(p=>p.id===projectId&&p.status==="active");
 const t=p?.tasks.find(t=>t.key===taskKey);
 if(!t||!["backlog","assigned"].includes(t.status))return;
 if(employeeId&&(!s.staff.includes(employeeId)||!eligibleForRole(employeeId,t.role)))return fx.toast("Employee not qualified for this workstream.");
 t.preferredEmployee=employeeId;
 fx.log((employeeId?employeeById(employeeId)?.name:"Automatic assignment")+" designated for "+p!.brand+" · "+t.label);
}
export function prioritizeProject(s:GameState,fx:Fx,id:string,priority:"normal"|"high"){
 const p=s.ceo?.projects.find(p=>p.id===id&&p.status==="active");
 if(!p||!["normal","high"].includes(priority))return;
 p.priority=priority;fx.log(p.brand+" delivery priority set to "+priority);
}
