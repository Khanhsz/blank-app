/** Canonical client master database V1.
 * All non-Fortune client companies and their financial metrics are SYNTHETIC.
 * Fortune 50 US (2026) ranks are sourced; only published, checked revenue figures
 * are stored as reported. Marketing budgets and awareness are GAME ESTIMATES.
 * No endpoint, spreadsheet, AI generated brief or CRM lookup is needed at runtime.
 */
import {ceoLeadDefs,scenarios,clamp,type Scenario,type LeadDef} from "./data";

export type ClientSector="coffee"|"beauty"|"fashion"|"education"|"tech"|"fitness"|"food";
export type ClientSegment="startup"|"sme"|"bigcorp";
export type DataBasis="simulated"|"fortune-2026";
export interface ClientMaster {
 id:string; brand:string; sector:ClientSector;segment:ClientSegment;
 industry:string;market:string;businessModel:string;description:string;basis:DataBasis;
 employees:number|null;annualRevenueVnd:number|null;verifiedRevenueUsd:number|null;
 /** modeled marketing budget per year, in VND — NEVER an audited company expense */
 marketingBudgetVnd:number;brandAwareness:number;scaleScore:number;
 commercialScore:number;fortuneRank:number|null;fortuneYear:number|null;
 rankingSource:string|null;revenueSource:string|null;sourceNote:string;
}
export const SECTORS:{id:ClientSector;label:string;brief:string;insight:string;position:string;creative:string;objective:string;metric:string;unit:string;baseline:number;channel:Scenario["channel"]}[]=[
 {id:"coffee",label:"Coffee",brief:"Increase local visits and repeat purchases",insight:"awareness",position:"study",creative:"study",objective:"visits",metric:"daily visits",unit:"visits",baseline:55,channel:{paid:1.1,creator:1.25,promo:.85,flyer:.76}},
 {id:"beauty",label:"Beauty",brief:"Grow new-line awareness and product trials",insight:"trust",position:"proof",creative:"story",objective:"leads",metric:"qualified product trials",unit:"trials",baseline:40,channel:{paid:1.18,creator:1.24,promo:.86,flyer:.48}},
 {id:"fashion",label:"Fashion",brief:"Turn style discovery into purchases",insight:"style",position:"style",creative:"creator",objective:"sales",metric:"weekly orders",unit:"orders",baseline:42,channel:{paid:1.05,creator:1.3,promo:.8,flyer:.6}},
 {id:"education",label:"Education",brief:"Increase relevant course enquiries",insight:"trust",position:"proof",creative:"story",objective:"leads",metric:"qualified enquiries",unit:"leads",baseline:32,channel:{paid:1.22,creator:1.14,promo:.81,flyer:.62}},
 {id:"tech",label:"Tech",brief:"Build product confidence and qualified demand",insight:"value",position:"proof",creative:"story",objective:"leads",metric:"qualified demo requests",unit:"leads",baseline:36,channel:{paid:1.26,creator:1.1,promo:.82,flyer:.38}},
 {id:"fitness",label:"Fitness",brief:"Grow trial sessions and beginner sign-ups",insight:"trust",position:"proof",creative:"story",objective:"leads",metric:"class enquiries",unit:"leads",baseline:18,channel:{paid:1.2,creator:1.17,promo:.85,flyer:.4}},
 {id:"food",label:"Food",brief:"Grow product trial and repeat buying",insight:"value",position:"budget",creative:"creator",objective:"sales",metric:"weekly orders",unit:"orders",baseline:72,channel:{paid:1.16,creator:1.1,promo:1.02,flyer:.72}}
];
const WORDS:Record<ClientSector,string[]>={
 coffee:["Mây Corner Coffee","Lùm Roastery","Daybreak Beans","Hẻm Brew","Nắng Coffee Lab","Oakline Café","August Roasters","Chillhouse Coffee","Orbit Coffee","Granary Roasters","Mosaic Coffee Group","North Café Collective"],
 beauty:["Serein Skincare","Dew & Petal","Mira Botanics","Barely Beauty","Bloom Beauty","Lumière Lab","Astra Cosmetics","Moss Beauty","Aura Personal Care","Horizon Derm","Mira Beauty Group","Nova Cosmetics"],
 fashion:["Moss Streetwear","Rêve Studio","June Apparel","Mono Archive","Fable Fashion","Lava Street","Afterglow Denim","Wearwise","Solstice Apparel","Mode District","Arc Fashion Group","Everline Retail"],
 education:["StudyNest","BrightSeed Academy","LeapSpring","Mentorly","NorthStar Education","CloudCampus","GlobeTutor","Pioneer Learning","Learncore","Beacon Education","Nexus Learning Group","Atlas Academy"],
 tech:["Orbit SaaS","SparkFlow App","Nova Devices","DigiNest","Vertex Mobility","Sora Home Tech","CodeBridge","Sync Labs","ORION Electronics","Mavix Digital","Vantage Technologies","Northpeak Cloud"],
 fitness:["Bloom Fit Studio","Lift Society","Flow Pilates","ActiveHour","Next Rep","Motion House","PulseFit Studio","Zen Motion","FlexWell","Core Health Club","Vita Gym Network","Peak Fitness"],
 food:["Mầm Kitchen","Crisp Bites","Fudo Meal","Bánh Nhà","Sora Foods","Goodgrain","Chili Kitchen","Nori Snacks","Apex FMCG","Harvest Foods","Crave Food Group","Greenbasket Foods"]
};
// A small curated sample from the 2026 US Fortune 500 top 50. Rank comes
// from Fortune; not a claim that these firms would actually hire the player.
const FORTUNE:{rank:number;brand:string;sector:ClientSector;model:string;revenueUsd?:number}[]=[
 {rank:1,brand:"Amazon",sector:"tech",model:"Commerce and cloud",revenueUsd:716924000000},
 {rank:2,brand:"Walmart",sector:"food",model:"Grocery and general retail",revenueUsd:713163000000},
 {rank:4,brand:"Apple",sector:"tech",model:"Consumer devices and services",revenueUsd:416161000000},
 {rank:5,brand:"Alphabet",sector:"tech",model:"Search, advertising and AI",revenueUsd:402836000000},
 {rank:11,brand:"Microsoft",sector:"tech",model:"Software and cloud"},
 {rank:13,brand:"Costco Wholesale",sector:"food",model:"Membership wholesale and grocery"},
 {rank:16,brand:"Nvidia",sector:"tech",model:"Computing and AI chips"},
 {rank:17,brand:"Meta Platforms",sector:"tech",model:"Social platforms and advertising"},
 {rank:27,brand:"Kroger",sector:"food",model:"Grocery retail"},
 {rank:28,brand:"Verizon Communications",sector:"tech",model:"Telecommunications"},
 {rank:35,brand:"AT&T",sector:"tech",model:"Telecommunications"},
 {rank:41,brand:"Dell Technologies",sector:"tech",model:"Enterprise and consumer computing"},
 {rank:42,brand:"Target",sector:"fashion",model:"General retail including fashion"},
 {rank:46,brand:"PepsiCo",sector:"food",model:"Food and soft drinks"}
];
const FORTUNE_SOURCE="https://fortune.com/ranking/fortune500/";
const FORTUNE_REVENUE_SOURCE="https://fortune.com/ranking/global500/";
/** Fictional revenue and marketing shares. Deliberately non-overlapping tiers.
 * These are GAME balance assumptions, not statutory SME thresholds or filings.
 * Gemini can influence subsequent growth through the market pulse, not overwrite
 * these starting boundaries or any published Fortune revenue.
 */
export const FINANCIAL_BANDS={
 startup:{revenueMinVnd:350_000_000,revenueMaxVnd:2_500_000_000,marketingShareMin:.065,marketingShareMax:.095},
 sme:{revenueMinVnd:4_000_000_000,revenueMaxVnd:55_000_000_000,marketingShareMin:.045,marketingShareMax:.075},
 bigcorp:{revenueMinVnd:10_000_000_000_000,revenueMaxVnd:80_000_000_000_000,marketingShareMin:.027,marketingShareMax:.043}
} as const;
export const SIMULATED_USD_TO_VND=25_000;
/** Fortune unknown revenues are simulated ONLY, never recorded as verified. */
export function simulatedFortuneRevenueUsd(rank:number){
 return Math.round((90+(51-rank)*4.3+hashSeed("fortune:"+rank)*45)*1e9);
}
const tierAwareness:Record<ClientSegment,number>={startup:12,sme:35,bigcorp:66};
const tierScale:Record<ClientSegment,number>={startup:14,sme:43,bigcorp:79};
const sectorBias:Record<ClientSector,number>={coffee:.65,beauty:1.05,fashion:1,education:.82,tech:1.4,fitness:.7,food:1.1};
const hashSeed=(key:string)=>{let h=2166136261;for(let i=0;i<key.length;i++)h=Math.imul(h^key.charCodeAt(i),16777619);return (h>>>0)%10000/10000;};
const vnd=(n:number)=>Math.round(n/100000)*100000;
function makeFictional(sector:ClientSector,segment:ClientSegment,index:number):ClientMaster {
 const idx=(segment==="startup"?0:segment==="sme"?4:8)+index;
 const name=WORDS[sector][idx]??(["Summit","Pinnacle"][index-4]+" "+SECTORS.find(s=>s.id===sector)!.label+" Holdings");
 const id=segment+"-"+sector+"-"+index;
 const rand=hashSeed(id),band=FINANCIAL_BANDS[segment];
 const employeeBase=segment==="startup"?3:segment==="sme"?18:900;
 const employees=Math.round(employeeBase*(.7+rand*1.5));
 const revenueCandidate=(band.revenueMinVnd+(band.revenueMaxVnd-band.revenueMinVnd)*rand)*sectorBias[sector];
 const annualRevenueVnd=vnd(clamp(revenueCandidate,band.revenueMinVnd,band.revenueMaxVnd));
 const share=band.marketingShareMin+(band.marketingShareMax-band.marketingShareMin)*hashSeed("budget:"+id);
 const marketingBudgetVnd=vnd(annualRevenueVnd*share);
 const brandAwareness=clamp(Math.round(tierAwareness[segment]+rand*20),2,98);
 const scaleScore=clamp(Math.round(tierScale[segment]+rand*16),0,98);
 return {id,brand:name,sector,segment,industry:SECTORS.find(x=>x.id===sector)!.label,
  market:"Simulated Vietnam market",businessModel:"Fictional "+sector+" company",description:SECTORS.find(x=>x.id===sector)!.brief,
  basis:"simulated",employees,annualRevenueVnd,verifiedRevenueUsd:null,marketingBudgetVnd,brandAwareness,scaleScore,
  commercialScore:0,fortuneRank:null,fortuneYear:null,rankingSource:null,revenueSource:null,
  sourceNote:"Fictional client. Starting revenue, payroll scale, marketing share and awareness are bounded gameplay estimates; Gemini affects future game market dynamics."};
}
function makeFortune({rank,brand,sector,model,revenueUsd}:typeof FORTUNE[number]):ClientMaster{
 const modeledAwareness=clamp(78+Math.round((51-rank)*.26),65,97);
 const baselineRevenueUsd=revenueUsd??simulatedFortuneRevenueUsd(rank);
 const fortuneMarketingRate=sector==="food"?.018:sector==="tech"?.04:.032;
 const budget=vnd(baselineRevenueUsd*SIMULATED_USD_TO_VND*fortuneMarketingRate);
 return {id:"f50-"+rank,brand,sector,segment:"bigcorp",industry:SECTORS.find(x=>x.id===sector)!.label,
  market:"United States / global",businessModel:model,description:"Fictional marketing brief for a real company. Not an actual RFP, contract, endorsement or partnership.",
  basis:"fortune-2026",employees:null,annualRevenueVnd:null,verifiedRevenueUsd:revenueUsd??null,
  marketingBudgetVnd:budget,brandAwareness:modeledAwareness,scaleScore:clamp(Math.round(99-rank*.25),78,99),
  commercialScore:0,fortuneRank:rank,fortuneYear:2026,rankingSource:FORTUNE_SOURCE,
  revenueSource:revenueUsd?FORTUNE_REVENUE_SOURCE:null,
  sourceNote:revenueUsd?"Fortune US rank and published Fortune Global 500 revenue (USD). Marketing budget and awareness are game simulations.":
    "Fortune US rank verified. Company revenue not stored until independently verified. Marketing budget and awareness are game simulations."};
}
function score(c:ClientMaster):number{
 // Never treat a modeled awareness/budget as verified. The score is a game index.
 const revenueScale=c.verifiedRevenueUsd?99-Math.min(16,(c.fortuneRank??50)*.25):
   c.annualRevenueVnd?clamp(Math.round(13+Math.log10(c.annualRevenueVnd/1e9)*26),10,96):83;
 const budgetScale=clamp(Math.round(12+Math.log10(Math.max(1,c.marketingBudgetVnd)/1e8)*19),8,98);
 return clamp(Math.round(.30*revenueScale+.25*c.scaleScore+.25*budgetScale+.20*c.brandAwareness),0,100);
}
const fiction=SECTORS.flatMap(sec=>(["startup","sme","bigcorp"] as const).flatMap(segment=>
 Array.from({length:segment==="bigcorp"?6:4},(_,i)=>makeFictional(sec.id,segment,i))));
export const CLIENT_DATABASE:ClientMaster[]=[...fiction,...FORTUNE.map(makeFortune)].map(c=>({...c,commercialScore:score(c)}));
export const CLIENT_BY_ID:Record<string,ClientMaster>=Object.fromEntries(CLIENT_DATABASE.map(x=>[x.id,x]));
export const getClient=(id:string)=>CLIENT_BY_ID[id]??null;
export const CLIENT_COUNTS={total:CLIENT_DATABASE.length,fortune:CLIENT_DATABASE.filter(x=>x.basis==="fortune-2026").length,
 startup:CLIENT_DATABASE.filter(x=>x.segment==="startup").length,
 sme:CLIENT_DATABASE.filter(x=>x.segment==="sme").length,
 bigcorp:CLIENT_DATABASE.filter(x=>x.segment==="bigcorp").length};
export function queryClients(opts:{sector?:ClientSector|"all";segment?:ClientSegment|"all";search?:string;fortuneOnly?:boolean;sort?:"rank"|"scale"|"revenue"|"budget"|"awareness"|"name";limit?:number}={}):ClientMaster[]{
 let result=CLIENT_DATABASE.filter(x=>(!opts.sector||opts.sector==="all"||x.sector===opts.sector)&&
  (!opts.segment||opts.segment==="all"||x.segment===opts.segment)&&(!opts.fortuneOnly||x.fortuneRank!==null));
 if(opts.search){const q=opts.search.toLowerCase().trim();result=result.filter(x=>x.brand.toLowerCase().includes(q)||x.industry.toLowerCase().includes(q));}
 switch(opts.sort){
  case "scale":result.sort((a,b)=>b.scaleScore-a.scaleScore);break;
  case "revenue":result.sort((a,b)=>(b.verifiedRevenueUsd??(b.annualRevenueVnd??0)/25000)-(a.verifiedRevenueUsd??(a.annualRevenueVnd??0)/25000)||b.commercialScore-a.commercialScore);break;
  case "budget":result.sort((a,b)=>b.marketingBudgetVnd-a.marketingBudgetVnd);break;
  case "awareness":result.sort((a,b)=>b.brandAwareness-a.brandAwareness);break;
  case "name":result.sort((a,b)=>a.brand.localeCompare(b.brand));break;
  default:result.sort((a,b)=>b.commercialScore-a.commercialScore);
 }
 return opts.limit?result.slice(0,opts.limit):result;
}
export function scenarioForClient(c:ClientMaster):Scenario{
 const sec=SECTORS.find(s=>s.id===c.sector)!;
 const freelance=c.segment!=="bigcorp",small=c.segment==="startup";
 const budget=freelance?clamp(vnd(c.marketingBudgetVnd*(small?.09:.025)),small?2_500_000:5_000_000,small?12_000_000:26_000_000):
  clamp(vnd(c.marketingBudgetVnd*.0004),150_000_000,650_000_000);
 const days=small?14:c.segment==="sme"?21:35;
 const defaultFee=vnd(budget*(small?.42:.34));
 const insightOptions=[
  {id:"awareness",title:"Awareness gap",desc:"People do not know the product exists."},
  {id:"value",title:"Weak perceived value",desc:"People question the value of choosing the product."},
  {id:"location",title:"Access or distribution friction",desc:"The product may be difficult to find or try."},
  {id:"trust",title:"Trust barrier",desc:"The audience lacks evidence to try a new brand."},
  {id:"style",title:"Relevance gap",desc:"The audience cannot picture the product fitting their life."}
 ];
 return {id:"catalog-"+c.id,brand:c.brand,industry:sec.label,contact:small?"Founder":c.segment==="sme"?"Marketing Manager":"Brand Director",
  budget,fee:defaultFee,days,baseline:sec.baseline,target:small?25:20,metric:sec.metric,unit:sec.unit,
  summary:sec.brief,client:`We are ${c.brand}, a ${c.segment==="startup"?"growing startup":c.segment==="sme"?"regional company":"large brand"} in ${sec.label}. ${sec.brief}. We need a realistic, measurable campaign within our budget.`,
  trueInsight:sec.insight,trueSegment:c.sector==="coffee"||c.sector==="education"?"students":c.sector==="fashion"?"genz":"youngpros",
  truePosition:sec.position,trueCreative:sec.creative,trueObjective:sec.objective,channel:{...sec.channel},
  insightOptions,reports:{
   audit:`Competing ${sec.label} brands are active in their category. ${c.brand} needs clearer differentiation.`,
   reviews:`Potential customers mention ${sec.insight==="trust"?"uncertainty about credibility":sec.insight==="style"?"difficulty imagining product usage":sec.insight==="awareness"?"low familiarity with the brand":"unclear perceived value"} before purchase.`,
   industry:`The ${sec.label} category shows demand, but category data alone does not prove the root cause for ${c.brand}.`,
   interview:`A small simulated consumer interview indicates the likely issue is ${sec.insight}. More validation may be needed.`
  },
  aiMeta:{category:c.sector,seed:Math.round(hashSeed(c.id)*1000000),label:"Catalog simulation: "+c.id}
 };
}
export function agencyLeadForClient(c:ClientMaster):LeadDef{
 const sec=SECTORS.find(x=>x.id===c.sector)!;
 const budget=clamp(vnd(c.marketingBudgetVnd*(c.segment==="startup"?.09:c.segment==="sme"?.05:.0006)),
  c.segment==="startup"?2_500_000:c.segment==="sme"?12_000_000:450_000_000,
  c.segment==="startup"?16_000_000:c.segment==="sme"?150_000_000:3_200_000_000);
 const fee=vnd(Math.max(c.segment==="startup"?7_500_000:c.segment==="sme"?15_000_000:120_000_000,
   budget*(c.segment==="startup"?.8:c.segment==="sme"?.32:.16)));
 const fortune=c.fortuneRank!==null;
 return {id:"db-"+c.id,brand:c.brand,industry:sec.label,businessSize:c.segment==="startup"?"small":c.segment==="sme"?"medium":"enterprise",
  clientMasterId:c.id,sector:c.sector,segment:c.segment,value:budget,fee,duration:c.segment==="startup"?21:c.segment==="sme"?30:42,
  objective:sec.brief,scope:c.segment==="startup"?4:c.segment==="sme"?8:12,
  intensity:c.segment==="startup"?.35:c.segment==="sme"?.60:.92,
  difficulty:clamp(Math.round(33+c.commercialScore*.49+(fortune?7:0)),35,93),
  required:c.segment==="startup"?2:c.segment==="sme"?4:7,
  rivalIds:c.segment==="startup"?["lean","muse"]:c.segment==="sme"?["pulse","muse"]:["atlas","north"],
  pref:c.sector==="fashion"||c.sector==="beauty"?"creative":c.sector==="tech"||c.sector==="education"?"performance":c.sector==="coffee"?"cost":"strategy",
  trust:clamp(65-Math.round(c.commercialScore*.22),35,65),stakeholder:c.segment==="startup"?"Founder":c.segment==="sme"?"Marketing Manager":"Chief Marketing Officer",
  target:c.segment==="startup"?26:c.segment==="sme"?19:16,
  scenario:c.sector==="coffee"?0:c.sector==="fitness"?1:c.sector==="fashion"?2:c.sector==="tech"?3:c.sector==="beauty"?4:c.sector==="food"?5:1,
  origin:fortune?"Fictional Fortune 50 brand brief (not a real RFP)":"Client master database · fictional",
  desc:`${sec.brief}. Client tier: ${c.segment}. Indicative campaign media budget, not annual marketing spend.`};
}
// Legacy client names, invoices and wins are never overwritten.
export function catalogForBrand(brand:string):ClientMaster|null{return CLIENT_DATABASE.find(c=>c.brand===brand)??null;}
