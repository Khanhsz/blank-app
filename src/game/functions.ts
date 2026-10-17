import {employees,ceoTalent} from "./data";
import type {GameState,Task} from "./state";

export const AGENCY_FUNCTIONS=[
 {id:"account",name:"Business & Account",mission:"Pitch, negotiate and manage the client relationship",phases:"Planning · Live"},
 {id:"research",name:"Research & Insights",mission:"Gather evidence, survey customers and validate insights",phases:"Planning"},
 {id:"strategy",name:"Strategy & Planning",mission:"Set objectives, audience, positioning and integrated plan",phases:"Planning"},
 {id:"creative",name:"Creative & Content",mission:"Build the big idea, design and messaging",phases:"Executing"},
 {id:"production",name:"Production & Activation",mission:"Deliver assets, shoots and physical activations",phases:"Executing"},
 {id:"media",name:"Media & Growth",mission:"Buy media, coordinate creators and distribute",phases:"Executing · Live"},
 {id:"data",name:"Data & Performance",mission:"Measure, test and optimize results",phases:"Live"},
 {id:"operations",name:"Operations & People",mission:"Manage delivery, quality, staffing and timelines",phases:"All phases"}
] as const;
export type FunctionId=(typeof AGENCY_FUNCTIONS)[number]["id"];
export const TASK_FUNCTION:Record<string,FunctionId>={
 account:"account",research:"research",strategy:"strategy",creative:"creative",
 production:"production",media:"media",kol:"media",analytics:"data",operations:"operations"
};
const crossTraining:Record<string,string[]>={
 account:["operations"],research:["strategy"],strategy:["research"],creative:["production"],
 production:["creative"],media:["analytics"],kol:["production"],analytics:["operations"],operations:["account"]
};
export function candidatesForRole(role:string){
 const primary=ceoTalent[role];
 const backup=Object.entries(crossTraining).filter(([,roles])=>roles.includes(role)).map(([r])=>ceoTalent[r]).filter(Boolean);
 return [primary,...backup].filter((v):v is string=>!!v);
}
export function departmentMetrics(s:GameState){
 const projects=s.ceo?.projects.filter(p=>p.status==="active")??[];
 return AGENCY_FUNCTIONS.map(fn=>{
  const roles=Object.entries(TASK_FUNCTION).filter(([,f])=>f===fn.id).map(([k])=>k);
  const tasks:Task[]=projects.flatMap(p=>p.tasks.filter(t=>roles.includes(t.role)||roles.includes(t.key)));
  const active=tasks.filter(t=>t.status==="assigned"||t.status==="in_progress"||t.status==="review");
  const staff=s.staff.filter(id=>roles.some(r=>candidatesForRole(r).includes(id)));
  const primary=staff.filter(id=>roles.some(r=>ceoTalent[r]===id));
  const capacity=primary.length*2+staff.filter(id=>!primary.includes(id)).length;
  const workload=active.length;
  const completed=tasks.filter(t=>t.status==="completed");
  const quality=completed.length?Math.round(completed.reduce((sum,t)=>sum+t.quality,0)/completed.length):null;
  return {...fn,staff:staff.map(id=>employees.find(e=>e.id===id)?.name??id),capacity,workload,
    delivered:completed.length,total:tasks.length,quality,
    bottleneck:workload>capacity||(!capacity&&tasks.some(t=>t.status!=="completed"&&!t.outsourced))};
 });
}
