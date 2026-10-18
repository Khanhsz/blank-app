# Gameplay flow continuity

The Computer shortcut and the bedroom computer open the same workstation. A new
freelancer sees the Job Board. An accepted offer resumes its Gemini brief; an
in-progress job resumes its workspace, review or final payment. Closing and
reopening the panel no longer defaults an awarded job back to the Job Board.

## Freelance delivery

Apply → AI application review → Accept Offer → Gemini brief → Accept Job →
job-specific workspace → Deliverable Board → client review / revision →
Final Submit & Payment → Job Board.

- Partial edits persist in `artifact.draft`, including incomplete decisions.
  Switching outputs, closing the panel and restoring a save preserve the draft.
- Draft edits consume no hours, create no deliverable version, and pay no money.
  **Save Deliverable / Save Version** commits the output and charges work hours.
- The UI shows the required hours. At capacity, a draft remains editable and can
  be committed after End Week restores capacity.
- The board and client review reject outstanding edited drafts, including stale
  submissions. The client therefore reviews the version the player confirmed.
- Per-output QA acceptance remains **78/100** and is displayed in the editor.
  The latest upstream revision fixtures remain intact.
- Approved outputs remain locked. Final Submit pays once. With no deduction,
  payment equals the exact accepted fee, including quotes not divisible by 10,000.
  The latest upstream VND rounding is preserved for deductions; the payment
  preview and payment action share the calculation.
- The route highlights the Paid stage after completion.

## Agency navigation

- Projects opens Workforce in Agency HQ.
- The CEO section and Workforce detail view survive closing/reopening panels and
  switching CEO sections within the running session.
- Approaching a catalog client focuses the newly created deal. Growth Desk opens
  its Deal Room immediately; corporate HQ approaches use the same focus.
- A signed deal opens its own client squad using project/lead identity.
- Location shortcuts open the relevant CEO section. Pitch/negotiation scenes
  activate the boardroom while viewing the pipeline.

These routes use existing game state. Application awards, mandatory Gemini brief
generation, the global weekly clock, recruitment, exclusive team membership,
Fortune HQ access and annual contracts continue through their established engines.

## Verification

`npm run build` runs TypeScript, asset checks, all game regressions and the Vite
production build. `node --test marketing-tycoon-ai-api/*.test.mjs` checks the AI
backend guards. New regressions cover draft persistence, capacity, stale review
prevention and precise client-team navigation; all eight existing V4 lifecycle
cases also return the restored paid job to the Job Board.
