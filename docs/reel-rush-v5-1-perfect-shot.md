# Reel Rush V5.1 · One-button Perfect Shot

Within the existing V4 job **5 Short Videos**, only Video 2 / Perfect Shot is simplified. The other four games are unchanged.

## Player
- Open Video 2 and a vertical 9:16 animated product preview starts automatically, looping every eight seconds.
- The player has **ONE** active action: **CAPTURE!**. No camera drag, frame X/Y or zoom controls.
- Capture stores the precise elapsed timestamp; the deterministic engine scores timing against the hero moment at 4.5s (100-point peak, minus 18 points per second of deviation).
- After Capture, display a large Perfect / Good / Needs Work result. The deliverable version, score and V4 work-hours are **automatically recorded**; no manual Save button remains.
- **Retry** replays the video; new Capture replaces the *same unconfirmed version* (and its history snapshot) for **zero extra work-hours** until Continue. Result is retained safely through reload.
- **Continue** marks the saved version confirmed, navigates to next unsaved video, or opens the Deliverable Board if all five are complete.
- Revisiting a previously confirmed Perfect Shot to create a new revision still consumes 1 hour, preserving freelance resource balancing.
- If initial work-hours are insufficient, Capture stays disabled until End Week; the game never simulates a free submission.
- Existing V5 and V4 saves retain their video history. No deposit at Brief; money only on approved V4 Final Submit, at most once.
- Preview is simulated animated vector footage, not a true client recording or an MP4 render. No new backend endpoints.

## Regression coverage
- Automated tests assert time-only scoring independent of old X/Y/zoom, automatic saved deliverable after Capture, free pre-Continue retries, version identity and persistence after reload, appropriate revision charging, next-video transition, and no early payout.
