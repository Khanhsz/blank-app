import {useState} from "react";
import {Building2,LockKeyhole,ShieldCheck,ArrowRight} from "lucide-react";
import {Button} from "@/components/ui/button";
import {act,useGame} from "@/game/store";
import {FORTUNE_CLIENTS,fortuneRfpStatus,canContractFortune} from "@/game/fortuneAccounts";
import {approachFortuneAtHQ,isOpenCatalogLead} from "@/game/clientMarket";
import {currentMarketingBudgetVnd} from "@/game/companyMarket";
import {money} from "@/game/data";
import {FortuneSimulationBoard} from "./FortuneSimulationBoard";

/** Accessed only by visiting the Corporate HQ building in the city.
 * These are separate simulated corporate offices, NOT marketplace listings.
 */
export function FortuneHeadquarters({onOpenDeal}:{onOpenDeal:()=>void}){
 const s=useGame(x=>x);
 const [visited,setVisited]=useState<string|null>(null);
 const selected=FORTUNE_CLIENTS.find(c=>c.id===visited)??null;
 const status=selected?fortuneRfpStatus(s,selected.id):null;
 const gate=selected?canContractFortune(s,selected.id):null;
 const already=selected?isOpenCatalogLead(s,selected.id):false;
 const signed=s.ceo?.projects.find(p=>p.clientMasterId===selected?.id&&p.contractTerms&&p.status==="active");
 return <div className="mt-fortune-hq">
  <div className="mt-location-identity"><span className="mt-location-eyebrow">CORPORATE MILE / GLOBAL CLIENT HEADQUARTERS</span>
   <h3>Fortune 50 · HQ Visits</h3>
   <p>Choose a company office to visit. Fortune accounts never accept direct Marketplace pitches. All contracts, incumbents and negotiations are fictional game scenarios.</p>
  </div>
  <div className="mt-client-catalog-count"><span>{FORTUNE_CLIENTS.length} simulated headquarters</span><span>365-day agency retainers</span></div>
  <div className="mt-client-results">
   {FORTUNE_CLIENTS.map(firm=>{
    const st=fortuneRfpStatus(s,firm.id);
    return <button type="button" key={firm.id} aria-pressed={visited===firm.id} onClick={()=>setVisited(firm.id)}
     className={"mt-fortune-office "+(visited===firm.id?"selected":"")} style={{display:"flex",alignItems:"center",justifyContent:"space-between",width:"100%",gap:12,padding:"12px",border:"1px solid var(--border)",borderRadius:6,marginBottom:6,textAlign:"left"}}>
     <span><b>#{firm.fortuneRank} · {firm.brand}</b><small style={{display:"block"}}>{firm.businessModel} · {st.owner?"Incumbent: "+st.ownerName:"Open account"}</small></span>
     <span>{st.owner&&st.remaining>90?<LockKeyhole size={16}/>:<Building2 size={17}/>}</span>
    </button>;
   })}
  </div>
  {selected&&status&&<section className="mt-growth-flow" style={{marginTop:12}}>
   <h4>{selected.brand} · corporate office</h4>
   <p>Fortune US 2026 #{selected.fortuneRank} · {selected.market}. Company identity is real; brief, agency relationship and contract are gameplay simulations.</p>
   <div className="mt-location-stat-grid">
    <div><small>ANNUAL MARKETING BUDGET · SIM.</small><b>{money(currentMarketingBudgetVnd(s,selected))}</b></div>
    <div><small>ACCOUNT HOLDER</small><b>{status.owner?status.ownerName:"Unassigned"}</b></div>
    <div><small>EXISTING TERM</small><b>{status.owner?status.remaining+" days remaining":"Available"}</b></div>
   </div>
   {selected.fortuneRank!==null&&selected.fortuneRank<=10&&<p><ShieldCheck size={14}/> Top 10 sector exclusivity: one agency may not simultaneously serve another top-10 client in the same industry.</p>}
   {signed&&<p><b>Active 12-month agreement</b> · Paid annual service fee {money(signed.contractTerms!.annualServiceFeeVnd)} · Ends day {signed.contractTerms!.endDay}.</p>}
   <p>{gate?.reason}</p>
   <Button block disabled={!gate?.ok||already} onClick={()=>{
    let success=false;
    act((d,fx)=>{success=approachFortuneAtHQ(d,fx,selected.id);});
    if(success)onOpenDeal();
   }}>{already?"Already in pipeline":gate?.ok?"Approach "+selected.brand+" from HQ":"HQ approach unavailable"} <ArrowRight size={15}/></Button>
   <small>Procurement: contact → discovery → RFP qualification → competitive pitch → negotiation → 365-day written agreement. Annual service fee is invoiced once and settled on signing; media funds are separate.</small>
  </section>}
  <FortuneSimulationBoard/>
 </div>;
}
