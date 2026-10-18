/** Four-function human capital model. Existing role eligibility, salary contracts and
 * exclusive client squads remain authoritative. No style-toggle reroll mechanics.
 */
import {ceoTalent,clamp,employees,employeeById,money} from "./data";
import type {Fx} from "./store";
import type {GameState,PersonnelProfile,Task,TalentAttributes,TalentFunction} from "./state";
type FunctionId="account"|"research"|"strategy"|"creative"|"production"|"media"|"data"|"operations";

export const TALENT_FUNCTIONS=[
 {id:"acc",label:"Account & Operations",short:"ACC"},
 {id:"str",label:"Research & Strategy",short:"STR"},
 {id:"cre",label:"Creative & Production",short:"CRE"},
 {id:"med",label:"Media & Analytics",short:"MED"}
] as const;
export const ROLE_IDS=["account","research","strategy","creative","production","media","kol","analytics","operations"] as const;
export const FUNCTION_FOR_ROLE:Record<string,FunctionId>={account:"account",research:"research",strategy:"strategy",creative:"creative",production:"production",media:"media",kol:"media",analytics:"data",operations:"operations"};
export const TALENT_FOR_ROLE:Record<string,TalentFunction>={account:"acc",operations:"acc",research:"str",strategy:"str",creative:"cre",production:"cre",media:"med",kol:"med",analytics:"med"};
const BACKUP_ROLES:Record<string,string[]>={account:["operations"],research:["strategy"],strategy:["research"],creative:["production"],production:["creative","kol"],media:["analytics"],kol:["production"],analytics:["media"],operations:["account","analytics"]};
const keys:TalentFunction[]=["acc","str","cre","med"];
const weights:Record<string,TalentAttributes>={
 account:{acc:.8,str:.2,cre:0,med:0},
 operations:{acc:.85,str:.15,cre:0,med:0},
 research:{acc:0,str:.85,cre:0,med:.15},
 strategy:{acc:.25,str:.75,cre:0,med:0},
 creative:{acc:0,str:.15,cre:.85,med:0},
 production:{acc:.2,str:0,cre:.8,med:0},
 media:{acc:0,str:.15,cre:0,med:.85},
 kol:{acc:0,str:0,cre:.3,med:.7},
 analytics:{acc:.2,str:0,cre:0,med:.8}
};
export function primaryRole(id:string):string|null{
 const e=employeeById(id);
 return e?.specialty??Object.entries(ceoTalent).find(([,staffId])=>staffId===id)?.[0]??null;
}
export function specialistCandidates(role:string):string[]{return employees.filter(e=>primaryRole(e.id)===role).map(e=>e.id);}
export function eligibleForRole(id:string,role:string):boolean{
 const assigned=primaryRole(id);
 return !!assigned&&(assigned===role||BACKUP_ROLES[role]?.includes(assigned));
}
export function candidatesForRole(role:string):string[]{
 return employees.filter(e=>eligibleForRole(e.id,role)).sort((a,b)=>Number(primaryRole(b.id)===role)-Number(primaryRole(a.id)===role)).map(e=>e.id);
}
export const specialtyFunction=(id:string):TalentFunction=>TALENT_FOR_ROLE[primaryRole(id)??""]??"acc";
/** Deterministic mapping for hires from old saves; preserving their historical skill. */
export function legacyTalentAttributes(id:string,skill:number):TalentAttributes{
 const main=specialtyFunction(id),v=clamp(skill,20,100);
 const out:TalentAttributes={acc:clamp(Math.round(v*.62),20,100),str:clamp(Math.round(v*.62),20,100),
  cre:clamp(Math.round(v*.62),20,100),med:clamp(Math.round(v*.62),20,100)};
 out[main]=v;
 if(main==="str")out.acc=clamp(Math.round(v*.76),20,100);
 if(main==="cre")out.str=clamp(Math.round(v*.75),20,100);
 if(main==="med")out.str=clamp(Math.round(v*.74),20,100);
 if(main==="acc")out.str=clamp(Math.round(v*.74),20,100);
 return out;
}
export function defaultProfile(id:string):PersonnelProfile{
 const e=employeeById(id),skill=e?.startingSkill??64;
 const attributes=e?.startingAttributes??legacyTalentAttributes(id,skill);
 return {skill,morale:e?.startingMorale??78,fatigue:e?.startingFatigue??0,xp:0,attributes:{...attributes}};
}
export function profile(s:GameState,id:string):PersonnelProfile{return s.personnel[id]??defaultProfile(id);}
export function talentStats(s:GameState,id:string):TalentAttributes{
 const p=profile(s,id);
 return p.attributes??employeeById(id)?.startingAttributes??legacyTalentAttributes(id,p.skill);
}
export function talentScore(s:GameState,id:string):number{
 const stat=talentStats(s,id),vals=keys.map(k=>stat[k]).sort((a,b)=>b-a);
 return Math.round(vals[0]*.8+vals[1]*.15+vals[2]*.05);
}
export function taskFit(s:GameState,id:string,role:string,key=role):number{
 const stats=talentStats(s,id),mix=weights[key]??weights[role]??weights.operations;
 return clamp(Math.round(keys.reduce((n,k)=>n+stats[k]*mix[k],0)),0,100);
}
export function effectiveCapacity(s:GameState,id:string):number{
 const p=profile(s,id);
 return p.trainingUntil!==undefined&&p.trainingUntil>(s.ceo?.day??s.clock.day)?0:2;
}
export function employeeReadiness(s:GameState,id:string):number{
 const p=profile(s,id);
 return Math.round(clamp(talentScore(s,id)*.55+p.morale*.35+(100-p.fatigue)*.10,0,100));
}
export function leadFor(s:GameState,id:string):string|null{
 const team=s.ceo?.clientTeams?.find(t=>t.status==="active"&&t.memberIds.includes(id));
 return team?.leadId&&team.memberIds.includes(team.leadId)?team.leadId:null;
}
export function staffRate(s:GameState,id:string,role:string,load:number,key=role):{speed:number;quality:number}{
 if(id==="external")return {speed:1.07,quality:0};
 const p=profile(s,id),primary=primaryRole(id)===role,fit=taskFit(s,id,role,key);
 const match=primary?1:.78,skill=clamp((fit-64)/100,-.40,.36);
 const fatigue=clamp(p.fatigue/100,0,1),morale=(p.morale-75)/250;
 const lead=leadFor(s,id),mentorship=lead&&lead!==id ? .065 : lead===id ? .085 : 0;
 const speed=clamp((.91+skill+morale+mentorship)*match*(1-fatigue*.32)/(load>1?1.25:1),.25,1.55);
 const quality=skill*30+((p.skill-64)/100)*4+morale*18+mentorship*45-fatigue*.2+(primary?2:-6);
 return {speed,quality};
}
export function deliveryForecast(s:GameState,t:Task):{fit:number|null;dailyRate:number|null;daysLeft:number|null;estimatedFinishDay:number|null;warning:string|null}{
 const id=t.employee&&t.employee!=="external"?t.employee:t.preferredEmployee??null;
 if(t.status==="completed")return {fit:id?taskFit(s,id,t.role,t.key):null,dailyRate:null,daysLeft:0,estimatedFinishDay:t.doneDay??null,warning:null};
 if(t.outsourced)return {fit:null,dailyRate:1.08,daysLeft:Math.ceil(Math.max(0,t.effort-t.progress)/1.08),estimatedFinishDay:null,warning:null};
 if(!id)return {fit:null,dailyRate:null,daysLeft:null,estimatedFinishDay:null,warning:"Awaiting specialist or prerequisites"};
 if(effectiveCapacity(s,id)===0)return {fit:taskFit(s,id,t.role,t.key),dailyRate:0,daysLeft:null,estimatedFinishDay:null,warning:"Specialist in training"};
 const load=s.ceo?.projects.filter(p=>p.status==="active").flatMap(p=>p.tasks).filter(x=>x.status==="in_progress"&&x.employee===id).length??0;
 const rate=staffRate(s,id,t.role,Math.max(1,load),t.key).speed;
 const daysLeft=Math.ceil(Math.max(0,t.effort-t.progress)/Math.max(.1,rate))+(t.status==="review"?1:1);
 return {fit:taskFit(s,id,t.role,t.key),dailyRate:Number(rate.toFixed(2)),daysLeft,
  estimatedFinishDay:(s.ceo?.day??s.clock.day)+daysLeft,
  warning:profile(s,id).fatigue>=72?"High fatigue may slow delivery":null};
}
export function updatePersonnelDay(s:GameState){
 if(!s.ceo)return;
 const day=s.ceo.day,busy:Record<string,number>={};
 for(const p of s.ceo.projects.filter(p=>p.status==="active"))for(const t of p.tasks){
  if(t.status==="in_progress"&&t.employee&&s.staff.includes(t.employee))busy[t.employee]=(busy[t.employee]??0)+1;
 }
 // Side gigs occupy the same staffing capacity as CEO production tasks.
 for(const gig of s.ceo.agencyGigs??[])if((gig.status==="working"||gig.status==="revision")&&s.staff.includes(gig.staffId))
  busy[gig.staffId]=(busy[gig.staffId]??0)+1;
 for(const id of s.staff){
  const p=s.personnel[id]??(s.personnel[id]=defaultProfile(id));
  if(p.trainingUntil!==undefined&&day>=p.trainingUntil){
   const skill=p.pendingSkill??8;
   p.skill=clamp(p.skill+skill,20,100);
   const key=p.trainingFunction??specialtyFunction(id);
   p.attributes??=legacyTalentAttributes(id,p.skill-skill);
   p.attributes[key]=clamp(p.attributes[key]+skill,20,100);
   delete p.trainingUntil;delete p.pendingSkill;delete p.trainingFunction;
   p.morale=clamp(p.morale+4,0,100);
  }
  const n=busy[id]??0;
  p.fatigue=clamp(p.fatigue+(n>=2?2.4:n===1 ? .8 : -2.6),0,100);
  p.morale=clamp(p.morale+(n>=2 ? -.55 : n===1 ? -.08 : .24),20,100);
 }
}
export function recordDelivery(s:GameState,task:Task){
 if(!task.employee||!s.staff.includes(task.employee))return;
 const id=task.employee,p=s.personnel[id]??(s.personnel[id]=defaultProfile(id));
 p.xp+=4;
 if(p.xp>=20){
  p.xp-=20;
  p.attributes??=legacyTalentAttributes(id,p.skill);
  const role=TALENT_FOR_ROLE[task.role]??specialtyFunction(id);
  p.attributes[role]=clamp(p.attributes[role]+2,20,100);
  p.skill=clamp(p.skill+2,20,100);
 }
 p.morale=clamp(p.morale+(task.quality>=80?2:task.quality<60?-2:1),20,100);
}
export function train(s:GameState,fx:Fx,id:string,focus?:TalentFunction){
 const c=s.ceo,e=employeeById(id);if(!c||!e||!s.staff.includes(id))return;
 const p=s.personnel[id]??(s.personnel[id]=defaultProfile(id));
 if(p.trainingUntil&&p.trainingUntil>c.day)return fx.toast("Training is already underway.");
 if(c.projects.some(pr=>pr.status==="active"&&pr.tasks.some(t=>t.employee===id&&t.status==="in_progress")))return fx.toast("Finish the active assignment before training.");
 if((c.agencyGigs??[]).some(g=>g.staffId===id&&(g.status==="working"||g.status==="revision")))
  return fx.toast("Finish or reassign the side gig before training this specialist.");
 const cost=Math.round(e.salary*.35);if(s.agencyCash<cost)return fx.toast("Insufficient training budget: "+money(cost));
 s.agencyCash-=cost;c.ledger.unshift({day:c.day,what:"Staff training · "+e.name,value:-cost,lead:"agency",status:"paid"});
 p.trainingUntil=c.day+7;p.pendingSkill=9;p.trainingFunction=focus??specialtyFunction(id);
 fx.log(e.name+" started 7-day upskilling in "+p.trainingFunction.toUpperCase());
}
export function promoteLead(s:GameState,fx:Fx,id:string){
 if(!s.ceo||!s.staff.includes(id))return;
 const role=primaryRole(id);if(!role)return;
 const fn=FUNCTION_FOR_ROLE[role],p=profile(s,id);
 if((talentStats(s,id)[specialtyFunction(id)]??p.skill)<65)return fx.toast("Function skill 65+ required for team leadership.");
 if(s.teamLeads[fn]===id){delete s.teamLeads[fn];fx.log(employeeById(id)?.name+" stepped down as "+fn+" team lead");return;}
 s.teamLeads[fn]=id;fx.log(employeeById(id)?.name+" appointed "+fn+" team lead");
}
export function assignSpecialist(s:GameState,fx:Fx,projectId:string,taskKey:string,employeeId:string|null){
 const c=s.ceo,p=c?.projects.find(p=>p.id===projectId&&p.status==="active");
 const t=p?.tasks.find(t=>t.key===taskKey);
 if(!t||!["backlog","assigned"].includes(t.status))return;
 const team=s.ceo?.clientTeams?.find(team=>team.id===p?.teamId);
 if(employeeId&&(!s.staff.includes(employeeId)||!team?.memberIds.includes(employeeId)||!eligibleForRole(employeeId,t.role)))
  return fx.toast("Employee must belong to this client team and be role-qualified.");
 t.preferredEmployee=employeeId;
 fx.log((employeeId?employeeById(employeeId)?.name:"Automatic assignment")+" selected for "+p!.brand+" · "+t.label);
}
export function prioritizeProject(s:GameState,fx:Fx,id:string,priority:"normal"|"high"){
 const p=s.ceo?.projects.find(p=>p.id===id&&p.status==="active");
 if(!p||!["normal","high"].includes(priority))return;
 p.priority=priority;fx.log(p.brand+" delivery priority set to "+priority);
}
