# Intelligence Workspace V4.2

Static mobile-first Personal Intelligence Workspace deployed as an independent Render site from branch `deploy/ai-intelligence-workspace-v4`, folder `v4/`.

## Functional modules
- V4.0: My Brief, Trend Explorer with timeline, Research Library with bookmarks and collection membership.
- V4.1: cross-domain concept constellation with clearly distinguished verified-links state; Opportunity Feed contains evidence-linked research experiments and no invented job opportunities.
- V4.2: global article search, filters, local interest sliders, collection management, personal backup import/export, dark mode, responsive layout, feedback links that compose emails but **do not send automatically**.

## Privacy & capabilities
This is **a public static site**. `feed.json` is a public demonstration snapshot containing four public-news examples, not the private Google Sheets database. Never publish personal emails, individual feedback, sensitive profile records, or private source data here. The app deliberately **does not** call the Google Sheets API from the browser, does not embed OAuth tokens, does not authenticate and does not store server-side preferences. User library and settings persist **only in localStorage** on that device/browser.

Existing private source of truth stays in the connected Google Sheet:
`https://docs.google.com/spreadsheets/d/1CjHLI8E6jAUu_pGo6u4NC7ibNPkBG7QRGPQ8hU37Erg/edit`.

Gmail feedback: tap a button in any story dialog; `mailto:` prepopulates target `k63.2411115072@ftu.edu.vn` with `Signal_ID` and `Vote`. The user **must press Send** in their email client. This matches UX V3.2; no web-to-Google-Sheet write.

## Updating the public demo feed
Edit `v4/feed.json` with a **curated, redacted public-only** JSON collection respecting the existing schema `stories[]`, `links[]`, `opportunities[]`. Always source every story, mark test data `preview: true`, and use real saved IDs. Do not upload private database exports or include personally sensitive information. A live automated publication process is **not yet connected or verified**. Manual import of a user-provided snapshot exists, but imported news remains in memory for the current page only.

## Deployment
Render static site using `https://github.com/Khanhsz/blank-app.git`, branch `deploy/ai-intelligence-workspace-v4`, root `v4/` and publish path `v4`. No npm dependencies or build. Free/static hosting.
