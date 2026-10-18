import {useState} from "react";
import {Building2,LockKeyhole,ShieldCheck,ArrowRight} from "lucide-react";
import {Button} from "@/components/ui/button";
import {act,useGame} from "@/game/store";
import {rankedFortuneClients,fortuneRfpStatus,canContractFortune,isGameFortuneTop10} from "@/game/fortuneAccounts";
import {approachFortuneAtHQ,isOpenCatalogLead} from "@/game/clientMarket";
import {currentMarketingBudgetVnd} from "@/game/companyMarket";
import {money} from "@/game/data";
import {FortuneSimulationBoard} from "./FortuneSimulationBoard";

/** Accessed only by visiting the Corporate HQ building in the city.
 * These are separate simulated corporate offices, NOT marketplace listings.
 */
export function FortuneHeadquarters({onOpenDeal,onVisitCompany,forcedClientId}:{onOpenDeal:()=>void;onVisitCompany?:(clientId:string)=>void;forcedClientId?:string}){
 const s=useGame(x=>x);
 const [visited,setVisited]=useState<string|null>(null);
 const ranked=rankedFortuneClients(s);
 const current=ranked.find(c=>c.firm.id===(forcedClientId??visited));
 const selected=current?.firm??null;
 const status=selected?fortuneRfpStatus(s,selected.id):null;
 const gate=selected?canContractFortune(s,selected.id):null;
 const already=selected?isOpenCatalogLead(s,selected.id):false;
 const signed=s.ceo?.projects.find(p=>p.clientMasterId===selected?.id&&p.contractTerms&&p.status==="active");
 return <div className="mt-fortune-hq">
  <div className="mt-location-identity"><span className="mt-location-eyebrow">CORPORATE MILE / GLOBAL CLIENT HEADQUARTERS</span>
   <h3>Fortune 50 · HQ Visits</h3>
   <p>{forcedClientId?"You are visiting this company's in-game office. Review incumbent commitments before requesting a meeting.":"This is the in-game corporate directory. Select a ranked company to locate and visit its simulated HQ office before approaching procurement."} All contracts and incumbent agency relationships are simulated.</p>
  </div>
  {!forcedClientId&&<div className="mt-client-catalog-count"><span>{ranked.length} live ranked headquarters</span><span>365-day agency retainers</span></div>}
  {!forcedClientId&&<div className="mt-client-results">
   {ranked.map(({firm,rank})=>{
    const st=fortuneRfpStatus(s,firm.id);
    return <button type="button" key={firm.id} aria-pressed={visited===firm.id} onClick={()=>setVisited(firm.id)}
     className={"mt-fortune-office "+(visited===firm.id?"selected":"")} style={{display:"flex",alignItems:"center",justifyContent:"space-between",width:"100%",gap:12,padding:"12px",border:"1px solid var(--border)",borderRadius:6,marginBottom:6,textAlign:"left"}}>
     <span><b>GAME #{rank} · {firm.brand}</b><small style={{display:"block"}}>{firm.businessModel} · {st.owner?"Incumbent: "+st.ownerName:"Open account"}</small></span>
     <span>{st.owner&&st.remaining>90?<LockKeyhole size={16}/>:<Building2 size={17}/>}</span>
    </button>;
   })}
  </div>}
  {selected&&status&&<section className="mt-growth-flow" style={{marginTop:12}}>
   <h4>{selected.brand} · corporate office</h4>
   <p>Game Fortune 50 rank #{current!.rank}{selected.fortuneRank!==null?" · Published US Fortune 2026 #"+selected.fortuneRank:" · Fictional Big Corp"} · {selected.market}. Marketing briefs, agency relationships and contracts are simulated.</p>
   <div className="mt-location-stat-grid">
    <div><small>ANNUAL MARKETING BUDGET · SIM.</small><b>{money(currentMarketingBudgetVnd(s,selected))}</b></div>
    <div><small>ACCOUNT HOLDER</small><b>{status.owner?status.ownerName:"Unassigned"}</b></div>
    <div><small>EXISTING TERM</small><b>{status.owner?status.remaining+" days remaining":"Available"}</b></div>
   </div>
   {isGameFortuneTop10(s,selected.id)&&<p><ShieldCheck size={14}/> Top 10 sector exclusivity: one agency may not simultaneously serve another top-10 client in the same industry.</p>}
   {signed&&<p><b>Active 12-month agreement</b> · Paid annual service fee {money(signed.contractTerms!.annualServiceFeeVnd)} · Ends day {signed.contractTerms!.endDay}.</p>}
   <p>{gate?.reason}</p>
   <Button className="w-full" disabled={!!forcedClientId&&(!gate?.ok||already)} onClick={()=>{
    if(!forcedClientId){onVisitCompany?.(selected.id);return;}
    let success=false;
    act((d,fx)=>{success=approachFortuneAtHQ(d,fx,selected.id);});
    if(success)onOpenDeal();
   }}>{!forcedClientId?"Visit "+selected.brand+" corporate office":already?"Already in pipeline":gate?.ok?"Approach "+selected.brand+" from HQ":"HQ approach unavailable"} <ArrowRight size={15}/></Button>
   <small>Procurement: contact → discovery → RFP qualification → competitive pitch → negotiation → 365-day written agreement. Annual service fee is invoiced once and settled on signing; media funds are separate.</small>
  </section>}
  {!forcedClientId&&<FortuneSimulationBoard/>}
 </div>;
}
