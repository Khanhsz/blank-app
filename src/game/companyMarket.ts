/** Marketing Tycoon · Client Business Simulation V1
 * One deterministic weekly balance sheet for all 112 client companies.
 * Generated macro signals can influence only FUTURE weeks. Official Fortune
 * ranks and published revenues in clientDatabase are NEVER overwritten.
 */
import {CLIENT_DATABASE,CLIENT_BY_ID,SECTORS,SIMULATED_USD_TO_VND,simulatedFortuneRevenueUsd,type ClientMaster,type ClientSector} from "./clientDatabase";
import {clamp,ceoRand} from "./data";
import type {GameState,CompanyMarket,CompanyPerformance,MarketCampaignEvent,QuarterlyRanking} from "./state";
import type {Fx} from "./store";
import {calibratedClient} from "./financeCalibration";

export const RANKING_CYCLE_WEEKS=13;
export const FORTUNE_CANDIDATES=CLIENT_DATABASE.filter(c=>c.segment==="bigcorp");
export const FORTUNE_BOARD_SIZE=50;
const round=(n:number,d=2)=>Number(n.toFixed(d));
const hash=(key:string)=>ceoRand("client-business:v1:"+key);
export const marketCompany=(s:GameState,id:string)=>s.companyMarket?.companies[id]??null;
export const officialRank=(id:string)=>CLIENT_BY_ID[id]?.fortuneRank??null;
/** Annual marketing envelope follows simulated revenue over time. Gemini's
 * market-sector signals feed weekly growth; the budget shares remain guarded
 * by the starting company tier and cannot be invented by a model.
 */
export function currentMarketingBudgetVnd(s:GameState,client:ClientMaster):number{
 const calibrated=calibratedClient(s,CLIENT_BY_ID[client.id]??client);
 const live=marketCompany(s,client.id);
 if(!live)return calibrated.marketingBudgetVnd;
 const growth=clamp(live.simulatedAnnualRevenue/Math.max(1,live.baselineAnnualRevenue),.65,1.8);
 return Math.round(calibrated.marketingBudgetVnd*growth/100000)*100000;
}

function startingRevenue(s:GameState,id:string){
 const c=calibratedClient(s,CLIENT_BY_ID[id]);
 if(c.segment!=="bigcorp")return c.annualRevenueVnd??1_000_000_000;
 // All Big Corp market values are USD. Fictional group revenues match the
 // master database VND model using a disclosed GAME conversion assumption.
 if(c.basis==="simulated")return Math.round((c.annualRevenueVnd??0)/SIMULATED_USD_TO_VND);
 if(c.verifiedRevenueUsd!==null)return c.verifiedRevenueUsd;
 return simulatedFortuneRevenueUsd(c.fortuneRank??50);
}
function seedCompany(s:GameState,id:string):CompanyPerformance{
 const c=CLIENT_BY_ID[id],revenue=startingRevenue(s,id);
 return {id,simulatedAnnualRevenue:revenue,baselineAnnualRevenue:revenue,currency:c.segment==="bigcorp"?"USD":"VND",
  awareness:c.brandAwareness,brandStrength:c.scaleScore,weeklyGrowthPct:0,totalGrowthPct:0,
  momentum:0,rivalPressure:0,playerMarketingImpact:0,rivalMarketingImpact:0,
  marketingSpendVnd:0,lastUpdatedWeek:0,history:[],campaigns:0};
}
function score(c:CompanyPerformance):number{
 const cap=clamp(c.simulatedAnnualRevenue/Math.max(1,c.baselineAnnualRevenue),.5,1.8);
 return round(Math.log10(c.simulatedAnnualRevenue/1e9)*20+c.brandStrength*.18+c.awareness*.20+c.totalGrowthPct*.21+cap*8,3);
}
function rankFor(m:CompanyMarket,week:number):QuarterlyRanking{
 const sorted=FORTUNE_CANDIDATES.map(x=>m.companies[x.id]).filter(Boolean).sort((a,b)=>score(b)-score(a)||a.id.localeCompare(b.id));
 const previous=m.quarters[0]?.positions??{};
 const positions:Record<string,number>={},entries=sorted.slice(0,FORTUNE_BOARD_SIZE).map((c,i)=>{
  const rank=i+1,old=previous[c.id]??null;
  positions[c.id]=rank;
  return {id:c.id,rank,previousRank:old,change:old===null?0:old-rank,revenue:c.simulatedAnnualRevenue,score:round(score(c))};
 });
 for(let i=FORTUNE_BOARD_SIZE;i<sorted.length;i++)positions[sorted[i].id]=i+1;
 return {week,quarter:Math.floor(week/RANKING_CYCLE_WEEKS),positions,entries};
}
export function ensureCompanyMarket(s:GameState):CompanyMarket{
 if(!s.companyMarket)s.companyMarket={lastWeek:0,companies:{},quarters:[],pending:[],activity:[],
  macro:{coffee:0,beauty:0,fashion:0,education:0,tech:0,fitness:0,food:0},
  intelligence:{lastWeek:0,status:"rules",headline:"Business simulation ready",summary:"Market outcomes will be calculated each week.",signals:[]}};
 const m=s.companyMarket;
 for(const c of CLIENT_DATABASE)if(!m.companies[c.id])m.companies[c.id]=seedCompany(s,c.id);
 if(!Array.isArray(m.quarters))m.quarters=[];
 if(!m.quarters.length)m.quarters.push(rankFor(m,0));
 m.lastWeek=Math.max(0,m.lastWeek||0);m.pending??=[];m.activity??=[];
 return m;
}
/** Rebase only untouched profiles when the one-time Gemini estimate arrives.
 * Signed bids, played weeks, published figures and existing player cash stay frozen.
 */
export function applyInitialFinancialCalibration(s:GameState){
 const market=ensureCompanyMarket(s);
 if(market.lastWeek!==0||market.pending.length||market.activity.length)return false;
 for(const c of CLIENT_DATABASE){
  const performance=market.companies[c.id];
  if(!performance||performance.campaigns>0)continue;
  const adjusted=startingRevenue(s,c.id);
  performance.baselineAnnualRevenue=adjusted;
  performance.simulatedAnnualRevenue=adjusted;
 }
 market.quarters=[rankFor(market,0)];
 return true;
}
export function enqueueCompanyCampaign(s:GameState,info:Omit<MarketCampaignEvent,"id"|"week">){
 if(!CLIENT_BY_ID[info.clientId])return false;
 const m=ensureCompanyMarket(s);
 const week=Math.floor((s.clock.day-1)/7)+1;
 const id="campaign-"+info.actor+"-"+info.projectId;
 if(m.pending.some(e=>e.id===id)||m.activity.some(e=>e.id===id))return false;
 m.pending.push({...info,id,week});
 return true;
}
export function recordClientDelivery(s:GameState,info:{clientId:string|null|undefined;projectId:string;spendVnd:number;quality:number;kpi:number}){
 if(!info.clientId)return;
 enqueueCompanyCampaign(s,{clientId:info.clientId,projectId:info.projectId,actor:"player",agency:"Your Agency",
  spendVnd:Math.max(0,Math.round(info.spendVnd)),quality:clamp(info.quality,0,100),kpi:clamp(info.kpi,-30,100)});
}
export function recordRivalDelivery(s:GameState,info:{clientId:string;projectId:string;agency:string;spendVnd:number;quality:number}){
 enqueueCompanyCampaign(s,{clientId:info.clientId,projectId:info.projectId,actor:"rival",agency:info.agency,
  spendVnd:Math.max(0,Math.round(info.spendVnd)),quality:clamp(info.quality,0,100),kpi:info.quality>65?16:4});
}
const companySector=(c:CompanyPerformance)=>CLIENT_BY_ID[c.id]?.sector??"tech";
function campaignLift(s:GameState,e:MarketCampaignEvent,c:CompanyPerformance){
 const annual=currentMarketingBudgetVnd(s,CLIENT_BY_ID[e.clientId]);
 const spendFraction=Math.sqrt(Math.min(9,e.spendVnd/Math.max(1,annual/52)));
 const performance=clamp((e.quality-50)*.023+e.kpi*.014,-.65,2.1);
 return clamp(round((.085+performance*.26)*spendFraction),-.6,1.65);
}
/** Rival agencies may proactively run client marketing even when the player
 * is pursuing other companies. This is NOT a false contract in the CRM:
 * it is a separate AI-world market action and never posts player cash.
 */
function simulateAutonomousRivals(s:GameState,week:number){
 const m=ensureCompanyMarket(s),rivals=s.ceo?.rivals??[];
 if(!rivals.length)return;
 for(let i=0;i<Math.min(3,rivals.length);i++){
  const rival=rivals[(week+i*2)%rivals.length];
  const list=CLIENT_DATABASE.filter(x=>x.sector===SECTORS[(week+i*3)%SECTORS.length].id);
  const c=list[Math.floor(hash("client"+week+":"+i)*list.length)];
  const id="rival-autonomous-"+week+"-"+rival.id+"-"+c.id;
  if(m.pending.some(e=>e.id===id)||m.activity.some(e=>e.id===id))continue;
  const yearly=currentMarketingBudgetVnd(s,c);
  const budget=Math.min(yearly*.011,Math.max(500_000,yearly*.002*(.75+hash(id))));
  enqueueCompanyCampaign(s,{clientId:c.id,projectId:id,actor:"rival",agency:rival.name,
   spendVnd:Math.round(budget),quality:clamp(Math.round((rival.creative+rival.performance+rival.strategy)/3),25,98),kpi:12});
  const queued=m.pending.find(e=>e.projectId===id);
  if(queued)queued.week=week;
 }
}
export function advanceCompanyMarket(s:GameState,completedWeek:number,fx?:Fx){
 const m=ensureCompanyMarket(s);
 if(completedWeek<=m.lastWeek)return null;
 const weeks=Math.min(104,completedWeek-m.lastWeek);
 let recent:QuarterlyRanking|null=null;
 for(let iteration=0;iteration<weeks;iteration++){
  const week=m.lastWeek+1;
  simulateAutonomousRivals(s,week);
  const events=m.pending.filter(e=>e.week<=week);
  m.pending=m.pending.filter(e=>e.week>week);
  const impacts:Record<string,{player:number;rival:number;totalSpend:number}>={};
  for(const e of events){
   const company=m.companies[e.clientId];if(!company)continue;
   const effect=campaignLift(s,e,company);
   const v=impacts[e.clientId]??={player:0,rival:0,totalSpend:0};
   v[e.actor]+=effect;v.totalSpend+=e.spendVnd;
   company.campaigns++;
   m.activity.unshift({...e,impactPct:effect,week});
  }
  m.activity=m.activity.slice(0,96);
  const sectorPressure:Partial<Record<ClientSector,number>>={};
  for(const e of events.filter(e=>e.actor==="rival")){
   const industry=CLIENT_BY_ID[e.clientId].sector;
   sectorPressure[industry]=(sectorPressure[industry]??0)+.007;
  }
  for(const c of Object.values(m.companies)){
   const sector=companySector(c),v=impacts[c.id],master=CLIENT_BY_ID[c.id];
   const macro=clamp(m.macro[sector]??0,-.65,.65);
   const variation=(hash(c.id+":week:"+week)-.5)*.24;
   const baseGrowth=master.segment==="startup"?.33:master.segment==="sme"?.18:.10;
   const playerLift=v?.player??0,rivalLift=v?.rival??0;
   const competitionPenalty=Math.min(.19,Math.max(0,(sectorPressure[sector]??0)-(rivalLift>0?.02:0)));
   const growth=clamp(baseGrowth+variation+macro*.33+playerLift*.45+rivalLift*.35+clamp(c.momentum,-1.5,1.8)*.20-competitionPenalty,-1.6,2.2);
   c.simulatedAnnualRevenue=Math.max(1,Math.round(c.simulatedAnnualRevenue*(1+growth/100)));
   c.weeklyGrowthPct=round(growth);c.totalGrowthPct=round((c.simulatedAnnualRevenue/c.baselineAnnualRevenue-1)*100);
   c.awareness=clamp(round(c.awareness+playerLift*.45+rivalLift*.35-.03+variation*.16,2),0,100);
   c.brandStrength=clamp(round(c.brandStrength+growth*.09+playerLift*.09,2),5,100);
   c.momentum=clamp(round(c.momentum*.65+playerLift*.55+rivalLift*.4,3),-1.5,2);
   c.rivalPressure=round(competitionPenalty,3);
   c.playerMarketingImpact=round(c.playerMarketingImpact+playerLift,2);
   c.rivalMarketingImpact=round(c.rivalMarketingImpact+rivalLift,2);
   c.marketingSpendVnd+=v?.totalSpend??0;c.lastUpdatedWeek=week;
   if(week%4===0||v)c.history.push({week,revenue:c.simulatedAnnualRevenue,growth:round(growth),awareness:round(c.awareness),playerLift:round(playerLift),rivalLift:round(rivalLift)});
   if(c.history.length>28)c.history=c.history.slice(-28);
  }
  m.lastWeek=week;
  if(week%RANKING_CYCLE_WEEKS===0){recent=rankFor(m,week);m.quarters.unshift(recent);m.quarters=m.quarters.slice(0,12);
   fx?.log("Simulation Fortune 50 ranking published · game Week "+week);}
 }
 return recent;
}
export function currentFortuneBoard(s:GameState){return ensureCompanyMarket(s).quarters[0];}
export function projectedFortuneRanking(s:GameState){
 // Current simulated standing updates weekly; official game ranking only each quarter.
 const m=ensureCompanyMarket(s);
 return FORTUNE_CANDIDATES.map(x=>m.companies[x.id]).sort((a,b)=>score(b)-score(a)||a.id.localeCompare(b.id)).slice(0,50);
}
export function marketPreview(s:GameState,sector:ClientSector){
 const m=ensureCompanyMarket(s);
 return CLIENT_DATABASE.filter(x=>x.sector===sector).map(x=>m.companies[x.id]);
}
export function applyGeminiMarketIntelligence(s:GameState,report:{week:number;headline:string;summary:string;signals:{sector:ClientSector;momentum:number;reason:string}[];source:"gemini"|"rules"}){
 const m=ensureCompanyMarket(s);
 if(report.week<=m.intelligence.lastWeek||report.week>m.lastWeek||report.week<m.lastWeek-1)return false;
 for(const signal of report.signals){
  if(!SECTORS.some(x=>x.id===signal.sector)||!Number.isFinite(signal.momentum))continue;
  m.macro[signal.sector]=clamp(signal.momentum,-.65,.65);
 }
 m.intelligence={lastWeek:report.week,status:report.source,headline:report.headline.slice(0,115),
  summary:report.summary.slice(0,350),signals:report.signals.filter(x=>SECTORS.some(s=>s.id===x.sector)).slice(0,7)
   .map(x=>({...x,momentum:clamp(x.momentum,-.65,.65),reason:x.reason.slice(0,140)}))};
 return true;
}
export function marketIntelligencePayload(s:GameState){
 const m=ensureCompanyMarket(s),week=m.lastWeek;
 return {week,sectors:SECTORS.map(sector=>{
  const companies=CLIENT_DATABASE.filter(c=>c.sector===sector.id).map(c=>m.companies[c.id]);
  return {sector:sector.id,clientCount:companies.length,
   averageGrowth:round(companies.reduce((sum,c)=>sum+c.weeklyGrowthPct,0)/companies.length),
   averageAwareness:round(companies.reduce((sum,c)=>sum+c.awareness,0)/companies.length),
   campaignCount:companies.reduce((sum,c)=>sum+c.campaigns,0)};
 }),recent:m.activity.slice(0,6).map(e=>({sector:CLIENT_BY_ID[e.clientId]?.sector,actor:e.actor,impact:e.impactPct??0}))};
}
