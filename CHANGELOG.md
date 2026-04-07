## Unreleased

- Fixed recurring Vite dev-server 500/Unexpected token caused by invalid JSX structure in App.jsx (misplaced return blocks and duplicated/partial render fragments), which prevented React-Babel transform and caused `/src/App.jsx` to fail intermittently under dev reload.
- Updated Excel import to validate and parse `Ngày rời` correctly; rows with invalid `Ngày rời` are reported and skipped to avoid creating an active stay. Workers with `Ngày rời` now appear only in history, not in current room occupancy.
- Hardened stays API validation (date format, date_out >= date_in, one active stay per worker) and normalized Postgres `DATE` parsing to return `YYYY-MM-DD` strings (timezone-safe).
- Added backend settings endpoints and switched bootstrap settings load to backend when authenticated.
- Added automated tests:
  - stays validation + load-all shape
  - Vite regression: 20 consecutive GET requests to `/src/App.jsx` assert no 500

