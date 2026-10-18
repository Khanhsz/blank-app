import test from "node:test";
import assert from "node:assert/strict";
import {defaults,migrate,newCEO} from "../src/game/state";
import {ensureRecruitment,quotedSalary,recruitmentScore,recruitmentFee,startRecruitmentCampaign,canStartRecruitment,RECRUITMENT_CHANNELS} from "../src/game/recruitment";
import {hire,dailyPayroll} from "../src/game/ceo";
import {endWeek,acknowledgeEdition} from "../src/game/weekly";
import {employeeById} from "../src/game/data";
import type {Fx} from "../src/game/store";

const messages:string[]=[];
const fx:Fx={toast:m=>{messages.push(m);},log:()=>{}};
const agency=()=>{const s=defaults();s.created=true;s.agencyUnlocked=true;s.ceo=newCEO(55);s.ceo.weekly=s.clock;s.agencyCash=150000000;ensureRecruitment(s);return s;};
const nextWeek=(s:ReturnType<typeof agency>)=>{const edition=endWeek(s,fx);assert.ok(edition);acknowledgeEdition(s,edition!.id);return edition!;};

test("organic applications stay at one or two per week and survive save and UI revisits",()=>{
 const s=agency(),initial=structuredClone(s.recruitment);
 assert.ok(initial&&initial.candidates.length>=1&&initial.candidates.length<=2);
 assert.ok(initial.candidates.every(e=>e.source==="organic"));
 ensureRecruitment(s);assert.deepEqual(s.recruitment,initial);
 const saved=migrate(JSON.parse(JSON.stringify(s)));
 assert.deepEqual(saved.recruitment,initial);
 nextWeek(s);
 assert.equal(s.recruitment?.week,2);
 assert.ok((s.recruitment?.candidates.length??0)>=1&&(s.recruitment?.candidates.length??0)<=2);
 assert.notDeepEqual(s.recruitment?.candidates.map(e=>e.id),initial.candidates.map(e=>e.id));
});

test("a paid website campaign arrives next week, does not instantly reroll, and cannot be spammed",()=>{
 const s=agency(),before=s.agencyCash,initial=structuredClone(s.recruitment!.candidates);
 assert.equal(startRecruitmentCampaign(s,fx,"website"),true);
 const fee=RECRUITMENT_CHANNELS.find(ch=>ch.id==="website")!.fee;
 assert.equal(s.agencyCash,before-fee);
 assert.deepEqual(s.recruitment!.candidates,initial);
 assert.equal(s.recruitment!.postings?.length,1);
 assert.equal(s.recruitment!.postings?.[0].arrivalWeek,2);
 assert.equal(startRecruitmentCampaign(s,fx,"newspaper"),false);
 assert.equal(s.agencyCash,before-fee);
 assert.equal(s.ceo?.ledger.filter(x=>x.what.includes("Recruiting campaign")).length,1);
 const restored=migrate(JSON.parse(JSON.stringify(s)));
 assert.deepEqual(restored.recruitment?.postings,s.recruitment?.postings);
 nextWeek(s);
 const sourced=s.recruitment!.candidates.filter(e=>e.source==="website");
 assert.ok(sourced.length>=4&&sourced.length<=6);
 assert.ok(s.recruitment!.candidates.filter(e=>e.source==="organic").length<=2);
 assert.equal(s.recruitment!.postings!.length,0);
 ensureRecruitment(s);
 assert.deepEqual(s.recruitment!.candidates.filter(e=>e.source==="website"),sourced);
 nextWeek(s);
 assert.ok(!s.recruitment!.candidates.some(e=>e.source==="website"));
});

test("the four channels have explicit budgets, volumes, skill bands and no immediate arrivals",()=>{
 for(const ch of RECRUITMENT_CHANNELS){
  const s=agency();
  if(ch.id==="referral"){hire(s,fx,"planner2");s.personnel.planner2.skill=90;}
  const oldCash=s.agencyCash;
  const accepted=startRecruitmentCampaign(s,fx,ch.id);
  assert.equal(accepted,true,ch.id);
  assert.equal(s.agencyCash,oldCash-ch.fee);
  nextWeek(s);
  const candidates=s.recruitment!.candidates.filter(e=>e.source===ch.id);
  assert.ok(candidates.length>=ch.min&&candidates.length<=ch.max,ch.id+" candidate count");
  assert.ok(candidates.every(e=>e.startingSkill>=ch.minSkill&&e.startingSkill<=ch.maxSkill),ch.id+" skill range");
  assert.ok(candidates.every(e=>e.salary===quotedSalary(recruitmentScore(e))),ch.id+" salary from stats");
 }
});

test("employee referrals require an 80+ skill contact and yield premium candidates",()=>{
 const s=agency(),initial=s.agencyCash;
 assert.equal(canStartRecruitment(s,"referral").ok,false);
 assert.equal(startRecruitmentCampaign(s,fx,"referral"),false);
 assert.equal(s.agencyCash,initial);
 hire(s,fx,"planner2");
 assert.equal(canStartRecruitment(s,"referral").ok,false);
 s.personnel.planner2.skill=85;
 assert.equal(canStartRecruitment(s,"referral").ok,true);
 assert.equal(startRecruitmentCampaign(s,fx,"referral"),true);
 nextWeek(s);
 const referrals=s.recruitment!.candidates.filter(e=>e.source==="referral");
 assert.ok(referrals.length>=1&&referrals.length<=3);
 assert.ok(referrals.every(e=>e.startingSkill>=85&&recruitmentScore(e)>=80));
});

test("candidate score determines salary; signed hires affect payroll and persist through next week",()=>{
 for(let rating=0;rating<100;rating++)assert.ok(quotedSalary(rating+1)>=quotedSalary(rating));
 const s=agency(),e=s.recruitment!.candidates[0],before=s.agencyCash,beforePay=dailyPayroll(s);
 assert.equal(e.salary,quotedSalary(recruitmentScore(e)));
 hire(s,fx,e.id);
 assert.ok(s.staff.includes(e.id));
 assert.equal(employeeById(e.id)?.salary,e.salary);
 assert.equal(s.agencyCash,before-recruitmentFee(e));
 assert.ok(dailyPayroll(s)>beforePay);
 assert.equal(s.personnel[e.id].skill,e.startingSkill);
 assert.equal(s.personnel[e.id].morale,e.startingMorale);
 assert.equal(s.personnel[e.id].fatigue,e.startingFatigue);
 nextWeek(s);
 assert.equal(employeeById(e.id)?.salary,e.salary);
 assert.ok(s.recruitment?.hired.some(candidate=>candidate.id===e.id));
 const restored=migrate(JSON.parse(JSON.stringify(s)));
 assert.equal(employeeById(e.id)?.salary,e.salary);
 assert.ok(restored.staff.includes(e.id));
});

test("expired offers cannot be hired; older 7–9 candidate saves are safely trimmed",()=>{
 const s=agency(),expired=s.recruitment!.candidates[0].id;
 const saved=structuredClone(s);
 saved.recruitment!.version=undefined;
 saved.recruitment!.candidates=[...saved.recruitment!.candidates,...Array.from({length:7},(_,n)=>({...saved.recruitment!.candidates[0],id:"recruit-legacy-"+n}))];
 const migrated=migrate(JSON.parse(JSON.stringify(saved)));
 assert.ok(migrated.recruitment!.candidates.length<=2);
 nextWeek(s);
 const oldHeadcount=s.staff.length;
 hire(s,fx,expired);
 assert.equal(s.staff.length,oldHeadcount);
});
