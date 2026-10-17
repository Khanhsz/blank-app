import { ceoLeadDefs, ceoRivalDefs, type Channel, type LeadDef, type Rival } from "./data";

export type Phase = "brief" | "research" | "survey" | "validation" | "strategy" | "creative" | "media" | "live" | "results";
export const PHASES: Phase[] = ["brief", "research", "survey", "validation", "strategy", "creative", "media", "live", "results"];
export const PHASE_LABEL: Record<Phase, string> = { brief: "Brief", research: "Research", survey: "Survey", validation: "Validate", strategy: "Strategy", creative: "Creative", media: "Media", live: "Live", results: "Review" };

export interface Campaign {
  scenarioIndex: number; phase: Phase; day: number; spent: number; research: string[];
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
export interface CEO {
  day: number; speed: number; pauseOnIssue: boolean; leads: Lead[]; rivals: Rival[]; projects: Project[]; inbox: Issue[]; partners: string[];
  ledger: LedgerEntry[]; history: { id: string; brand: string; kpi: number; profit: number; quality: number; day: number }[];
  reputation: { overall: number; creative: number; performance: number; strategy: number; reliability: number; industries: Record<string, number> };
  seq: number; pitch: Pitch | null; negotiation: Negotiation | null; totalPayroll: number; totalDirect: number; totalBilled: number; totalPaid: number;
  legacyCampaignMigration?: number;
}

export type SceneId = "room" | "city" | "office" | "boardroom";
export interface Character { name: string; skin: string; outfit: string; hair: string; interest: string }
export interface RoomStyle { wall: string; rug: string; plant: boolean; lamp: boolean; shelf: boolean }

export interface GameState {
  version: 2; created: boolean; character: Character; room: RoomStyle; scene: SceneId;
  reputation: number; expertise: number; personalCash: number; agencyCash: number; agencyUnlocked: boolean; agencyName: string;
  staff: string[]; upgrades: string[]; cityUnlocked: boolean; campaign: Campaign;
  history: { brand: string; outcome: number; score: number; spent: number; rep: number; xp: number; scenarioIndex: number; agency: boolean }[];
  log: { t: number; msg: string }[]; graphics: "high" | "low"; ceo: CEO | null;
}

export const newCampaign = (i: number): Campaign => ({
  scenarioIndex: i, phase: "brief", day: 1, spent: 0, research: [], survey: null, insight: null,
  strategy: { segment: "students", objective: "visits", position: "study" }, creative: null,
  media: { paid: 0, creator: 0, promo: 0, flyer: 0 }, optimization: null, liveMetrics: null, final: null,
});

export const defaults = (): GameState => ({
  version: 2, created: false,
  character: { name: "Alex", skin: "#d6a681", outfit: "#4c9589", hair: "#352824", interest: "Strategy" },
  room: { wall: "#efe4d3", rug: "#bd694a", plant: true, lamp: true, shelf: false },
  scene: "room", reputation: 0, expertise: 0, personalCash: 2500000, agencyCash: 0, agencyUnlocked: false, agencyName: "",
  staff: [], upgrades: [], cityUnlocked: false, campaign: newCampaign(0), history: [], log: [], graphics: "high", ceo: null,
});

export const newCEO = (reputation: number): CEO => ({
  day: 1, speed: 1, pauseOnIssue: true,
  leads: ceoLeadDefs.map((x) => ({ ...x, status: "new", relationship: x.trust })),
  rivals: ceoRivalDefs.map((v) => ({ ...v })), projects: [], inbox: [], partners: [], ledger: [], history: [],
  reputation: { overall: reputation, creative: 50, performance: 50, strategy: 50, reliability: 60, industries: {} },
  seq: 0, pitch: null, negotiation: null, totalPayroll: 0, totalDirect: 0, totalBilled: 0, totalPaid: 0,
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
    staff: Array.isArray(s.staff) ? s.staff : [], upgrades: Array.isArray(s.upgrades) ? s.upgrades : [],
    history: Array.isArray(s.history) ? s.history : [],
    log: Array.isArray(s.log) ? (s.log as unknown[]).map((l) => (typeof l === "string" ? { t: 0, msg: l } : (l as { t: number; msg: string }))) : [],
    ceo: s.ceo ?? null,
  };
  if (!["room", "city", "office", "boardroom"].includes(out.scene)) out.scene = out.agencyUnlocked ? "office" : "room";
  if (out.agencyUnlocked && out.ceo) {
    const base = newCEO(out.reputation);
    out.ceo = { ...base, ...out.ceo, reputation: { ...base.reputation, ...out.ceo.reputation, industries: out.ceo.reputation?.industries ?? {} } };
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