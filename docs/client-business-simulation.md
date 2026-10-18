# Client Business Simulation · Gemini Intelligence · Fortune 50 Game Board

## Scope and model provenance
Marketing Tycoon's canonical client database contains 112 playable clients: 28 Startup, 28 SME, and **56 Big Corp**. Fortune Magazine's 2026 top-50 rank is stored **read-only** for 14 real brand identities. All active business KPIs, campaign effects, annual revenue after initialization, and the **Fortune 50 Game World** table are entirely simulated; they are not current financial reporting or Fortune's published rankings.

## Turn simulation
Every **End Week** calculates business outcomes for all 112 companies, not just companies signed by the founder. Inputs:
- sector base demand, bounded week-to-week variation and possible Gemini macro momentum
- completed player campaigns using actual KPI, delivery quality and media spend; an agency has exclusive client staff as before
- completed rival contracts and autonomous rival campaign effects for businesses beyond the player's sales pipeline
- decay of historical marketing momentum, brand awareness and competitive pressure

The engine stores `CompanyPerformance` with simulated annual revenue, weekly and total growth, brand awareness, player/rival attributed marketing impact, campaign activity, and a compact time series. Changes are clamped so a campaign cannot arbitrarily double revenue. The result affects the client's next prospect opportunity budget in `clientMarket.ts`.

Financial KPIs are **simulation metrics only**. Published revenue stored in `ClientMaster.verifiedRevenueUsd` is never overwritten. Game revenue for Big Corp uses USD; other client-game revenue uses VND. Currency must always accompany a number.

## Quarterly simulated Big Corp ranking
- Big Corp eligible cohort: **56** companies (42 original + 14 additional fictional), so firms can actually join/leave Top 50.
- The **Top 50 Game World** is ranked at Week 0 and recomputed **every 13 game weeks** from simulated revenue, recent growth, awareness and brand strength. Between publications the official game rankings are frozen; preliminary financials evolve each week.
- The company UI shows both **Published 2026 Fortune #N** (when grounded in the original source) and **GAME F50 #N** separately. A real company may move in the game, never in Fortune's official list.
- Ranking history retains up to 12 quarters; position changes are stored for comparison. The Weekly Newspaper announces publication events.

## Gemini server architecture
The existing Render web service `marketing-tycoon-ai-api` owns `GEMINI_API_KEY`; it exposes `POST /api/company-market-intelligence`. The React client sends only seven aggregated **game-world** sectors and anonymous campaign effects every four completed game weeks. Gemini writes 7 brief forward-looking macro signals and explanatory narrative. Server validation prevents unknown sectors, excessive numerical shocks, invalid lengths and private data. The engine applies signals at most ±0.65 percentage points per future week.

The endpoint is throttled per IP (3/h) and shares the daily Gemini cap (reserve room for briefs/AI pricing); if unavailable, a deterministic rules fallback returns the same validated shape. No calendar timer, Gemini-generated fabricated current corporate facts, client API key, or remote edit of player cash exists. Results cannot alter past weeks, external Fortune results or ledger records.

## Persistence/compatibility
`GameState.companyMarket` is optional for backwards-compatible saves. `migrate` seeds any missing 112 entries with stable IDs without overwriting existing state. Simulation advances at most once for a completed week; campaign events are de-duplicated by project ID. The remaining gameplay systems keep their established weekly clock, Rival AI, CEO bidding, Gemini pricing and Dedicated Client Squads.

## UX
Agency HQ → Growth Desk → Discover → **Fortune 50 — Game World** shows top ten or full top 50, quarter, upcoming refresh, simulated revenue, growth and rank change, plus latest Gemini/rules market pulse. Company profiles in Marketplace show the corresponding simulated revenue, growth and rivalry instead of representing game values as audited results.

## QA
`tests/company-market.test.ts`: seed coverage, official vs game ranks, 13-week period, campaign attribution, persistence and idempotency, Gemini macro bounds and rival activity.
`marketing-tycoon-ai-api/scenario.test.mjs`: API schema/request tests for seven safe aggregate sectors and bounded output.

This is a deliberately bounded agency-management simulation, not an econometric forecast. No new external API keys are necessary beyond existing `GEMINI_API_KEY` in Render.
