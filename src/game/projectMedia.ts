import {clamp} from "./data";
import type {Project} from "./state";

/** Keep a signed client's actual media outlay consistent across budgets,
 * accounting and KPI inputs, including after older agency saves are restored.
 */
export function reconcileProjectMedia(p:Project){
  const c=p.campaign;
  if(!c?.mediaBooked||!Number.isFinite(p.adBudget)||p.adBudget<=0||!Number.isFinite(p.mediaSpent))return;
  const total=clamp(Math.round(p.mediaSpent),0,p.adBudget);
  const paid=Math.round(total*.46),creator=Math.round(total*.34),promo=Math.round(total*.13);
  c.media={paid,creator,promo,flyer:total-paid-creator-promo};
  c.mediaBudget=p.adBudget;
  c.spent=total;
  p.mediaSpent=total;
  p.mediaReserved=Math.max(0,p.adBudget-total);
}
