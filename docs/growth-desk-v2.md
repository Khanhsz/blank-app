# Client Acquisition V2 — Growth Desk (P0 → P2)

Scope: existing Marketing Tycoon, not a separate application. Main entry: `CEO Command Center → Pipeline → Growth Desk`; client building in city deep-links into the matching deal.

## Player-facing workflow

**Discover → Prospect/Inbound → Discovery → Qualified → Proposal → Pitch → (Shortlist/Revision) → Negotiate → Sign → Dedicated Client Squad → Deliver → Review/Renew/Referral**

### P0 — Growth Desk and meaningful qualification
- **Discover:** Browse the canonical 98-company master database, with explicit simulated vs Fortune source metadata. Adding a catalog company produces an **Outbound Prospect**, *not* a free qualified invitation to bid.
- **Outreach:** Personal email (free), network introduction (260k), or insight-led message (180k). A bounded deterministic game model uses reputation, relationship, company segment and strategy; failure sends a prospect to a timed nurture period.
- **Inbound / Referral:** Can begin Discovery without outbound, but is still not automatically qualified.
- **Discovery:** Clarify Need, Budget, Authority, Timeline. Answer 3/4 before a Go, Nurture or No-Bid decision. Standard discovery is **free**. Optional deeper research uses the exact AI-calibrated diligence quotation already supported in the pricing engine. It records expense to the ledger and improves confidence without guaranteeing a deal.
- **Pipeline:** Filter stages, search, tender countdown, opportunity probability and expected value. The latter is the weighted **service fee**, never the client's media budget or guaranteed cash.
- **City HQ:** Opens the selected client in Growth Desk, never bypasses discovery with an old one-click qualifier.

### P1 — Proposal engine and multiple active deals
- **Proposal Builder:** Choose strategic response, concept, delivery style and tentative available specialists. All proposal choices are recorded on the Lead and affect the real pitch quality and financial feasibility calculations.
- **Team Feasibility:** Only staff in the Talent Pool or the already formed client squad are considered. Another client's dedicated staff may not be booked or counted. Skills, role coverage, estimated outsourcing, margin and delivery risk drive the outcome. No staff are locked until a contract is signed.
- **Pricing:** Uses the existing AI-priced competitive/balanced/premium service fees. Media money and service fees remain independent. The quoted fee flows to existing negotiation and ledger. A negotiation on a catalog lead uses the client-specific cost forecast.
- **Competitive evaluation:** Existing rivals and tender engine remain authoritative. Near-miss qualified proposals may earn one second-round shortlist and a paid revision; a final result is generated, avoiding infinite revision loops. Old pitches keep original outcomes.
- **Parallel Deals:** The legacy `ceo.pitch` and `ceo.negotiation` remain the active deal for old saves and APIs. `ceo.dealSessions` stores other pitches/negotiations; `focusDeal` swaps snapshots without losing prepared work. Active pitch capacity is 2–5 slots, improving as account/strategy headcount grows.
- **No new weekly clock:** Time still advances exclusively using **End Week**, so multiple deals and production teams experience the same week.

### P2 — CRM relationships, follow-up, repeat business
- **Nurturing:** Sets a next-contact day. In-game clock advances this date; players choose check-in, case-study share or warm intro. Paid actions affect cash and relationship, not guaranteed conversion.
- **Relationship History:** Persists trust, last contact, wins, referrals, and notes for a client; past engagements influence future outreach and expected deal evaluation.
- **Repeat Business:** Original client renewal workflow remains after completed campaigns, retaining scope/fee negotiation and client satisfaction gates.
- **Referrals:** Completed delivery with high trust and quality can create one *fictional inbound referral* from an eligible peer brand in the same category. The lead must still go through discovery, pitching and contract; no unsigned revenue or automatic staffing is created.
- **Negative outcomes:** No-Bid or lost contracts remain in CRM; they do not become a forced win.

### Technical files
- `src/game/acquisition.ts`: new domain rules, session switching, relationship system, forecasts.
- `src/game/clientMarket.ts`: outbound prospection leads.
- `src/game/ceo.ts`: pricing, real bids, revisions, project completion hooks, negotiation cost bridge.
- `src/game/state.ts`: optional types and migration defaults for old saves.
- `src/components/game/GrowthDesk.tsx`: unified UI and inline deal room.
- `src/components/game/Panels.tsx`: CEO and city integration.
- `tests/acquisition-v2.test.ts`: BANT, outreach, nurture, team exclusivity, parallel pitches and negotiations, referral, migration.
- `tests/agency-pricing.test.ts`: AI-calibrated fee regression, updated for Growth Desk.
- `src/styles.css`: responsive CSS for the Growth Desk.

## Integrity, limits and assumptions
- This is a deterministic **simulation**, not a real CRM connection or knowledge of private company budgets. Displayed win probabilities, resource costs and company outreach results are estimates used solely by gameplay.
- Fortune company contracts and introductions are fictional exercises; no assertion of actual procurement or endorsement.
- The multi-deal session adapter keeps old `CEO.pitch/negotiation` APIs for compatibility; a future full refactor can migrate all deals to normalized records.
- Auto-generated project proposals are not yet LLM-authored; strategic choices are authored rules scored by the existing deterministic game. AI Pricing is preserved with a local fallback.
- Render production QA includes TypeScript, automated game tests and Vite build. A full manual browser smoke test is a separate step.

## QA
`npm run build` runs TypeScript, automated tests and Vite. Automated tests cover structural state migration, qualification/referrals, independent deals, pricing, staffing and Weekly Clock.
