# Marketing Tycoon P0: CI and campaign-economy rules

## Stability
This branch derives from `deploy/marketing-tycoon-lovable-world`. GitHub Actions runs Node 22 and `npm ci` from the committed `package-lock.json`, then typechecks, builds procedural assets, runs gameplay tests and verifies deterministic GLBs.

## Freelance payout
- A brief that never launches pays zero and cannot grant completion XP, campaign reputation or city access.
- Delivered media flights earn a prorated portion of the agreed service fee based on the number of completed live weeks versus the expected live weeks. This is a gameplay contract rule.
- Above-target performance awards reputation in proportion to delivery. Near-target earns 70% of the base reputation, scaled by delivery. Under-target earns no positive reputation; a negative KPI outcome decreases it.
- The agency-founding requirement counts three **delivered** freelance campaigns, so repeatedly abandoning briefs cannot unlock the agency.
- Optional `feePaid` and `deliveryRatio` are written to results/history. Legacy saves without these properties remain playable and count previously completed freelance campaigns.
- The review screen shows actual earned fee, delivery fraction and reputation changes.

## Agency media spend and KPI
- Media spend is budgeted from the signed client's `Project.adBudget`, never from the training scenario's nominal `Scenario.budget`.
- Media delivery uses 88% of negotiated advertising budget, and completion of KOL delivery brings the total to 94%, regardless of whether KOL or media finishes first.
- `Project.mediaSpent`, `mediaReserved`, `Campaign.media`, `Campaign.spent` and `Campaign.mediaBudget` must agree.
- KPI percentage uses effectiveness **relative to contracted spend**, normalized to the scenario benchmark. Large contracts no longer automatically hit the maximum KPI simply because their budgets are larger.
- Real reach continues to use actual media spending. The model is deterministic simulation, not claims about real-world attribution.

## Acceptance commands
```bash
npm ci --no-audit --no-fund
npm run build
npm run assets:verify
node --test marketing-tycoon-ai-api/scenario.test.mjs
```
CI automatically runs for pull requests targeting deploy and for pushes to the listed branches. Local/browser 3D QA is a separate acceptance requirement.
