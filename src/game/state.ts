import { ceoLeadDefs, ceoRivalDefs, type Channel, type LeadDef, type Rival, type Scenario } from "./data";

export type Phase = "brief" | "planning" | "executing" | "live" | "results" | "research" | "survey" | "validation" | "strategy" | "creative" | "media";
export const PHASES: Phase[] = ["planning", "executing", "live", "results"];
export const PHASE_LABEL: Record<Phase, string> = { brief: "Brief", planning: "Planning", executing: "Executing", live: "Live", results: "Results", research: "Planning", survey: "Planning", validation: "Planning", strategy: "Planning", creative: "Executing", media: "Executing" };

export type AIBriefStatus = "pending" | "generating" | "ready" | "fallback";
export interface Campaign {
  briefId: string; aiStatus: AIBriefStatus; aiError?: string | null;
  scenarioIndex: number; aiScenario?: Scenario | null; phase: Phase; day: number; spent: number; research: string[];
  startedDay?: number; productionReadyDay?: number; mediaBooked?: boolean; actualLaunchDay?: number;
  liveWeeks?: number; lastOptimizationWeek?: number; weeklyResults?: {week:number;reach:number;uplift:number;decision:string}[];
  survey: { audience: string; sample: number; question: string } | null; insight: string | null;
  strategy: { segment: string; objective: string; position: string }; creative: string | null;
  media: Record<Channel, number>; optimization: string | null;
  liveMetrics: ScoreResult | null; final: (ScoreResult & { qualityScore: number; rep: number; xp: number }) | null;
}
export interface ScoreResult { pct: number; outcome: number; adReach: number; quality: number; fit: Record<string, number>; performance: "target" | "near" | "under" }

export interface Task { key: string; label: string; role: string; effort: number; pre: string[]; cost: number; status: "backlog" | "assigned" | "in_progress" | "review" | "completed"; progress: number; quality: number; employee: string | null; outsourced: boolean; revised?: boolean; reviewDay?: number; assignedDay?: number; startedDay?: number; doneDay?: number }
export interface Project { id: string; leadId: string; brand: string; adBudget: number; fee: number; bonus: number; scope: number; duration: number; industry: string; days: number; status: "active" | "completed"; scenarioIndex: number; startedDay: number; target: number; pitchQuality: number; mediaSpent: number; mediaReserved: number; direct: number; campaign: Campaign; tasks: Task[]; paymentCount: number; payrollAllocated?: number; overheadAllocated?: number; deadlineIssue?: boolean; midpoint?: boolean; kolQuality?: number; reportQuality?: number; kpi?: number; quality?: number; margin?: number; clientTrust?: number; completedDay?: number; legacy?: boolean }
export interface Lead extends LeadDef { status: "new" | "qualified" | "pitch" | "pitch_won" | "negotiating" | "signed" | "lost" | "declined" | "renewal"; relationship: number; insightKnown?: boolean; lostTo?: string }
export interface Issue { id: string; type: string; project: string; message: string; choices: string[]; status: "open" | "resolved"; day: number; resolution?: string }
export interface LedgerEntry { day: number; what: string; value: number; lead: string; status: "paid" | "due"; due?: number; project?: string }
export interface Pitch { id: string; focus: string; price: string; team: string; evidence: string; step: "prepare" | "objection" | "result"; quality: number; objection: string | null; result: { winner: string; playerScore: number; topRival: string; topScore: number; explanation: string } | null }
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
export interface GameState {
  version: 2; created: boolean; character: Character; room: RoomStyle; scene: SceneId;
  reputation: number; expertise: number; personalCash: number; agencyCash: number; agencyUnlocked: boolean; agencyName: string;
  staff: string[]; upgrades: string[]; cityUnlocked: boolean; campaign: Campaign; clock: GameClock; officeId:string;
  world: WorldProgress;
  history: { brand: string; outcome: number; score: number; spent: number; rep: number; xp: number; scenarioIndex: number; agency: boolean }[];
  log: { t: number; msg: string }[]; graphics: "high" | "low"; ceo: CEO | null;
}

export const newCampaign = (i: number, day = 1): Campaign => ({
  briefId: "brief-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,9),
  aiStatus:"pending", aiError:null,
  scenarioIndex: i, aiScenario:null, phase: "brief", day, startedDay:day, spent: 0, research: [], mediaBooked:false, productionReadyDay:undefined, liveWeeks:0, weeklyResults:[], survey: null, insight: null,
  strategy: { segment: "students", objective: "visits", position: "study" }, creative: null,
  media: { paid: 0, creator: 0, promo: 0, flyer: 0 }, optimization: null, liveMetrics: null, final: null,
});

export const defaults = (): GameState => ({
  version: 2, created: false,
  character: { name: "Alex", skin: "#d6a681", outfit: "#4c9589", hair: "#352824", interest: "Strategy", hairstyle:"short", accessory:"none" },
  room: { wall: "#efe4d3", rug: "#bd694a", plant: true, lamp: true, shelf: false },
  scene: "room", reputation: 0, expertise: 0, personalCash: 2500000, agencyCash: 0, agencyUnlocked: false, agencyName: "",
  staff: [], upgrades: [], cityUnlocked: false, campaign: newCampaign(0), clock:{day:1,week:1,pending:[],editions:[],lastAdvanceDay:1}, officeId:"agency", world:{visited:[],contacts:[],leasedOffices:[]}, history: [], log: [], graphics: "high", ceo: null,
});

export const newCEO = (reputation: number): CEO => ({
  day: 1, speed: 0, pauseOnIssue: false,
  leads: ceoLeadDefs.map((x) => ({ ...x, status: "new", relationship: x.trust })),
  rivals: ceoRivalDefs.map((v) => ({ ...v })), projects: [], inbox: [], partners: [], ledger: [], history: [],
  reputation: { overall: reputation, creative: 50, performance: 50, strategy: 50, reliability: 60, industries: {} },
  seq: 0, pitch: null, negotiation: null, totalPayroll: 0, totalDirect: 0, totalBilled: 0, totalPaid: 0,
  tenders:[], rivalNews:[], talentOffers:[], salaryPremiums:{}, talentMarket:{}, rivalLastTick:0,
  weekly:{week:1,pending:[],editions:[],lastAdvanceDay:1},
});

export const SAVE_KEY = "marketing-tycoon-lovable-v2";
const LEGACY_KEY = "marketing-tycoon-save-v1";

/** Safe migration: accepts v1 saves from the original game (same field names) and fills gaps. */
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
    staff: Array.isArray(s.staff) ? s.staff : [], upgrades: Array.isArray(s.upgrades) ? s.upgrades : [],
    history: Array.isArray(s.history) ? s.history : [],
    world:{visited:Array.isArray(s.world?.visited)?s.world.visited.filter((x):x is string=>typeof x==="string"):[],contacts:Array.isArray(s.world?.contacts)?s.world.contacts.filter((x):x is string=>typeof x==="string"):[],leasedOffices:Array.isArray(s.world?.leasedOffices)?s.world.leasedOffices.filter((x):x is string=>typeof x==="string"):[]},
    log: Array.isArray(s.log) ? (s.log as unknown[]).map((l) => (typeof l === "string" ? { t: 0, msg: l } : (l as { t: number; msg: string }))) : [],
    ceo: s.ceo ?? null,
  };
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
  else if (out.campaign.phase==="brief" && !["fallback","pending","generating"].includes(out.campaign.aiStatus)) out.campaign.aiStatus="pending";
  else if (out.campaign.phase!=="brief" && !out.campaign.aiScenario) out.campaign.aiStatus="fallback";
  if (!["room", "city", "office", "boardroom"].includes(out.scene)) out.scene = out.agencyUnlocked ? "office" : "room";
  if (out.agencyUnlocked && out.ceo) {
    const base = newCEO(out.reputation);
    out.ceo = { ...base, ...out.ceo, reputation: { ...base.reputation, ...out.ceo.reputation, industries: out.ceo.reputation?.industries ?? {} },
      rivals:(Array.isArray(out.ceo.rivals)?out.ceo.rivals:base.rivals).map(r=>({officeTier:1,wins:0,lastMove:"Managing agency operations",...r})),
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
    const priorLeads=Array.isArray(out.ceo.leads)?out.ceo.leads:[];
    const knownIds=new Set(priorLeads.map(l=>l.id));
    out.ceo.leads=[...priorLeads,...base.leads.filter(l=>!knownIds.has(l.id))];
  }
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