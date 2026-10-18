/** One automatic AI business-size check per game save.
 * Falls back to the game's calibrated tier assumptions without blocking play.
 */
import {act,getState} from "./store";
import {ruleCalibration,validatedCalibration} from "./financeCalibration";
import {applyInitialFinancialCalibration} from "./companyMarket";

const API="https://marketing-tycoon-ai-api.onrender.com";
let pending=false;
export function prepareClientFinancialCalibration(){
 const current=getState();
 if(!current.created||current.financeCalibration||pending)return;
 pending=true;
 void (async()=>{
  try{
   const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),32000);
   let data:unknown;
   try{
    const response=await fetch(API+"/api/finance-calibration",{signal:controller.signal});
    if(!response.ok)throw Error("Financial calibration API unavailable");
    data=await response.json();
   }finally{clearTimeout(timeout);}
   const payload=data as {calibration?:unknown};
   return validatedCalibration(payload.calibration);
  }catch{
   return ruleCalibration();
  }
 })().then(calibration=>act(d=>{
  if(d.financeCalibration)return;
  d.financeCalibration=calibration;
  applyInitialFinancialCalibration(d);
 })).finally(()=>{pending=false});
}
