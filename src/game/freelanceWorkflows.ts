/** Bedroom V4 — eight real, structured job workflows. No random button-progress.
 * All deliverables and decisions persist in the campaign save; no money at brief.
 */
import type {GameState,FreelanceV4Work,FreelanceV4Artifact,FreelanceV4Step} from "./state";
import type {Fx} from "./store";
import {getFreelanceJob,type FreelanceJobType} from "./freelanceJobTemplates";
import {workload,WEEKLY_CAPACITY,effectiveWorkDay} from "./freelanceJobs";
import {clamp,money} from "./data";
import {videoScore} from "./videoMiniGames";

export interface Choice {id:string;label:string;detail:string;fit:number}
export interface Field {id:string;label:string;options:Choice[]}
export interface Unit {id:string;title:string;description:string;fields:Field[];starter:string}
export interface JobDesign {id:FreelanceJobType;name:string;intro:string;workstation:string;units:Unit[]}
const c=(id:string,label:string,detail:string,fit:number):Choice=>({id,label,detail,fit});
const f=(id:string,label:string,...options:Choice[]):Field=>({id,label,options});
const fields={
 post:[
  f("objective","Content objective",c("awareness","Awareness","Make the brand recognizable",90),c("engagement","Engagement","Invite meaningful responses",86),c("conversion","Conversion","Direct response with credible offer",76)),
  f("pillar","Content pillar",c("product","Product story","Highlight a real product benefit",86),c("lifestyle","Lifestyle moment","Connect to an everyday occasion",92),c("education","Useful tips","Give audience a helpful takeaway",95)),
  f("format","Visual format",c("carousel","Carousel","Sequence of 3–5 frames",92),c("static","Single image","Clear hero frame and headline",86),c("infographic","Infographic","Show facts in a structured layout",86)),
  f("cta","Call to action",c("discover","Discover more","Low-friction next step",90),c("comment","Join the conversation","Invite a meaningful comment",88),c("shop","Browse offer","Product-led action",80))
 ],
 audit:[
  f("signal","Evidence to inspect",c("retention","Watch-time / retention","Find the drop-off point",95),c("engagement","Engagement and saves","Compare meaningful interaction",92),c("cadence","Content frequency","Test scheduling consistency",83)),
  f("diagnosis","Working diagnosis",c("weak-hook","Creative hook weakness","Early viewers do not see value",95),c("message","Message mismatch","Content does not address a need",90),c("frequency","Posting frequency","Not enough consistent samples",70)),
  f("action","Action recommendation",c("hook-test","A/B test opening hooks","Compare 3 authentic hooks",95),c("content-pillar","Refresh topic pillars","Prioritize useful audience themes",93),c("posting","Adjust publishing cadence","Controlled schedule experiment",79))
 ],
 calendar:[
  f("pillar","Editorial pillar",c("teach","Education","Useful advice and demonstrations",95),c("story","Brand story","People, values, behind the scenes",93),c("product","Product","Practical benefits and evidence",88),c("community","Community","Questions, customer stories",90)),
  f("format","Post format",c("short","Short video","Hook and visual demonstration",91),c("carousel","Carousel","Structured multi-step lesson",93),c("photo","Single visual","Product or lifestyle still",82)),
  f("objective","Funnel role",c("awareness","Discover","Introduce the brand",88),c("consideration","Consider","Build trust and clarity",95),c("action","Act","Encourage next step",87))
 ],
 video:[
  f("hook","First 3 seconds",c("problem","Problem-first hook","Open with a recognizable tension",95),c("demo","Demonstration hook","Show the payoff immediately",94),c("question","Curiosity question","Raise a relevant question",90)),
  f("story","Story structure",c("problem-solution","Problem → solution","Explain why the solution matters",95),c("before-after","Before → after","Show a credible contrast",90),c("howto","How-to","Demonstrate steps with captions",92)),
  f("pacing","Edit & accessibility",c("captions","Captions & punchy cuts","Readable captions, purposeful rhythm",96),c("smooth","Slow cinematic sequence","Mood and deliberate pacing",78),c("fast","Fast montage","Attention-grabbing but busy",66)),
  f("cta","End action",c("learn","Learn more","Explore full story",90),c("visit","Visit the store","Local action",88),c("follow","Follow for tips","Retention and community",86))
 ],
 meta:[
  f("objective","Campaign objective",c("leads","Leads","Collect qualified intent",94),c("traffic","Traffic","Drive landing-page visits",87),c("sales","Sales","Optimize toward purchases",86)),
  f("audience","Audience plan",c("local","Local intent segment","Clear geography and behaviors",94),c("interest","Interest clusters","Audience hypotheses to test",90),c("broad","Broad exploration","Requires more learning budget",76)),
  f("tracking","Measurement event",c("lead","Lead","Verified lead capture event",95),c("view","ViewContent","Landing-page diagnostic event",82),c("purchase","Purchase","Transaction completion event",90)),
  f("qa","Preflight validation",c("verify","Event + landing QA","Confirm pixel, UTM and event match",97),c("creative","Creative QA only","Review ad previews and policies",76),c("skip","Skip preflight","Risk invalid measurement",30))
 ],
 research:[
  f("method","Methodology",c("interview","Semi-structured interviews","Explore needs with open questions",94),c("survey","Exploratory questionnaire","Compare stated attitudes",85),c("desk","Desk research","Evaluate secondary context",81)),
  f("sample","Sampling decision",c("target","Targeted mixed sample","Recruit relevant, varied users",96),c("convenience","Convenience sample","Fast but high selection bias",68),c("existing","Existing customers only","May miss non-customers",72)),
  f("evidence","Evidence synthesis",c("themes","Code recurring themes","Tag and triangulate statements",97),c("quotes","Selected interview quotes","Useful but limited evidence",81),c("guess","Unverified assumption","No direct supporting evidence",32)),
  f("limitation","Research limitation",c("bias","State sampling bias","Report uncertainty explicitly",96),c("validate","Suggest follow-up validation","Define next evidence needed",95),c("claim","Generalize to whole market","Unsupported population claim",30))
 ],
 sprint:[
  f("channel","Channel assignment",c("instagram","Instagram","Visual storytelling / consideration",92),c("tiktok","TikTok","Discovery via native short video",94),c("email","Email","Nurture opted-in audience",91),c("website","Website","Landing context and action",93)),
  f("role","Funnel role",c("discovery","Discovery","Reach relevant new customers",94),c("trust","Trust-building","Show evidence and reassurance",95),c("action","Action","Clarify next step",90)),
  f("adapt","Platform adaptation",c("native","Platform-native version","Rework opening, framing and CTA",98),c("crop","Light crop and caption","Some adaptation",75),c("copy","Identical post everywhere","Weak channel fit",35))
 ],
 launch:[
  f("decision","Marketing direction",c("evidence","Evidence-led","Address verified audience friction",96),c("creative","Creative-first","Memorable but evidence-light",78),c("discount","Discount-first","Immediate attention with margin risk",68)),
  f("activation","Local execution",c("creator","Local creator + owned posts","Credible demonstration and local reach",93),c("paid","Geo-targeted paid distribution","Clear geographic targeting",90),c("pop-up","Neighborhood sampling","High-touch engagement",91)),
  f("measurement","KPI method",c("tracked","UTM / unique code / footfall","Clear observable attribution",97),c("survey","Post-activity intercept","Imperfect but useful learning",84),c("vanity","Impressions only","Not equivalent to visits/leads",45))
 ]
};
const units=(prefix:string,names:string[],schema:Field[],start:(title:string,i:number)=>string):Unit[]=>names.map((title,i)=>({
 id:prefix+"-"+(i+1),title,description:"Deliver a reviewed "+title.toLowerCase()+" that aligns with the client's brief.",
 fields:schema,starter:start(title,i)
}));
fields.landing=[
 f("message","Message hierarchy",c("benefit","Clear customer benefit","A specific, audience-relevant value proposition",96),c("proof","Trust-first","Put verified customer evidence near the claim",94),c("vague","Brand slogan only","No actionable product explanation",30)),
 f("visual","Page presentation",c("focused","Focused mobile layout","One clear promise per section with readable hierarchy",96),c("support","Product demonstration","Useful image with descriptive alternative text",93),c("clutter","Decorative collage","Crowds the page and hides the offer",40)),
 f("action","Action and offer",c("explicit","Visible CTA + terms","Single explicit next step and honest offer conditions",97),c("gentle","Learn more","Low commitment but less conversion intent",83),c("hidden","CTA at page bottom","Hard to act on mobile",36))
];
const DESIGNS:Record<FreelanceJobType,JobDesign>={
 "social-pack":{id:"social-pack",name:"5 Social Posts",workstation:"Content Studio",intro:"Make five publishable posts with different content angles, captions and CTAs.",units:units("post",["Brand introduction","Product highlight","Helpful tip","Community moment","Offer / next step"],fields.post,(title)=>"Headline: "+title+".\nCaption: Introduce a relevant customer benefit using the client's tone.\nVisual direction: Show the product in a believable everyday setting.\nCTA: Invite the reader to discover the next step.")},
 "social-audit":{id:"social-audit",name:"TikTok / Instagram Audit",workstation:"Analytics Lab",intro:"Diagnose channel signals and deliver five prioritized, evidence-linked improvements.",units:units("finding",["Reach & discovery","Early video retention","Engagement signals","Content pillar mix","Publishing consistency"],fields.audit,(title)=>"Observation: Review "+title.toLowerCase()+" against the reported channel baseline.\nEvidence: Compare stronger and weaker posts before claiming causation.\nRecommendation: Test a measurable improvement with a clear success signal.")},
 "content-calendar":{id:"content-calendar",name:"2-Week Content Calendar",workstation:"Editorial Planner",intro:"Plan twelve distinct ideas across fourteen days with formats, funnel roles and realistic cadence.",units:units("day",Array.from({length:12},(_,i)=>"Day "+(i+1+(i>=6?2:0))+" · Content idea "+(i+1)),fields.calendar,(title,i)=>"Idea "+(i+1)+": "+title+".\nKey message: Help the target audience solve a practical issue.\nVisual: A clear first-frame concept and supporting caption.\nPublishing note: Reserve preparation time before posting.")},
 "landing-page":{id:"landing-page",name:"Fix My Landing Page",workstation:"Landing Page Builder",intro:"Repair one page by composing five essential sections. The live page preview updates as you choose cards and reorder sections.",units:units("block",["Hero · headline & visual","Benefits · audience value","Proof · trust signals","Offer · terms & savings","CTA · next step"],fields.landing,(title)=>"Page block: "+title+". Select a clear audience benefit, proof-led visual and unambiguous action, then check the mobile preview.")},
 "short-video":{id:"short-video",name:"5 Short Videos",workstation:"Video Storyboard Studio",intro:"Build five distinct short-form storyboards and scripts. Video assets are simulated, not rendered MP4 files.",units:units("video",["Introduction","Product demonstration","Customer problem","How-it-works","Final invitation"],fields.video,title=>"0–3s: Hook for "+title.toLowerCase()+".\n3–12s: Scene 1 frames the customer need.\n12–22s: Show evidence or demonstration.\n22–30s: Relevant CTA.\nCaptions: Accessible on-screen text.")},
 "meta-setup":{id:"meta-setup",name:"Meta Ads Setup",workstation:"Ads Manager Simulator",intro:"Configure a fictional campaign; check audience, events and launch readiness. Client media is separate.",units:units("ads",["Campaign & objective","Audience / ad set","Tracking & events","Launch-readiness QA"],fields.meta,title=>"Configuration: "+title+".\nImplement a measured, budget-bounded setup using the client's fictional brief.\nAcceptance: Clear naming, objective/event consistency and verifiable QA checks.")},
 "audience-research":{id:"audience-research",name:"Audience Research Sprint",workstation:"Consumer Insight Lab",intro:"Design and synthesize a limited fictional study. Distinguish observations, inferences and limitations.",units:units("research",["Research question","Sampling & fieldwork","Interview theme coding","Audience segmentation","Insight / limitations"],fields.research,title=>"Research section: "+title+".\nEvidence: Use the supplied interview or competitor signals as hypotheses, not population facts.\nConclusion: State an insight with uncertainty and a feasible validation step.")},
 "content-sprint":{id:"content-sprint",name:"Multi-channel Content Sprint",workstation:"Content Operations Center",intro:"Create six adapted channel assets from a unified message and production plan.",units:units("asset",["Hero message","TikTok adaptation","Instagram adaptation","Email / CRM","Landing page","Handover matrix"],fields.sprint,title=>"Deliverable: "+title+".\nMaster message: Explain the audience benefit consistently.\nChannel adaptation: Tailor hook, visual hierarchy and CTA to the chosen platform.\nHandover: Include execution notes.")},
 "mini-launch":{id:"mini-launch",name:"Local Mini Launch Campaign",workstation:"Campaign Command Center",intro:"Build and hand over a seven-stage local campaign with credible scope, channel allocation and KPI measurement.",units:units("stage",["Research & diagnosis","Audience / strategy","Key message & concept","Creative executions","Local media allocation","Launch & optimization","KPI report & handover"],fields.launch,title=>"Stage: "+title+".\nDecision: Make a local-scale marketing choice grounded in the client context.\nDeliverable: Document responsibilities, budget assumptions and measurable outcome.\nNext step: Identify a check before sign-off.")}
};
export const designFor=(id:string|null|undefined)=>id&&id in DESIGNS?DESIGNS[id as FreelanceJobType]:null;
export const allDesigns=Object.values(DESIGNS).filter(d=>d.id!=="short-video");
export const V4_ACCEPTANCE_SCORE=78;
/** Keep the payment preview and final settlement on the same VND calculation. */
export const v4PaymentAmount=(fee:number,deduction:number)=>Math.max(0,Math.round(fee*(1-deduction/100)));
export const unitFor=(jobId:string,unitId:string)=>designFor(jobId)?.units.find(u=>u.id===unitId);
/** Source of truth for review eligibility; scores alone never constitute an output. */
export function isArtifactComplete(jobId:string,a:FreelanceV4Artifact){
 const unit=unitFor(jobId,a.id);
 if(!unit||a.version<1||a.copy.trim().length<20||!!a.draft||!!a.videoDraft)return false;
 if(jobId==="short-video"&&a.video)return videoScore(a.video)>0;
 return unit.fields.every(f=>f.options.some(o=>o.id===a.decisions[f.id]));
}
/** Produce inspectable copy from actual player-selected cards, not a fixed Done button. */
export function composeCardOutput(jobId:string,unitId:string,decisions:Record<string,string>,brand:string){
 const unit=unitFor(jobId,unitId);if(!unit)return "";
 return [brand+" · "+unit.title,...unit.fields.map(f=>{
  const o=f.options.find(x=>x.id===decisions[f.id]);
  return f.label+": "+(o?o.label+" — "+o.detail:"Not decided");
 }),"Deliverable: "+unit.description].join("\n");
}
export function newFreelanceV4(jobId:string):FreelanceV4Work{
 const def=designFor(jobId);if(!def)throw Error("Unrecognized freelance workflow");
 return {step:"brief",activeId:def.units[0].id,reviewRound:0,reviewVersion:0,score:0,deduction:0,
  artifacts:def.units.map(u=>({id:u.id,title:u.title,description:u.description,decisions:{},copy:u.starter,
   version:0,status:"draft",score:0,feedback:"",versions:[]}))};
}
export function artifactScore(jobId:string,a:FreelanceV4Artifact):number{
 if(jobId==="short-video"&&a.video)return videoScore(a.video);
 const unit=unitFor(jobId,a.id);if(!unit)return 0;
 const scores=unit.fields.map(f=>f.options.find(x=>x.id===a.decisions[f.id])?.fit??0);
 if(scores.some(x=>!x))return 0;
 const content=a.copy.trim(),specificity=content.length>=95?92:content.length>=45?75:content.length>=20?48:0;
 const unique=new Set(Object.values(a.decisions)).size/Math.max(1,scores.length);
 return clamp(Math.round(scores.reduce((x,y)=>x+y,0)/scores.length*.73+specificity*.22+unique*5),0,100);
}
export function startV4(s:GameState,fx:Fx){
 const c=s.campaign,p=c.freelanceJob,def=designFor(p?.templateId);
 if(!p?.v4||p.v4.step!=="brief"||!def||!c.aiScenario||c.aiStatus!=="ready"||s.agencyUnlocked)return false;
 p.v4.step="workspace";p.stage="work";p.deadlineDay=s.clock.day+getFreelanceJob(def.id)!.days;
 c.startedDay=s.clock.day;c.phase="planning";p.actualWorkHours=0;p.hoursWorked=0;
 const t=getFreelanceJob(def.id)!,sc=c.aiScenario;
 p.v4.briefSnapshot??={briefId:c.briefId,context:sc.client??sc.summary??"",
 objective:sc.aiPlanning?.strategy??t.objective,audience:sc.audience??"Audience from client brief",
 insight:sc.aiPlanning?.insight??"",fee:p.acceptedFee??t.fee,deadlineDay:p.deadlineDay,
 scope:t.deliverables,acceptance:t.successMetric,revisions:t.revisions};
 fx.log("Accepted "+def.name+" · no deposit charged or paid. Build the agreed deliverables.");
 return true;
}
/** Editing a draft persists partial work without booking hours or submitting a version. */
export function saveV4Draft(s:GameState,id:string,decisions:Record<string,string>,copy:string){
 const p=s.campaign.freelanceJob,v=p?.v4,a=v?.artifacts.find(x=>x.id===id);
 const unit=unitFor(p?.templateId??"",id);
 if(!v||v.step!=="workspace"||!a||!unit||copy.length>2500)return false;
 const choices=Object.fromEntries(unit.fields.map(f=>[f.id,decisions[f.id]??""]));
 if(unit.fields.some(f=>choices[f.id]&&!f.options.some(o=>o.id===choices[f.id])))return false;
 if(copy===a.copy&&unit.fields.every(f=>(a.decisions[f.id]??"")===choices[f.id]))delete a.draft;
 else a.draft={decisions:choices,copy};
 return true;
}
export function v4EditHours(s:GameState,id:string):number{
 const p=s.campaign.freelanceJob,v=p?.v4,t=getFreelanceJob(p?.templateId),a=v?.artifacts.find(x=>x.id===id);
 return !v||!t||!a?0:a.version?1:Math.max(1,Math.ceil(t.hours/v.artifacts.length));
}
export function v4HasDrafts(v:FreelanceV4Work):boolean{
 return v.artifacts.some(a=>!!a.draft||!!a.videoDraft);
}
export function editV4(s:GameState,fx:Fx,id:string,decisions:Record<string,string>,copy:string){
 const p=s.campaign.freelanceJob,v=p?.v4;
 if(!p||!v||v.step!=="workspace")return false;
 const unit=unitFor(p.templateId,id),a=v.artifacts.find(x=>x.id===id);
 if(!unit||!a||copy.trim().length<20||copy.length>2500)return false;
 // Existing pre-V5 saves can continue their saved text versions, but new
 // short-video deliverables must use their playable production mini-game.
 if(p.templateId==="short-video"&&a.version===0&&!a.video)return fx.toast("Complete the video mini-game to save this deliverable."),false;
 if(unit.fields.some(f=>!f.options.some(x=>x.id===decisions[f.id])))return fx.toast("Complete every professional decision before saving."),false;
 const unchanged=a.copy===copy&&unit.fields.every(f=>a.decisions[f.id]===decisions[f.id]);
 if(unchanged&&a.version>0){delete a.draft;return true;}
 const career=workload(s);
 if(career.weeklyWeek!==s.clock.week){career.weeklyWeek=s.clock.week;career.weeklyHours=0;}
 const hours=v4EditHours(s,id);
 if(career.weeklyHours+hours>WEEKLY_CAPACITY)return fx.toast("Weekly capacity reached. End Week to continue."),false;
 career.weeklyHours+=hours;p.actualWorkHours=(p.actualWorkHours??0)+hours;p.hoursWorked=(p.hoursWorked??0)+hours;
 a.version++;a.copy=copy.trim();a.decisions={...decisions};a.score=artifactScore(p.templateId,a);
 a.versions.push({version:a.version,copy:a.copy,decisions:{...a.decisions}});
 a.versions=a.versions.slice(-8);a.status="ready";a.approvedVersion=undefined;a.feedback="";delete a.draft;
 fx.log("Saved "+a.title+" v"+a.version+" · "+hours+"h · score "+a.score+"/100");
 return true;
}
export function setV4Active(s:GameState,id:string){
 const v=s.campaign.freelanceJob?.v4;
 if(!v||!["workspace","board","revision","ready"].includes(v.step)||!v.artifacts.some(a=>a.id===id))return;
 v.activeId=id;v.step="workspace";
}
export function openV4Board(s:GameState,fx:Fx){
 const v=s.campaign.freelanceJob?.v4;
 if(!v||v.step!=="workspace")return false;
 if(v4HasDrafts(v))return fx.toast("Save your edited drafts as deliverable versions before opening the board."),false;
 if(v.artifacts.some(a=>!isArtifactComplete(s.campaign.freelanceJob?.templateId??"",a)||a.status==="draft"||a.status==="revise"))return fx.toast("Complete and save all deliverables before review."),false;
 v.step="board";return true;
}
export function returnV4Workspace(s:GameState,id?:string){
 const v=s.campaign.freelanceJob?.v4;
 if(!v||!["board","revision","ready"].includes(v.step))return;
 const a=v.artifacts.find(x=>x.id===id)??v.artifacts.find(x=>x.status!=="approved");
 if(!a)return;
 v.activeId=a.id;v.step="workspace";
}
export function submitV4Review(s:GameState,fx:Fx){
 const p=s.campaign.freelanceJob,v=p?.v4,t=getFreelanceJob(p?.templateId);
 if(!v||!p||!t||v.step!=="board"||v4HasDrafts(v)||v.artifacts.some(a=>!isArtifactComplete(p.templateId,a)||a.status==="draft"||a.status==="revise"))return false;
 v.reviewVersion++;v.reviewRound++;
 const late=effectiveWorkDay(s)>p.deadlineDay;
 const scores=v.artifacts.map(a=>artifactScore(p.templateId,a));
 v.score=clamp(Math.round(scores.reduce((x,y)=>x+y,0)/scores.length-(late?12:0)),0,100);
 let issues=0;
 for(const [i,a] of v.artifacts.entries()){
  if(a.status==="approved"&&a.approvedVersion===a.version)continue;
  a.score=scores[i];
  if(a.score>=V4_ACCEPTANCE_SCORE){a.status="approved";a.approvedVersion=a.version;a.feedback="Accepted: clear scope alignment and actionable output.";} 
  else {issues++;a.approvedVersion=undefined;a.status="revise";a.feedback=a.score<62?"Major revision: improve weak choices and make the evidence/output more specific.":"Minor revision: strengthen message, evidence or implementation clarity.";}
 }
 p.quality=v.score;
 v.reviewMode="rules";
 if(issues===0){v.step="ready";v.deduction=0;}
 else {v.step="revision";v.deduction=0;} // Never hand over rejected output, even after included rounds.
 p.revisions=Math.min(t.revisions,v.reviewRound);
 p.clientFeedback=issues?issues+" deliverable(s) need work. "+"Return to the marked workspace and resubmit the revised output.":"Client accepted every deliverable. Final submission is available.";
 fx.log("Client reviewed "+t.title+" · "+(v.artifacts.length-issues)+" approved / "+v.artifacts.length);
 return true;
}
export function applyV4AIReview(s:GameState,reviewVersion:number,notes:{id:string;feedback:string}[]){
 const v=s.campaign.freelanceJob?.v4;
 if(!v||v.reviewVersion!==reviewVersion||!["revision","ready"].includes(v.step))return false;
 for(const note of notes){
  const a=v.artifacts.find(x=>x.id===note.id);
  if(a&&note.feedback?.trim().length>=8&&note.feedback.length<=300)a.feedback=note.feedback;
 }
 v.reviewMode="gemini";return true;
}
export function finalizeV4(s:GameState,fx:Fx){
 const c=s.campaign,p=c.freelanceJob,v=p?.v4,t=getFreelanceJob(p?.templateId);
 if(!p||!v||!t||v.step!=="ready"||c.final||v4HasDrafts(v)||!v.artifacts.length||v.artifacts.some(a=>a.status!=="approved"||a.approvedVersion!==a.version||!isArtifactComplete(p.templateId,a)))return false;
 const career=workload(s),id=c.briefId,clientId=c.catalogClientId??"unknown";
 const transactionId="freelance:"+id;
 if(career.completedIds.includes(id)||career.transactionIds?.includes(transactionId)||v.paymentTransactionId)return false; // exactly-once payment
 const fee=p.acceptedFee??t.fee;
 const paid=v4PaymentAmount(fee,v.deduction);
 v.step="paid";v.paidAmount=paid;v.expenseCharged=true;v.paymentTransactionId=transactionId;
 career.completedIds.push(id);(career.transactionIds??=[]).push(transactionId);
 (career.portfolio??=[]).push({id,jobType:t.id,client:c.aiScenario?.brand??clientId,earned:paid,
  quality:v.score,completedDay:effectiveWorkDay(s),feedback:p.clientFeedback??"",artifacts:structuredClone(v.artifacts)});
 s.personalCash+=paid-t.outOfPocket;
 p.stage="done";p.deliveredDay=effectiveWorkDay(s);p.quality=v.score;
 if(t.tier==="gig")career.completedGigs++;
 else if(t.tier==="project")career.completedProjects++;
 else career.completedMiniCampaigns++;
 const onTime=p.deliveredDay<=p.deadlineDay;
 const positive=v.score>=75&&v.deduction===0&&onTime;
 if(positive)career.positiveReviews++;
 if(career.clientWins[clientId]===1)career.repeatClients++;
 career.clientWins[clientId]=(career.clientWins[clientId]??0)+1;
 const reputation=positive?7:v.deduction?1:onTime?4:2;
 s.reputation+=reputation;s.expertise+=t.tier==="gig"?2:4;
 c.phase="results";
 c.journey??={step:"report",questions:[],diagnosis:null,confidence:0,approach:null,message:"",pitchedCreative:null,pitchFeedback:null,pitchCount:0,mediaPlan:null,review:null};
 c.journey.review={highlight:"kpi",reason:"creative",next:"validate",score:v.score};
 c.journey.step="report";
 c.final={pct:positive?14:2,outcome:t.hours,adReach:0,quality:v.score,qualityScore:v.score,rep:reputation,xp:2,
  fit:{insight:1,segment:1,position:1,objective:1,creative:1},performance:positive?"target":"near"};
 s.history.push({brand:c.aiScenario?.brand??"Client",outcome:positive?14:2,score:v.score,spent:t.outOfPocket,rep:reputation,xp:2,scenarioIndex:c.scenarioIndex,agency:false,
 caseStudy:{highlight:"kpi",reason:"creative",next:"validate",score:v.score,diagnosis:null,insight:c.insight??null,approach:null,creative:null,message:t.title,mediaPlan:null,liveWeeks:0}});
 if(!s.cityUnlocked)s.cityUnlocked=true;
 fx.log("Final submission accepted: "+t.title+" · paid "+money(paid)+" less freelancer expenses "+money(t.outOfPocket));
 fx.toast("Client accepted delivery · "+money(paid)+" paid. Portfolio and reputation updated.");
 return true;
}

