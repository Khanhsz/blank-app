# CaseCraft V0.5.7 — Gameplay without typing

## Product direction
The player acts as a decision-maker, not a document author. Loops: **observe → select a hypothesis → commission evidence → tune financial assumptions → compare strategic options → commit a simulated initiative → review observed outcomes**. No AI or auto-grading is presented as a factual explanation of hidden business causes.

## Research references and key finding
- [Coffee Inc 2 — Side Labs](https://www.sidelabs.com/coffeeinc2/): decisions on prices, operations, finance and human resources affect a living market.
- [Capsim](https://www.capsim.com/business-simulations): sliders, finance/operations/R&D choices and integrated consequences, rather than narrative entry.
- [Gurobean — Gurobi](https://www.gurobi.com/academics/gurobean/game-guide): adjustable variables → review → commit → simulated results, keeping trial inputs separate from submitted choices.

**Design choice:** the analytical challenge must remain in choosing assumptions and interpreting impact, even when the interface generates the written audit summary for compatibility with the original engine.

## Current gameplay mapping
| Screen | Previous user input | Updated interaction | Business method |
|---|---|---|---|
| Evidence Lab | Write analyst hypothesis | Choose an evidence-test hypothesis | Original `submitHypothesis` |
| Workspace — Diagnosis | Type issue node, edit in browser prompt | Choose hypothesis, branch type, parent and evidence; cycle hypothesis | Original issue node methods |
| Workspace — Financial | Type scenario name, edit seven number boxes | Autonumber scenario, use seven sliders with +/- and instant EBIT preview | Original `calculateWhatIf`, `saveScenario` |
| Workspace — Strategy | Write strategy name/thesis/implementation/risk | Choose one of six decision levers; adjust expected EBIT, CapEx, lead time; attach sources | Original `addStrategyOption`, `selectStrategy` |
| Decision Journal | Write three narratives | Select priority and sources; show auto-generated audit text | Original `addDecisionJournal` |
| Boardroom | Write four memo text blocks | Choose goal and risk mitigation, review derived proposal, approve | Original `submitRecommendation`, original `readiness` gate |
| Expert interview | Type question | Select an interview theme and research question | Original `bookExpert` and credits/calendar |
| Decision Lab | Type optional rationale, numeric box | Select lever, slider/pivot choice, preview, confirm irreversible action | Original `submitDecision` |
| First-case reflection | Write 3 answers | Choose observed signal, forecast assessment and next move; generated observation uses accessible metrics | Original `ccWalkSubmitReflection` |
| World setup (advanced) | Enter world name/seed/volatility | Choose preset seed/world, profile/company, slider for volatility | Original `restart` |

All template strings are player-selected *methods*, not asserted hidden causes. Saved records preserve existing schema and compatibility. Slider *what-if* assumptions do not modify the live world; only approved Decision Lab initiatives do.

## Files
- `casecraft/decision-controls.js`: additive decision-only UI layer, generated hidden field payloads to existing form handlers.
- `casecraft/decision-controls.css`: style tokens based on original navy/white layout, sliders and responsive behavior.
- `casecraft/glossary.js`: updated walkthrough language: no mandatory writing tasks.
- `casecraft/build.mjs`: adds UI module into existing standalone build.
- `casecraft/index.html`: rebuilt static deployment artifact.

No changes to stage 01–05 simulation engines, case engine, consulting engine, expert engine, clock, API, route IDs or save/export/import schema.

## Known limits
1. Text records produced from decisions are rule-based summaries, not independent consulting analysis. They must not be treated as proven causes.
2. The strategy option slider affects the player's **estimated** EBIT impact; actual execution uses a separately selected Decision Lab lever. Preserving this distinction prevents a silent engine change.
3. The entire financial model remains a static sensitivity calculation; not a general optimization solver.
4. Preset hypothesis choices may be expanded by industry once the game exposes more player-visible evidence; they intentionally never query hidden root causes.
5. User-facing strings in some preexisting read-only panels remain historically inherited and are outside the input refactor.