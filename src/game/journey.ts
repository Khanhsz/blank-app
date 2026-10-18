/** Campaign Journey - persistent 7-mission layer on top of the existing deterministic
 * freelance campaign engine. This module owns decisions, not the weekly clock.
 * Existing media, production, scoring and CEO code remain authoritative.
 */
import {clamp,creatives,insights,researchOptions,scenarios,type Channel} from "./data";
import {newJourney,type Campaign,type CampaignJourney,type GameState,type JourneyStep} from "./state";
import type {Fx} from "./store";
import * as C from "./campaign";

export const JOURNEY_STEPS:{id:JourneyStep;label:string;short:string;act:string;output:string}[]=[
 {id:"brief",label:"Brief Room",short:"Brief",act:"Planning",output:"Diagnosed business problem"},
 {id:"research",label:"Insight Lab",short:"Research",act:"Planning",output:"Evidence-backed insight"},
 {id:"strategy",label:"Strategy Workshop",short:"Strategy",act:"Planning",output:"Strategy blueprint"},
 {id:"creative",label:"Creative Studio",short:"Creative",act:"Executing",output:"Client-approved concept"},
 {id:"production",label:"Production & Media Hub",short:"Media",act:"Executing",output:"Launch-ready production and media"},
 {id:"live",label:"Live Control",short:"Live",act:"Live",output:"Weekly performance and optimization"},
 {id:"report",label:"Client Review",short:"Report",act:"Live",output:"A defensible case study"}
];
export const BRIEF_QUESTIONS=[
 {id:"audience",label:"Who is the priority customer?",hint:"Clarify the audience before spending."},
 {id:"barrier",label:"What stops people from acting?",hint:"Ask about the real customer friction."},
 {id:"success",label:"How will you measure success?",hint:"Align the client around an observable business metric."},
 {id:"constraint",label:"What cannot change?",hint:"Surface budget, time and approval constraints."}
] as const;
export const DIAGNOSES=[
 {id:"discover",title:"Discovery gap",desc:"The market may not know this brand or product well enough."},
 {id:"hesitate",title:"Consideration gap",desc:"People know it, but don't see enough relevance or reassurance."},
 {id:"convert",title:"Action gap",desc:"Interest exists, but too few customers take the next step."}
] as const;
export const APPROACHES=[
 {id:"reach",title:"Build Reach",sub:"Paid distribution and discoverability",channel:"paid" as Channel},
 {id:"proof",title:"Build Trust",sub:"Creators, demonstrations and social proof",channel:"creator" as Channel},
 {id:"activation",title:"Drive Action",sub:"Promotion and local activations",channel:"promo" as Channel}
] as const;
export const MEDIA_PLANS=[
 {id:"balanced",label:"Balanced Mix",weights:{paid:0.4,creator:0.3,promo:0.2,flyer:0.1}},
 {id:"performance",label:"Performance First",weights:{paid:0.66,creator:0.14,promo:0.15,flyer:0.05}},
 {id:"creator",label:"Creator-led",weights:{paid:0.22,creator:0.63,promo:0.1,flyer:0.05}},
 {id:"local",label:"Local Activation",weights:{paid:0.23,creator:0.2,promo:0.26,flyer:0.31}}
] as const;
export type MediaPlanId=(typeof MEDIA_PLANS)[number]["id"];

export function journeyOf(c:Campaign):CampaignJourney{return c.journey??newJourney();}
export function briefAnswer(s:GameState,id:string):string {
 const sc=C.scenarioOf(s.campaign);
 const aiAnswer=sc.clientAnswers?.[id as keyof NonNullable<typeof sc.clientAnswers>];
 if(aiAnswer)return aiAnswer;
 switch(id){
  case "audience":return "The client needs growth around "+sc.metric+". You must decide which audience is most actionable.";
  case "barrier":return sc.reports.reviews;
  case "success":return "Baseline "+sc.baseline+" "+sc.unit+"; success target +"+sc.target+"% by Day "+C.scheduleOf(s.campaign).endDay+".";
  case "constraint":return "Available media and research budget "+new Intl.NumberFormat("vi-VN").format(sc.budget)+"đ; brief duration "+sc.days+" days.";
  default:return "";
 }
}
export function askClient(s:GameState,fx:Fx,id:string){
 const c=s.campaign,j=journeyOf(c);
 if(c.phase!=="brief"||j.step!=="brief"||!BRIEF_QUESTIONS.some(q=>q.id===id)||j.questions.includes(id))return;
 j.questions.push(id);c.journey=j;fx.log("Clarified client question: "+id);
}
export function approveBrief(s:GameState,fx:Fx,diagnosis:string){
 const c=s.campaign,j=journeyOf(c);
 if(j.step!=="brief"||j.questions.length<2)return fx.toast("Ask at least two client questions before diagnosing the brief.");
 if(!c.catalogClientId||!c.aiScenario?.aiPlanning)return fx.toast("Approach a client and wait for Gemini to prepare the brief first.");
 if(!DIAGNOSES.some(x=>x.id===diagnosis))return;
 j.diagnosis=diagnosis;C.acceptBrief(s,fx);
 if(c.phase==="planning"){j.step="research";fx.log("Brief diagnosed: "+diagnosis);}
}
export function evidenceConfidence(s:GameState):number{
 const c=s.campaign,points=c.research.reduce((sum,id)=>sum+(researchOptions.find(r=>r.id===id)?.quality??0),0);
 const sampleQuality=C.surveyQuality(s,c);
 return clamp(Math.round((points?28:0)+Math.min(38,points*12)+(c.survey?sampleQuality*27:0)),0,93);
}
export function approveInsight(s:GameState,fx:Fx,id:string){
 const c=s.campaign,j=journeyOf(c);
 if(j.step!=="research"||!c.research.length&&!c.survey)return fx.toast("Collect at least one source of evidence first.");
 if(!(C.scenarioOf(c).insightOptions??insights).some(x=>x.id===id))return;
 C.confirmInsight(s,fx,id);j.confidence=evidenceConfidence(s);j.step="strategy";
 fx.log("Insight validated with evidence confidence "+j.confidence+"%");
}
export function approveStrategy(s:GameState,fx:Fx,st:Campaign["strategy"],approach:CampaignJourney["approach"]){
 const c=s.campaign,j=journeyOf(c);
 if(j.step!=="strategy"||!APPROACHES.some(a=>a.id===approach))return fx.toast("Choose a strategic approach.");
 C.confirmStrategy(s,fx,st);
 if(c.phase==="executing"){j.approach=approach;j.step="creative";fx.log("Strategy blueprint approved: "+approach);}
}
export function creativeFeedback(s:GameState,id:string):string {
 const c=s.campaign,sc=C.scenarioOf(c);
 const matched=id===sc.trueCreative,aligned=c.insight===sc.trueInsight;
 if(matched&&aligned)return "Client: This feels relevant to the customer barrier and consistent with the direction. Ready to approve.";
 if(matched)return "Client: Promising concept, but can you explain how the idea connects to our diagnosed problem?";
 if(aligned)return "Client: The strategy makes sense, but this expression may not be compelling enough for the target audience.";
 return "Client: I'm unconvinced. The concept needs a clearer insight and proof that it will move our business KPI.";
}
export function pitchConcept(s:GameState,fx:Fx,id:string,message:string){
 const c=s.campaign,j=journeyOf(c);
 if(j.step!=="creative"||c.creative)return;
 if(!creatives.some(x=>x.id===id))return;
 j.pitchedCreative=id;j.message=message.trim().slice(0,100)||creatives.find(x=>x.id===id)!.title;
 j.pitchFeedback=creativeFeedback(s,id);j.pitchCount++;
 fx.log("Client creative pitch #"+j.pitchCount+" · "+id);
}
export function approveCreative(s:GameState,fx:Fx){
 const c=s.campaign,j=journeyOf(c);
 if(j.step!=="creative"||!j.pitchedCreative||!j.pitchFeedback)return fx.toast("Pitch a concept to the client first.");
 C.confirmCreative(s,fx,j.pitchedCreative);
 if(c.creative){j.step="production";fx.log("Concept signed off after client feedback");}
}
export function mediaAllocation(s:GameState,id:MediaPlanId):Record<Channel,number>{
 const p=MEDIA_PLANS.find(x=>x.id===id)??MEDIA_PLANS[0];
 const left=Math.max(0,C.scenarioOf(s.campaign).budget-s.campaign.spent);
 const total=Math.floor(left*0.88/100000)*100000;
 const paid=Math.floor(total*p.weights.paid/100000)*100000;
 const creator=Math.floor(total*p.weights.creator/100000)*100000;
 const promo=Math.floor(total*p.weights.promo/100000)*100000;
 return {paid,creator,promo,flyer:total-paid-creator-promo};
}
export function approveMedia(s:GameState,fx:Fx,id:MediaPlanId,custom?:Record<Channel,number>){
 const c=s.campaign,j=journeyOf(c);
 if(j.step!=="production"||!MEDIA_PLANS.some(x=>x.id===id))return;
 C.bookMedia(s,fx,custom??mediaAllocation(s,id));
 if(c.mediaBooked){j.mediaPlan=id;fx.log("Media plan approved: "+id);}
}
export function readyForLive(s:GameState,fx:Fx){
 const c=s.campaign,j=journeyOf(c);
 if(j.step!=="production"||!c.creative||!c.mediaBooked)return fx.toast("Approve creative production and media bookings first.");
 j.step="live";fx.log("Launch readiness confirmed. Await production before pressing Launch.");
}
export function launchJourney(s:GameState,fx:Fx){
 const c=s.campaign;
 if(journeyOf(c).step!=="live")return;
 C.launch(s,fx);
}
export function optimizeJourney(s:GameState,fx:Fx,id:string){
 if(journeyOf(s.campaign).step!=="live")return;
 C.optimize(s,fx,id);
}
export const REVIEW_HIGHLIGHTS=[
 {id:"kpi",label:"Business KPI",desc:"Compare actual results against the client's target."},
 {id:"reach",label:"Distribution",desc:"Explain the audience exposed to campaign messages."},
 {id:"spend",label:"Efficiency",desc:"Show how the budget was deployed."}
] as const;
export const REVIEW_REASONS=[
 {id:"insight",label:"Research & positioning",desc:"Assess whether the customer problem was diagnosed correctly."},
 {id:"creative",label:"Creative relevance",desc:"Evaluate whether the message addressed the barrier."},
 {id:"media",label:"Distribution & timing",desc:"Assess channel fit, launch timing and live duration."}
] as const;
export const REVIEW_NEXT=[
 {id:"validate",label:"Validate an uncertain hypothesis",desc:"Test the riskiest assumption before scaling."},
 {id:"scale",label:"Scale what worked",desc:"Invest in the elements that produced repeatable signals."},
 {id:"repair",label:"Repair the weakest stage",desc:"Fix the bottleneck instead of merely spending more."}
] as const;
export function submitReview(s:GameState,fx:Fx,highlight:string,reason:string,next:string){
 const c=s.campaign,j=journeyOf(c);
 if(c.phase!=="results"||!c.final||j.review)return;
 if(!REVIEW_HIGHLIGHTS.some(x=>x.id===highlight)||!REVIEW_REASONS.some(x=>x.id===reason)||!REVIEW_NEXT.some(x=>x.id===next))return;
 const sch=C.scheduleOf(c),delivered=(c.liveWeeks??0)/sch.expectedLiveWeeks;
 const context=(reason==="media"&&delivered<0.9)||(reason==="insight"&&c.final.fit.insight===0)||(reason==="creative"&&c.final.fit.creative===0);
 const score=clamp(65+(highlight==="kpi"?12:0)+(context?16:0)+(next==="validate"&&j.confidence<55?6:0),40,99);
 j.review={highlight,reason,next,score};j.step="report";
 const entry=s.history[s.history.length-1];
 if(entry&&!entry.agency&&entry.scenarioIndex===c.scenarioIndex){
  entry.caseStudy={highlight,reason,next,score,diagnosis:j.diagnosis,insight:c.insight,
   approach:j.approach,creative:c.creative,message:j.message,mediaPlan:j.mediaPlan,liveWeeks:c.liveWeeks??0};
 }
 s.expertise+=2;fx.log("Client review submitted · explanation score "+score+" · +2 XP");
 fx.toast("Case study added to portfolio. You can request a new brief.");
}
export function journeyCanAdvanceClient(c:Campaign){return c.phase==="results"&&!!c.journey?.review;}
