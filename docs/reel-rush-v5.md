# Marketing Tycoon V5 · REEL RUSH / Five Playable Video Mini-Games

Scope: replaces the generic 4-dropdown `5 Short Videos` workflow **only for new V5 video deliverables**. All other seven freelance workflows and legacy already-saved V4 video versions remain compatible.

## Flow
Apply → Instant review → Accept Offer → Gemini brief → **Accept Job (no deposit)** → five different playable video levels → Deliverable Board (review / edit) → client review (Gemini narrative plus engine-owned scores) → targeted revisions → Final Submit → **one exact service-fee payment** (personal expenses deducted once).

| Unit | Mini-game | Real user action | Engine validation |
|---|---|---|---|
| Video 1 · Introduction | Scroll Stopper | Pick a clip and opening line, then test a fictional short-video feed | Opening clarity and message fit; must run at least one test |
| Video 2 · Product demo | Perfect Shot | Drag/viewfinder, zoom and capture moving hero frame against real-time clock | Framing, zoom, correct capture timing; must capture |
| Video 3 · Customer experience | Match Cut | Reorder 5 clips, trim lengths, scrub the assembled preview | Logical continuity plus ideal narrative pacing; at least one edit |
| Video 4 · Tutorial | Caption Rush | Scrub playback, align four caption cues to reference speech waveform, choose safe subtitle position | Cue synchrony and visual placement; must edit caption |
| Video 5 · Promotional reel | Beat Drop | Start the moving playhead, listen to synthesized tones, tap CUT/Space for four transitions | Four chronologically ordered cut timings vs beat markers |

All levels show animated 9:16 SVG/vector client footage as an honest **simulation**—the game does **not** render MP4, pretend to use external client videos, call stock or generation APIs, or purchase media.

## Game state
- `FreelanceV4Artifact.videoDraft` is autosaved through canonical `act()` store on drag, trim, hook choice, click, capture and rhythmic cut, not a volatile component-only value.
- `FreelanceV4Artifact.video` is the immutable submitted version; `versions[].video` stores the snapshot of each previously submitted revision.
- Each of five initial saves consumes 4 hours (20h total). A submitted video revision consumes 1 hour; no hours charged during experimentation.
- `videoScore()` and `videoComplete()` are deterministic pure functions of saved actions; no fabricated free 100/100 starting score. `artifactScore('short-video')` dispatches to them on V5 videos.
- `v4HasDrafts()` includes video edits to prevent an uncommitted video being reviewed.
- `openV4Board()`, `submitV4Review()`, `finalizeV4()` keep all existing quality, hours, deduction and payment rules. Client feedback may only request changes to the specific output.
- Legacy V4 video artifacts with existing text versions are still accepted and editable through the original editor to protect old saves.

## Regression testing
`tests/freelance-market.test.ts`: all five gameplay states, challenge gating, invalid scene rejection, autosave/reload, work-hour budget, client review with one failing Beat Drop, targeted redo while four approved videos are locked, and exactly-once V4 final payment.

No new backend endpoints required: V4 Gemini client review already accepts textual summaries, fixed engine score and status.
