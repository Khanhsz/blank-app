# CaseCraft Matplotlib Report Service

Runtime: Python stdlib HTTP server + Matplotlib Agg. No Flask or external DB.
Run locally: `pip install -r requirements.txt && python app.py`.

Render Free Web Service:
- Runtime: `python`
- Build: `pip install -r casecraft/report-api/requirements.txt`
- Start: `cd casecraft/report-api && python app.py`
- Environment: `PYTHON_VERSION=3.11.11`, `MPLBACKEND=Agg`, `MPLCONFIGDIR=/tmp/mpl-config`
- Health: `/health`.

Only POST a deliverable's disclosed fields to `/api/charts` or `/api/report.pdf`. Do **not** transmit the whole WorldState, actual hidden causes, or player saves. Reports are rendered only in memory; data is not persisted. Matplotlib runs server-side because the game is deployed as a Render Static Site.

Free services may take time to wake from idle. The HTML report and existing EBIT bars remain the fallback if the Python service is unavailable.