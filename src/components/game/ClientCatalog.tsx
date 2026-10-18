import {useMemo,useState} from "react";
import {ArrowDown,BriefcaseBusiness,CheckCircle2,Database,Search,ShieldCheck,SlidersHorizontal} from "lucide-react";
import {Button} from "@/components/ui/button";
import {useGame,act} from "@/game/store";
import * as C from "@/game/campaign";
import * as M from "@/game/clientMarket";
import {CLIENT_COUNTS,queryClients,SECTORS,type ClientSector,type ClientSegment,type ClientMaster} from "@/game/clientDatabase";
import {money} from "@/game/data";
import {FortuneSimulationBoard} from "./FortuneSimulationBoard";
import {marketCompany,ensureCompanyMarket} from "@/game/companyMarket";

type Mode="freelancer"|"agency";
const SEGMENTS=[{id:"all",title:"All sizes"},{id:"startup",title:"Startup"},{id:"sme",title:"SMEs"},{id:"bigcorp",title:"Big Corp"}] as const;
const number=(n:number)=>new Intl.NumberFormat("en-US",{maximumFractionDigits:0}).format(n);
function companySize(c:ClientMaster){
 if(c.basis==="fortune-2026")return "Fortune 500 US 2026 #"+c.fortuneRank;
 return c.employees===null?"Unknown":number(c.employees)+" employees · simulated";
}
function businessMoney(c:ClientMaster,sim?:{simulatedAnnualRevenue:number;currency:string}){
 if(sim)return sim.currency==="USD"?"$"+(sim.simulatedAnnualRevenue/1e9).toFixed(1)+"B sim.":money(sim.simulatedAnnualRevenue)+" sim.";
 if(c.verifiedRevenueUsd!==null)return "$"+(c.verifiedRevenueUsd/1e9).toFixed(1)+"B USD";
 if(c.annualRevenueVnd!==null)return money(c.annualRevenueVnd);
 return "Not independently verified";
}
export function ClientCatalog({mode="freelancer",onSelected}:{mode?:Mode;onSelected?:()=>void}){
 const game=useGame(x=>x);
 const [sector,setSector]=useState<ClientSector|"all">("all");
 const [segment,setSegment]=useState<ClientSegment|"all">("all");
 const [sort,setSort]=useState<"rank"|"scale"|"revenue"|"budget"|"awareness"|"name">("rank");
 const [query,setQuery]=useState("");
 const [onlyFortune,setOnlyFortune]=useState(false);
 const [shown,setShown]=useState(12);
 const [selected,setSelected]=useState<string|null>(null);
 const segments=mode==="freelancer"?SEGMENTS.filter(s=>s.id!=="bigcorp"):SEGMENTS;
 const all=useMemo(()=>queryClients({sector,segment:mode==="freelancer"&&segment==="bigcorp"?"all":segment,search:query,sort,fortuneOnly:mode==="agency"&&onlyFortune}).filter(c=>mode==="agency"||c.segment!=="bigcorp"),[sector,segment,query,sort,onlyFortune,mode]);

 const gameMarket=ensureCompanyMarket(game);
 const latest=gameMarket.quarters[0];
 const liveAll=[...all];
 if(sort==="revenue")liveAll.sort((a,b)=>{
  const conv=(c:ClientMaster)=>{const p=gameMarket.companies[c.id];return p.simulatedAnnualRevenue*(p.currency==="USD"?25000:1);};
  return conv(b)-conv(a);
 });
 if(sort==="awareness")liveAll.sort((a,b)=>gameMarket.companies[b.id].awareness-gameMarket.companies[a.id].awareness);
 if(sort==="rank")liveAll.sort((a,b)=>{
  const x=latest.positions[a.id]??1000,y=latest.positions[b.id]??1000;
  return a.segment==="bigcorp"&&b.segment==="bigcorp"?x-y:b.commercialScore-a.commercialScore;
 });
 const canSelect=mode==="agency"?game.agencyUnlocked:game.campaign.phase==="brief";
 const clients=liveAll.slice(0,shown);
 const next="Approach";
 return <div className="mt-client-catalog">
  <header className="mt-client-catalog-head"><div><small>CLIENT INTELLIGENCE / MASTER DATABASE V1</small><h2>Client Marketplace</h2>
   <p>{mode==="freelancer"?"Approach a Startup or SME from your bedroom. Gemini generates that company’s fictional business context, discovery dialogue, insight and strategy. No prewritten brief is used.":"Research businesses by scale, sector and simulated market signals; approach any client for a fictional RFP."}</p></div><Database size={25}/></header>
  <div className="mt-client-catalog-summary">
   <div><small>CANONICAL CLIENTS</small><b>{CLIENT_COUNTS.total}</b></div>
   <div><small>STARTUPS</small><b>{CLIENT_COUNTS.startup}</b></div>
   <div><small>SMEs</small><b>{CLIENT_COUNTS.sme}</b></div>
   <div><small>BIG CORP</small><b>{CLIENT_COUNTS.bigcorp}</b></div>
  </div>
  {mode==="agency"&&<FortuneSimulationBoard/>}
  <div className="mt-client-filters">
   <label><span>Sector</span><select aria-label="Client sector" value={sector} onChange={e=>{setSector(e.target.value as ClientSector|"all");setShown(12);}}><option value="all">All 7 sectors</option>{SECTORS.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}</select></label>
   <label><span>Company size</span><select aria-label="Client segment" value={segment} onChange={e=>{setSegment(e.target.value as ClientSegment|"all");setShown(12);}}>{segments.map(s=><option key={s.id} value={s.id}>{s.title}</option>)}</select></label>
   <label><span>Sort by</span><select aria-label="Client ranking" value={sort} onChange={e=>setSort(e.target.value as typeof sort)}><option value="rank">Commercial Index</option><option value="scale">Company Scale</option><option value="revenue">Revenue</option><option value="budget">Marketing Budget</option><option value="awareness">Brand Awareness</option><option value="name">Company Name</option></select></label>
   <label className="mt-client-search"><span>Find company</span><div><Search size={15}/><input value={query} onChange={e=>{setQuery(e.target.value);setShown(12);}} aria-label="Search client companies" placeholder="Brand or sector"/></div></label>
   {mode==="agency"&&<label className="mt-client-check"><input type="checkbox" checked={onlyFortune} onChange={e=>{setOnlyFortune(e.target.checked);setShown(12);}}/> Fortune 50 only</label>}
  </div>
  <div className="mt-client-catalog-count"><span>{all.length} matching clients · showing {clients.length}</span><span>7 sectors · 3 segments</span></div>
  <div className="mt-client-results">
   {clients.map(c=><article key={c.id} className={"mt-client-profile "+(selected===c.id?"is-selected":"")}>
    <div className="mt-client-profile-head"><div className="mt-client-profile-badges"><span>{c.segment==="bigcorp"?"BIG CORP":c.segment==="sme"?"SME":"STARTUP"}</span><span>{SECTORS.find(x=>x.id===c.sector)?.label}</span>{c.fortuneRank!==null&&<span className="mt-client-fortune">PUBLISHED 2026 · #{c.fortuneRank}</span>}
    {c.segment==="bigcorp"&&latest.positions[c.id]<=50&&<span className="mt-client-fortune">GAME F50 · #{latest.positions[c.id]}</span>}</div><span className="mt-client-ranking">#{c.commercialScore} index</span></div>
    <h3>{c.brand}</h3><p>{c.description}</p>
    <div className="mt-client-profile-metrics">
     <div><small>SIMULATED ANNUAL REVENUE</small><b>{businessMoney(c,gameMarket.companies[c.id])}</b></div>
     <div><small>MARKETING BUDGET / YEAR</small><b>{money(c.marketingBudgetVnd)}</b></div>
     <div><small>AWARENESS · GAME INDEX</small><b>{Math.round(gameMarket.companies[c.id]?.awareness??c.brandAwareness)}/100</b></div>
     <div><small>SCALE</small><b>{companySize(c)}</b></div>
     <div><small>GAME GROWTH</small><b>{(gameMarket.companies[c.id]?.totalGrowthPct??0).toFixed(2)}%</b></div>
     <div><small>RIVAL CAMPAIGNS</small><b>{gameMarket.activity.filter(x=>x.clientId===c.id&&x.actor==="rival").length}</b></div>
    </div>
    <div className="mt-client-profile-footer"><small>{c.basis==="fortune-2026"?"Real company and published rank; proposal and marketing figures are fictional.":"Fictional company · modeled revenue, team size, awareness and budget."}</small>
     <Button size="sm" variant={selected===c.id?"outline":"default"} disabled={!canSelect||(mode==="agency"&&M.isOpenCatalogLead(game,c.id))}
      onClick={()=>{
       if(mode==="freelancer")act((s,fx)=>C.chooseFreelanceClient(s,fx,c.id));
       else act((s,fx)=>M.approachCatalogClient(s,fx,c.id));
       setSelected(c.id);
       onSelected?.();
      }}>{mode==="agency"&&M.isOpenCatalogLead(game,c.id)?"In pipeline":selected===c.id?"Approached":next+" client"}</Button>
    </div>
    {selected===c.id&&<div className="mt-client-confirmation"><CheckCircle2 size={15}/> {mode==="freelancer"?"Gemini is preparing this client’s context and strategy. Open the selected client to follow progress or retry.":"Lead added to Pipeline. Qualify it, pitch and negotiate before forming a dedicated client team."}</div>}
    {selected===c.id&&mode==="agency"&&c.basis==="fortune-2026"&&<a href={c.rankingSource??"https://fortune.com/ranking/fortune500/"} target="_blank" rel="noreferrer" className="mt-client-source">View Fortune 2026 ranking ↗</a>}
   </article>)}
  </div>
  {!clients.length&&<p className="mt-client-empty">No matching clients. Try a different sector or company size.</p>}
  {shown<all.length&&<Button variant="outline" className="w-full" onClick={()=>setShown(n=>n+12)}>Show 12 more <ArrowDown size={15}/></Button>}
  <p className="mt-client-disclaimer"><ShieldCheck size={15}/> Data policy: fictional clients use deterministic simulated profiles. Fortune status comes from Fortune 500 US (2026); only individually checked revenue is labeled verified. Marketing budgets, brand awareness and all contracts are fictional gameplay assumptions, not corporate disclosures.</p>
 </div>;
}
