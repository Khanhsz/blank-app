# TripMate — AI Travel Planner (web MVP)

A responsive, editable AI travel-planning prototype built with **Next.js App Router**, **React**, **TypeScript**, **Gemini**, and **Leaflet + OpenStreetMap**.

## Run locally

Prerequisites: Node.js **20.9+**, npm.

```bash
npm install
cp .env.example .env.local
npm run dev
```

On Windows PowerShell, replace `cp` with `Copy-Item .env.example .env.local`.

Open `http://localhost:3000`. **No Gemini API key is required to explore the demo.** Click **New trip → Try demo instead**. The first visit loads a sample Kyoto trip.

## Turn on AI generation

1. Create your own Google AI Studio API key.
2. In `.env.local`, set `GEMINI_API_KEY=your_key_here`.
3. Keep `GEMINI_MODEL=gemini-3.5-flash-lite` (or replace with an available model in your account).
4. Restart the local server and use **Generate with AI**.

**Never put the secret into `NEXT_PUBLIC_` variables, client code, Git, screenshots, or chat.** If a key was publicly shared, rotate it in Google AI Studio before using it.

## Implemented screens and interactions

- **Overview**: welcome banner, recent trips, destination inspiration.
- **Create a trip**: destination, date range (1–14 days), party size, budget, currency, pace, interests, notes. AI mode and offline-friendly demo mode.
- **Itinerary**: day tabs, stop timeline, cost, location, duration, add/edit/remove/reorder stops.
- **Map**: per-day numbered markers on a Leaflet map, plus links to verify places on Google Maps. Stops with missing coordinates show "No pin".
- **Budget**: automatically totals planned activity costs, supports manual expenses, and shows spend distribution and remaining budget.
- **Saved trips**: switch trips, delete with confirmation.
- **Discover**: manually curated destination starters.
- **Export**: download the current trip JSON.
- **Persistence**: browser `localStorage` stores trips and the selected trip (single browser only).

## Technical architecture

```text
Browser (React/Next.js client components)
  ├── localStorage (trips, activity edits, expenses)
  ├── React Leaflet (OSM tiles)
  └── POST /api/generate
         ├── Zod validates inputs (and AI output)
         └── @google/genai -> Gemini generateContent structured JSON
```

The Gemini key is used **only** by the server-side route. The route requests structured JSON, validates it, creates activity ids, and returns a normalized trip object. API errors are surfaced without hiding that AI generation failed. It never silently substitutes a demo plan.

### Data shape

`Trip { id, destination, country, startDate, endDate, travelers, budget, currency, pace, interests, notes, summary, tips, days: [{date,theme,activities: [{id,time,title,location,description,durationMinutes,category,cost,lat?,lng?}]}], expenses:[{id,title,category,amount}], mode, createdAt }`

Activity cost is **the estimated cost for the entire party** in the trip's selected currency. Budget is also for the entire party. No FX conversions are performed. The budget summary only totals activities and manually entered extra expenses, **not a complete trip quote**.

## What is deliberately not included in MVP

- User signup and server-side cloud storage / multi-device sync (Supabase is the planned next step).
- Live flight/hotel bookings, weather, real-time opening hours, prices, or ticket availability.
- Route optimization, geocoding for unknown places, or travel-time estimates.
- Sharing links and collaborative editing.
- Offline map tiles or turn-by-turn directions.

**Before public launch:** Add authentication and row-level security for Supabase; input-specific and IP-based rate limits on `/api/generate`; abuse protection and monitoring; privacy policy and data retention; a verified place search provider and verified prices/opening hours; provider-compliant commercial map tile hosting. The public OSM tile server is best-effort and subject to a fair-use policy: https://operations.osmfoundation.org/policies/tiles/.

## Deployment

Deploy this repo to **Vercel** or **Render Web Service (Node)**. Set `GEMINI_API_KEY` in the platform's **server environment variables**. Build: `npm install && npm run build`. Start: `npm run start`. (With Render, Node 22+ is recommended.)

## Manual smoke test checklist

1. Homepage opens with a sample Kyoto trip.
2. Create a different demo trip; check it appears in Saved trips.
3. Switch days, add/edit/remove/move an activity.
4. Check the budget updates; add and delete an extra expense.
5. Confirm map pins render for Kyoto and 'No pin' for unknown demo destinations.
6. Download JSON; refresh the page to confirm persistence.
7. Try AI with and without an API key; confirm both outcomes are clearly reported.

## License and imagery

Interface icons via `lucide-react`; map data © OpenStreetMap contributors. The Kyoto example card uses a remote Unsplash photo; this can be replaced with licensed, locally hosted art for production. Google Fonts are optional; system fonts are used if offline.