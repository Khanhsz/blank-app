# Bedroom V3.2 · Instant Gemini Application Review

**Apply Job → Pending (AI Reviewing) → Selected/Rejected → Accept Offer (if selected)**

- Submitting an application immediately queues an asynchronous, bounded Gemini review. **End Week is no longer required to learn the result.**
- Competition and outcomes remain deterministic in the game engine, based on the saved player fit score and stable NPC candidates. Gemini describes the strengths, concerns and client response only; it cannot decide the winner, mint contracts or rewrite fees.
- Gemini review payload is restricted to the fictional sector, job template, client tier, application score, strongest NPC score, candidate count and submitted fee. No personal information or open prompts leave the client.
- Server endpoint `POST /api/freelance-review`: 10 requests/IP/hour, with a shared daily Gemini quota reserve for brief generation, structured JSON output, 16-second upstream timeout and rule-based fallback. Frontend has a 24-second deadline and uses the same deterministic game outcome when API is unavailable.
- While a review is running, the application and Job Board persist `pending` on save. A request resumes after browser reload. Once complete, the saved `selected` or `rejected` status cannot be rerolled, even through multiple requests or advancing weeks.
- Accepted offers still require an explicit user click, and only then Gemini generates the project brief. NPC competition and low-budget Reputation gating remain unchanged.
- The selected job card surfaces **AI REVIEW IN PROGRESS** or **OFFER READY / Accept Offer** without requiring mobile scrolling to the application history section.
- End Week now only closes expired listings and refreshes the following week's job supply. Pending jobs remain available for the asynchronous reviewer until resolved.

Notes: Review success is *not* guaranteed; a rejected application receives feedback. The backend is an advisory Gemini analysis, not real external client recruitment. Rules fallback is labeled as a game simulation.

QA:
- `tests/freelance-market.test.ts` immediate resolution, same-week offer, idempotency, pending-through-week, access gates and save recovery
- `marketing-tycoon-ai-api/freelance-review.test.mjs` bounded request and AI response schema validation
