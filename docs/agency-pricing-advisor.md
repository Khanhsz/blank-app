# Agency pricing — built into the existing bid pipeline

## In-game flow (no optional Pricing Desk)
1. **Qualify lead**: the research/validation **fee charged to agency cash** is calculated per client (company size, media budget, scope, difficulty and rival pressure), instead of costing a fixed 180,000đ. The game produces a safe quote before the player clicks and records the actual paid cost on the client and ledger. Client service fees are separate.
2. **Automatic Gemini input**: a persistent game effect analyzes new/renewal leads before qualification when possible, and always handles qualified leads. Gemini can choose research-depth **lean / standard / deep**; the game calculates the actual VND qualification charge within a strict cost band. The same AI continues advising bid tiers and pitch preparation. No separate Analyze screen.
3. **Prepare pitch**: the current competitive-pitch step **includes** three numeric fee quotes directly in the decision flow. Recommended tier is preselected. The player may switch tiers, committing a strategic price decision. A manual selection is preserved if Gemini responds later.
4. **Submit priced pitch**: every submission carries a real bounded agency fee, even from an older save or when Gemini is offline. Rival competition still runs through the deterministic game engine and is influenced by the selected fee.
5. **Contract negotiation**: if successful, the submitted fee is the opening negotiation amount. Contract margin, team capacity and client sign chance are calculated normally; client media budget remains separate from agency service fee.

## API and offline behavior
- Automatically request `POST /api/pricing-advice` for selected available prospects before qualification, and for newly qualified accounts; never require an AI connection to proceed.
- Local cost-model quote exists **before** the request and is preserved if the model is unavailable, times out, or is rate limited. The fee is 90,000đ–1,400,000đ depending on simulated scale and diligence (game calibration, not a statement of real research rates).
- Only allow valid API results with the exact matching client-budget/staffing context. AI selects research depth and pitch strategy, but cannot invent VND amounts or outcomes; the game recomputes both fees using shared rules.
- One API attempt per selected prospect/qualified lead and pricing context per browser session; lead results and `qualifyFeePaid` are saved through the existing game save key. A late AI response never changes historical charges.
- The game uses the existing fictional business-size categories; these should never be presented as verified facts about real companies.

## Compatibility
- Preserve dedicated client squads, staff exclusivity, game clock, rival bids, existing client/project IDs, and save key.
- Historic prepared pitches without a fee are upgraded to a valid quote at submission; legacy pitch price preferences still map onto a competitive/balanced/premium quote.
- No new navigation items, tabs, pricing panels, or optional quote-generation controls.

## Verification
```bash
npm run build
node --test marketing-tycoon-ai-api/*.test.mjs
```
Check a realistic click path: qualifying a customer instantly shows the estimated bid, entering the existing pitch displays three prices, submitting goes to objection, winning starts negotiation at the chosen price; confirm updated Gemini recommendations appear without clicking Analyze and that a late result never overwrites a user's choice.

## Qualification fee gameplay semantics
- **Qualification fee** is an agency expense for validating an RFP, not the fee the client pays after winning a pitch.
- Both Agency Pipeline and Corporate Client HQ display the same value as the amount subtracted by `ceo.qualify`.
- Insufficient agency cash blocks qualification with no partial payment. A lead already qualified cannot be charged twice.
- A successful qualification writes `Lead.qualifyFeePaid`, `qualifyDepthPaid` and an agency ledger entry. Optional fields preserve previous saved games.
