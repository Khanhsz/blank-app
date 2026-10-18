# Bedroom · Client Approach powered by Gemini

## Game journey
1. Player reaches the **bedroom workstation** and chooses a simulated Startup or SME from Client Marketplace. There is **no auto-assigned random client**.
2. **Approach Client** stores a selected catalog client and starts a new, unique pending request. Browser posts the selected client ID, brand, business category, fictional marketing-budget estimate and business challenge to the existing Render AI API.
3. **Gemini must answer** with a full structured, fictional, internally consistent client brief, four simulated discovery answers, strategic **market context**, a falsifiable **consumer insight hypothesis** and a **strategy direction**. Server validates these fields and overrides the brand with the selected catalog brand.
4. Game gates the first brief until the response has `mode=ai`, a matching `clientId` and all required context/insight/strategy fields. The client-specific answers appear when the player asks questions in the Client Discovery step. Context appears in step 1, hypothesis in Insight Lab and strategic direction in Strategy Workshop.
5. The player still evaluates fictional evidence and picks the final insight, target audience, objective, positioning and approach. Gemini provides creative scenario content; the deterministic game engine remains responsible for score, cash and outcomes.
6. If Gemini returns 429/5xx, times out, has an invalid result or is not configured, **do not create any local/prewritten substitute**. Keep selected client and save progress. Show an explicit **Retry Gemini approach** button. No automatic retry loop.
7. Choosing a different client invalidates any in-flight response using `briefId` + `catalogClientId` identity. All existing progressed campaigns, agency state, city geometry and saved gameplay remain compatible.

## Data policy
All Startup/SME and scenario market data are fictional simulations. Gemini hypotheses, conversations and strategy are not verified market research. Hidden answer keys remain in the game simulation and are not disclosed as guaranteed recommendations.

## Checks
`npm run build`
`node --test marketing-tycoon-ai-api/*.test.mjs`
Smoke test the real API response on production for selected client through the bedroom UI. Do not log private API keys.
