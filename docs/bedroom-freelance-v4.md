# Marketing Tycoon · Bedroom Freelance Delivery V4

## In-game contract and payment policy
One Job Board. Apply → instant review → Accept Offer → Gemini client brief → **Accept Job (no deposit)** → job-specific workspace → Deliverable Board → Client review and revisions → Final Submit → **one immediate full earned fee**.
- No personal income at Apply, Offer, or Brief. Only on final client-accepted submission.
- Personal expenses deducted once from net cash. Client-owned ad/media budgets are never income.
- If allowed revision rounds are exhausted, client may accept as-is with clearly shown simulated contractual 20% service fee deduction.
- Career stats, client repeat history, portfolio and reputation update exactly once. Historical V2 saves (without `freelanceJob.v4`) continue using their previous flow. New accepted jobs are V4.

## Eight title-driven workspaces
| Job ID | Workspace | User-created structured deliverables |
|---|---|---|
| social-pack | Content Studio | Five posts with objective/pillar/format/CTA and editable captions |
| social-audit | Analytics Lab | Five evidence-linked audit findings, diagnostics and recommendations |
| content-calendar | Editorial Planner | Twelve unique post ideas within 14 days, with pillar, format, role and editable publishing notes |
| short-video | Video Storyboard Studio | Five videos with hook, story structure, pacing, CTA and editable scene scripts (storyboard simulator; no MP4 generation) |
| meta-setup | Ads Manager Simulator | Campaign objective, audience/ad set, tracking, preflight QA and configuration documents (no real Meta account) |
| audience-research | Consumer Insight Lab | Research question, sampling, coded themes, segmentation, insight/limitations (fictional source data) |
| content-sprint | Content Operations Center | Six distinct channel adaptations with funnel role, platform-native tailoring and handover matrix |
| mini-launch | Campaign Command Center | Seven local planning/creative/media/launch/measurement stages and a structured simulated KPI handover; no real ad buying |

## Save and state
- New `FreelanceJobProgress.v4` saves `step`, `activeId`, individual artifacts, selected decisions, authored copy, version history, QA scores, review round, feedback, 20% deduction if needed and `paidAmount`.
- Auto-save via the canonical `act()` store.
- Every first save costs a bounded fraction of modeled project effort; revisions consume 1h. Standard freelancer capacity remains 28h per simulated week.
- Approved artifacts remain locked during subsequent revision rounds. Before client submission, every draft can be edited and previous versions remain viewable.
- A full output cannot be submitted until every mandatory artifact has been saved, including all professional decisions and meaningful text.
- A completed contract uses `career.completedIds` for financial idempotency.
- Legacy campaigns remain on the legacy component; V4 mini-launch bypasses the old weekly campaign auto-simulator.

## Client review
- Game engine grades decision fit, output completeness, text specificity and late submission. It decides approved versus specific revision and persists the result.
- `POST /api/freelance-deliverables-review` accepts bounded fictitious work summaries and *fixed* review scores/statuses, returning optional Gemini feedback per item.
- 8 review requests/IP/hour, <=40 shared AI calls/day, 16-sec upstream timeout. Rules-generated feedback works offline; Gemini only improves narrative. Never let AI decide fees, outcomes, or scope.
- V4 review token `reviewVersion` prevents an old AI response from overwriting feedback after a new revision.
- No client invoice delayed to End Week for V4; payment is immediate when user confirms Final Submit.

## Verification
Game regression tests cover all eight workflows, save versions, no deposit, immediate exactly-once payout, revision corrections and fee deduction. AI API tests cover input restrictions and bounded narrative-only response.
