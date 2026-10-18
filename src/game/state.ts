import { ceoLeadDefs, ceoRivalDefs, type Channel, type Employee, type LeadDef, type Rival, type Scenario } from "./data";
import {reconcileClientTeams} from "./clientTeams";
import {ensureRecruitment,syncRecruitmentDirectory} from "./recruitment";
import {legacyTalentAttributes} from "./personnel";
import {ensureCompanyMarket} from "./companyMarket";
import {ensureFortuneAccounts} from "./fortuneAccounts";
import type {FinanceCalibration} from "./financeCalibration";

export type Phase = "brief" | "planning" | "executing" | "live" | "results" | "research" | "survey" | "validation" | "strategy" | "creative" | "media";
export const PHASES: Phase[] = ["planning", "executing", "live", "results"];
export const PHASE_LABEL: Record<Phase, string> = { brief: "Brief", planning: "Planning", executing: "Executing", live: "Live", results: "Results", research: "Planning", survey: "Planning", validation: "Planning", strategy: "Planning", creative: "Executing", media: "Executing" };

export type AIBriefStatus = "pending" | "generating" | "ready" | "fallback" | "error";
export type JourneyStep = "brief" | "research" | "strategy" | "creative" | "production" | "live" | "report";
export interface CampaignJourney {
  step: JourneyStep;
  questions: string[];
  diagnosis: string | null;
  confidence: number;
  approach: "reach" | "proof" | "activation" | null;
  message: string;
  pitchedCreative: string | null;
  pitchFeedback: string | null;
  pitchCount: number;
  mediaPlan: string | null;
  review: {highlight:string;reason:string;next:string;score:number} | null;
}
export const newJourney = ():CampaignJourney=>({
  step:"brief",questions:[],diagnosis:null,confidence:0,approach:null,message:"",
  pitchedCreative:null,pitchFeedback:null,pitchCount:0,mediaPlan:null,review:null
});
export function inferJourney(c:Campaign):CampaignJourney {
 const phase=c.phase;
 const step:JourneyStep=phase==="brief"?"brief":phase==="results"?"report":phase==="live"?"live":
 ["creative","media","executing"].includes(phase)?(c.creative?"production":"creative"):
 c.insight?"strategy":"research";
 return {...newJourney(),step,questions:step==="brief"?[]:["audience","barrier"],diagnosis:c.insight??null,confidence:c.research.length?55:0,
  pitchedCreative:c.creative??null,mediaPlan:c.mediaBooked?"legacy":null};
}
export interface FreelanceJobProgress {templateId:string;stage:"brief"|"work"|"feedback"|"delivery"|"done";hoursWorked:number;revisionHours:number;focus:"research"|"quality"|"speed"|null;clientFeedback:string|null;quality:number;revisions:number;deadlineDay:number;weekHours:number;actualWorkHours?:number;deliveredDay?:number;acceptedFee?:number;}
export interface FreelanceInvoice {id:string;clientId:string;amount:number;dueDay:number;status:"pending"|"late"|"paid";reminded:boolean}
export type FreelanceBidApproach="creative"|"performance"|"research"|"value";
export type FreelanceBidPrice="competitive"|"standard"|"premium";
export interface FreelanceListing {id:string;clientId:string;templateId:string;postedWeek:number;closeWeek:number;fee:number;mediaBudget:number;applicantIds:string[];status:"open"|"closed";}
export interface FreelanceApplication {id:string;listingId:string;clientId:string;templateId:string;week:number;approach:FreelanceBidApproach;price:FreelanceBidPrice;proposedFee:number;score:number;winChance:number;status:"pending"|"selected"|"rejected"|"accepted"|"declined";feedback:string;}
export interface FreelanceBoard {lastWeek:number;listings:FreelanceListing[];applications:FreelanceApplication[];}
export interface FreelanceCareer {completedGigs:number;completedProjects:number;completedMiniCampaigns:number;positiveReviews:number;repeatClients:number;weeklyHours:number;weeklyWeek:number;clientWins:Record<string,number>;invoices:FreelanceInvoice[];completedIds:string[];}
export const newFreelanceCareer=():FreelanceCareer=>({completedGigs:0,completedProjects:0,completedMiniCampaigns:0,positiveReviews:0,repeatClients:0,weeklyHours:0,weeklyWeek:1,clientWins:{},invoices:[],completedIds:[]});
export interface Campaign {freelanceJob?:FreelanceJobProgress;
  briefId: string; aiStatus: AIBriefStatus; aiError?: string | null; legacyBrief?:boolean; journey?:CampaignJourney;
  scenarioIndex: number; catalogClientId?:string|null; aiScenario?: Scenario | null; phase: Phase; day: number; spent: number; research: string[];
  startedDay?: number; productionReadyDay?: number; mediaBooked?: boolean; actualLaunchDay?: number;
  liveWeeks?: number; lastOptimizationWeek?: number; weeklyResults?: {week:number;reach:number;uplift:number;decision:string}[];
  survey: { audience: string; sample: number; question: string } | null; insight: string | null;
  strategy: { segment: string; objective: string; position: string }; creative: string | null;
  media: Record<Channel, number>; optimization: string | null;
  liveMetrics: ScoreResult | null; final: (ScoreResult & { qualityScore: number; rep: number; xp: number }) | null;
}
export interface ScoreResult { pct: number; outcome: number; adReach: number; quality: number; fit: Record<string, number>; performance: "target" | "near" | "under" }

export type TalentFunction="acc"|"str"|"cre"|"med";
export interface TalentAttributes {acc:number;str:number;cre:number;med:number;}
export interface PersonnelProfile {skill:number;morale:number;fatigue:number;xp:number;attributes?:TalentAttributes;trainingFunction?:TalentFunction;trainingUntil?:number;pendingSkill?:number;}
export type RecruitmentChannel="organic"|"newspaper"|"website"|"journal"|"referral";
export interface RecruitmentCandidate extends Employee {startingSkill:number;startingMorale:number;startingFatigue:number;source?:RecruitmentChannel;}
export interface RecruitmentPosting {id:string;channel:Exclude<RecruitmentChannel,"organic">;startedWeek:number;arrivalWeek:number;fee:number;focusRole?:string;}
export interface RecruitmentMarket {
 week:number;seed:number;candidates:RecruitmentCandidate[];hired:RecruitmentCandidate[];
 version?:2;postings?:RecruitmentPosting[];lastCampaignWeek?:number;
}
export interface Task {preferredEmployee?:string|null; key: string; label: string; role: string; effort: number; pre: string[]; cost: number; status: "backlog" | "assigned" | "in_progress" | "review" | "completed"; progress: number; quality: number; employee: string | null; outsourced: boolean; revised?: boolean; reviewDay?: number; assignedDay?: number; startedDay?: number; doneDay?: number }
export interface ClientTeam {id:string;clientId:string;brand:string;memberIds:string[];projectIds:string[];leadId:string|null;status:"forming"|"active"|"closing"|"released";createdDay:number}
export interface AnnualContractTerms {
  kind:"annual-retainer";startDay:number;endDay:number;termDays:365;
  annualServiceFeeVnd:number;annualMediaBudgetVnd:number;
  payment:"annual-upfront";paymentStatus:"paid";currency:"VND";
  monthlyReports:boolean;reportingIntervalDays:30;
  scopeOfWork:string;deliverables:string[];
  kpiTarget:number;terminationNoticeDays:30;
  confidentiality:true;intellectualProperty:"client-owns-approved-paid-work";
  mediaSpendSeparate:true;top10SectorExclusivity:boolean;
}
export interface FortuneAccount {clientId:string;ownerAgencyId:string|null;startedDay:number|null;endsDay:number|null;}
export interface Project {contractTerms?:AnnualContractTerms; clientMasterId?:string; teamId?:string; priority?:"normal"|"high"; id: string; leadId: string; brand: string; adBudget: number; fee: number; bonus: number; scope: number; duration: number; industry: string; days: number; status: "active" | "completed"; scenarioIndex: number; startedDay: number; target: number; pitchQuality: number; mediaSpent: number; mediaReserved: number; direct: number; campaign: Campaign; tasks: Task[]; paymentCount: number; payrollAllocated?: number; overheadAllocated?: number; deadlineIssue?: boolean; midpoint?: boolean; kolQuality?: number; reportQuality?: number; kpi?: number; quality?: number; margin?: number; clientTrust?: number; completedDay?: number; legacy?: boolean }
export type PriceTier="competitive"|"balanced"|"premium";
export interface PricingAdvice {
 leadId:string;brand:string;mediaBudget:number;baselineFee:number;
 companyScale:"growing"|"regional"|"national";businessSize?:"small"|"medium"|"large"|"enterprise";estimatedCost:number;feeFloor:number;feeCeiling:number;
 options:Record<PriceTier,number>;tier:PriceTier;recommendedFee:number;qualificationDepth?:"lean"|"standard"|"deep";qualificationFee?:number;
 headline:string;rationale:string;preparation:string[];risk:string;
 source:"gemini"|"rules";contextKey?:string;
}
export type OpportunitySource="inbound"|"outbound"|"referral"|"tender"|"renewal";
export type DiscoveryKey="need"|"budget"|"authority"|"timing";
export type AcquisitionStage="prospecting"|"discovery"|"nurturing";
export interface ClientDiscovery {
 answered:DiscoveryKey[];notes:Partial<Record<DiscoveryKey,string>>;confidence:number;
 decision?:"pursue"|"nurture"|"no-bid";qualificationReason?:string;
}
export interface ProposalPlan {
 approach:"performance"|"creative"|"cost"|"strategy";
 evidence:"research"|"portfolio";delivery:"lean"|"balanced"|"specialist";
 concept:"proof"|"story"|"conversion";selectedTalentIds:string[];
}
export interface ClientRelationship {trust:number;lastContactDay:number;wins:number;losses:number;referrals:number;notes:string[];}
export interface DealSession {pitch:Pitch|null;negotiation:Negotiation|null;}
export interface Lead extends LeadDef {contractType?:"annual-retainer";hqApproach?:boolean;
 source?:OpportunitySource;discovery?:ClientDiscovery;outreachAttempts?:number;nurtureUntil?:number;
 proposal?:ProposalPlan;qualificationReason?:string;referralFrom?:string;
 pricingAdvice?:PricingAdvice; qualifyFeePaid?:number; qualifyDepthPaid?:"lean"|"standard"|"deep"; status: "new" | "prospecting" | "discovery" | "nurturing" | "qualified" | "pitch" | "shortlisted" | "pitch_won" | "negotiating" | "signed" | "lost" | "declined" | "renewal"; relationship: number; insightKnown?: boolean; lostTo?: string }
export interface Issue { id: string; type: string; project: string; message: string; choices: string[]; status: "open" | "resolved"; day: number; resolution?: string }
export interface LedgerEntry { day: number; what: string; value: number; lead: string; status: "paid" | "due"; due?: number; project?: string }
export interface Pitch { proposal?:ProposalPlan;revisionCount?:number; id: string; focus: string; price: string; bidFee?:number; priceTier?:PriceTier; priceSelected?:boolean; team: string; evidence: string; step: "prepare" | "objection" | "revision" | "result"; quality: number; objection: string | null; result: { winner: string; playerScore: number; topRival: string; topScore: number; explanation: string } | null }
export interface Negotiation { id: string; round: number; fee: number; scope: number; advance: number; deadline: number; bonus: number; trust: number; notes: string[]; status: "open" | "signed" | "lost" | "walked"; counter: { fee: number; scope: number; advance: number; deadline: number } | null }
export interface RivalTender {leadId:string;deadline:number;rivalId:string;score:number;fee:number;status:"open"|"won"|"player"|"closed"}
export interface RivalEvent {id:string;day:number;rivalId:string;kind:"pitch"|"win"|"expand"|"hire"|"poach"|"market"|"loss";message:string}
export interface TalentOffer {id:string;employeeId:string;rivalId:string;day:number;expires:number;raise:number;bonus:number;status:"open"|"retained"|"left"}
export type WeeklyCategory = "decisions" | "finance" | "clients" | "operations" | "competition" | "talent";
export interface WeeklyDecision {id:string; day:number; category:WeeklyCategory; headline:string; detail:string}
export interface WeeklyArticle {id:string; category:WeeklyCategory; headline:string; body:string; evidence:string; impact:"positive"|"negative"|"neutral"}
export interface WeeklyEdition {
 id:string; weekCompleted:number; weekStarted:number; dayFrom:number; dayTo:number;
 articles:WeeklyArticle[]; cashBefore:number; cashAfter:number; repBefore:number; repAfter:number;
 projectsBefore:number; projectsAfter:number; rivalsWon:number; completedProjects:number;
 read:boolean;
}
export interface WeeklyProgress {week:number; pending:WeeklyDecision[]; editions:WeeklyEdition[]; lastAdvanceDay:number}
export interface GameClock extends WeeklyProgress {day:number}
export interface CEO {
  fortuneAccounts?:Record<string,FortuneAccount>;
  dealSessions?:Record<string,DealSession>;activeDealId?:string|null;
  clientRelationships?:Record<string,ClientRelationship>;
  clientTeams?:ClientTeam[];
  weekly?:WeeklyProgress;
  tenders?:RivalTender[]; rivalNews?:RivalEvent[]; talentOffers?:TalentOffer[];
  salaryPremiums?:Record<string,number>; talentMarket?:Record<string,{rivalId:string;untilDay:number}>;
  rivalLastTick?:number;
  day: number; speed: number; pauseOnIssue: boolean; leads: Lead[]; rivals: Rival[]; projects: Project[]; inbox: Issue[]; partners: string[];
  ledger: LedgerEntry[]; history: { id: string; brand: string; kpi: number; profit: number; quality: number; day: number }[];
  reputation: { overall: number; creative: number; performance: number; strategy: number; reliability: number; industries: Record<string, number> };
  seq: number; pitch: Pitch | null; negotiation: Negotiation | null; totalPayroll: number; totalDirect: number; totalBilled: number; totalPaid: number;
  legacyCampaignMigration?: number;
}

export type SceneId = "room" | "city" | "office" | "boardroom";
export interface Character { name: string; skin: string; outfit: string; hair: string; interest: string; hairstyle?: "short"|"curly"|"bun"; accessory?: "none"|"headphones"|"glasses" }
export interface RoomStyle { wall: string; rug: string; plant: boolean; lamp: boolean; shelf: boolean }

export interface WorldProgress {visited:string[];contacts:string[];leasedOffices:string[]}
export type MarketSector="coffee"|"beauty"|"fashion"|"education"|"tech"|"fitness"|"food";
export interface MarketCampaignEvent {
 id:string;projectId:string;clientId:string;actor:"player"|"rival";agency:string;week:number;
 spendVnd:number;quality:number;kpi:number;impactPct?:number
}
export interface CompanyPerformance {
 id:string;simulatedAnnualRevenue:number;baselineAnnualRevenue:number;currency:"VND"|"USD";
 awareness:number;brandStrength:number;weeklyGrowthPct:number;totalGrowthPct:number;
 momentum:number;rivalPressure:number;playerMarketingImpact:number;rivalMarketingImpact:number;
 marketingSpendVnd:number;lastUpdatedWeek:number;campaigns:number;
 history:{week:number;revenue:number;growth:number;awareness:number;playerLift:number;rivalLift:number}[];
}
export interface QuarterlyRanking {
 week:number;quarter:number;positions:Record<string,number>;
 entries:{id:string;rank:number;previousRank:number|null;change:number;revenue:number;score:number}[];
}
export interface CompanyMarket {
 lastWeek:number;companies:Record<string,CompanyPerformance>;quarters:QuarterlyRanking[];
 pending:MarketCampaignEvent[];activity:MarketCampaignEvent[];
 macro:Record<MarketSector,number>;
 intelligence:{lastWeek:number;status:"gemini"|"rules";headline:string;summary:string;
 signals:{sector:MarketSector;momentum:number;reason:string}[]};
}
export interface GameState {
  version: 2; created: boolean; character: Character; room: RoomStyle; scene: SceneId;
  reputation: number; expertise: number; personalCash: number; agencyCash: number; agencyUnlocked: boolean; agencyName: string;
  staff: string[]; personnel:Record<string,PersonnelProfile>; recruitment?:RecruitmentMarket; teamLeads:Record<string,string>; upgrades: string[]; cityUnlocked: boolean; campaign: Campaign; clock: GameClock; officeId:string;
  world: WorldProgress;companyMarket?:CompanyMarket;financeCalibration?:FinanceCalibration;freelanceCareer?:FreelanceCareer;freelanceBoard?:FreelanceBoard;
  history: { brand: string; outcome: number; score: number; spent: number; rep: number; xp: number; scenarioIndex: number; agency: boolean; caseStudy?: {highlight:string;reason:string;next:string;score:number;diagnosis:string|null;insight:string|null;approach:string|null;creative:string|null;message:string;mediaPlan:string|null;liveWeeks:number} }[];
  log: { t: number; msg: string }[]; graphics: "high" | "low"; ceo: CEO | null;
}

export const newCampaign = (i: number, day = 1): Campaign => ({
  briefId: "brief-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,9),
  aiStatus:"pending", aiError:null,
  scenarioIndex: i, catalogClientId:null, aiScenario:null, phase: "brief", journey:newJourney(), day, startedDay:day, spent: 0, research: [], mediaBooked:false, productionReadyDay:undefined, liveWeeks:0, weeklyResults:[], survey: null, insight: null,
  strategy: { segment: "students", objective: "visits", position: "study" }, creative: null,
  media: { paid: 0, creator: 0, promo: 0, flyer: 0 }, optimization: null, liveMetrics: null, final: null,
});

export const defaults = (): GameState => ({
  version: 2, created: false,
  character: { name: "Alex", skin: "#d6a681", outfit: "#4c9589", hair: "#352824", interest: "Strategy", hairstyle:"short", accessory:"none" },
  room: { wall: "#efe4d3", rug: "#bd694a", plant: true, lamp: true, shelf: false },
  scene: "room", reputation: 0, expertise: 0, personalCash: 2500000, agencyCash: 0, agencyUnlocked: false, agencyName: "",
  freelanceCareer:newFreelanceCareer(), staff: [], personnel:{}, recruitment:undefined, teamLeads:{}, upgrades: [], cityUnlocked: false, campaign: newCampaign(0), clock:{day:1,week:1,pending:[],editions:[],lastAdvanceDay:1}, officeId:"agency", world:{visited:[],contacts:[],leasedOffices:[]}, history: [], log: [], graphics: "high", ceo: null,
});

export const newCEO = (reputation: number): CEO => ({
  day: 1, speed: 0, pauseOnIssue: false,
  leads: ceoLeadDefs.map((x) => ({ ...x, status: "new", relationship: x.trust })),
  rivals: ceoRivalDefs.map((v) => ({ ...v })), projects: [], inbox: [], partners: [], ledger: [], history: [],
  reputation: { overall: reputation, creative: 50, performance: 50, strategy: 50, reliability: 60, industries: {} },
  seq: 0, pitch: null, negotiation: null, totalPayroll: 0, totalDirect: 0, totalBilled: 0, totalPaid: 0,
  clientTeams:[], fortuneAccounts:{}, dealSessions:{}, activeDealId:null, clientRelationships:{}, tenders:[], rivalNews:[], talentOffers:[], salaryPremiums:{}, talentMarket:{}, rivalLastTick:0,
  weekly:{week:1,pending:[],editions:[],lastAdvanceDay:1},
});

export const SAVE_KEY = "marketing-tycoon-lovable-v2";
const LEGACY_KEY = "marketing-tycoon-save-v1";

/** Safe migration: accepts v1 saves from the original game (same field names) and fills gaps. */
/** The pre-Growth-Desk agency founder silently inherited a Freelancer brief,
 * constructing an ACTIVE "legacy-N" project with no signed client contract.
 * This is not a legitimate Agency client. Strip only unmistakable artifacts of
 * that automatic transfer, never signed projects or completed historical work.
 * Do not retroactively edit cash or paid ledger entries in existing saves.
 */
export function removeUncontractedLegacyAgencyClients(s:GameState):number {
 const c=s.ceo;if(!c||!s.agencyUnlocked)return 0;
 const stale=c.projects.filter(p=>p.legacy===true&&p.leadId==="legacy"&&
   /^legacy-[0-9]+$/.test(p.id)&&p.status==="active");
 if(!stale.length)return 0;
 const ids=new Set(stale.map(p=>p.id));
 c.projects=c.projects.filter(p=>!ids.has(p.id));
 c.inbox=c.inbox.filter(entry=>!ids.has(entry.project));
 const valid=new Set(c.projects.map(p=>p.id));
 // Release the synthetic client's team, including any assigned employees,
 // but do not touch another real project sharing the same brand.
 c.clientTeams=(c.clientTeams??[]).filter(team=>{
  team.projectIds=team.projectIds.filter(id=>!ids.has(id));
  return team.projectIds.some(id=>valid.has(id))||c.projects.some(p=>p.teamId===team.id);
 });
 // Historic fees may have been paid or spent; avoid altering the save economy.
 // All future agencies start without this transfer and synthetic payment.
 c.legacyCampaignMigration=2;
 return stale.length;
}

export function migrate(raw: unknown): GameState {
  const d = defaults();
  if (!raw || typeof raw !== "object") return d;
  const s = raw as Partial<GameState> & Record<string, unknown>;
  if (!s.campaign) return d;
  const out: GameState = {
    ...d, ...s, version: 2,
    character: { ...d.character, ...(s.character ?? {}) },
    room: { ...d.room, ...(s.room ?? {}) },
    campaign: { ...newCampaign(0), ...s.campaign },
    officeId:typeof s.officeId==="string"?s.officeId:"agency",
    staff: Array.isArray(s.staff) ? s.staff : [],
    personnel:s.personnel&&typeof s.personnel==="object"?{...s.personnel}:{},
    recruitment:s.recruitment&&Array.isArray(s.recruitment.candidates)&&Array.isArray(s.recruitment.hired)?s.recruitment:undefined,
    teamLeads:s.teamLeads&&typeof s.teamLeads==="object"?{...s.teamLeads}:{},
    upgrades: Array.isArray(s.upgrades) ? s.upgrades : [],
    history: Array.isArray(s.history) ? s.history : [],
    world:{visited:Array.isArray(s.world?.visited)?s.world.visited.filter((x):x is string=>typeof x==="string"):[],contacts:Array.isArray(s.world?.contacts)?s.world.contacts.filter((x):x is string=>typeof x==="string"):[],leasedOffices:Array.isArray(s.world?.leasedOffices)?s.world.leasedOffices.filter((x):x is string=>typeof x==="string"):[]},
    log: Array.isArray(s.log) ? (s.log as unknown[]).map((l) => (typeof l === "string" ? { t: 0, msg: l } : (l as { t: number; msg: string }))) : [],
    ceo: s.ceo ?? null,
  };
  // Register recruited hires before deriving their function-based legacy skill attributes.
  syncRecruitmentDirectory(out);
  // Preserve historical hired IDs; initialize deterministic attributes for old saves.
  for(const id of out.staff){
    const rawProfile=out.personnel[id];
    const base={skill:64,morale:78,fatigue:0,xp:0};
    const skill=Math.min(100,Math.max(25,Number(rawProfile?.skill??base.skill)));
    const migrated=legacyTalentAttributes(id,skill);
    const a=rawProfile?.attributes;
    const attributes:TalentAttributes={acc:migrated.acc,str:migrated.str,cre:migrated.cre,med:migrated.med};
    if(a)for(const k of ["acc","str","cre","med"] as TalentFunction[]){
      const score=Number(a[k]);if(Number.isFinite(score))attributes[k]=Math.min(100,Math.max(20,score));
    }
    out.personnel[id]={
      skill,
      attributes,
      morale:Math.min(100,Math.max(0,Number(rawProfile?.morale??base.morale))),
      fatigue:Math.min(100,Math.max(0,Number(rawProfile?.fatigue??base.fatigue))),
      xp:Math.max(0,Number(rawProfile?.xp??0)),
      ...(rawProfile?.trainingUntil===undefined?{}:{trainingUntil:rawProfile.trainingUntil}),
      ...(rawProfile?.pendingSkill===undefined?{}:{pendingSkill:rawProfile.pendingSkill}),
      ...(rawProfile?.trainingFunction?{trainingFunction:rawProfile.trainingFunction}:{})
    };
  }
  for(const [role,id] of Object.entries(out.teamLeads))if(!out.staff.includes(id))delete out.teamLeads[role];
  // One global week from the bedroom onwards. CEO legacy saves retain their accumulated date.
  const savedDay = s.agencyUnlocked ? Math.max(s.clock?.day??1,s.ceo?.day??1) : (s.clock?.day ?? s.campaign?.day ?? 1);
  const day = Math.max(1,Math.floor(Number(savedDay)||1));
  const oldWeekly = s.clock ?? s.ceo?.weekly;
  out.clock = {
    day, week: Math.max(Math.floor((day-1)/7)+1,oldWeekly?.week??1),
    pending: Array.isArray(oldWeekly?.pending)?oldWeekly.pending:[],
    editions: Array.isArray(oldWeekly?.editions)?oldWeekly.editions:[],
    lastAdvanceDay: oldWeekly?.lastAdvanceDay ?? day
  };
  out.campaign.journey = out.campaign.journey && typeof out.campaign.journey.step==="string"
    ? {...inferJourney(out.campaign),...out.campaign.journey,questions:Array.isArray(out.campaign.journey.questions)?out.campaign.journey.questions:[]}
    : inferJourney(out.campaign);
  // Earlier saves already contain a phase, but not a completed Journey.
  // Never strand an existing campaign in Brief Room after it progressed to Planning/Live.
  if(out.campaign.phase!=="brief"&&out.campaign.journey.step==="brief")out.campaign.journey=inferJourney(out.campaign);
  const oldPhase = out.campaign.phase;
  if (["research","survey","validation","strategy"].includes(oldPhase)) out.campaign.phase="planning";
  if (["creative","media"].includes(oldPhase)) out.campaign.phase="executing";
  if(!out.campaign.startedDay)out.campaign.startedDay=Math.min(day,Math.max(1,out.campaign.day||1));
  if(out.campaign.productionReadyDay===undefined && out.campaign.creative)out.campaign.productionReadyDay=day;
  if(out.campaign.mediaBooked===undefined)out.campaign.mediaBooked=Object.values(out.campaign.media).some(v=>v>0);
  if(!Array.isArray(out.campaign.weeklyResults))out.campaign.weeklyResults=[];
  // Keep old saves playable; only unaccepted briefs become automatic-AI candidates.
  if (!out.campaign.briefId || typeof out.campaign.briefId!=="string") out.campaign.briefId=newCampaign(out.campaign.scenarioIndex).briefId;
  if (out.campaign.aiScenario) out.campaign.aiStatus="ready";
  else if (out.campaign.phase==="brief" && !["fallback","pending","generating","error"].includes(out.campaign.aiStatus)) out.campaign.aiStatus="pending";
  else if (out.campaign.phase!=="brief" && !out.campaign.aiScenario) out.campaign.aiStatus="fallback";
  if (!["room", "city", "office", "boardroom"].includes(out.scene)) out.scene = out.agencyUnlocked ? "office" : "room";
  if (out.agencyUnlocked && out.ceo) {
    const base = newCEO(out.reputation);
    out.ceo = { ...base, ...out.ceo, reputation: { ...base.reputation, ...out.ceo.reputation, industries: out.ceo.reputation?.industries ?? {} },
      rivals:(Array.isArray(out.ceo.rivals)?out.ceo.rivals:base.rivals).map(r=>({officeTier:1,wins:0,lastMove:"Managing agency operations",...r})),
      clientTeams:Array.isArray(out.ceo.clientTeams)?out.ceo.clientTeams:[],
      fortuneAccounts:out.ceo.fortuneAccounts&&typeof out.ceo.fortuneAccounts==="object"?out.ceo.fortuneAccounts:{},
      dealSessions:out.ceo.dealSessions&&typeof out.ceo.dealSessions==="object"?out.ceo.dealSessions:{},
      activeDealId:typeof out.ceo.activeDealId==="string"?out.ceo.activeDealId:(out.ceo.pitch?.id??out.ceo.negotiation?.id??null),
      clientRelationships:out.ceo.clientRelationships&&typeof out.ceo.clientRelationships==="object"?out.ceo.clientRelationships:{},
      tenders:Array.isArray(out.ceo.tenders)?out.ceo.tenders:[],
      rivalNews:Array.isArray(out.ceo.rivalNews)?out.ceo.rivalNews:[],
      talentOffers:Array.isArray(out.ceo.talentOffers)?out.ceo.talentOffers:[],
      salaryPremiums:out.ceo.salaryPremiums??{},
      talentMarket:out.ceo.talentMarket??{},
      rivalLastTick:out.ceo.rivalLastTick??Math.max(0,out.ceo.day-1),
      weekly:{
        week:Math.max(1,out.ceo.weekly?.week??Math.floor((out.ceo.day-1)/7)+1),
        pending:Array.isArray(out.ceo.weekly?.pending)?out.ceo.weekly.pending:[],
        editions:Array.isArray(out.ceo.weekly?.editions)?out.ceo.weekly.editions:[],
        lastAdvanceDay:out.ceo.weekly?.lastAdvanceDay??out.ceo.day
      },
      speed:0,
      pauseOnIssue:false
    };
    out.ceo.day = out.clock.day;
    out.ceo.weekly = out.clock;
    // New corporate clients appear in existing CEO saves without resetting
    // relationships, negotiation outcomes, ongoing projects or cash history.
    out.ceo.leads=Array.isArray(out.ceo.leads)?out.ceo.leads:[]; // Preserve signed/active legacy deals without injecting unsolicited prospects.
    removeUncontractedLegacyAgencyClients(out);
    ensureRecruitment(out); // register generated staff before client-team reconciliation
    reconcileClientTeams(out);
  }
  const career=s.freelanceCareer??newFreelanceCareer();
  out.freelanceCareer={...newFreelanceCareer(),...career,invoices:Array.isArray(career.invoices)?career.invoices:[],completedIds:Array.isArray(career.completedIds)?career.completedIds:[],clientWins:career.clientWins??{},weeklyWeek:Number.isInteger(career.weeklyWeek)?career.weeklyWeek:out.clock.week};
  if(out.freelanceBoard&&(!Array.isArray(out.freelanceBoard.listings)||!Array.isArray(out.freelanceBoard.applications)))out.freelanceBoard=undefined;
  if(!out.agencyUnlocked||!out.ceo)ensureRecruitment(out);
  ensureCompanyMarket(out);
  if(out.agencyUnlocked&&out.ceo)ensureFortuneAccounts(out);
  return out;
}

export function loadState(): GameState {
  if (typeof window === "undefined") return defaults();
  try {
    const v2 = localStorage.getItem(SAVE_KEY);
    if (v2) return migrate(JSON.parse(v2));
    const v1 = localStorage.getItem(LEGACY_KEY);
    if (v1) return migrate(JSON.parse(v1));
  } catch { /* corrupted save → fresh */ }
  return defaults();
}
export function persist(s: GameState) {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(s)); } catch { /* quota */ }
}