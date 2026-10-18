import test from "node:test";
import assert from "node:assert/strict";
import {REVIEW_SCHEMA,validateReviewRequest,reviewPrompt,validateReviewResponse,fallbackReview} from "./freelance-review.mjs";
const input={sector:"beauty",segment:"sme",jobId:"social-pack",selected:true,score:76.2,strongestRival:71.5,npcCount:3,jobFee:700000,proposedFee:700000};
test("Only bounded fictional applicant data can be sent to Gemini hiring review",()=>{
 assert.deepEqual(validateReviewRequest(input),input);
 assert.throws(()=>validateReviewRequest({...input,sector:"finance"}));
 assert.throws(()=>validateReviewRequest({...input,proposedFee:1e20}));
 assert.throws(()=>validateReviewRequest({...input,npcCount:-1}));
 assert.throws(()=>validateReviewRequest({...input,selected:"yes"}));
 assert.equal(REVIEW_SCHEMA.type,"OBJECT");
 assert.ok(reviewPrompt(input).includes("FIXED: SELECTED"));
 assert.ok(reviewPrompt({...input,selected:false}).includes("FIXED: REJECTED"));
});
test("Gemini review has no fields capable of changing win decisions and falls back safely",()=>{
 const review=validateReviewResponse({feedback:"Good fit for brand story and the requested social content.",strength:"Social portfolio",concern:"Discuss review scope",winner:"hacker",cash:50000000});
 assert.equal(review.source,"gemini");
 assert.ok(!("winner" in review));assert.ok(!("cash" in review));
 assert.throws(()=>validateReviewResponse({feedback:"too short",strength:"a",concern:""}));
 const lost=fallbackReview({...input,selected:false});
 assert.equal(lost.source,"rules");
 assert.match(lost.feedback,/another|client|freelancer/i);
});
