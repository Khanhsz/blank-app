# TripMate — Product Specification v0.1

**Release:** Functional prototype / MVP (single-user, web-only)  
**Audience:** Leisure travelers looking for a personalized, editable first draft of a trip  
**North-star metric:** Percentage of created trips whose itineraries the user meaningfully edits or returns to

## 1. The problem and value proposition

**Job to be done:** “When I know roughly where and when I want to travel, help me quickly turn preferences and a budget into a realistic, editable day-by-day plan so I don't have to open ten tabs.”

Common friction: comparing places across disconnected tabs; aligning opening hours and geography; staying within budget; keeping a trip updated as plans change.

**MVP promise:** Fast first draft + effortless edits + understandable estimated costs + spatial visualization. **Not a booking engine** and **not a source of verified live travel availability.**

## 2. Functional scope

| ID | User story | Acceptance criteria | Phase |
|---|---|---|---|
| T01 | Create a trip with destination, dates, party size, currency and budget | Required fields validated; 1–14 days; clear error feedback | MVP |
| T02 | Describe pace, interests and additional preferences | Inputs included in generation request | MVP |
| T03 | Generate personalized itinerary | Server validates request, Gemini returns a JSON plan, server validates response; explicit error on failure | MVP |
| T04 | Try without API access | Demo produces an explicitly labeled sample plan | MVP |
| T05 | Compare days in my trip | Day tabs update activities, date and day cost | MVP |
| T06 | Customize an activity | Add, edit, delete, reorder; changes update totals and remain after reload | MVP |
| T07 | See places on map | Leaflet renders known coordinates; unknown stops clearly indicate missing coordinates | MVP |
| T08 | Understand planned spending | Activity sum + manually added expenses; remaining = budget minus sum | MVP |
| T09 | Add flight/hotel/other spending | Expense form with title, category, amount; remove updates totals | MVP |
| T10 | Reopen and switch trips | Saved trips persist in browser localStorage and can be deleted | MVP |
| T11 | Export my plan | JSON is downloadable without sending data to another service | MVP |
| T12 | Cross-device account and cloud sync | Secure sign-in and Supabase RLS policies | Phase 2 |
| T13 | Real place details | Geocoded place IDs, verified hours and costs | Phase 2 |
| T14 | Navigation and route optimization | Travel times and ordered legs from a verified routing provider | Phase 2 |
| T15 | Booking checkout | Provider agreements, live quote and payment compliance | Phase 3 |

## 3. App screens and wireframes

### S1. Overview (`view: overview`)

```text
┌─────────────┬───────────────────────────────────────────────┐
│ TripMate    │ Workspace / Overview            + New trip   │
│             ├───────────────────────────────────────────────┤
│ Overview ●  │ Good to see you, explorer                     │
│ Itinerary   │ ┌───────────────────────────────────────────┐ │
│ Map         │ │ Go somewhere extraordinary     PLAN TRIP │ │
│ Budget      │ └───────────────────────────────────────────┘ │
│ Saved trips │ Your adventures                                │
│ Discover    │ [Existing trip] [New adventure] [Trip ...]      │
│             │ A little inspiration                           │
│             │ [Kyoto] [Da Nang] [Ho Chi Minh City]            │
└─────────────┴───────────────────────────────────────────────┘
```

**States:** sample Kyoto trip on first run; saved trips after creation; no trips empty state after deletion.

### S2. Trip creation (modal)

```text
Destination:  [Kyoto________________________]
Dates:        [Start]               [End]
Budget:       [Currency] [Amount]   Travelers [- 2 +]
Pace:         [Relaxed] [Balanced] [Packed]
Interests:    [Food] [Nature] [Culture] ...
Other notes:  [Accessibility, dietary preferences...]
              [Try demo instead] [Generate with AI →]
```

**States:** input validation error; loading; AI success; explicit Gemini-not-configured / generation failure.

### S3. Itinerary editor

```text
Kyoto • Nov 10–13 • 2 travelers             Export JSON
┌─────────────────────────────────────────────────────────┐
│ Summary, budget, travel pace                            │
└─────────────────────────────────────────────────────────┘
[Day 1] [Day 2] [Day 3] [Day 4]                    MAP VIEW
Day 1: First impressions                    Cost estimate
09:00   [Sightseeing] Fushimi Inari       $8  Edit ↑ ↓ Delete
12:30   [Food] Nishiki Market           $22  Edit ↑ ↓ Delete
16:00   [Culture] Gion                  $12  Edit ↑ ↓ Delete
[+ Add another activity]
```

**Important behavior:** Reordering swaps displayed schedule slots, keeping the order of the timeline consistent; changing a place/name clears its prior coordinates to avoid misleading pins.

### S4. Explore map

```text
[Day 1] [Day 2] [Day 3] ...
┌───────────────────┬───────────────────────────────────────┐
│ Numbered stops    │         OSM Leaflet interactive map   │
│ 1. Fushimi Inari  │            1      2       3           │
│ 2. Nishiki Market │                                       │
│ 3. Gion           │   Click pin → place + verify link     │
└───────────────────┴───────────────────────────────────────┘
```

**No false claims:** These are location pins, **not** a route, live map navigation, or verified geocoding. If coordinates are missing, show “No pin.”

### S5. Trip budget

```text
[Total budget] [Estimated planned] [Unallocated / Over]
┌────────────────────────┬──────────────────────────────┐
│ Spend by category      │ Extra expenses               │
│ Food        ██████     │ Hotel             $...       │
│ Culture     ███        │ [+ Add expense]              │
│ Sightseeing ████       │                              │
└────────────────────────┴──────────────────────────────┘
```

**Important:** Amounts are in the selected trip currency, and estimates are for the **entire travel party**. The system does not exchange currencies or automatically include travel items not in the itinerary.

### S6. Saved trips / Discover

**Saved trips** shows persistent trip list, creation mode, dates, travelers and budget, with open/delete. **Discover** has a small editorial set of inspiration cards, not crowdsourced, not backed by a destination-search API.

## 4. Primary user flows

### Flow A — AI-generated trip

```text
Overview → New trip → Enter destination, dates, budget, style
  → Generate with AI → POST /api/generate
  → Validate → Gemini structured JSON → Validate + normalize
  → Persist in browser → Itinerary editor → Map → Budget
                                  ↘ Edit stops ↗
```

**Failure branch:** AI missing / invalid output / network failure → meaningful error message → edit inputs / retry / select demo. Never silently pretend demo output came from AI.

### Flow B — No API key / offline-friendly demo

```text
Overview → New trip → Try demo instead
  → Create labeled sample → Edit activities → Save automatically
```

For cities without built-in landmarks, sample activities are **generic placeholders**. These should not be presented as researched local businesses.

### Flow C — Trip management

```text
Saved trips → Open trip → Change day or add expense → Auto-save
           → Delete trip → Native confirmation → Remove local copy
```

## 5. App architecture and module responsibilities

```text
app/page.tsx                 React client application, user flows and state
app/globals.css              Responsive visual system
app/layout.tsx               Page metadata and global CSS
app/api/generate/route.ts    POST endpoint, Zod validation, Gemini SDK
components/TripMap.tsx      SSR-safe lazy map wrapper
components/TripMapCanvas.tsx Leaflet map, OSM tiles, stop markers
lib/types.ts                 Typed data model, currency format, totals
lib/demo.ts                  Sample trips, locality examples, date helpers
```

**MVP storage:** `localStorage` key `tripmate.trips.v1` and `tripmate.selected.v1`. The UI is responsive and has no login. Local browser data is private to that browser profile and can be erased by the browser; it does not sync across devices.

**Phase 2 storage:** Supabase Auth and Postgres, with tables `profiles`, `trips`, `trip_days`, `activities`, `expenses`; foreign keys `trips.user_id`, `trip_days.trip_id`, `activities.day_id`, `expenses.trip_id`. Enable RLS such that users can only read/write data belonging to their user ID. Do not let the frontend send trusted `user_id` without verifying auth.

**API contract:**

```http
POST /api/generate
Content-Type: application/json
{
  "destination": "Kyoto", "startDate": "2026-11-10",
  "endDate": "2026-11-13", "travelers": 2,
  "budget": 650, "currency": "USD", "pace": "balanced",
  "interests": ["Food", "Culture"], "notes": "Prefer gentle walks"
}
```

Success: `200 { "trip": { ...normalized Trip } }`  
Validation failure: `400 { "error": "..." }`  
AI not configured: `503 { "error": "..." }`  
Model/network/invalid result: `502 { "error": "..." }`

**AI prompt safeguards:** Explain user-supplied notes as preferences, insist on structured data only, instruct the model not to fabricate coordinates/hours/bookings, validate shape server-side. This does not guarantee factual accuracy; use a places verification provider before production.

## 6. Visual design

- **Brand:** TripMate, evergreen travel studio.
- **Primary:** dark forest green `#214e46`; supporting green `#e8f1e9`.
- **Neutrals:** paper `#f8faf7`, white cards, dark text `#223634`.
- **Accents:** warm apricot `#e9bc87` for warmth, pastel activity category surfaces.
- **Typography:** Plus Jakarta Sans headlines, DM Sans body, fallback to system font.
- **UI:** Rounded 10–21px surfaces; clear 3-tier typographic hierarchy; 250px desktop nav sidebar; responsive mobile slide-in nav.
- **Accessibility:** semantic buttons, field labels, modal dialogs, visible selected states, map fallback if no coordinates. Future work: full keyboard focus trapping and thorough accessibility audit.

## 7. Testing and release gates

### Functional QA

- Create first trip without AI using demo mode; sample destination has known coordinates.
- Create 3- and 14-day trips; reject invalid start/end and trips longer than 14 days.
- Edit/rename activity and confirm saved changes survive refresh.
- Remove/move activity and confirm cost and map update.
- Add expense and verify remaining budget computation; test over-budget state.
- Test missing AI key and invalid/timeout AI response.
- Test mobile layouts, keyboard navigation, and empty states.
- Export JSON and verify fields can be read.

### Before production use

- Add server-side rate limiting (e.g., Upstash Redis) and optionally authentication/quotas.
- Use a commercial tile provider for traffic at scale; respect OSM usage policy.
- Integrate a places/geocoding service with place IDs and verified coordinates.
- Add reliable opening hours, pricing, routing/transit, accessibility and safety details.
- Implement privacy consent, account deletion and customer support.
- Add E2E tests, observability and deployment smoke tests.

## 8. Suggested implementation milestones

| Phase | Outcome |
|---|---|
| Sprint 1 (prototype) | Responsive app, demo, local persistence, editable itinerary |
| Sprint 2 (AI) | Gemini API, output schema validation, user messages/errors |
| Sprint 3 (utility) | Map, budget, export, usability and mobile testing |
| Sprint 4 (production readiness) | Authentication, cloud data, rate limiting and external place verification |

**Current project includes Sprints 1–3 as source code, not a production-hardened deployment.**