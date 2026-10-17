# Client Master Database V1 — Marketing Tycoon

**Canonical implementation:** `src/game/clientDatabase.ts`
**Game integrations:** `src/game/clientMarket.ts`, `src/game/campaign.ts`, `src/game/ceo.ts`, `src/components/game/ClientCatalog.tsx`

## Scope
- Seven playable verticals: **Coffee, Beauty, Fashion, Education, Tech, Fitness, Food**. Coffee is deliberately separate from Food, matching the game's legacy AI category taxonomy.
- Three business segments: **Startup**, **SME**, **Big Corp**.
- **98 deterministic records:** 28 Startup + 28 SME + 28 fictional Big Corp + 14 real U.S. Fortune 500 Top 50 companies (2026).
- Freelance offers: any Startup or SME from the catalog; player chooses independently. Big Corp stays in the Agency catalog.
- Agency offers: freely approach any catalog entry through **Agency HQ → Pipeline → Client Master Database**; leads follow the existing qualification, pitch, negotiation, contract and dedicated client team lifecycle. A catalog selection does not automatically award a deal.
- Legacy leads, dated RFPs, saved projects, city IDs and game saves remain present and playable.

## Fields
`id`, `brand`, `sector`, `segment`, `industry`, `market`, `businessModel`, `description`, `basis` (simulated/fortune-2026), `employees`, `annualRevenueVnd`, `verifiedRevenueUsd`, `marketingBudgetVnd`, `brandAwareness` (0–100), `scaleScore` (0–100), `commercialScore` (0–100), `fortuneRank`, `fortuneYear`, `rankingSource`, `revenueSource`, `sourceNote`.

The **Commercial Index** is a gameplay-oriented composite, not a third-party company ranking: 30% revenue-size proxy + 25% scale + 25% modeled marketing spend + 20% modeled awareness. It is descriptive, not an approval gate. Marketing budgets shown in profile cards are **annual**, while Agency `LeadDef.value` is **campaign media budget** and `LeadDef.fee` is the independent **agency fee**. Never equate any two.

## Data source integrity
- **Fictional companies**: every financial, headcount, marketing-spend and awareness value is generated deterministically, with `basis:"simulated"`. No claim is made about an existing enterprise.
- **Fortune US Top 50**: company and rank (2026) are public facts from [Fortune's U.S. 500](https://fortune.com/ranking/fortune500/) cross-checked against [the company profile index](https://www.sheetsteps.com/data/fortune-100-companies-2026).
- **Verified revenue**: only four companies have `verifiedRevenueUsd` populated (Amazon, Walmart, Apple and Alphabet), using publicly reported 2026 Fortune Global 500 figures at [Fortune Global 500](https://fortune.com/ranking/global500/). Other real-company revenue values are `null`, not speculative.
- **Marketing spend & awareness for all companies**: modeled **game estimates**, never an actual budget, proprietary marketing intelligence, real awareness survey or corporate disclosure.
- **Fortune brand campaigns**: purely **fictional educational marketing scenarios**. These companies have not sponsored, authorized, requested, or awarded a contract in the game.

Only a subset of the 2026 U.S. Top 50 maps credibly to the seven playable sectors. In particular, the Fortune subset does not include Coffee, Education or Fitness. Other Big Corp clients in these verticals are explicitly fictional; their `fortuneRank` is `null`.

## Campaign bridge
- `scenarioForClient(c)` builds an evidence-based *game exercise* with the existing brief, insight, strategy, creative, media and report interfaces.
- `agencyLeadForClient(c)` generates deterministic media budgets, fee ranges, timeline, risk, client specialty and difficulty from the client profile. The existing AI Pricing Desk remains optional during pitching; it is not a separate gameplay flow.
- `contractBrief(id,terms)` attaches a real `Scenario` to the signed Agency `Project.campaign.aiScenario`, keeping consistent brand, sector, budget and deadline through weekly execution and final scoring.
- `chooseFreelanceClient` permits selection only before the current brief is accepted, and only Startup/SME.
- `approachCatalogClient` adds a lead only once while it has an open/ongoing deal, without overwriting saved CRM data.

## Extensibility and limits
New client records should preserve globally unique stable IDs. Real-company financials require an explicit source, date and currency. When a valid published figure isn't available, keep it `null`. The game's curated database is intentionally static and deterministic, requiring neither an external API nor a writeable database on Render Free. Future phases can move these normalized records into Postgres or a JSON snapshot while keeping the same domain interfaces.

## QA
`tests/client-database.test.ts` validates counts, seven-sector coverage, Fortune 50 ranks, source provenance, sorting, free choice, duplicate lead prevention, and the signed-project integration. Existing campaigns, staff, client squads and economy continue under the original tests.
