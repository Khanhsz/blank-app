import {useState} from "react";
import {ArrowDown,ChartNoAxesCombined} from "lucide-react";
import {useGame} from "@/game/store";
import {CLIENT_BY_ID} from "@/game/clientDatabase";
import {ensureCompanyMarket,RANKING_CYCLE_WEEKS,FORTUNE_CANDIDATES} from "@/game/companyMarket";

export function FortuneSimulationBoard(){
 const s=useGame(x=>x),[full,setFull]=useState(false);
 const market=ensureCompanyMarket(s),current=market.quarters[0];
 const visible=full?current.entries:current.entries.slice(0,10);
 const next=RANKING_CYCLE_WEEKS-market.lastWeek%RANKING_CYCLE_WEEKS;
 return <div className="mt-fortune-simulator">
  <header className="mt-fortune-header"><div><small>BIG CORP ONLY · SIMULATION</small><h3>Fortune 50 — Game World</h3>
   <p>Quarterly ranking among {FORTUNE_CANDIDATES.length} Big Corp competitors. This is not Fortune Magazine's official list.</p></div>
   <ChartNoAxesCombined size={23}/>
  </header>
  <div className="mt-fortune-stats">
   <span>Ranking as of <b>Week {current.week}</b></span>
   <span>Next refresh <b>{next} weeks</b></span>
   <span>Entrants <b>{FORTUNE_CANDIDATES.length}</b></span>
   <span>Positions <b>Top 50</b></span>
  </div>
  <div className="mt-fortune-thead"><span>Rank / Big Corp</span><span>Sim. annual revenue</span><span>Move</span></div>
  {visible.map(e=>{
   const master=CLIENT_BY_ID[e.id],p=market.companies[e.id];
   return <div className="mt-fortune-entry" key={e.id}>
    <div className="mt-fortune-name"><strong>#{e.rank}</strong><div><b>{master.brand}</b>
     <small>{master.industry}{master.fortuneRank!==null?" · Published 2026 #"+master.fortuneRank:" · fictional"}</small></div></div>
    <div className="mt-fortune-amount"><b>{"$"+(p.simulatedAnnualRevenue/1e9).toFixed(1)+"B"}</b>
     <small>{p.totalGrowthPct>=0?"+":""}{p.totalGrowthPct.toFixed(1)}% game growth</small></div>
    <span className={"mt-fortune-change "+(e.change>0?"up":e.change<0?"down":"")}>{e.previousRank===null?"NEW":e.change>0?"▲ "+e.change:e.change<0?"▼ "+Math.abs(e.change):"—"}</span>
   </div>;
  })}
  {current.entries.length>10&&<button type="button" className="mt-fortune-expand" onClick={()=>setFull(x=>!x)}>{full?"Show top 10":"Show all top 50"} <ArrowDown size={14}/></button>}
  <div className="mt-fortune-intelligence"><b>{market.intelligence.status==="gemini"?"Gemini Business Intelligence":"Rule-Based Market Intelligence"}</b>
   <p>{market.intelligence.headline}</p><small>{market.intelligence.summary}</small>
   <span>Report Week {market.intelligence.lastWeek} · signals affect future weeks only</span>
  </div>
  <p className="mt-fortune-note">Ranking, simulated revenue, brand strength and growth are hypothetical game values. Published Fortune 2026 ranks remain separately displayed as immutable background information. Advance the game with End Week; no real-world company ranking is modified.</p>
 </div>;
}
