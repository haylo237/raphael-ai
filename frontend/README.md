# Raphael AI — Frontends

All user-facing applications live here. Each subdirectory is an independent project with its own `package.json`.

| Directory | Audience | Tech | Default port |
| --- | --- | --- | --- |
| [`web-dashboard/`](./web-dashboard) | Receptionists, hospital admins, emergency coordinators, ops | Next.js 14 (App Router) + Tailwind | `3001` |
| [`mobile-patient/`](./mobile-patient) | Patients | Expo / React Native | Metro `19000` |
| [`mobile-doctor/`](./mobile-doctor) | Doctors (tablet-friendly) | Expo / React Native | Metro `19010` |
| [`mobile-health-worker/`](./mobile-health-worker) | Nurses & community health workers | Expo / React Native | Metro `19020` |

## Run with Docker (recommended)

From the repo root:

```bash
docker compose up web-dashboard mobile-patient mobile-doctor mobile-health-worker
```

Each frontend runs in its own container and is wired to:

- `backend-laravel`  → `http://localhost:8000`
- `pulse-engine`     → `http://localhost:8001`

## Run locally

```bash
cd frontend/web-dashboard         && npm install && npm run dev
cd frontend/mobile-patient        && npm install && npm start
cd frontend/mobile-doctor         && npm install && npm start
cd frontend/mobile-health-worker  && npm install && npm start
```
