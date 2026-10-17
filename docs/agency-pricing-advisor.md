# Marketing Tycoon — Agency AI Pricing Desk

## Feature
A pricing recommendation is available for **qualified** client leads and inside **Pitch Preparation** and **Contract Negotiation**. It uses the existing Gemini scenario service; no new Render service or API key.

Input to the pricing advisor comes only from existing simulated game state:
- Client media campaign budget (\`Lead.value\`) and listed agency service fee (\`Lead.fee\`) are **separate**.
- Client industry, objective, required KPI, scope, delivery duration and difficulty.
- Staffing count, modeled payroll/overhead/direct/outsourcing from \`forecast()\` and live rival agency fee indices.
- Fictional client size (small/medium/large/enterprise) is defined for starter leads and inherited by recurring seasonal RFPs. When not supplied, the API infers a coarse category from campaign budget. Campaign scale (growing/regional/national) is a separate media-budget signal, not verified revenue or actual headcount.

The API returns a bounded competitive, balanced or premium service fee envelope. Gemini chooses one strategy and writes rationale and preparation steps. Actual VND values are calculated by server-side rules, not trusted from the model. The game provides rule-based pricing if Gemini is unconfigured or temporarily unavailable; the interface labels that fallback honestly. Requests are on-demand and throttled.

## Gameplay integration
- Price advice stored in each \`Lead.pricingAdvice\` with optional fields; old saves remain compatible.
- The player can select any of the proposed quotes within an open pitch. Only explicit selection sets \`Pitch.bidFee\`.
- A numeric quote enters \`beginNegotiation()\` as the starting service fee; existing contract margin checks and tender-scoring remain deterministic and cannot be overwritten by the LLM.
- Client media budget and actual media delivery remain separate from service fees.
- Price presets still work even without the AI service.

## Deployment
The existing \`marketing-tycoon-ai-api\` Render service must be redeployed from a commit that includes \`POST /api/pricing-advice\`. If the website deploys first but the API has not yet updated, the price advisor will display a recoverable error; all normal pitch actions remain available.

## Verification
\`\`\`sh
npm install --no-audit --no-fund
npm run build
node --test marketing-tycoon-ai-api/*.test.mjs
\`\`\`
Browser QA should test: qualify → request advice → select quote → pitch → negotiate, API quota and no-key fallback, save/reload, and old agency saves. Live pricing model availability and the actual Gemini response cannot be proven by unit tests alone.
