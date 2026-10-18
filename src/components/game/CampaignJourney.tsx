import {useEffect,useState} from "react";
import {Activity,ArrowRight,BookOpen,Check,CheckCircle2,ClipboardCheck,Clock3,Coins,FileText,FlaskConical,Lightbulb,MessageCircle,Play,Radio,Search,Send,Target,TrendingUp,Users} from "lucide-react";
import {Button} from "@/components/ui/button";
import {act,useGame} from "@/game/store";
import * as C from "@/game/campaign";
import * as J from "@/game/journey";
import {creatives,insights,mediaChannels,money,objectives,optimizations,positions,researchOptions,segments,surveyCosts,type Channel} from "@/game/data";
import {AnimatedGauge,GameSection,GameStat,FeedbackStrip} from "./GameVisuals";
import {AutomaticBriefWaiting} from "./AIBriefLauncher";
import {FreelanceJobDesk} from "./FreelanceJobDesk";
import {FreelanceV4Desk} from "./FreelanceV4Desk";
import {getFreelanceJob} from "@/game/freelanceJobTemplates";
import {ClientCatalog} from "./ClientCatalog";
import type {Campaign,CampaignJourney,JourneyStep} from "@/game/state";

function Option({selected,title,sub,onClick,disabled=false}:{selected:boolean;title:string;sub?:string;onClick:()=>void;disabled?:boolean}){
 return <button disabled={disabled} type="button" onClick={onClick} className={"mt-journey-option "+(selected?"selected":"")} aria-pressed={selected}>
  <span className="mt-journey-option-copy"><b>{title}</b>{sub&&<small>{sub}</small>}</span>
  <span className="mt-journey-choice-indicator">{selected?<Check size={15}/>:<span className="mt-journey-choice-empty"/>}</span>
 </button>;
}
function Detail({title,children}:{title:string;children:React.ReactNode}){
 return <details className="mt-workstream"><summary>{title}</summary><div className="mt-journey-detail">{children}</div></details>;
}
function ClientMemo({text}:{text:string}){return <div className="mt-journey-memo"><MessageCircle size={19}/><p>{text}</p></div>;}
function MissionHeader({step,sub}:{step:string;sub:string}){return <div className="mt-journey-mission-head"><small>YOUR NEXT ASSIGNMENT</small><h3>{step}</h3><p>{sub}</p></div>;}
function Memory({c,j}:{c:Campaign;j:CampaignJourney}){
 const sc=C.scenarioOf(c),spent=Object.values(c.media).reduce((a,b)=>a+b,0);
 return <details className="mt-journey-memory"><summary><BookOpen size={16}/> Campaign Memory <span>View decisions</span></summary>
  <div className="mt-journey-memory-grid">
   <div><small>BRIEF</small><b>{sc.brand}</b><span>{sc.summary}</span></div>
   <div><small>DIAGNOSIS</small><b>{J.DIAGNOSES.find(d=>d.id===j.diagnosis)?.title??"Not diagnosed"}</b><span>{j.questions.length} questions clarified</span></div>
   <div><small>EVIDENCE</small><b>{c.insight?insights.find(x=>x.id===c.insight)?.title??c.insight:"Pending"}</b><span>{c.research.length} research sources · confidence {j.confidence||"—"}%</span></div>
   <div><small>STRATEGY</small><b>{j.approach?J.APPROACHES.find(x=>x.id===j.approach)?.title:"Pending"}</b><span>{c.strategy.segment} · {c.strategy.objective} · {c.strategy.position}</span></div>
   <div><small>CREATIVE</small><b>{creatives.find(x=>x.id===c.creative)?.title??"Not signed off"}</b><span>{j.message||"No key message yet"}</span></div>
   <div><small>MEDIA & RESULTS</small><b>{money(spent)} booked</b><span>{c.final?c.final.pct+"% KPI uplift":c.liveWeeks?c.liveWeeks+" live weeks":"Awaiting launch"}</span></div>
  </div>
 </details>;
}
function Main({c}:{c:Campaign}){
 const s=useGame(x=>x),sc=C.scenarioOf(c),j=J.journeyOf(c),step=j.step;
 const schedule=C.scheduleOf(c),stepIndex=J.JOURNEY_STEPS.findIndex(x=>x.id===step);
 const [diagnosis,setDiagnosis]=useState(j.diagnosis??"discover");
 const [insight,setInsight]=useState(c.insight??"");
 const [strategy,setStrategy]=useState(c.strategy);
 const [approach,setApproach]=useState<CampaignJourney["approach"]>(j.approach??"reach");
 const [concept,setConcept]=useState(j.pitchedCreative??c.creative??"study");
 const [message,setMessage]=useState(j.message);
 const [plan,setPlan]=useState<J.MediaPlanId>("balanced");
 const [useCustom,setUseCustom]=useState(false);
 const [custom,setCustom]=useState<Record<Channel,number>>({paid:0,creator:0,promo:0,flyer:0});
 const [survey,setSurvey]=useState({audience:"students",sample:60,question:"barrier"});
 const [highlight,setHighlight]=useState("kpi"),[reason,setReason]=useState("insight"),[next,setNext]=useState("validate");
 const remaining=Math.max(0,sc.budget-c.spent),daysLeft=Math.max(0,schedule.endDay-s.clock.day);
 const selectedPlan=J.mediaAllocation(s,plan),mediaDraft=useCustom?custom:selectedPlan;
 const mediaSum=Object.values(mediaDraft).reduce((a,b)=>a+b,0);
 const currentStep=J.JOURNEY_STEPS[Math.max(0,stepIndex)];
 const stage=stepIndex<=2?"Planning":stepIndex<=4?"Executing":"Live";
 const ready=c.creative&&c.mediaBooked&&s.clock.day>=(c.productionReadyDay??Infinity)&&s.clock.day<schedule.endDay;
 const report=c.final;
 if(s.agencyUnlocked)return <p className="text-sm text-muted-foreground">Your agency delivery is now managed through CEO Command Center → Projects and Functions.</p>;
 if(c.phase==="brief"&&(!c.aiScenario||c.aiStatus!=="ready"))return <AutomaticBriefWaiting campaign={c}/>;
 return <div className="mt-journey">
  <div className="mt-journey-topline"><div><small>CAMPAIGN JOURNEY · WEEK {s.clock.week}</small><h2>{sc.brand}</h2><p>{sc.summary}</p></div><span className="mt-journey-act">{stage}</span></div>
  <div className="mt-journey-stats"><GameStat label="BUDGET LEFT" value={money(remaining)} icon={<Coins size={16}/>}/><GameStat label="CLIENT KPI" value={"+"+sc.target+"%"} icon={<Target size={16}/>}/><GameStat label="DAYS LEFT" value={String(daysLeft)} icon={<Clock3 size={16}/>}/></div>
  <div className="mt-journey-route" aria-label="Seven campaign missions">
    {J.JOURNEY_STEPS.map((x,i)=><div key={x.id} title={x.label} className={"mt-journey-node "+(i<stepIndex?"done ":i===stepIndex?"active ":"")}>
      <span>{i<stepIndex?<Check size={13}/>:String(i+1).padStart(2,"0")}</span><small>{x.short}</small>
    </div>)}
  </div>
  <div className="mt-journey-weekbar"><span>Day {s.clock.day} · Campaign deadline Day {schedule.endDay}</span><span>{currentStep.output}</span></div>
  <div className="mt-journey-mission" key={step}>
  {step==="brief"&&<>
   <MissionHeader step="01 · Client Discovery" sub="You approached this client from your bedroom. Gemini created its fictional context and discovery dialogue. Diagnose the business problem before accepting the campaign."/>
   {sc.aiPlanning?.context&&<div className="mt-journey-blueprint"><span><BookOpen size={16}/> GEMINI · SIMULATED BUSINESS CONTEXT</span><b>{sc.aiPlanning.context}</b><small>Scenario assumptions generated for training · not real-world verified research</small></div>}
   <ClientMemo text={sc.client||sc.summary}/>
   <div className="mt-journey-section-head"><b>Ask your client</b><small>{j.questions.length}/4 clarified · minimum 2</small></div>
   <div className="mt-journey-options">{J.BRIEF_QUESTIONS.map(q=><div key={q.id}>
    <Option selected={j.questions.includes(q.id)} title={q.label} sub={q.hint} onClick={()=>act((d,fx)=>J.askClient(d,fx,q.id))}/>
    {j.questions.includes(q.id)&&<div className="mt-journey-client-answer"><MessageCircle size={15}/>{J.briefAnswer(s,q.id)}</div>}
   </div>)}</div>
   <div className="mt-journey-section-head"><b>What's the core business problem?</b><small>Your initial hypothesis</small></div>
   <div className="mt-journey-options">{J.DIAGNOSES.map(d=><Option key={d.id} selected={diagnosis===d.id} title={d.title} sub={d.desc} onClick={()=>setDiagnosis(d.id)}/>)}</div>
   <Button className="w-full" disabled={j.questions.length<2} onClick={()=>act((d,fx)=>J.approveBrief(d,fx,diagnosis))}>Diagnose Brief → Insight Lab <ArrowRight size={16}/></Button>
  </>}
  {step==="research"&&<>
   <MissionHeader step="02 · Insight Lab" sub="Gemini provides a hypothesis, but you must validate it with simulated research and make your own call."/>
   {sc.aiPlanning?.insight&&<div className="mt-journey-blueprint"><span><Lightbulb size={16}/> GEMINI · INSIGHT HYPOTHESIS</span><b>{sc.aiPlanning.insight}</b><small>Unverified hypothesis. Commission evidence and select the insight you can defend.</small></div>}
   <div className="mt-journey-section-head"><b>Evidence Board</b><small>{c.research.length} commissioned</small></div>
   <div className="mt-journey-evidence">{researchOptions.map(r=><div className={"mt-journey-evidence-card "+(c.research.includes(r.id)?"found":"")} key={r.id}>
    <div className="mt-journey-evidence-head"><b>{r.title}</b><small>{money(r.cost)}</small></div>
    <p>{c.research.includes(r.id)?sc.reports[r.id]:r.description}</p>
    {c.research.includes(r.id)?<span className="mt-journey-verified"><CheckCircle2 size={14}/> Added to evidence board</span>:<Button variant="outline" size="sm" disabled={r.cost>remaining} onClick={()=>act((d,fx)=>C.addResearch(d,fx,r.id))}>Commission source</Button>}
   </div>)}</div>
   <Detail title="Optional deep dive · Field survey">
    {c.survey?<FeedbackStrip tone="positive">Survey completed · {C.surveyResults(s).primary}% key signal · evidence quality {C.surveyResults(s).quality}%</FeedbackStrip>:<>
     <p className="mt-journey-hint">Interview a broader sample when the current evidence is inconclusive. A mismatched audience can still produce misleading confidence.</p>
     <div className="mt-journey-inline"><select aria-label="Survey audience" value={survey.audience} onChange={e=>setSurvey({...survey,audience:e.target.value})}>{segments.map(x=><option key={x.id} value={x.id}>{x.title}</option>)}</select>
     <select aria-label="Survey sample" value={survey.sample} onChange={e=>setSurvey({...survey,sample:+e.target.value})}>{[20,60,120].map(n=><option key={n} value={n}>{n} people · {money(surveyCosts[n])}</option>)}</select>
     <select aria-label="Survey question" value={survey.question} onChange={e=>setSurvey({...survey,question:e.target.value})}><option value="barrier">Purchase barrier</option><option value="like">Preference</option></select></div>
     <Button variant="outline" className="w-full mt-2" disabled={surveyCosts[survey.sample]>remaining} onClick={()=>act((d,fx)=>C.runSurvey(d,fx,survey))}>Run consumer survey</Button>
    </>}
   </Detail>
   <div className="mt-journey-section-head"><b>Your insight hypothesis</b><small>Consider the strength of the evidence</small></div>
   <div className="mt-journey-options">{(sc.insightOptions??insights).map(x=><Option key={x.id} selected={insight===x.id} title={x.title} sub={x.desc} onClick={()=>setInsight(x.id)}/>)}</div>
   <div className="mt-journey-confidence"><span>Evidence confidence</span><strong>{J.evidenceConfidence(s)}%</strong><div className="mt-journey-meter"><i style={{width:J.evidenceConfidence(s)+"%"}}/></div><small>Confidence estimates the coverage and survey quality, not whether your conclusion is automatically correct.</small></div>
   <Button className="w-full" disabled={!insight||(!c.research.length&&!c.survey)} onClick={()=>act((d,fx)=>J.approveInsight(d,fx,insight))}>Validate Insight → Strategy Workshop <ArrowRight size={16}/></Button>
  </>}
  {step==="strategy"&&<>
   <MissionHeader step="03 · Strategy Workshop" sub="Translate your research into a strategic decision. Gemini gives a direction, not a guaranteed winning answer."/>
   {sc.aiPlanning?.strategy&&<div className="mt-journey-blueprint"><span><Target size={16}/> GEMINI · STRATEGY DIRECTION</span><b>{sc.aiPlanning.strategy}</b><small>Use this fictional recommendation to challenge your own audience, objective, positioning and campaign approach.</small></div>}
   <div className="mt-journey-blueprint"><span><Lightbulb size={17}/> DISCOVERED INSIGHT</span><b>{(sc.insightOptions??insights).find(x=>x.id===c.insight)?.title??c.insight}</b><small>Evidence confidence · {j.confidence}%</small></div>
   <div className="mt-journey-canvas">
    {([{key:"segment",label:"WHO · Priority audience",options:segments},{key:"objective",label:"WHAT · Business response",options:objectives},{key:"position",label:"WHY · Value proposition",options:positions}] as const).map(row=><div className="mt-journey-canvas-row" key={row.key}><b>{row.label}</b><div className="mt-journey-options compact">{row.options.map(x=><Option key={x.id} selected={strategy[row.key]===x.id} title={x.title} onClick={()=>setStrategy({...strategy,[row.key]:x.id})}/>)}</div></div>)}
   </div>
   <div className="mt-journey-section-head"><b>Strategic approach</b><small>Decides your primary route to impact</small></div>
   <div className="mt-journey-options">{J.APPROACHES.map(x=><Option key={x.id} selected={approach===x.id} title={x.title} sub={x.sub} onClick={()=>setApproach(x.id)}/>)}</div>
   <Button className="w-full" onClick={()=>act((d,fx)=>J.approveStrategy(d,fx,strategy,approach))}>Approve Strategy Blueprint <ArrowRight size={16}/></Button>
  </>}
  {step==="creative"&&<>
   <MissionHeader step="04 · Creative Studio" sub="Develop a concept, propose the key message and pitch it to the client. You can revise before signing off."/>
   <div className="mt-journey-blueprint"><span><Target size={16}/> STRATEGY BRIEF</span><b>{J.APPROACHES.find(x=>x.id===j.approach)?.title} · {c.strategy.segment}</b><small>Positioning: {c.strategy.position} · Objective: {c.strategy.objective}</small></div>
   <div className="mt-journey-section-head"><b>Concept board</b><small>Propose one direction</small></div>
   <div className="mt-journey-concepts">{creatives.map(x=><Option key={x.id} selected={concept===x.id} title={x.title+" · "+money(x.cost)} sub={x.subtitle+" — "+x.desc} onClick={()=>setConcept(x.id)}/>)}</div>
   <label className="mt-journey-message-label" htmlFor="journey-key-message">Key message to pitch</label>
   <input id="journey-key-message" maxLength={100} placeholder={creatives.find(x=>x.id===concept)?.title??"Write a short message"} value={message} onChange={e=>setMessage(e.target.value)}/>
   <Button className="w-full" variant="outline" disabled={!!c.creative||creatives.find(x=>x.id===concept)!.cost>remaining} onClick={()=>act((d,fx)=>J.pitchConcept(d,fx,concept,message))}><Send size={16}/> Pitch Concept to Client</Button>
   {j.pitchFeedback&&<div className="mt-journey-feedback"><small>CLIENT REVIEW · PITCH {j.pitchCount}</small><p>{j.pitchFeedback}</p><span>Feedback is grounded in the scenario's customer problem, not a randomized approval.</span></div>}
   <Button className="w-full" disabled={!j.pitchFeedback||j.pitchedCreative!==concept||creatives.find(x=>x.id===concept)!.cost>remaining} onClick={()=>act((d,fx)=>J.approveCreative(d,fx))}>Approve & Produce Concept <ArrowRight size={16}/></Button>
   {j.pitchedCreative!==concept&&j.pitchFeedback&&<p className="mt-journey-hint">You changed the concept. Pitch this revised direction before client approval.</p>}
  </>}
  {step==="production"&&<>
   <MissionHeader step="05 · Production & Media Hub" sub="Creative is signed off. Reserve distribution and allow production to finish before launch."/>
   <div className="mt-journey-status"><div><CheckCircle2 size={18}/><span><b>Creative approved</b><small>{creatives.find(x=>x.id===c.creative)?.title}</small></span></div><div><Clock3 size={18}/><span><b>{s.clock.day>=(c.productionReadyDay??Infinity)?"Production completed":"Production in progress"}</b><small>Estimated delivery · Day {c.productionReadyDay}</small></span></div></div>
   <div className="mt-journey-section-head"><b>Media plan</b><small>Choose a distribution strategy, or fine-tune manually</small></div>
   <div className="mt-journey-media-plans">{J.MEDIA_PLANS.map(x=><Option key={x.id} selected={plan===x.id} title={x.label} sub={Object.entries(x.weights).filter(([,v])=>v>=0.2).map(([k,v])=>k+" "+Math.round(v*100)+"%").join(" · ")} disabled={!!c.mediaBooked} onClick={()=>setPlan(x.id)}/>)}</div>
   <Detail title="Advanced · Customize channel budgets">
     <label className="mt-journey-toggle"><input type="checkbox" checked={useCustom} onChange={e=>{setUseCustom(e.target.checked);if(e.target.checked)setCustom({...selectedPlan})}} disabled={!!c.mediaBooked}/> Manual channel allocation</label>
     {(Object.keys(mediaDraft) as Channel[]).map(channel=><div className="mt-journey-budget-row" key={channel}><div><span>{mediaChannels.find(x=>x.id===channel)?.title}</span><b>{money(mediaDraft[channel])}</b></div>{useCustom&&!c.mediaBooked&&<input aria-label={channel+" budget"} type="range" min={0} max={remaining} step={100000} value={mediaDraft[channel]} onChange={e=>setCustom({...custom,[channel]:Number(e.target.value)})}/>}</div>)}
   </Detail>
   <div className="mt-journey-media-total"><span>Media to book</span><b>{money(c.mediaBooked?Object.values(c.media).reduce((a,b)=>a+b,0):mediaSum)}</b></div>
   {!c.mediaBooked?<Button className="w-full" disabled={mediaSum<500000||mediaSum>remaining} onClick={()=>act((d,fx)=>J.approveMedia(d,fx,plan,useCustom?mediaDraft:undefined))}>Book Media Inventory</Button>:<FeedbackStrip tone="positive">Media inventory booked. Spending and channel distribution are now part of the campaign state.</FeedbackStrip>}
   <Button className="w-full" variant="outline" disabled={!c.mediaBooked} onClick={()=>act(J.readyForLive)}>Open Live Control <ArrowRight size={16}/></Button>
   <p className="mt-journey-hint">The existing weekly engine delivers assets after time advances. If the planned launch is missed, your live window becomes shorter.</p>
  </>}
  {step==="live"&&<>
   <MissionHeader step="06 · Live Control" sub="Launch when ready, observe campaign signals and decide whether to optimize. All live effects are recorded at End Week."/>
   {c.phase==="executing"?<>
     <div className="mt-journey-launch-card"><Radio size={25}/><div><b>{ready?"Launch window is open":"Awaiting production delivery"}</b><p>{ready?"Creative and media are ready. Launch now to avoid losing time.":"Assets are scheduled for Day "+c.productionReadyDay+". Advance the global week and review the delivery."}</p></div></div>
     <Button className="w-full" disabled={!ready} onClick={()=>act(J.launchJourney)}><Play size={16}/> Launch Campaign</Button>
   </>:<>
     <div className="mt-journey-live-metrics"><GameStat label="LIVE WEEKS" value={String(c.liveWeeks??0)}/><GameStat label="EST. REACH" value={(c.liveMetrics?.adReach??0).toLocaleString()}/><GameStat label="KPI UPLIFT" value={(c.liveMetrics?.pct??0)+"%"}/></div>
     <AnimatedGauge label="Progress to client KPI" percent={(c.liveMetrics?.pct??0)/Math.max(1,sc.target)*100} tone="teal"/>
     <div className="mt-journey-feedback"><small>WEEKLY DIAGNOSIS</small><p>{!c.liveWeeks?"Initial launch week — no realized performance yet. Choose whether to intervene, or hold the plan.":(c.liveMetrics?.pct??0)>=sc.target?"The estimated KPI has met the target. Decide whether extra investment can add incremental value.":(c.liveMetrics?.adReach??0)>0?"Distribution is delivering reach, but uplift is below the client's goal. Check whether the problem is creative, audience or conversion.":"Reach remains weak. Check media allocation, creative relevance and remaining campaign days."}</p></div>
     <div className="mt-journey-section-head"><b>Weekly optimization</b><small>{c.lastOptimizationWeek===s.clock.week?"Decision locked for this week":"Optional · one move per week"}</small></div>
     <div className="mt-journey-options">{optimizations.map(o=><Option key={o.id} selected={c.lastOptimizationWeek===s.clock.week&&c.optimization===o.id} title={o.title+" · "+money(o.cost)} sub={o.desc} disabled={c.lastOptimizationWeek===s.clock.week||o.cost>remaining} onClick={()=>act((d,fx)=>J.optimizeJourney(d,fx,o.id))}/>)}</div>
     {(c.weeklyResults??[]).length>0&&<div className="mt-journey-history"><b>Weekly performance history</b>{c.weeklyResults?.map(r=><div key={r.week}><span>Week {r.week} · {r.decision}</span><strong>{r.uplift}% · {r.reach.toLocaleString()} reach</strong></div>)}</div>}
     <p className="mt-journey-hint">Use the standalone End Week control to advance time. The client review unlocks at the brief deadline, Day {schedule.endDay}.</p>
   </>}
  </>}
  {step==="report"&&report&&<>
   <MissionHeader step="07 · Client Review" sub="Defend what the campaign achieved, identify the most important cause and recommend what to do next."/>
   <div className="mt-journey-review-summary"><div><small>RESULT VS BASELINE</small><strong>{report.pct>0?"+":""}{report.pct}%</strong><span>Client target +{sc.target}%</span></div><div><small>CAMPAIGN DELIVERY</small><strong>{c.liveWeeks??0}/{schedule.expectedLiveWeeks}</strong><span>Live weeks completed</span></div><div><small>FINAL OUTCOME</small><strong>{report.outcome.toLocaleString()}</strong><span>{sc.unit}</span></div></div>
   <div className="mt-journey-history"><b>Campaign decision trail</b><div><span>Diagnosed problem</span><strong>{J.DIAGNOSES.find(x=>x.id===j.diagnosis)?.title??"Existing brief"}</strong></div><div><span>Evidence confidence</span><strong>{j.confidence}%</strong></div><div><span>Insight & strategy</span><strong>{c.insight??"—"} / {j.approach??"—"}</strong></div><div><span>Creative & media</span><strong>{creatives.find(x=>x.id===c.creative)?.title??"Not launched"} · {money(c.spent)} used</strong></div></div>
   {j.review?<><FeedbackStrip tone="positive">Client review completed · quality {j.review.score}/100 · +2 expertise earned. This case study is stored in your campaign history.</FeedbackStrip><Button className="w-full" onClick={()=>act(C.nextClient)}>Request next client brief <ArrowRight size={16}/></Button></>:<>
    <div className="mt-journey-section-head"><b>Which evidence leads your presentation?</b></div><div className="mt-journey-options compact">{J.REVIEW_HIGHLIGHTS.map(x=><Option key={x.id} selected={highlight===x.id} title={x.label} sub={x.desc} onClick={()=>setHighlight(x.id)}/>)}</div>
    <div className="mt-journey-section-head"><b>What best explains the result?</b></div><div className="mt-journey-options compact">{J.REVIEW_REASONS.map(x=><Option key={x.id} selected={reason===x.id} title={x.label} sub={x.desc} onClick={()=>setReason(x.id)}/>)}</div>
    <div className="mt-journey-section-head"><b>What would you recommend next?</b></div><div className="mt-journey-options compact">{J.REVIEW_NEXT.map(x=><Option key={x.id} selected={next===x.id} title={x.label} sub={x.desc} onClick={()=>setNext(x.id)}/>)}</div>
    <Button className="w-full" onClick={()=>act((d,fx)=>J.submitReview(d,fx,highlight,reason,next))}><ClipboardCheck size={16}/> Present Client Review</Button>
   </>}
  </>}
  </div>
  <Memory c={c} j={j}/>
 </div>;
}
export function CampaignJourney(){
 const c=useGame(s=>s.campaign);
 const [browse,setBrowse]=useState(()=>!c.catalogClientId);
 useEffect(()=>{setBrowse(!c.catalogClientId);},[c.briefId,c.catalogClientId]);
 return <div className="mt-client-journey-wrap">
  {c.phase==="brief"&&<div className="mt-client-journey-switch">
    <Button size="sm" variant={browse?"default":"outline"} onClick={()=>setBrowse(true)}>Freelance Job Board</Button>
    <Button size="sm" variant={!browse?"default":"outline"} onClick={()=>setBrowse(false)} disabled={!c.catalogClientId}>Awarded Job · Gemini Brief</Button>
  </div>}
  {c.phase==="brief"&&(browse||!c.catalogClientId)?<ClientCatalog mode="freelancer" onSelected={()=>setBrowse(false)}/>:
   c.freelanceJob?.v4&&c.aiScenario?<FreelanceV4Desk/>:
   c.freelanceJob&&getFreelanceJob(c.freelanceJob.templateId)?.tier!=="campaign"&&c.aiScenario?<FreelanceJobDesk/>:
   <Main key={c.briefId} c={c}/>}
 </div>;
}

