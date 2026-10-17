/**
 * Autonomous rival agency economy (local deterministic AI agents).
 * Runs once per simulated day — does not spend Gemini API tokens.
 * All actions change the existing CEO state; no fabricated wins are presented.
 */
import {ceoRand,ceoLeadDefs,employees,clamp,money} from "./data";
import type {Rival} from "./data";
import type {GameState,CEO,Lead,RivalTender,RivalEvent,TalentOffer} from "./state";
import type {Fx} from "./store";

const agentFocus:Record<string,NonNullable<Rival["focus"]>>={
 atlas:"premium",pulse:"growth",muse:"creative",lean:"value",north:"strategy"
};
const noise=(key:string,day:number)=>ceoRand("rival-ai-v1:"+key+":"+day);
const focusOf=(r:Rival)=>r.focus??agentFocus[r.id]??"growth";
function logEvent(c:CEO,day:number,r:Rival,kind:RivalEvent["kind"],message:string){
 c.rivalNews ||= [];
 c.rivalNews.unshift({id:r.id+"-"+day+"-"+(c.rivalNews.length?c.rivalNews[0].id:"start"),day,rivalId:r.id,kind,message});
 c.rivalNews=c.rivalNews.slice(0,65);
 r.lastMove=message;r.lastMoveDay=day;
}
function fitScore(r:Rival,l:Lead){
 if(l.pref==="performance")return r.performance;
 if(l.pref==="creative")return r.creative;
 if(l.pref==="strategy")return r.strategy;
 return clamp(90/r.price,35,100);
}
export function rivalBidScore(r:Rival,l:Lead,day:number){
 const fit=fitScore(r,l),capacity=Math.min(17,r.people*.32),scarcity=Math.min(10,Math.max(0,r.clients*3-r.people)*.5);
 const special=focusOf(r)==="premium"?3:focusOf(r)==="value"&&l.pref==="cost"?6:focusOf(r)==="creative"&&l.pref==="creative"?5:focusOf(r)==="strategy"&&l.pref==="strategy"?5:0;
 return clamp(Math.round(r.rep*.25+fit*.45+capacity+(1.3-r.price)*10+(r.officeTier??1)*1.3+special-scarcity+noise(r.id+l.id,day)*6),10,99);
}
export function tenderFor(c:CEO,leadId:string){return c.tenders?.find(x=>x.leadId===leadId)}
export function ensureTender(c:CEO,l:Lead,day=c.day){
 c.tenders ||= [];
 let t=tenderFor(c,l.id);if(t)return t;
 const competitors=l.rivalIds.map(id=>c.rivals.find(r=>r.id===id)).filter((r):r is Rival=>!!r);
 if(!competitors.length)return null;
 const ranked=competitors.map(r=>({r,score:rivalBidScore(r,l,day)})).sort((a,b)=>b.score-a.score);
 const top=ranked[0];
 t={leadId:l.id,deadline:day+11+Math.floor(noise(l.id,day)*5),rivalId:top.r.id,score:top.score,fee:Math.round(l.fee*top.r.price),status:"open"};
 c.tenders.push(t);
 return t;
}
export function registerRivalWin(s:GameState,c:CEO,leadId:string,rivalId:string,reason="tender"){
 const l=c.leads.find(l=>l.id===leadId),r=c.rivals.find(x=>x.id===rivalId);
 if(!l||!r||l.status==="signed")return false;
 const t=ensureTender(c,l);
 if(t?.status==="won")return false;
 if(t)t.status="won";
 l.status="lost";l.lostTo=r.name;
 r.clients++;r.wins=(r.wins??0)+1;
 // Revenue is realized after delivery, not immediately at bid-award time.
 r.activeContracts||=[];
 if(!r.activeContracts.some(p=>p.leadId===l.id))r.activeContracts.push({leadId:l.id,brand:l.brand,finishDay:c.day+Math.max(12,l.duration),revenue:Math.round(l.fee*r.price*.72)});
 r.rep=clamp(r.rep+.55,15,99);
 logEvent(c,c.day,r,"win",r.name+" won "+l.brand+" ("+reason+").");
 if(reason==="tender")c.inbox.unshift({id:"rival-win-"+(++c.seq),type:"rival-win",project:l.id,message:r.name+" won the "+l.brand+" tender while your agency was preparing.",choices:["acknowledge"],status:"open",day:c.day});
 return true;
}
function stepRivalStrategy(c:CEO,r:Rival,day:number){
 r.officeTier ||= 1;
 const focus=focusOf(r);r.focus=focus;
 const monthlySalaries=r.people*(focus==="premium"?2500000:1900000);
 const dailyRetainers=r.clients*(focus==="premium"?105000:focus==="value"?66000:83000);
 r.cash=Math.max(0,Math.round(r.cash+dailyRetainers-monthlySalaries/30-r.officeTier*24000));
 if(r.activeContracts?.length){
  for(const contract of [...r.activeContracts])if(day>=contract.finishDay){
   r.cash+=contract.revenue;
   r.activeContracts.splice(r.activeContracts.indexOf(contract),1);
   r.rep=clamp(r.rep+(noise(r.id+contract.brand,day)-.45)*1.4,15,99);
  }
 }
 if(day%7!==0)return;
 const improvement=(r.creative+r.performance+r.strategy)/3;
 const expansionPrice=7000000*(r.officeTier+1);
 const hirePrice=2600000+(r.people>30?1600000:0);
 const pressure=r.clients/Math.max(1,r.people/3);
 if(r.cash>expansionPrice*3&&r.officeTier<4&&(focus==="premium"||pressure>1.4)&&noise(r.id+"expand",day)>.28){
  r.cash-=expansionPrice;r.officeTier++;
  r.rep=clamp(r.rep+1.25,15,99);
  logEvent(c,day,r,"expand",r.name+" expanded its headquarters to tier "+r.officeTier+".");
 }else if(r.cash>hirePrice*4&&(pressure>.7||r.people<12)&&noise(r.id+"hire",day)>.24){
  r.cash-=hirePrice;r.people++;
  const target: "creative"|"performance"|"strategy"=focus==="creative"?"creative":focus==="growth"?"performance":focus==="strategy"?"strategy":r.special==="Integrated"?"strategy":"performance";
  r[target]=clamp(r[target]+.55,25,99);
  logEvent(c,day,r,"hire",r.name+" recruited a new "+target+" specialist.");
 }else if(r.cash>9000000&&improvement<86&&noise(r.id+"upskill",day)>.55){
  r.cash-=2200000;
  const skill: "creative"|"performance"|"strategy"=focus==="creative"?"creative":focus==="strategy"?"strategy":focus==="growth"?"performance":r.special==="Integrated"?"strategy":"performance";
  r[skill]=clamp(r[skill]+1.4,20,99);
  logEvent(c,day,r,"market",r.name+" invested in "+skill+" capability.");
 }else{
  const target=focus==="value"?.78:focus==="premium"?1.22:focus==="creative"?1.25:1.06;
  r.price=clamp(r.price+(target-r.price)*.12, .66,1.48);
  r.aggression=clamp(r.aggression+(noise(r.id+"aggression",day)-.5)*.025,.28,.96);
 }
}
function talentActivities(s:GameState,c:CEO,day:number){
 c.talentMarket||={};c.talentOffers||=[];
 for(const [id,o] of Object.entries(c.talentMarket))if(o.untilDay<=day)delete c.talentMarket[id];
 for(const offer of c.talentOffers.filter(x=>x.status==="open"&&x.expires<=day))resolveTalentOffer(s,{toast:()=>{},log:()=>{}},offer.id,"release",true);
 if(day%11!==0)return;
 const r=c.rivals[Math.floor(noise("hiring",day)*c.rivals.length)];if(!r||r.cash<7500000)return;
 // Rivals compete for external professionals; temporarily unavailable on the player's recruitment market.
 const candidates=(s.recruitment?.candidates??[]).filter(x=>!s.staff.includes(x.id)&&!c.talentMarket?.[x.id]);
 const hire=candidates[Math.floor(noise(r.id+"recruit",day)*Math.max(1,candidates.length))];
 if(hire&&noise(r.id+"market",day)>.36){
  c.talentMarket[hire.id]={rivalId:r.id,untilDay:day+7};
  r.cash-=Math.round(hire.salary*1.25);r.people++;
  logEvent(c,day,r,"hire",r.name+" signed "+hire.name+"; temporarily unavailable for recruitment.");
 }
 // Existing staff receive a counter-offer with a fair response window and no invisible transfer.
 if(s.staff.length>=2&&!c.talentOffers.some(x=>x.status==="open")&&noise("poach",day)>.5){
  const available=employees.filter(x=>s.staff.includes(x.id));
  const emp=available[Math.floor(noise(r.id+"poach",day)*available.length)];
  if(emp){
   const raise=Math.round(emp.salary*(.13+noise(emp.id,day)*.14)/50000)*50000;
   const bonus=Math.round(emp.salary*(.8+noise("bonus"+emp.id,day)*.7)/100000)*100000;
   const offer:TalentOffer={id:"poach-"+(++c.seq),employeeId:emp.id,rivalId:r.id,day,expires:day+7,raise,bonus,status:"open"};
   c.talentOffers.unshift(offer);
   c.inbox.unshift({id:"issue-"+offer.id,type:"talent-poach",project:offer.id,message:r.name+" offered "+emp.name+" a better package. Decide whether to retain or release this employee.",choices:["retain","release"],status:"open",day});
   if(c.pauseOnIssue)c.speed=0;
   logEvent(c,day,r,"poach",r.name+" submitted a competing offer for "+emp.name+".");
  }
 }
}
export function resolveTalentOffer(s:GameState,fx:Fx,id:string,choice:string,expired=false){
 const c=s.ceo,offer=c?.talentOffers?.find(x=>x.id===id&&x.status==="open");if(!c||!offer)return false;
 const r=c.rivals.find(x=>x.id===offer.rivalId);if(!r)return false;
 const emp=employees.find(x=>x.id===offer.employeeId);if(!emp)return false;
 const retaining=choice==="retain";
 if(retaining&&s.agencyCash<offer.bonus){fx.toast("Need "+money(offer.bonus)+" to match the competing employee offer.");return false}
 if(retaining){
  s.agencyCash-=offer.bonus;c.salaryPremiums||={};c.salaryPremiums[emp.id]=(c.salaryPremiums[emp.id]||0)+offer.raise;
  c.ledger.unshift({day:c.day,what:"Talent retention bonus · "+emp.name,value:-offer.bonus,lead:"agency",status:"paid"});
  offer.status="retained";fx.toast(emp.name+" stays — monthly salary increased by "+money(offer.raise));
  logEvent(c,c.day,r,"loss",r.name+" lost a recruitment contest for "+emp.name+".");
 }else{
  s.staff=s.staff.filter(x=>x!==emp.id);
  for(const [fn,leadId] of Object.entries(s.teamLeads))if(leadId===emp.id)delete s.teamLeads[fn];
  // In-flight tasks become available for reassignment; work already completed is preserved.
  for(const p of c.projects)if(p.status==="active")for(const t of p.tasks){
   if(t.preferredEmployee===emp.id)t.preferredEmployee=null;
   if(t.employee===emp.id&&t.status==="in_progress"){t.status="assigned";t.employee=null;t.startedDay=undefined}
  }
  if(c.salaryPremiums)delete c.salaryPremiums[emp.id];
  offer.status="left";r.people++;r.cash=Math.max(0,r.cash-Math.round(emp.salary*1.5));
  fx.toast(emp.name+" joined "+r.name+".");
  logEvent(c,c.day,r,"hire",r.name+" recruited "+emp.name+(expired?" after the offer expired.":"."));
 }
 for(const i of c.inbox)if(i.type==="talent-poach"&&i.project===id&&i.status==="open"){i.status="resolved";i.resolution=expired?"expired":choice}
 if(c.speed===0&&c.inbox.every(i=>i.status!=="open"||!["capacity","deadline","cash","renewal","bad-margin","talent-poach"].includes(i.type)))c.speed=1;
 return true;
}
export function runRivalAgents(s:GameState,c:CEO,fx:Fx){
 if(!s.agencyUnlocked)return;
 c.rivalLastTick??=Math.max(0,c.day-1);
 // Guard against double execution or runaway catch-up from edited old saves.
 const start=Math.max(c.rivalLastTick+1,c.day-35);
 for(let day=start;day<=c.day;day++){
  c.rivalLastTick=day;
  c.tenders||=[];c.talentOffers||=[];
  // Fresh fictional corporate RFPs keep the economy competitive beyond starter deals.
  // Same game-world client definitions and real CEO pitch/negotiation engine.
  if(day>=28&&day%28===0&&c.leads.length<90){
   const base=ceoLeadDefs[(Math.floor(day/28)-1)%ceoLeadDefs.length];
   const factor=.86+noise(base.id+"rfp",day)*.27;
   const id="market-"+base.id+"-"+day;
   if(!c.leads.some(l=>l.id===id)){
    const l:Lead={...base,id,brand:base.brand,origin:"New seasonal request for proposal",value:Math.round(base.value*factor),fee:Math.round(base.fee*factor),status:"new",relationship:base.trust,insightKnown:false};
    c.leads.push(l);
    const tender=ensureTender(c,l,day);
    const rival=c.rivals.find(r=>r.id===tender?.rivalId)||c.rivals[0];
    if(rival)logEvent(c,day,rival,"pitch",l.brand+" invited agencies to a new competitive pitch.");
   }
  }
  for(const l of c.leads)if(["new","qualified","renewal"].includes(l.status))ensureTender(c,l,day);
  for(const r of c.rivals)stepRivalStrategy(c,r,day);
  talentActivities(s,c,day);
  for(const tender of c.tenders){
   if(tender.status!=="open"||day<tender.deadline)continue;
   const l=c.leads.find(x=>x.id===tender.leadId);
   if(!l){tender.status="closed";continue}
   // Once the founder has started pitching, the contest proceeds in the boardroom.
   if(["pitch","pitch_won","negotiating","signed"].includes(l.status))continue;
   if(l.status==="new"||l.status==="qualified"||l.status==="renewal"){
    const originalDay=c.day;c.day=day;
    registerRivalWin(s,c,l.id,tender.rivalId,"tender");
    c.day=originalDay;
   }else tender.status="closed";
  }
 }
}
export function marketShare(c:CEO){
 const players=Math.max(0,c.projects.filter(p=>p.status==="active").length)+c.history.length;
 const total=Math.max(1,players+c.rivals.reduce((a,r)=>a+r.clients,0));
 return {player:players/total*100,rivals:c.rivals.map(r=>({id:r.id,value:r.clients/total*100}))};
}
