# AI Tutor Studio – Knowledge Database 2.0

An offline-first curriculum builder with a **versioned SQLite reference database**.

## What's available

- **55 subjects** across 5 categories.
- **550 curriculum units**, **1,651 indexed subtopics**, **14 subject-area reading-list links**.
- **29 units contain original short explanations and worked examples**; other units are **outlines only**, not finished textbooks. App labels this distinction clearly.
- Database-backed curriculum builder (2–12 weeks), unit-based lesson composer, classroom activities, basic topic-recognition quizzes, topic search and simple grounded offline Q&A.
- No Gemini API key or Google Search calls are required for the database-based features. Data are static, not a live web index.
- Example reading links (OpenStax, MDN, MIT OCW, CORE Econ, etc.) are pointers to read more, **not evidence that each statement was verified against those sites**. No copyrighted textbook prose is included in the DB.

## Run locally

Requires Node **22.16+** (Render uses Node 26).

```bash
npm install
npm start
```

Then open http://localhost:3000. `npm start` compiles `data/catalog-seed.json` into a local SQLite file before starting the web server. It does not need Python, external API keys, or a paid database.

### Develop / test

```bash
npm run build:db
npm test
```

The seed source of truth is `data/catalog-seed.json` (original structure and original brief content); `scripts/build_database.mjs` builds read-only SQLite schema and indexes. A Python source authoring script is kept in the development archive; production only needs JS and JSON.

## HTTP endpoints

- `GET /api/health`: service health, database totals, mode.
- `GET /api/catalog` or `/api/catalog?q=marketing&category=...`: subject directory.
- `GET /api/catalog/:id`: subject's units and suggested reading-list sources.
- `POST /api/plan` with `{subject, goal, weeks, minutes, level}`: curriculum from matching database units.
- `POST /api/lesson` with `{course:{subject,minutes,level}, module:{title,unitIds}}`: authored material where available; outlines otherwise.
- `POST /api/research` with `{topic, level}`: searches the **local database**, does not call Google.
- `POST /api/tutor` with `{question, context}`: retrieves relevant local lesson text; may say it cannot answer when material is absent.

## Data boundaries and persistence

SQLite is a **bundled reference knowledge base** re-created at startup. It is read-only while app runs. User-created course plans and lesson records are stored in **browser localStorage** as before; they do not sync between devices and are lost when browser data are cleared.

Render Free's ephemeral disk is not a persistent database for user contributions. To support user uploads, instructor edits, multi-user sync or accumulated new educational content, add authenticated persistent Postgres and moderation/review workflow in a later phase. Do **not** store secrets or personal student records in the public seed.

## Source and licensing note

All brief explanations/outlines in the shipped seed were created for this app. The app links to third-party educational repositories but does not reproduce their chapter texts. Check source permissions and relevance before importing any external educational materials, and attribute each imported work explicitly. Legal, medical and rapidly changing information requires checking authoritative, current sources.

## Deploy

Existing Render Free web service: `ai-tutor-studio-khanhsz` in Singapore.

- GitHub source branch: `deploy/ai-tutor-studio`.
- Render build command: `npm install`.
- Render start command: `npm start` (generates SQLite then starts Node server).
- No environment key is needed. The legacy `GEMINI_API_KEY` (if present) is not used by current database endpoints and may be removed from Render separately.
