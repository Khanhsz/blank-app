# Bedroom V2 — Solo Freelancer → Agency Founder

## Core change
Bedroom is **not** a full-service agency. Selecting a Startup/SME in Client Marketplace now also requires selecting a scoped freelancer job. Eight game-balanced contracts start at 600,000–1,500,000 VND for small gigs, rise to 1,200,000–3,200,000 VND for specialist projects, then a 4,500,000 VND local mini-campaign. Published job prices here are **game design assumptions** and not audited real-world market quotes.

The sole player-level job registry is `src/game/freelanceJobTemplates.ts`; Gemini scenario validation uses the mirrored, server-enforced `BEDROOM_JOBS` registry in `marketing-tycoon-ai-api/scenario.mjs`. Future Excel workbook imports should validate both registries before promotion to production.

## Solo Gig / Freelance Project
1. **Brief & scope:** Gemini writes fictional client context, evidence and a plausible business challenge grounded in the *selected* client and job. Fee, duration, scope, revision limit and media budget **cannot** be invented by Gemini; the API server overwrites them using the trusted job template.
2. **Work sessions:** Focused 4-hour sessions consume a shared **28-hour weekly capacity**. Players choose brief validation, quality or rapid execution; actions deterministically change quality and workload.
3. **Client feedback:** Submission checks the agreed workload and quality, may request one or two revisions, and penalizes missed simulated deadlines.
4. **Handover/invoice:** A 20% upfront deposit is paid after accepting scope; final balance is invoiced upon approved handover, payable in the following weeks. Slow payments generate follow-up actions. Expenses are deducted from personal funds. Client media budget is never personal revenue.

Short jobs do NOT require the seven stages of a full campaign; the same global End Week timer handles capacity and invoice timing. Jobs can be finished with multiple work actions inside a week (4-hour sessions represent project effort, not advancement of the global date). If a job is still open after End Week, deadline penalties apply.

## Mini Campaign
`mini-launch` is unlocked after six freelance gigs/projects with at least two specialist projects. It alone uses the existing full seven-stage journey and KPI engine; the API enforces a local 21-day / 3.2m media / 4.5m service-fee cap.

## Agency unlocking
New games require: **8 completed gigs/projects, including at least 2 specialist projects, 4 positive reviews, one returning client, and 8m personal cash**. Full seven-stage mini campaigns are an optional higher-tier portfolio path, not a compulsory detour before opening an agency. Old saves that satisfied the previous three-campaign reputation/expertise route are grandfathered (cash still required). Founding an Agency **never transfers an uncontracted Bedroom client**.

## Compatibility and integrity
- Existing campaign and office saves without `freelanceJob` retain the old seven-stage workflow.
- New fields `FreelanceCareer` and `FreelanceJobProgress` are optional and migrated safely. Invoice IDs and completion IDs prevent double payment and duplicate ratings.
- Startup/SME only; Big Corp reserved for Agency.
- Gemini must provide a real validated response for the selected client; there is no fake static brief fallback or guaranteed business performance.
- Freelancer portfolio tracks gigs, mini campaigns, reviews, repeat clients, outstanding invoices and weekly capacity. Revenue from work is distinct from client-owned campaign media spending.

## Test coverage
`tests/freelancer-v2.test.ts`: tier locks, 4-step handover, invoice accounting, revisions, repeat business, agency save migration.
`marketing-tycoon-ai-api/scenario.test.mjs`: enforce job scope at server, prevent invented price/budget, test invalid template IDs.
The source is an internal game simulator and not an employment or market-rate reference.

## V2.1 realism / final polish
- Bedroom Marketplace displays each scoped job as an inspectable card: service fee, agreed deliverables, hours, deadline, revision limit, client-owned media and progression locks. This replaces the opaque single dropdown.
- A quick/quality/research decision is a genuine trade-off: four worked hours generate 6/4/4 hours of deliverable progress respectively. Fast execution reduces quality; research is weighted toward audits, insights, planning and tracking work. Different inputs are deterministic rather than random.
- A modeled work day consists of eight actual work hours. A job's estimated delivery day and late penalties account for realistic effort while leaving the game's **global End Week** as the only clock that advances all clients. `actualWorkHours` and `deliveredDay` are optional fields for legacy-save compatibility.
- An 8-gig portfolio with two specialist projects is enough to open Agency if positive reviews, a returning client and cash requirements are met. Legacy saves remain grandfathered.
- After delivery, the Bedroom explicitly returns to the freelance job board instead of announcing a fictional automatic coffee client.
