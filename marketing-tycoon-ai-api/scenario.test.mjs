import test from "node:test";
import assert from "node:assert/strict";
import {validateCandidate,inputCategory,prompt,validateApproachClient,clientPrompt,CLIENT_SCENARIO_SCHEMA} from "./scenario.mjs";
const input={brand:"Breeze Corner",industry:"F&B",contact:"Ms. Lee · Owner",budget:10000000,baseline:45,target:25,metric:"visits/week",unit:"visits",summary:"Grow the afternoon traffic from local students.",client:"Students pass our cafe but many do not come in.",trueInsight:"awareness",trueSegment:"students",truePosition:"study",trueCreative:"study",trueObjective:"visits",channel:{paid:1.1,creator:1.15,promo:.88,flyer:.8},reports:{audit:"Competitors communicate their location through local short videos.",reviews:"Customers like drinks but say not many people know about us.",industry:"Industry demand is growing but does not explain the specific problem.",interview:"Several students did not know the shop even though they pass it daily."},insightOptions:["awareness","value","location","trust","style"].map(id=>({id,title:"Hypothesis "+id,desc:"Some evidence may point to "+id}))};
test("validated AI scenario retains simulation-compatible fields",()=>{const s=validateCandidate(input,"coffee");assert.equal(s.trueInsight,"awareness");assert.equal(s.reports.interview,input.reports.interview);assert.equal(s.insightOptions.length,5);assert.equal(s.fee,4000000);assert.match(s.id,/^ai-/);});
test("rejects unbounded and invalid game outcomes",()=>{assert.throws(()=>validateCandidate({...input,trueInsight:"guaranteed_win"},"coffee"));assert.throws(()=>validateCandidate({...input,channel:{...input.channel,creator:30}},"coffee"));assert.throws(()=>validateCandidate({...input,budget:3000000000}));});
test("rejects incomplete research or repeated insight options",()=>{assert.throws(()=>validateCandidate({...input,reports:{audit:"hi"}}));assert.throws(()=>validateCandidate({...input,insightOptions:Array(5).fill(input.insightOptions[0])}));});
test("input restrictions",()=>{assert.equal(inputCategory("restricted-category"),"coffee");assert.match(prompt("coffee"),/fictional marketing client/);});

const approached={id:"startup-coffee-0",segment:"startup",sector:"coffee",brand:"Mây Corner Coffee",description:"Increase local visits and repeat purchases",industry:"Coffee",marketingBudgetVnd:160000000};
const aiAnswer={...input,brand:"Invented Different Brand",aiPlanning:{
 context:"A neighborhood startup has uneven footfall. Competitors own search discovery and students compare offers on mobile.",
 insight:"Students want a low-risk reason to stop by, but do not know which products are worth trying.",
 strategy:"Prioritize nearby students, grow first-visit confidence and test proof-of-quality storytelling before scaling ads."
},clientAnswers:{
 audience:"University students within 2km during afternoon hours.",
 barrier:"The store is overlooked during study breaks and price visibility is weak.",
 success:"We want 25% more qualified visits over 14 days.",
 constraint:"Small team, 14-day launch window, approve claims with the owner."
}};
test("Gemini client approach is tied to an actual chosen Startup/SME and returns insight and strategy",()=>{
 const selected=validateApproachClient(approached);
 const scene=validateCandidate(aiAnswer,selected.sector,selected);
 assert.equal(scene.brand,selected.brand,"selected client, not an unrelated random brand");
 assert.equal(scene.aiMeta.clientId,selected.id);
 assert.ok(scene.aiPlanning.context.length>30);
 assert.ok(scene.aiPlanning.insight.length>30);
 assert.ok(scene.aiPlanning.strategy.length>30);
 assert.equal(scene.clientAnswers.audience,aiAnswer.clientAnswers.audience);
 assert.ok(clientPrompt(selected.sector,selected).includes(selected.brand));
 assert.deepEqual(CLIENT_SCENARIO_SCHEMA.required.slice(-2),["aiPlanning","clientAnswers"]);
});
test("rejected arbitrary clients and incomplete AI hypothesis/direction",()=>{
 assert.throws(()=>validateApproachClient({...approached,segment:"bigcorp"}));
 assert.throws(()=>validateApproachClient({...approached,id:"f50-1"}));
 assert.throws(()=>validateApproachClient({...approached,sector:"fashion"}));
 assert.throws(()=>validateCandidate({...aiAnswer,aiPlanning:{...aiAnswer.aiPlanning,strategy:""}}, "coffee",approached));
 assert.throws(()=>validateCandidate({...aiAnswer,clientAnswers:{...aiAnswer.clientAnswers,barrier:""}}, "coffee",approached));
});
