# Weekly campaigns and agency functions (Marketing Tycoon)

## Global turn clock
- The authoritative clock is `GameState.clock`, available immediately after onboarding.
- `End Week` advances exactly seven simulated days. This is the only standard gameplay path for advancing time.
- Legacy `CEO.weekly` remains a compatibility mirror. Creating an agency never resets the global day or week.
- Each week produces a persisted, evidence-backed recap. The current unread recap must be acknowledged before another turn.
- Freelance cash comes from `personalCash`; agency reports use `agencyCash`.

## Campaign lifecycle
1. Planning: optional research and survey, required insight and strategy.
2. Executing: creative selection initiates a seven-day production job; media buying reserves budget. Live launches only with both complete.
3. Live: one optional optimization each week; results materialize on End Week. Client deadline, not optimization selection, closes the campaign.

Brief's `days` drives the client end date. Suggested planning and execution windows derive from the total weeks; small briefs can combine both before the first End Week. Delayed launches shrink the delivered flight and harm results. New clients inherit the current global clock.

## Agency functions
8 departments appear in CEO Command Center > Functions:
Business & Account, Research & Insights, Strategy & Planning, Creative & Content,
Production & Activation, Media & Growth, Data & Performance, Operations & People.

They reuse actual `ceoTaskDefs`, project prerequisites and staff assignments; not a parallel point-based engine.
Specialist employees have two simultaneous task slots; cross-trained staff offer fallback capacity at reduced daily productivity.
Production and Operations are real tasks, with dedicated hires. Analytics requires production, media, creator and operations completion. Bottleneck cards derive workload from assigned/in-progress/review project tasks.

## Save migration
Legacy campaign phases are mapped to Planning/Executing; original details remain on the saved Campaign.
Legacy CEO saves derive global clock from saved CEO day/week. New saves persist the clock directly.
World entities, office IDs, budgets, history, rival AI, media art and GLB assets are unchanged.

## QA checklist
- New user begins Week 1 in Bedroom and can end first week.
- 14-day freelance brief: Week 1 planning, production and booking; Week 2 launch; End Week reports results.
- Live optimization does not instantly finalize.
- New brief retains global date.
- Agency founding retains global date.
- Eight agency functions show live staffing/workload/dependencies; producer and ops can be hired.
- Save restoration retains weekly reports, campaign stage, staff, and agency accounts.
