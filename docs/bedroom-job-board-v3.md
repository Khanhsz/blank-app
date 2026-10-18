# Bedroom Job Board V3 — Unified Competitive Freelance Marketplace

## Decision
There is **one** Freelancer Job Board, open from the first day. It includes Startup and SME listings. There is no separate Personal Network menu, company approach or guaranteed first contract. The game publishes seven scoped jobs each in-game week; it does not pretend every company's entire annual marketing budget is available to a new freelancer.

## Access
- Reputation 0–30: apply to affordable Starter Gig / SME and Startup listings.
- Reputation 31+: may apply for high-budget scopes subject to experience. Premium means **service fee ≥2,000,000 VND OR client-owned media ≥5,000,000 VND**.
- Beginner may inspect locked jobs and see the reputation/portfolio requirement.
- Big Corp clients, including Fortune 50, never appear in Bedroom; they require agency Growth Desk and Fortune HQ rules.
- Portfolio gates remain separate from reputation: advanced freelance scopes still require completed gigs and specialist experience.

## Applying and selection
- Job Board uses stable **Client Master Database** identities and eight scoped, deterministic job templates.
- Each listing has a fixed NPC applicant cohort with consistent skill/portfolio/reputation/quote styles.
- Application chooses proposal approach (creative/performance/research/value) and bid fee tier (85%, 100%, 115% of template).
- Three applications per game week, one work hour each and zero monetary application fee.
- Client's NPC selection occurs **once** at End Week. The applicant fit formula uses 27% skill, 20% portfolio, 20% proposal, 12% price-value, 12% availability, 9% relationship/reputation; softmax temperature 12 adds competitive uncertainty.
- All NPC applicants, estimates, score, selection status and feedback are persisted. Reloading cannot reroll the winner.
- If a player wins, a selectable offer appears. Only **Accept Offer** allows `chooseFreelanceClient` to start the Gemini-powered fictional business brief. Rejections/declines do not reduce reputation.
- The agreed **bid fee**, not the original template fee, drives the 20% deposit and outstanding final invoice. Client-owned media stays outside the freelancer's income.

## Weekly and persistence behavior
- One global game End Week clock remains authoritative. The same week that advances client market/rival agents closes Freelancer applications and publishes the next seven job listings.
- Already completed/accepted contracts, historical freelance campaigns, existing saves without Job Board state, cash, and agency workflows are preserved.
- The Job Board blocks direct client selection after initialization. Existing saves without this new field remain playable, and their already-in-progress jobs are untouched.
- Selection is a deterministic game simulation, not verified real-world recruitment behavior or a live Gemini hiring decision. Gemini supplies the contextual brief **after award**.

## Validation
`tests/freelance-market.test.ts`: 30/31 gating, affordable jobs at rep zero, applicant capacity, deterministic selection, no direct bypass, bid-fee invoicing and old-save migration.

## Tuning / next phase
The seven weekly listings currently follow a guaranteed mixture of gig and project templates. Further enhancements can add specialist NPC portfolios, bounded interview rounds and dynamic client demand without changing the saved contract schema.

## V3.1: one-click Apply UX
- **Apply Job** submits immediately; there is no Prepare Application preview/form on Bedroom mobile or desktop.
- Engine chooses the existing sector-matched default approach and the **Standard** job listing service fee. NPC scoring, 3 applications/week, 1-hour effort, Rep 31 premium gate, skill unlocks, End Week decision and explicit Accept Offer remain unchanged.
- After tapping Apply, listing status becomes **PENDING** and a saved entry appears in **My Applications & Offers**. The player does not automatically win or begin client work.
- Existing applications retain their originally chosen approach and quoted bid price. All old saves remain compatible.
