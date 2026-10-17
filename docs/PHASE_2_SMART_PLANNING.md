# TripMate Phase 2 — Smart Trip Assistant

**Implemented on the deployment branch:** opt-in smart planning and personal OSM food discovery.
It does not require Gemini or a paid API key. The route optimizer is a deterministic
heuristic, not a generative AI agent or a provider-confirmed live routing engine.

## Scope

- **Daily itinerary checks:** detect overlapping activities from HH:MM time and duration,
  flag tightly spaced stops when the straight-line displacement is substantial, warn
  about missing coordinates, late activities, trip pace, and interests represented
  by scheduled categories.
- **Budget snapshot:** uses existing itinerary estimated activity costs plus the
  recorded expenses. Does **not** infer live prices, booking costs, or missing
  transport/hotel fees.
- **Route suggestion:** runs bounded 2-opt over contiguous mapped sightseeing,
  culture, nature or other stops. Food, lodging and transport act as fixed anchors.
  An explicit toggle allows moving meal stops; lodging/transport/unmapped pins
  always stay fixed. Only proposals reducing straight-line travel by both >= 150 m
  and >= 5% are offered. Does not use actual road/walking route speeds.
- **Preview and apply:** previews the before/after visit order and possible new
  schedule conflicts. User must click Apply to update local trip state. Only the
  ordering and clock slot assignments change; costs, durations, and verified
  source IDs remain attached to their respective activities. Undo restores
  the immediately preceding order if it is still intact.
- **Nearby picks:** on demand only, queries already imported OSM restaurant/cafe
  records via \`/api/food-nearby\` with local food, street food, cafes, or all.
  The trip's interests choose the default filter. Suggestions carry OSM IDs,
  geocoordinates and source links, not ratings. When a meal activity exists
  the user can choose a venue to replace it.

## Non-goals / known gaps

- No verified opening hours, opening-now status, reservations, accessibility,
  dietary certifications, or live menu prices.
- No actual travel time or road-distance savings guarantees.
- Fixed appointments outside meal/transport/stay category aren't modeled yet.
  The user should review all paid bookings and time-sensitive stops before apply.
- Attraction discovery outside imported regional food snapshots awaits a larger
  genuine OSM dataset and suitable PostGIS infrastructure.
- Some named OSM locations are stale or incomplete. Match and confirm place
  identity using Verified Place Intelligence.
- Each day is optimized independently and never shifted to a different date.
- The travel-pace indicators use rough thresholds, not medically tailored advice.

## Smoke test

1. Open a saved TripMate trip > My itinerary.
2. Find the Smart Trip Assistant metrics. Click **Analyze my day**.
3. Check **Route & schedule** warnings; preview/accept an available order.
4. Click Undo to restore the pre-optimization order.
5. Switch to **Nearby picks**, pick **Local cuisine**, click **Find nearby**,
   and check the OSM ID/source for each venue.
6. Choose **Use for meal** on a day containing a food activity.
7. Check Map & transport pins now reflect the chosen venue.
8. Confirm the same changes survive page reload (trips are browser localStorage).

## Files

- \`lib/itinerary-intelligence.ts\`: deterministic distance, schedule analysis,
  bounded 2-opt proposal and safe ID reordering
- \`components/SmartTripAssistant.tsx\`: preview, warnings, opt-in apply/undo,
  sourced venue picks
- \`app/page.tsx\`: integration and trip state
- \`app/globals.css\`: responsive presentation
