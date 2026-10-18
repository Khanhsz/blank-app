import test from "node:test";
import assert from "node:assert/strict";
import {FINANCE_SECTORS,FINANCE_SCHEMA,validateFinanceCalibration,fallbackFinanceCalibration,financePrompt} from "./finance-calibration.mjs";

test("AI finance request is sector-wide, explicitly fictional and non-financially authoritative",()=>{
 const prompt=financePrompt();
 assert.match(prompt,/fictional/i);
 assert.match(prompt,/Fortune revenue/);
 assert.match(prompt,/0.85 and 1.15/);
 assert.equal(FINANCE_SCHEMA.properties.adjustments.minItems,7);
});
test("offline fallback always yields complete neutral multipliers",()=>{
 const c=fallbackFinanceCalibration();
 assert.equal(c.source,"rules");
 assert.equal(c.adjustments.length,7);
 assert.deepEqual(c.adjustments.map(x=>x.sector),FINANCE_SECTORS);
 for(const a of c.adjustments)assert.deepEqual([a.startup,a.sme,a.bigcorp,a.marketing],[1,1,1,1]);
});
test("Gemini output requires seven distinct sectors and bounded finite factors",()=>{
 const base=fallbackFinanceCalibration();
 const raw={adjustments:base.adjustments.map(a=>({...a,startup:1.12,sme:.9,bigcorp:1.03,marketing:1.1,reason:"Category model"}))};
 const v=validateFinanceCalibration(raw);
 assert.equal(v.source,"gemini");
 assert.equal(v.adjustments.length,7);
 assert.equal(v.adjustments[0].startup,1.12);
 assert.throws(()=>validateFinanceCalibration({adjustments:raw.adjustments.slice(0,6)}));
 assert.throws(()=>validateFinanceCalibration({adjustments:[raw.adjustments[0],...raw.adjustments.slice(0,6)]}));
 assert.throws(()=>validateFinanceCalibration({adjustments:raw.adjustments.map(a=>({...a,marketing:Infinity}))}));
});
test("adversarial plausible Gemini factors are clamped before reaching game engine",()=>{
 const a=fallbackFinanceCalibration().adjustments.map(x=>({...x,startup:.55,sme:1.48,bigcorp:1.45,marketing:.51}));
 const c=validateFinanceCalibration({adjustments:a});
 for(const x of c.adjustments){
  assert.equal(x.startup,.85);assert.equal(x.sme,1.15);
  assert.equal(x.bigcorp,1.15);assert.equal(x.marketing,.85);
 }
});
