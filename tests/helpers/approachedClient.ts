/** Static Gemini response FIXTURE for deterministic unit tests only.
 * Production never imports this and must use /api/generate-brief.
 */
import {scenarios} from "../../src/game/data";
import {getClient} from "../../src/game/clientDatabase";
import {chooseFreelanceClient,activateAIBrief} from "../../src/game/campaign";
import type {GameState} from "../../src/game/state";
import type {Fx} from "../../src/game/store";
const fx:Fx={toast:()=>{},log:()=>{}};
export function seedApproachedClient(s:GameState,clientId="startup-coffee-0"){
 const client=getClient(clientId);
 if(!client)throw Error("Unknown test client");
 // Regression tests below exercise the pre-Job-Board legacy campaign journey.
 // Explicitly model an old save without V3 applications; production code
 // never imports this fixture, and live applications still require an award.
 s.freelanceBoard=undefined;
 if(!chooseFreelanceClient(s,fx,clientId))throw Error("Could not approach test client");
 const sc={...scenarios[0],
  id:"ai-fixture-"+client.id,brand:client.brand,industry:client.industry,
  aiMeta:{category:client.sector,seed:777,label:"Test fixture, not a production AI response",clientId:client.id},
  insightOptions:["awareness","value","location","trust","style"].map(id=>({id,title:"Possible "+id,desc:"Fictional test insight "+id})),
  aiPlanning:{
   context:"A fictional "+client.industry+" company seeks marketing help for customer acquisition.",
   insight:"The selected market may have a trust or discovery barrier.",
   strategy:"Test audience fit and define a measurable campaign objective."
  },
  clientAnswers:{
   audience:"A nearby audience with a measurable conversion opportunity.",
   barrier:"Awareness and credibility need further research.",
   success:"Increase the selected business metric during a 14-day pilot.",
   constraint:"Budget and staffing are limited."
  }
 };
 if(!activateAIBrief(s,fx,sc))throw Error("Fixture Gemini scenario invalid");
 s.campaign.aiStatus="ready";
 return sc;
}
