/** Persisted recruitment board: refreshes only at the next in-game week. */
import {registerDynamicEmployees,type Employee} from "./data";
import type {GameState,RecruitmentCandidate} from "./state";
const roles=[
 ["account","Account Executive","Client service / negotiation"],
 ["research","Consumer Researcher","Insights / surveys"],
 ["strategy","Strategic Planner","Positioning / strategy"],
 ["creative","Creative Designer","Concept / design"],
 ["production","Content Producer","Production / activation"],
 ["media","Media Buyer","Paid media / growth"],
 ["kol","Creator Partnership Manager","KOL / KOC management"],
 ["analytics","Data Analyst","Measurement / analytics"],
 ["operations","Project Coordinator","Project delivery / operations"]
] as const;
const surnames=["Nguyễn","Trần","Lê","Phạm","Hoàng","Võ","Bùi","Đặng","Đỗ","Lương","Cao","Vũ"];
const names=["Minh Anh","Quốc Bảo","Khánh Linh","Gia Huy","Bảo Ngọc","Tuấn Kiệt","Hà My","Đức Anh","Thanh Vy","Hoài Nam","Ngọc Hà","Thảo Nhi","Minh Khang","Quỳnh Như","Hải Đăng","Phương Anh"];
function rng(seed:number){let x=seed>>>0;return ()=>{x=(x+0x6d2b79f5)>>>0;let v=Math.imul(x^(x>>>15),1|x);v^=v+Math.imul(v^(v>>>7),61|v);return ((v^(v>>>14))>>>0)/4294967296;};}
const rand=(f:()=>number,a:number,b:number)=>a+Math.floor(f()*(b-a+1));
export function recruitmentScore(e:Pick<RecruitmentCandidate,"startingSkill"|"startingMorale"|"startingFatigue">):number{
 return Math.round((e.startingSkill??64)*.7+(e.startingMorale??78)*.2+(100-(e.startingFatigue??0))*.1);
}
export function quotedSalary(score:number):number{return Math.round((650000+Math.max(0,Math.min(100,score))*31000)/10000)*10000;}
export function recruitmentFee(e:Employee):number{return Math.round(e.salary*.3/10000)*10000;}
function generate(seed:number,week:number):RecruitmentCandidate[]{
 const random=rng((seed^Math.imul(week,0x9e3779b1))>>>0);
 const shuffled=[...roles];
 for(let i=shuffled.length-1;i>0;i--){const k=rand(random,0,i);[shuffled[i],shuffled[k]]=[shuffled[k],shuffled[i]];}
 return shuffled.slice(0,rand(random,7,9)).map(([specialty,role,skill],i)=>{
  const startingSkill=rand(random,42,95),startingMorale=rand(random,58,96),startingFatigue=rand(random,0,20);
  const salary=quotedSalary(recruitmentScore({startingSkill,startingMorale,startingFatigue}));
  const name=surnames[rand(random,0,surnames.length-1)]+" "+names[rand(random,0,names.length-1)];
  return {id:"recruit-"+seed.toString(36)+"-w"+week+"-"+i,name,role,specialty,skill,salary,startingSkill,startingMorale,startingFatigue};
 });
}
export function syncRecruitmentDirectory(s:GameState):void{
 const market=s.recruitment;
 registerDynamicEmployees(market?[...market.hired,...market.candidates]:[]);
}
export function ensureRecruitment(s:GameState):void{
 if(!s.agencyUnlocked){syncRecruitmentDirectory(s);return;}
 const market=s.recruitment;
 if(!market||market.week!==s.clock.week){
  const seed=market?.seed??(Math.floor(Math.random()*0xffffffff)>>>0);
  s.recruitment={seed,week:s.clock.week,hired:(market?.hired??[]).filter(e=>s.staff.includes(e.id)),candidates:generate(seed,s.clock.week)};
 }
 syncRecruitmentDirectory(s);
}
export function acceptCandidate(s:GameState,id:string):void{
 const market=s.recruitment,candidate=market?.candidates.find(e=>e.id===id);
 if(!market||!candidate)return;
 market.candidates=market.candidates.filter(e=>e.id!==id);
 market.hired.push(candidate);
 syncRecruitmentDirectory(s);
}
export function visibleCandidates(s:GameState):RecruitmentCandidate[]{return s.recruitment?.week===s.clock.week?s.recruitment.candidates:[];}
