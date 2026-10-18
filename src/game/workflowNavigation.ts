import type {GameState} from "./state";

export type CEOSection="inbox"|"pipeline"|"workforce"|"finance"|"rivals"|"news"|"partners";
export interface WorkforceView {
 section:"planning"|"teams"|"pool";
 teamId:string|null;
 personId:string|null;
 deliveryId:string|null;
 recruitForTeam:string|null;
}
export const newWorkforceView=():WorkforceView=>({section:"planning",teamId:null,personId:null,deliveryId:null,recruitForTeam:null});

/** Route signed deals by their project identity, never by the last team viewed. */
export function workforceForDeal(s:GameState,leadId:string):WorkforceView {
 const projects=s.ceo?.projects.filter(p=>p.leadId===leadId)??[];
 const project=projects.find(p=>p.status==="active")??projects[0];
 const team=s.ceo?.clientTeams?.find(t=>t.status!=="released"&&
  (t.id===project?.teamId||!!project&&t.projectIds.includes(project.id)));
 return {...newWorkforceView(),section:"teams",teamId:team?.id??null};
}

/** Read-only copy for the bedroom entry point; opening it always resumes actual state. */
export function workstationHint(s:GameState):{title:string;detail:string} {
 const c=s.campaign,v=c.freelanceJob?.v4;
 if(!c.catalogClientId){
  const offers=s.freelanceBoard?.applications.filter(a=>a.status==="selected").length??0;
  const pending=s.freelanceBoard?.applications.filter(a=>a.status==="pending").length??0;
  if(offers)return {title:offers+" job offer(s) ready",detail:"Open the Job Board to accept an offer and receive the client brief."};
  if(pending)return {title:"Applications under review",detail:"AI is reviewing your applications. Open the Job Board to follow progress."};
  return {title:"Find your next freelance job",detail:"Apply on the Job Board. Accept an offer to receive a Gemini client brief."};
 }
 if(c.phase==="brief"&&c.aiStatus!=="ready")return c.aiStatus==="error"
  ?{title:"Client brief needs a retry",detail:"Open your awarded job to retry Gemini without losing the accepted offer."}
  :{title:"Gemini is preparing your brief",detail:"Your offer is accepted. Open the workstation to follow the client briefing."};
 if(v){
  const messages={
   brief:["Review your awarded job","Read the requirements and accept the brief to start work. Payment follows final delivery."],
   workspace:["Continue your deliverables","Your drafts are saved. Finish the outputs, then open the Deliverable Board."],
   board:["Confirm your deliverables","Review every saved output, edit where needed, then send it to the client."],
   client_review:["Client review","Open the workstation to check your delivery review."],
   revision:["Client revisions requested","Open the feedback and edit only the deliverables that need revision."],
   ready:["Final delivery is ready","Submit the approved work to receive the agreed payment."],
   paid:["Job complete · payment received","Your portfolio is updated. Return to the Job Board for the next assignment."]
  };
  const message=messages[v.step];
  if(message)return {title:message[0],detail:message[1]};
 }
 return {title:c.phase==="results"?"Review your completed job":"Continue your current job",detail:"Open the workstation to resume the current assignment."};
}
