/** Week-based agency recruitment with passive discovery and paid sourcing channels.
 * Candidates, posting fees and arrivals are persisted; opening the UI cannot reroll.
 */
import {registerDynamicEmployees,type Employee,money} from "./data";
import type {GameState,RecruitmentCandidate,RecruitmentChannel,RecruitmentPosting} from "./state";
import type {Fx} from "./store";

export const RECRUITMENT_CHANNELS=[
 {id:"newspaper",label:"Newspaper",detail:"Broad, local applicant reach.",fee:800000,min:3,max:4,minSkill:44,maxSkill:72},
 {id:"website",label:"Online job boards",detail:"High-volume digital applications.",fee:1600000,min:4,max:6,minSkill:48,maxSkill:82},
 {id:"journal",label:"Industry journal",detail:"Specialist practitioners and experienced talent.",fee:3200000,min:2,max:4,minSkill:72,maxSkill:92},
 {id:"referral",label:"Employee referral",detail:"High-performing talent from your team's trusted network.",fee:2200000,min:1,max:3,minSkill:85,maxSkill:98}
] as const;
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
const channelCode=(source:RecruitmentChannel)=>source==="organic"?19:source==="newspaper"?31:source==="website"?43:source==="journal"?59:71;

export function recruitmentScore(e:Pick<RecruitmentCandidate,"startingSkill"|"startingMorale"|"startingFatigue">):number{
 return Math.round(e.startingSkill*.7+e.startingMorale*.2+(100-e.startingFatigue)*.1);
}
export function quotedSalary(score:number):number{return Math.round((650000+Math.max(0,Math.min(100,score))*31000)/10000)*10000;}
export function recruitmentFee(e:Employee):number{return Math.round(e.salary*.3/10000)*10000;}
export function qualifiedReferrer(s:GameState):string|null{
 const member=s.staff.find(id=>(s.personnel[id]?.skill??0)>=80);
 return member??null;
}
export function canStartRecruitment(s:GameState,channel:Exclude<RecruitmentChannel,"organic">):{ok:boolean;reason:string}{
 const spec=RECRUITMENT_CHANNELS.find(c=>c.id===channel);
 if(!spec)return {ok:false,reason:"Unknown recruiting channel."};
 if(!s.agencyUnlocked||!s.ceo)return {ok:false,reason:"Found an agency before posting jobs."};
 if(s.recruitment?.lastCampaignWeek===s.clock.week)return {ok:false,reason:"A hiring campaign has already been placed this week."};
 if(channel==="referral"&&!qualifiedReferrer(s))return {ok:false,reason:"Referral requires at least one employee with skill 80+."};
 if(s.agencyCash<spec.fee)return {ok:false,reason:"Insufficient recruiting budget: "+money(spec.fee)};
 return {ok:true,reason:""};
}
export function startRecruitmentCampaign(s:GameState,fx:Fx,channel:Exclude<RecruitmentChannel,"organic">):boolean{
 ensureRecruitment(s);
 const eligibility=canStartRecruitment(s,channel);
 if(!eligibility.ok){fx.toast(eligibility.reason);return false;}
 const spec=RECRUITMENT_CHANNELS.find(c=>c.id===channel)!;
 const market=s.recruitment!;
 const posting:RecruitmentPosting={
  id:"hiring-"+market.seed.toString(36)+"-w"+s.clock.week+"-"+channel,
  channel,startedWeek:s.clock.week,arrivalWeek:s.clock.week+1,fee:spec.fee
 };
 market.postings??=[];
 market.postings.push(posting);
 market.lastCampaignWeek=s.clock.week;
 s.agencyCash-=spec.fee;
 s.ceo!.ledger.unshift({day:s.ceo!.day,what:"Recruiting campaign · "+spec.label,value:-spec.fee,lead:"agency",status:"paid"});
 fx.log("Recruiting campaign opened · "+spec.label+" · applications expected Week "+posting.arrivalWeek);
 fx.toast(spec.label+" posted — applicants arrive in Week "+posting.arrivalWeek);
 return true;
}
function generate(seed:number,week:number,source:RecruitmentChannel):RecruitmentCandidate[]{
 const spec=RECRUITMENT_CHANNELS.find(c=>c.id===source);
 const random=rng((seed^Math.imul(week,0x9e3779b1)^Math.imul(channelCode(source),0x85ebca6b))>>>0);
 const shuffled=[...roles];
 for(let i=shuffled.length-1;i>0;i--){const k=rand(random,0,i);[shuffled[i],shuffled[k]]=[shuffled[k],shuffled[i]];}
 const count=source==="organic"?rand(random,1,2):rand(random,spec!.min,spec!.max);
 const minSkill=source==="organic"?42:spec!.minSkill,maxSkill=source==="organic"?78:spec!.maxSkill;
 return Array.from({length:count},(_,i)=>{
  const [specialty,role,skill]=shuffled[i%shuffled.length];
  const startingSkill=rand(random,minSkill,maxSkill);
  const startingMorale=rand(random,source==="referral"?75:58,96);
  const startingFatigue=rand(random,0,source==="referral"?12:20);
  const salary=quotedSalary(recruitmentScore({startingSkill,startingMorale,startingFatigue}));
  const name=surnames[rand(random,0,surnames.length-1)]+" "+names[rand(random,0,names.length-1)];
  return {id:"recruit-"+seed.toString(36)+"-w"+week+"-"+source+"-"+i,name,role,specialty,skill,salary,startingSkill,startingMorale,startingFatigue,source};
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
  const arrivals=(market?.postings??[]).filter(p=>p.arrivalWeek===s.clock.week);
  s.recruitment={
   seed,week:s.clock.week,version:2,
   hired:(market?.hired??[]).filter(e=>s.staff.includes(e.id)),
   candidates:[...generate(seed,s.clock.week,"organic"),...arrivals.flatMap(p=>generate(seed,s.clock.week,p.channel))],
   postings:(market?.postings??[]).filter(p=>p.arrivalWeek>s.clock.week),
   ...(market?.lastCampaignWeek===undefined?{}:{lastCampaignWeek:market.lastCampaignWeek})
  };
 }else if(market.version!==2){
  // Upgrade legacy saves with 7–9 offers without changing employed people.
  market.candidates=market.candidates.slice(0,2);
  market.version=2;
  market.postings??=[];
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
