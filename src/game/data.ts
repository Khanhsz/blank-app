// Ported from Marketing Tycoon V3.1 (Khanhsz/blank-app, marketing-tycoon-preview/index.html).
// Values (costs, fees, multipliers, true answers) are kept identical to the original; copy is translated to English.

export type Channel = "paid" | "creator" | "promo" | "flyer";

export interface Scenario {
  id: string;
  brand: string;
  industry: string;
  contact: string;
  budget: number;
  fee: number;
  days: number;
  baseline: number;
  target: number;
  metric: string;
  unit: string;
  summary: string;
  client: string;
  trueInsight: string;
  trueSegment: string;
  truePosition: string;
  trueCreative: string;
  trueObjective: string;
  channel: Record<Channel, number>;
  reports: Record<string, string>;
  insightOptions?: {id:string;title:string;desc:string}[];
  aiMeta?: {category:string;seed:number;label:string};
}

export const researchOptions = [
  { id: "audit", title: "Competitor audit", description: "Nearby outlets, price levels, promotions and foot traffic near the campus.", cost: 300000, days: 1, quality: 1 },
  { id: "reviews", title: "Review analysis", description: "Find patterns in customer feedback and the sources of disappointment.", cost: 0, days: 1, quality: 1 },
  { id: "industry", title: "Market report", description: "Estimate category demand from aggregated industry reports.", cost: 700000, days: 1, quality: 0.75 },
  { id: "interview", title: "In-store interviews", description: "Eight in-depth conversations to uncover real barriers.", cost: 500000, days: 2, quality: 1.4 },
] as const;

export const surveyCosts: Record<number, number> = { 20: 140000, 60: 370000, 120: 720000 };

export const mediaChannels: { id: Channel; title: string; base: number; description: string }[] = [
  { id: "paid", title: "Paid social", base: 0.95, description: "Reach target audiences by interest and area." },
  { id: "creator", title: "Micro KOC", base: 1.08, description: "Credibility from small content creators." },
  { id: "promo", title: "In-store promotion", base: 0.82, description: "Pushes short-term purchase decisions." },
  { id: "flyer", title: "Campus / local activation", base: 0.65, description: "Direct contact and word of mouth in the area." },
];

const r = (audit: string, reviews: string, industry: string, interview: string) => ({ audit, reviews, industry, interview });

export const scenarios: Scenario[] = [
  { id: "coffee", brand: "Mây Corner Coffee", industry: "F&B · Coffee shop", contact: "Linh · Owner", budget: 8000000, fee: 3200000, days: 14, baseline: 55, target: 25, metric: "visits/day", unit: "visits",
    summary: "Grow afternoon visits from nearby students on a tight budget.",
    client: "We sit right between two universities but afternoons are still empty. Can you help people discover Mây Corner and come try it?",
    trueInsight: "awareness", trueSegment: "students", truePosition: "study", trueCreative: "study", trueObjective: "visits", channel: { paid: 1.1, creator: 1.25, promo: 0.85, flyer: 0.76 },
    reports: r("Two nearby shops appear constantly on TikTok with directions to their door. Prices are similar.", "Visitors rate drinks well, but many students say they have never heard of the shop.", "Out-of-home drink demand grows among students; the report says nothing about this shop specifically.", "Six of eight students interviewed did not know Mây Corner, even though they walk past it daily.") },
  { id: "fitness", brand: "Bloom Fit Studio", industry: "Health · Gym", contact: "Thảo · Founder", budget: 12000000, fee: 4800000, days: 14, baseline: 18, target: 30, metric: "consult sign-ups/week", unit: "leads",
    summary: "Grow trial sign-ups from office workers instead of just content views.",
    client: "We post lots of class photos but sign-ups aren't growing. People need to believe the classes really suit beginners.",
    trueInsight: "trust", trueSegment: "youngpros", truePosition: "proof", trueCreative: "story", trueObjective: "leads", channel: { paid: 1.2, creator: 1.17, promo: 0.85, flyer: 0.4 },
    reports: r("Many competitors advertise free trials, few show real beginner experiences.", "Customers worry about the level required and being pushed into long contracts.", "Young workers care about health, but industry data doesn't explain the sign-up barrier.", "Most beginners want to see real people, real classes and flexible schedules before leaving a number.") },
  { id: "fashion", brand: "Moss Streetwear", industry: "Retail · Fashion", contact: "Minh · Brand manager", budget: 16000000, fee: 6400000, days: 14, baseline: 42, target: 28, metric: "orders/week", unit: "orders",
    summary: "Turn love for the designs into orders from young shoppers.",
    client: "People save our lookbooks but don't buy. I want a campaign that makes style the reason to choose Moss.",
    trueInsight: "style", trueSegment: "genz", truePosition: "style", trueCreative: "creator", trueObjective: "sales", channel: { paid: 1.03, creator: 1.32, promo: 0.78, flyer: 0.6 },
    reports: r("Standout competitors post daily outfit videos instead of one-way lookbooks.", "Many like the designs but can't picture pairing them with what they own.", "Young people care about fashion, but trends don't confirm Moss's purchase barrier.", "Respondents want to see flexible outfits on real people before buying.") },
  { id: "orion", brand: "ORION Electronics", industry: "Consumer electronics", contact: "Marketing Director", budget: 14000000, fee: 190000000, days: 36, baseline: 100, target: 16, metric: "demand index", unit: "pts", summary: "National electronics launch.", client: "",
    trueInsight: "trust", trueSegment: "youngpros", truePosition: "proof", trueCreative: "story", trueObjective: "leads", channel: { paid: 1.18, creator: 1.17, promo: 0.82, flyer: 0.42 },
    reports: r("Big brands compete on performance, warranty and experience proof.", "Buyers worry about after-sales service and want trustworthy experiences.", "Category growth doesn't prove this product's benefit.", "Buyers need to verify value before upgrading.") },
  { id: "sora", brand: "Sora Home", industry: "Home & lifestyle", contact: "Brand Director", budget: 10000000, fee: 42000000, days: 25, baseline: 60, target: 12, metric: "trials", unit: "trials", summary: "Store trial growth.", client: "",
    trueInsight: "style", trueSegment: "genz", truePosition: "style", trueCreative: "creator", trueObjective: "visits", channel: { paid: 1.08, creator: 1.25, promo: 0.87, flyer: 0.7 },
    reports: r("Stores get good traffic but the experience isn't memorable.", "Customers can't picture products in a real home.", "Home decor is a growing need.", "Buyers want real usage scenarios.") },
  { id: "vertex", brand: "Vertex Mobility", industry: "Transport tech", contact: "Finance Director", budget: 12000000, fee: 78000000, days: 31, baseline: 75, target: 20, metric: "qualified leads", unit: "leads", summary: "Lead quality.", client: "",
    trueInsight: "value", trueSegment: "youngpros", truePosition: "budget", trueCreative: "discount", trueObjective: "leads", channel: { paid: 1.28, creator: 0.98, promo: 1.07, flyer: 0.44 },
    reports: r("Competitors stress total cost of ownership.", "Buyers hesitate about long-term upkeep cost.", "Urban mobility is a general trend.", "Usage value and total cost are weighed carefully.") },
];

export const insights = [
  { id: "awareness", title: "Low awareness", desc: "Target customers don't know the brand exists." },
  { id: "value", title: "Value not convincing", desc: "They know the brand but don't see it as worth it." },
  { id: "location", title: "Inconvenient location", desc: "Demand exists but access is hard." },
  { id: "trust", title: "Lack of trust", desc: "Customers fear the risk of trying." },
  { id: "style", title: "Can't picture usage", desc: "They like the idea but don't see where it fits." },
];
export const segments = [
  { id: "students", title: "Students near campus" },
  { id: "youngpros", title: "Young professionals" },
  { id: "genz", title: "Style-driven Gen Z" },
  { id: "everyone", title: "Everyone in the city" },
];
export const positions = [
  { id: "study", title: "A place to study & unwind" },
  { id: "budget", title: "Best price, max savings" },
  { id: "proof", title: "Real experience, low risk" },
  { id: "style", title: "Your own daily style" },
];
export const objectives = [
  { id: "visits", title: "Real store visits" },
  { id: "leads", title: "Sign-ups / leads" },
  { id: "sales", title: "Orders" },
  { id: "views", title: "Views / reach" },
];
export const creatives = [
  { id: "study", title: "A corner where you belong", subtitle: "Student lifestyle · UGC", desc: "Moments of hanging out, studying and resting in the real space.", cost: 850000 },
  { id: "story", title: "Real people, real stories", subtitle: "Testimonial · Social proof", desc: "Real customers retell their experience; needs filming and verification.", cost: 1300000 },
  { id: "creator", title: "A day with a creator", subtitle: "Short-form · Creator styling", desc: "Turns product usage into a shareable story.", cost: 1500000 },
  { id: "discount", title: "Crazy deal this week", subtitle: "Price promotion · Urgency", desc: "Drives instant purchase; short-term results but can dilute positioning.", cost: 400000 },
];

export const optimizations = [
  { id: "refresh", title: "Refresh creative", cost: 400000, desc: "Freshens the message; costs production effort." },
  { id: "retarget", title: "Retarget engaged audience", cost: 550000, desc: "Focus on people who already interacted." },
  { id: "promo", title: "Trigger an offer", cost: 300000, desc: "Short-term demand boost, risk of off-brand positioning." },
  { id: "hold", title: "Hold the plan", cost: 0, desc: "No extra spend; accept current signals." },
] as const;

export type UpgradeId = "research" | "creative" | "media" | "influencer";
export const upgrades: Record<UpgradeId, { name: string; cost: number; desc: string }> = {
  research: { name: "Consumer Insight Toolkit", cost: 500000, desc: "+10% survey quality — sharper research interpretation." },
  creative: { name: "Creative Production Network", cost: 750000, desc: "+2.5 campaign quality from fewer creative revisions." },
  media: { name: "Performance Workspace", cost: 650000, desc: "+4.5% effective spend on paid social." },
  influencer: { name: "Trusted Creator Directory", cost: 450000, desc: "+5% effective spend on creator channels." },
};
export const COWORK_COST = 300000;

export interface Employee { id: string; name: string; role: string; salary: number; skill: string }
export const employees: Employee[] = [
  { id: "researcher", name: "An Phạm", role: "Researcher", salary: 1600000, skill: "Insight / Survey" },
  { id: "planner", name: "Huy Nguyễn", role: "Strategic Planner", salary: 2200000, skill: "Strategy / Positioning" },
  { id: "creator", name: "Vy Trần", role: "Creative Lead", salary: 2000000, skill: "Copy / Art Direction" },
  { id: "buyer", name: "Tú Lê", role: "Media Buyer", salary: 1850000, skill: "Paid Media / Analytics" },
  { id: "account", name: "Mai Đỗ", role: "Account Manager", salary: 3400000, skill: "Client / Scope" },
  { id: "kol", name: "Phúc Lâm", role: "KOL/KOC Manager", salary: 3100000, skill: "Creator / Booking" },
  { id: "analyst", name: "Nhi Võ", role: "Data Analyst", salary: 3500000, skill: "Metrics / Reporting" },
  { id: "producer", name: "Bảo Trần", role: "Production Producer", salary: 2800000, skill: "Assets / Activations" },
  { id: "ops", name: "Hà Phạm", role: "Operations Lead", salary: 2600000, skill: "Project Delivery / Resource Planning" },
];
export const employeeById = (id: string) => employees.find((e) => e.id === id);

export const ceoRoles: Record<string, string> = { account: "Account Manager", research: "Research Executive", strategy: "Strategic Planner", creative: "Creative Team", production: "Production Producer", media: "Media Buyer", kol: "KOL/KOC Manager", analytics: "Data Analyst", operations: "Operations Lead" };
export const ceoTalent: Record<string, string> = { research: "researcher", strategy: "planner", creative: "creator", production: "producer", operations: "ops", media: "buyer", account: "account", kol: "kol", analytics: "analyst" };

export interface LeadDef {
  id: string; brand: string; industry: string; value: number; fee: number; duration: number; objective: string; scope: number; intensity: number;
  difficulty: number; required: number; rivalIds: string[]; pref: "performance" | "creative" | "cost" | "strategy"; trust: number; stakeholder: string;
  target: number; scenario: number; origin: string; desc: string;
}
export const ceoLeadDefs: LeadDef[] = [
  { id: "orion", brand: "ORION Electronics", industry: "Consumer electronics", value: 2400000000, fee: 190000000, duration: 36, objective: "Brand consideration & qualified sales", scope: 12, intensity: 0.9, difficulty: 72, required: 7, rivalIds: ["atlas", "pulse"], pref: "performance", trust: 52, stakeholder: "Marketing Director", target: 16, scenario: 3, origin: "Corporate procurement", desc: "National launch of a new electronics line. RFP requires integrated strategy, content production, KOL/KOC and conversion reporting." },
  { id: "sora", brand: "Sora Home", industry: "Home & lifestyle", value: 260000000, fee: 42000000, duration: 25, objective: "Product trial & store visits", scope: 7, intensity: 0.55, difficulty: 50, required: 4, rivalIds: ["muse", "lean"], pref: "creative", trust: 56, stakeholder: "Brand Director", target: 12, scenario: 4, origin: "Client referral", desc: "Grow product trials across the store chain and encourage customer testimonials." },
  { id: "vertex", brand: "Vertex Mobility", industry: "Transport technology", value: 550000000, fee: 78000000, duration: 31, objective: "Qualified leads & efficiency", scope: 9, intensity: 0.72, difficulty: 62, required: 5, rivalIds: ["pulse", "atlas"], pref: "cost", trust: 44, stakeholder: "Finance Director", target: 20, scenario: 5, origin: "Industry networking", desc: "Optimise lead quality for an urban mobility product; emphasise revenue efficiency." },
  { id: "bloom", brand: "Bloom Beauty", industry: "Beauty & skincare", value: 480000000, fee: 67000000, duration: 28, objective: "New-line awareness & first purchases", scope: 9, intensity: 0.7, difficulty: 60, required: 5, rivalIds: ["muse", "pulse"], pref: "creative", trust: 49, stakeholder: "Brand Director", target: 18, scenario: 1, origin: "Beauty brand procurement", desc: "Launch a new skincare line, earning consumer confidence with creator partnerships and distinctive brand storytelling." },
  { id: "apex", brand: "Apex FMCG", industry: "Consumer packaged goods", value: 1250000000, fee: 128000000, duration: 42, objective: "Distribution trial & product penetration", scope: 12, intensity: 0.88, difficulty: 78, required: 7, rivalIds: ["atlas", "north"], pref: "strategy", trust: 43, stakeholder: "Regional Marketing Director", target: 19, scenario: 2, origin: "Regional marketing tender", desc: "Plan an omnichannel category-growth launch across modern trade, community channels and regional retail partners." },
  { id: "northstar", brand: "NorthStar Education", industry: "Education technology", value: 360000000, fee: 52000000, duration: 30, objective: "Qualified course enquiries & sign-ups", scope: 8, intensity: 0.67, difficulty: 56, required: 4, rivalIds: ["north", "lean"], pref: "performance", trust: 57, stakeholder: "Growth Director", target: 21, scenario: 0, origin: "Education sector referral", desc: "Improve the quality of course enquiries and position learning programs with credible student outcomes." },
];

export interface TaskDef { key: string; label: string; role: string; effort: number; pre: string[]; cost: number }
export const ceoTaskDefs: TaskDef[] = [
  { key: "account", label: "Kick-off & scope control", role: "account", effort: 2, pre: [], cost: 850000 },
  { key: "research", label: "Consumer research & survey", role: "research", effort: 3, pre: ["account"], cost: 1900000 },
  { key: "strategy", label: "Positioning & campaign plan", role: "strategy", effort: 3, pre: ["research"], cost: 1700000 },
  { key: "creative", label: "Creative concept & content", role: "creative", effort: 3, pre: ["strategy"], cost: 1700000 },
  { key: "production", label: "Asset production & activation", role: "production", effort: 4, pre: ["creative"], cost: 1900000 },
  { key: "operations", label: "Delivery QA & coordination", role: "operations", effort: 3, pre: ["account"], cost: 900000 },
  { key: "media", label: "Media planning & A/B testing", role: "media", effort: 4, pre: ["strategy"], cost: 1600000 },
  { key: "kol", label: "Creator sourcing & execution", role: "kol", effort: 4, pre: ["strategy"], cost: 2500000 },
  { key: "analytics", label: "Campaign analytics & client report", role: "analytics", effort: 4, pre: ["production", "media", "kol", "operations"], cost: 1550000 },
];

export interface Rival { id: string; name: string; type: string; special: string; rep: number; creative: number; performance: number; strategy: number; people: number; cash: number; price: number; aggression: number; clients: number; officeTier?:number; wins?:number; lastMove?:string; lastMoveDay?:number; focus?: "premium"|"growth"|"creative"|"value"|"strategy"; activeContracts?:{leadId:string;brand:string;finishDay:number;revenue:number}[] }
export const ceoRivalDefs: Rival[] = [
  { id: "atlas", name: "Atlas Global Network", type: "Full-service Network", special: "Integrated", rep: 83, creative: 76, performance: 76, strategy: 80, people: 54, cash: 480000000, price: 1.22, aggression: 0.63, clients: 12 },
  { id: "pulse", name: "Pulse Performance", type: "Performance Agency", special: "Performance", rep: 72, creative: 58, performance: 92, strategy: 70, people: 24, cash: 165000000, price: 1.08, aggression: 0.78, clients: 7 },
  { id: "muse", name: "Muse & Matter", type: "Creative Boutique", special: "Creative", rep: 68, creative: 94, performance: 55, strategy: 71, people: 15, cash: 95000000, price: 1.31, aggression: 0.42, clients: 5 },
  { id: "lean", name: "LeanLab Digital", type: "Budget Agency", special: "Cost", rep: 52, creative: 57, performance: 66, strategy: 49, people: 18, cash: 69000000, price: 0.73, aggression: 0.9, clients: 8 },
  { id: "north", name: "Northline Advisory", type: "Strategy Consultancy", special: "Strategy", rep: 75, creative: 56, performance: 60, strategy: 95, people: 12, cash: 82000000, price: 1.27, aggression: 0.5, clients: 4 },
];

export const ceoPartners = [
  { id: "media", name: "Meridian Media Exchange", kind: "Media network", deposit: 1800000, monthly: 220000, discount: 0.09, cap: "Media", risk: "Minimum spend commitment" },
  { id: "research", name: "DeepFrame Insights", kind: "Research provider", deposit: 1350000, monthly: 165000, discount: 0.12, cap: "Research", risk: "Fixed subscription fee" },
  { id: "production", name: "Frame Studio Collective", kind: "Production studio", deposit: 2200000, monthly: 275000, discount: 0.1, cap: "Creative", risk: "Partner priority lock-in" },
];

export const AGENCY_REQ = { campaigns: 3, reputation: 38, expertise: 18, cash: 8000000 };
export const BRAND_HQ_REP = 25;

export const money = (n: number) => new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(Math.round(n)) + "đ";
export const compact = (n: number) => {
  const a = Math.abs(n), s = n < 0 ? "-" : "";
  if (a >= 1e9) return s + (a / 1e9).toFixed(1) + "B";
  if (a >= 1e6) return s + (a / 1e6).toFixed(a % 1e6 ? 1 : 0) + "M";
  if (a >= 1e3) return s + (a / 1e3).toFixed(0) + "k";
  return s + String(Math.round(a));
};
export const clamp = (n: number, a: number, b: number) => Math.min(b, Math.max(a, n));
export const hash = (n: number) => ((n * 9301 + 49297) % 233280) / 233280;
export const ceoRand = (seed: string | number) => {
  let h = 2166136261;
  for (const ch of String(seed)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  return ((h >>> 0) % 10000) / 10000;
};