# Raphael Pulse (Python Engine)

Network decision engine that adapts healthcare communication and emergency routing based on network and contextual signals.

## Run

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8001
```

## Starter Endpoints

- GET /health
- POST /decide
- POST /identity/verify-number
- POST /identity/otp/send
- POST /identity/otp/validate
- POST /location/retrieve
- POST /location/verify

## Scope

- Decision orchestration
- Emergency escalation workflow
- CAMARA and NaC integration logic
- Reachability and QoD decision policies

## CAMARA Coverage (Mock-First)

- Number Verification and SIM Swap
- One Time Password SMS (send/validate)
- Location Retrieval and Location Verification
- Connectivity Insights
- Region Device Count
- Device Reachability, Device Reachability Subscriptions
- Connected Network Type Subscriptions
- Device Identifier and Roaming Status
- Quality on Demand (session-based boost)
- QoS Profiles and QoS Provisioning (persistent profile assignment)
