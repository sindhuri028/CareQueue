# CareQueue

CareQueue is a responsive, glassmorphic full-stack appointment-scheduling starter. The Node/Express API serves the front end, searches a SQLite-backed sample directory, returns available sample slots, and reserves a slot transactionally with a queue token and reference.

## Run locally

Requires Node.js 20 or newer.

```sh
npm install
npm start
```

Open http://localhost:3000. The SQLite database is created under `./data/` on first run. Set `DATA_DIR` to choose another location. `npm run dev` restarts the server when files change.

## API

- `GET /api/health` — process health check
- `GET /api/providers?q=&department=` — search the seeded sample providers
- `GET /api/providers/:id/slots?department=&date=YYYY-MM-DD` — list currently unreserved sample times
- `POST /api/bookings` — validate and reserve a sample slot; returns a token and reference

Example request body:

```json
{
  "providerId": "northside",
  "department": "General Medicine",
  "date": "2026-12-01",
  "time": "09:00 AM",
  "patientName": "Alex Sample",
  "patientPhone": "+1 555 0100"
}
```

## Important: not a real healthcare booking service

Provider names, addresses, ratings, departments, schedules, queue positions, and appointments are illustrative sample data. A successful response means a slot was reserved in this app's local SQLite demo database only; **no real hospital receives the booking or sends a confirmation**. Do not enter real patient details or use this system for care. The app does not send SMS/email. It is not medical advice or an emergency service.

Before operating this for real patients, replace the seed directory with verified provider data and integrate each provider's authorized scheduling system; establish identity, consent, authentication and authorization, cancellation/change flows, notification delivery, encrypted storage and transport, retention/deletion policy, audit controls, monitoring/backups, and a security/privacy review for applicable health-data laws. The current prototype has no patient login and does not provide production-grade health-data protections. Do not deploy it for real patient data as-is. Keep provider credentials and secrets on the server, never in browser JavaScript.
