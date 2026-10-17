import type {GameState,Phase} from "./state";

/** Phase A: locations now own meaningful actions rather than acting as shortcuts to a menu. */
export type WorldLocation = "research"|"creative"|"media"|"influencer"|"network"|"brand"|"cowork"|"agency";
export const worldOrder: WorldLocation[] = ["research","creative","media","network","agency","influencer","cowork","brand"];
export const worldPeople:Record<WorldLocation,{name:string,title:string,message:string,tip:string}>={
 research:{name:"An Phạm",title:"Research Mentor",message:"Start with evidence, not assumptions. Test a real barrier before writing your strategy.",tip:"Use competitor audits, reviews and surveys here. Your choices determine insight quality."},
 creative:{name:"Vy Trần",title:"Creative Director",message:"One clear idea beats ten disconnected executions. We need the strategy before the concept.",tip:"Choose the target, objective, positioning and creative route in this studio."},
 media:{name:"Tú Lê",title:"Media Planner",message:"A good idea needs a distribution plan. Every channel should earn its share of budget.",tip:"Allocate media and run your live optimization here."},
 influencer:{name:"Phúc Lâm",title:"Creator Manager",message:"Audience fit is worth more than a large follower count.",tip:"Build creator capability through the Influencer District's existing upgrade."},
 network:{name:"Mai Đỗ",title:"Account Manager",message:"Relationships lead to briefs. Finishing a project is only the start of the next one.",tip:"Request your next real client brief here after finishing a campaign."},
 brand:{name:"Ms. Hà",title:"Brand Director",message:"Show me how your ideas connect to business growth.",tip:"Brand headquarters opens premium client opportunities after reputation milestones."},
 cowork:{name:"Nam Hoàng",title:"Community Host",message:"Good opportunities often begin over coffee and honest conversations.",tip:"Buy coworking membership to grow expertise and your network."},
 agency:{name:"Huy Nguyễn",title:"Operations Advisor",message:"A founder should lead the team, not become the team's default operator.",tip:"Meet the founding requirements and establish an agency."}
};
const phaseIndex=(p:Phase)=>["brief","research","survey","validation","strategy","creative","media","live","results"].indexOf(p);
export function availableAt(s:GameState,site:WorldLocation):{open:boolean;reason:string;level:number}{
 if(!s.cityUnlocked)return {open:false,reason:"Finish your first campaign from the bedroom computer to unlock Marketing City.",level:0};
 if(s.agencyUnlocked)return {open:true,reason:"Agency access granted.",level:3};
 const visited=s.world?.visited||[];
 const p=phaseIndex(s.campaign.phase);
 if(site==="research"||site==="network"||site==="agency")return {open:true,reason:"Open for exploration.",level:1};
 if(site==="creative")return {open:visited.includes("research")||p>=4||s.history.length>=2,reason:"Visit Research Lab or progress to Strategy to unlock Creative Studio.",level:2};
 if(site==="media")return {open:visited.includes("creative")||p>=6||s.history.length>=2,reason:"Visit Creative Studio and prepare a concept to unlock Media Hub.",level:3};
 if(site==="influencer")return {open:visited.includes("media")||s.history.length>=2,reason:"Visit Media Hub to unlock the Creator District.",level:4};
 if(site==="cowork")return {open:visited.includes("network")||s.history.length>=2,reason:"Meet the Account Manager in Networking Café.",level:2};
 if(site==="brand")return {open:s.reputation>=25,reason:"Reach 25 industry reputation to access Brand HQ.",level:5};
 return {open:false,reason:"Location not yet discovered.",level:0};
}
export function homeWorkstationEnabled(s:GameState){return !s.agencyUnlocked && (!s.cityUnlocked || s.campaign.phase==="brief" || s.campaign.phase==="results");}
export function campaignSite(s:GameState):"computer"|"research"|"creative"|"media"|"ceo"{
 if(s.agencyUnlocked)return "ceo";
 if(!s.cityUnlocked)return "computer";
 const phase=s.campaign.phase;
 if(phase==="brief"||phase==="results")return "computer";
 if(["research","survey","validation"].includes(phase))return "research";
 if(["strategy","creative"].includes(phase))return "creative";
 return "media";
}
export function nextLocation(s:GameState):{id:string;name:string;description:string}{
 const id=campaignSite(s);
 const names:{[k:string]:string}={computer:"Bedroom Computer",research:"Research Lab",creative:"Creative Studio",media:"Media Hub",ceo:"Agency Office"};
 const desc:{[k:string]:string}={
  computer:s.cityUnlocked && s.campaign.phase==="results"?"Use your bedroom computer to review the delivered report, then visit Networking Café for your next lead.":"Interact with the computer in your room to open your client brief.",
  research:"Travel to the Research Lab to collect evidence, survey and validate insight.",
  creative:"Visit the Creative Studio to develop the strategy and campaign creative.",
  media:"Go to Media Hub to allocate budget, launch and optimize.",
  ceo:"Your staff manage operations. Visit your agency to handle executive decisions."
 };
 return {id,name:names[id],description:desc[id]};
}
export function visitSite(s:GameState,id:WorldLocation){
 if(!availableAt(s,id).open)return false;
 s.world ||= {visited:[],contacts:[]};
 if(!s.world.visited.includes(id))s.world.visited.push(id);
 return true;
}
export function meetContact(s:GameState,id:WorldLocation){
 if(!availableAt(s,id).open)return false;
 s.world ||= {visited:[],contacts:[]};
 if(s.world.contacts.includes(id))return false;
 s.world.contacts.push(id);s.expertise+=1;return true;
}