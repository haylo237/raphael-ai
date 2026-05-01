# Backend Gateway (Laravel)

Laravel API gateway for mobile clients and orchestration with Raphael Pulse.

## Run

```bash
PULSE_ENGINE_URL=http://localhost:8001 php -S 0.0.0.0:8000 -t public
```

## Starter Routes

- `GET /health`
- `POST /cases`

`POST /cases` validates case payload and forwards it to Raphael Pulse at `/decide`.

## Scope

- API endpoints for case intake and status updates
- Lightweight dashboards
- Integration layer to `pulse-engine`
- Authentication and request validation
