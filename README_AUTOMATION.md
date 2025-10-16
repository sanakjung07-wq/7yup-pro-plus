# 7YUP PRO+ — Automation Kit

This pack adds:
- `scripts/merge_sources.py` — Merge JSON/CSV from `data_sources/` into `promos.json` (id/slug de-duplication).
- `scripts/create_daily_report.py` — Produce a daily markdown report in `reports/` from `promos.json`.
- `.github/workflows/daily-report.yml` — GitHub Action to run the daily report every day at 09:00 ICT (02:00 UTC).

## Usage (local)
```bash
python scripts/merge_sources.py
python scripts/create_daily_report.py
```

## Data Sources
Put input files under `data_sources/` (supports `.json` and `.csv`). JSON can be a list or an object with `items` list.

## Output
- `promos.json` (merged)
- `reports/daily_report_YYYY-MM-DD.md`

## Notes
- De-duplication uses `id` or `slug` if present; otherwise a stable slug is generated from `brand` + `title`.
- Fields normalized: `brand`, `title`, `desc`, `url`, `badge`, `image`, `category`, `rank`, `createdAt`, `active`.
- Safe defaults ensure build never breaks even with partial input.
