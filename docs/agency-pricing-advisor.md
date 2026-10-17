# Agency pricing — built into the existing bid pipeline

## In-game flow (no optional Pricing Desk)
1. **Qualify lead**: client size, media budget, delivery scope, timeline, staffing costs and rival pricing determine three sustainable fee quotes immediately. The same deterministic calculation is used locally and by the existing API.
2. **Automatic Gemini input**: a persistent root game effect requests AI pricing strategy as soon as the lead qualifies, including if the player closes the panel. AI chooses a tier, explains tradeoffs and suggests pitch-preparation actions. No separate "Analyze" button or pricing screen.
3. **Prepare pitch**: the current competitive-pitch step **includes** three numeric fee quotes directly in the decision flow. Recommended tier is preselected. The player may switch tiers, committing a strategic price decision. A manual selection is preserved if Gemini responds later.
4. **Submit priced pitch**: every submission carries a real bounded agency fee, even from an older save or when Gemini is offline. Rival competition still runs through the deterministic game engine and is influenced by the selected fee.
5. **Contract negotiation**: if successful, the submitted fee is the opening negotiation amount. Contract margin, team capacity and client sign chance are calculated normally; client media budget remains separate from agency service fee.

## API and offline behavior
- Automatically request `POST /api/pricing-advice` from the existing Render Gemini API after qualification, rather than a user-triggered button.
- Local cost-model quote exists **before** the request and is preserved if the model is unavailable, times out, or is rate limited.
- Only allow valid API results with the exact matching client-budget/staffing context. AI chooses strategy and language, but cannot invent numbers or outcomes.
- One API attempt per qualified lead and pricing context per browser session; persistent quote data is saved through the existing game save key.
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
