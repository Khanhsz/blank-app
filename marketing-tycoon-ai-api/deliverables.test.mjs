import test from "node:test";
import assert from "node:assert/strict";
import {validateDeliverableRequest,deliverablePrompt,validateDeliverableReview,fallbackDeliverableReview} from "./deliverables.mjs";
const req={jobId:"social-pack",round:1,items:[
 {id:"post-1",title:"Brand intro",summary:"Use a clear benefit-focused headline, visual and CTA.",issue:"Needs a stronger promise",score:68,status:"revise"},
 {id:"post-2",title:"Product story",summary:"Present an honest everyday product use case.",issue:"Accepted",score:92,status:"approved"}]};
test("V4 deliverable API strictly validates data and refuses fabricated unbounded scopes",()=>{
 const input=validateDeliverableRequest(req);assert.equal(input.items.length,2);
 assert.throws(()=>validateDeliverableRequest({...req,jobId:"unknown"}));
 assert.throws(()=>validateDeliverableRequest({...req,items:[req.items[0],req.items[0]]}));
 assert.throws(()=>validateDeliverableRequest({...req,items:[{...req.items[0],score:120}]}));
 assert.throws(()=>validateDeliverableRequest({...req,items:[]}));
 assert.ok(deliverablePrompt(input).includes("CANNOT change status"));
});
test("Gemini text cannot modify item statuses, fees, review decisions or missing feedback",()=>{
 const input=validateDeliverableRequest(req);
 const result=validateDeliverableReview({notes:[{id:"post-1",feedback:"Clarify the relevant customer benefit and update the caption."},
  {id:"post-2",feedback:"Approved: clear content aligned to the approved brief."}],
  score:100000,paid:true,accepted:true},input);
 assert.equal(result.source,"gemini");assert.equal(result.notes.length,2);
 assert.ok(!("paid" in result));assert.ok(!("accepted" in result));
 assert.equal(fallbackDeliverableReview(input).notes.length,2);
 assert.equal(validateDeliverableReview({notes:[]},input).notes[0].id,"post-1");
});
