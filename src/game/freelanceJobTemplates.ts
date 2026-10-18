/** V2 canonical freelance job templates. Numbers are simulated VND game balance,
 * not claims about prevailing freelancer rates. Never count media as freelancer income. */
export type FreelanceTier="gig"|"project"|"campaign";
export type FreelanceJobType="social-pack"|"social-audit"|"content-calendar"|"short-video"|"meta-setup"|"audience-research"|"content-sprint"|"mini-launch";
export interface FreelanceJobTemplate {
 id:FreelanceJobType;tier:FreelanceTier;title:string;
 fee:number;mediaBudget:number;days:number;hours:number;deliverables:string;
 revisions:number;outOfPocket:number;requiredGigs:number;
 objective:string;successMetric:string;source:"game-balance";
}
export const FREELANCE_JOBS:FreelanceJobTemplate[]=[
 {id:"social-pack",tier:"gig",title:"5 Social Posts",fee:700000,mediaBudget:0,days:4,hours:12,deliverables:"5 branded social posts with captions",revisions:2,outOfPocket:55000,requiredGigs:0,objective:"Content production",successMetric:"Approved posts on time",source:"game-balance"},
 {id:"social-audit",tier:"gig",title:"TikTok / Instagram Audit",fee:600000,mediaBudget:0,days:3,hours:8,deliverables:"Account audit and 5 practical improvements",revisions:1,outOfPocket:0,requiredGigs:0,objective:"Channel diagnosis",successMetric:"Actionable audit quality",source:"game-balance"},
 {id:"content-calendar",tier:"gig",title:"2-Week Content Calendar",fee:1000000,mediaBudget:0,days:5,hours:16,deliverables:"10–14 content ideas and scheduling plan",revisions:2,outOfPocket:60000,requiredGigs:0,objective:"Content planning",successMetric:"Deliverable completion and relevance",source:"game-balance"},
 {id:"short-video",tier:"gig",title:"5 Short Videos",fee:1500000,mediaBudget:0,days:5,hours:20,deliverables:"5 edited short-form videos",revisions:2,outOfPocket:200000,requiredGigs:0,objective:"Video production",successMetric:"Approved videos and delivery reliability",source:"game-balance"},
 {id:"meta-setup",tier:"project",title:"Meta Ads Setup",fee:1200000,mediaBudget:2000000,days:7,hours:20,deliverables:"Pixel, audience, campaign setup and reporting plan",revisions:2,outOfPocket:120000,requiredGigs:3,objective:"Paid social setup",successMetric:"Tracking and launch readiness (not guaranteed sales)",source:"game-balance"},
 {id:"audience-research",tier:"project",title:"Audience Research Sprint",fee:2000000,mediaBudget:0,days:8,hours:24,deliverables:"Interview synthesis, competitor audit and insight hypothesis",revisions:2,outOfPocket:180000,requiredGigs:3,objective:"Consumer insight",successMetric:"Evidence clarity and useful recommendations",source:"game-balance"},
 {id:"content-sprint",tier:"project",title:"Multi-channel Content Sprint",fee:3200000,mediaBudget:1200000,days:10,hours:28,deliverables:"Cross-platform assets, channel plan and client handover",revisions:2,outOfPocket:350000,requiredGigs:4,objective:"Content execution",successMetric:"Asset quality and agreed milestones",source:"game-balance"},
 {id:"mini-launch",tier:"campaign",title:"Local Mini Launch Campaign",fee:4500000,mediaBudget:3200000,days:21,hours:40,deliverables:"Insight, concept, local media deployment and KPI review",revisions:2,outOfPocket:350000,requiredGigs:6,objective:"Small campaign launch",successMetric:"Measured local visits/leads within scope",source:"game-balance"}
];
export const getFreelanceJob=(id:string|null|undefined)=>FREELANCE_JOBS.find(x=>x.id===id)??null;
