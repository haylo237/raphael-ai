# Raphael AI - Network-Aware Intelligent Healthcare Platform

Raphael AI is a network-aware intelligent healthcare platform designed to improve access to reliable medical services in underserved and low-connectivity regions, particularly across Sub-Saharan Africa.

The platform combines:

- AI-assisted healthcare workflows (simulated for hackathon)
- Telecom network intelligence
- Real-time decision orchestration

At its core is **Raphael Pulse**, a network decision engine that dynamically adapts healthcare delivery based on real-time connectivity conditions using telecom APIs.

## Problem Statement

Healthcare delivery in many regions faces critical challenges:

- Unstable internet disrupts telemedicine sessions
- Emergency response systems lack real-time coordination
- Digital health tools cannot adapt to network conditions
- Rural and underserved populations are most affected

This creates a gap between:

- the promise of digital healthcare
- and
- its reliability in real-world environments

## Solution Overview

Raphael AI introduces a network-aware healthcare system that intelligently adapts how care is delivered.

### Key Capabilities

#### Patient Interaction

- Submit symptoms and case details via mobile app
- Receive AI-assisted triage (simulated in prototype)

#### Intelligent Decision Engine (Raphael Pulse)

Evaluates:

- urgency (emergency vs normal case)
- network condition
- device reachability
- location data

Decides:

- communication mode (video, audio, chat)
- when to trigger emergency workflows
- when to request network prioritization

#### Emergency Response (Core Demo Feature)

- Detects critical cases
- Retrieves patient location
- Routes to nearest facility
- Requests priority network handling
- Triggers emergency alerts

#### Network Awareness

The system dynamically adapts based on:

- network congestion
- connectivity quality
- device availability

## Hackathon Alignment

This project aligns with the hackathon focus on:

### AI Agents and Intelligent Workflows

- Demonstrates agent-like orchestration via Raphael Pulse
- Automates decision-making in healthcare delivery

### Network as Code (NaC) and CAMARA APIs

Raphael AI integrates telecom intelligence using:

#### Identity and Security

- SIM Swap
- Number Verification

#### Connectivity

- Quality on Demand (QoD)
- Congestion Insights

#### Location

- Location Retrieval
- Geofencing

#### Device Intelligence

- Device Reachability
- Device Status

The platform does not just consume APIs, it orchestrates them intelligently to deliver reliable healthcare.

## Architecture Overview

Raphael AI is now a 5-app ecosystem coordinated by a network-aware decision engine.

```text
┌──────────────────────┐  ┌──────────────────────┐  ┌──────────────────────┐
│  Patient Mobile App  │  │ Health Worker Mobile │  │  Doctor Clinical App │
│      (Expo / RN)     │  │  (Expo / RN, Nurse)  │  │   (Expo / RN tablet) │
└─────────┬────────────┘  └──────────┬───────────┘  └──────────┬───────────┘
          │                          │                         │
          └──────────────┬───────────┴─────────────┬───────────┘
                         ▼                         ▼
                ┌─────────────────────────────────────────┐
                │     Laravel API Gateway  (port 8000)    │
                │  patients · emergencies · consultations │
                │             queue · pulse proxy         │
                └────────────────────┬────────────────────┘
                                     ▼
                  ┌────────────────────────────────────┐
                  │   Raphael Pulse Engine (port 8001) │
                  │   /decide → orchestrator           │
                  │   timeline + explanation           │
                  └─────────────────┬──────────────────┘
                                    ▼
                   ┌──────────────────────────────────┐
                   │  CAMARA APIs · Nokia NaC SDK     │
                   │  reachability · QoD · location   │
                   │  identity · congestion · device  │
                   └──────────────────────────────────┘

                         ┌──────────────────────────────┐
                         │     Admin Dashboard          │
                         │ ─ Hospital Operations panel  │
                         │ ─ Emergency Coordination     │
                         │ ─ CAMARA / Pulse consoles    │
                         │   (Next.js, port 3001)       │
                         └──────────────────────────────┘
```

## Platform Map

All user-facing apps live under a single `frontend/` directory.

| User | Platform | Folder |
| --- | --- | --- |
| Patient | Mobile App | `frontend/mobile-patient/` |
| Nurse / Community Health Worker | Mobile App | `frontend/mobile-health-worker/` |
| Doctor | Clinical App (mobile / tablet) | `frontend/mobile-doctor/` |
| Receptionist · Hospital Admin | Web Dashboard | `frontend/web-dashboard/` → Hospital Operations |
| Emergency Coordination Team | Web Dashboard | `frontend/web-dashboard/` → Emergency Coordination |

## Repository Structure

```text
raphael-ai/
│
├─ frontend/                       # All user interfaces (see frontend/README.md)
│  ├─ web-dashboard/               # Next.js 14 — admin / hospital / emergency consoles
│  │  └─ app/
│  │     ├─ hospital/              # overview · walk-in · queue · records
│  │     ├─ emergency/             # feed · pulse monitoring
│  │     ├─ triage, reachability, qod, … (CAMARA consoles)
│  │     └─ dashboard/             # system health
│  ├─ mobile-patient/              # Patient Expo RN app
│  │  └─ src/screens/patient/      # Welcome → OTP → Profile → Request emergency → Status
│  ├─ mobile-doctor/               # Doctor Expo RN app (tablet-friendly)
│  │  └─ src/screens/doctor/       # Login → Dashboard → Case list → Consultation → Prescription
│  └─ mobile-health-worker/        # Nurse / CHW Expo RN app
│     └─ src/screens/nurse/        # Login → Home → Register → Profile → Vitals → Emergency → Status
│
├─ backend-laravel/                # API Gateway (Laravel)
│  ├─ app/Http/Controllers/        # Case, Patient, Emergency, Consultation, Queue
│  └─ routes/api.php
│
├─ pulse-engine/                   # Raphael Pulse (FastAPI)
│  ├─ app/main.py
│  ├─ app/services/                # case_orchestrator, decision_engine
│  └─ app/camara/                  # reachability, identity, qod, location, congestion, device
│
├─ ai-core/                        # AI integration (future)
├─ docs/                           # SRS, diagrams
└─ docker-compose.yml              # All services + frontends, containerised
```

## Design Philosophy

- **Modular:** each component evolves independently
- **Scalable:** ready for national-level deployment
- **Network-aware:** core differentiator
- **AI-extendable:** future integration of real models

## Hackathon Scope

### Implemented

- Patient interaction flow
- Raphael Pulse decision engine
- CAMARA API orchestration (partial/full)
- Emergency response simulation
- Network-aware decision logic

### Simulated

- AI diagnosis and triage

### Future Work

- Real AI model integration (LLMs, vision models)
- Multi-role support (doctors, nurses, specialists)
- Full hospital and ministry dashboards
- Predictive healthcare analytics
- Deployment with telecom partners

## Getting Started

This repository now includes a runnable starter stack:

- `mobile`: Expo React Native intake client
- `backend-laravel`: lightweight PHP API gateway scaffold in Laravel module folder
- `pulse-engine`: FastAPI-based Raphael Pulse decision engine

### Option A: Run with Docker Compose

```bash
docker compose up
```

Endpoints:

- Gateway health: `http://localhost:8000/health`
- Pulse health: `http://localhost:8001/health`

### Option B: Run Locally (without Docker)

1. Start Raphael Pulse:

```bash
cd pulse-engine
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8001
```

2. Start backend gateway:

```bash
cd backend-laravel
PULSE_ENGINE_URL=http://localhost:8001 php -S 0.0.0.0:8000 -t public
```

3. Start the nurse / community health worker mobile app:

```bash
cd frontend/mobile-health-worker
npm install
EXPO_PUBLIC_API_URL=http://localhost:8000 EXPO_PUBLIC_PULSE_URL=http://localhost:8001 npm start
```

4. Start the patient mobile app (separate Expo instance):

```bash
cd frontend/mobile-patient
npm install
EXPO_PUBLIC_API_URL=http://localhost:8000 EXPO_PUBLIC_PULSE_URL=http://localhost:8001 npm start
```

5. Start the doctor clinical app:

```bash
cd frontend/mobile-doctor
npm install
EXPO_PUBLIC_API_URL=http://localhost:8000 EXPO_PUBLIC_PULSE_URL=http://localhost:8001 npm start
```

6. Start the web dashboard (hospital + emergency consoles):

```bash
cd frontend/web-dashboard
npm install
NEXT_PUBLIC_GATEWAY_URL=http://localhost:8000 NEXT_PUBLIC_PULSE_URL=http://localhost:8001 npm run dev
```

Then open:

- `http://localhost:3001/dashboard` — System health
- `http://localhost:3001/hospital/overview` — Hospital Operations
- `http://localhost:3001/emergency/feed` — Live Emergency Feed (showcase)
- `http://localhost:3001/emergency/pulse` — Pulse Monitoring

### Gateway API (stub endpoints)

The Laravel gateway exposes the following resources (in-memory via cache):

| Method | Path | Used by |
| --- | --- | --- |
| GET/POST | `/api/patients` | Nurse, Hospital Ops, Records |
| GET | `/api/patients/{id}` | Hospital Ops, Doctor |
| POST | `/api/patients/{id}/vitals` | Nurse, Doctor |
| GET/POST | `/api/emergencies` | Patient, Nurse, Emergency Dashboard |
| GET | `/api/emergencies/{id}` | Doctor, Emergency Dashboard |
| PATCH | `/api/emergencies/{id}` | Doctor, Emergency Dashboard |
| GET/POST | `/api/consultations` | Doctor |
| PATCH | `/api/consultations/{id}` | Doctor |
| POST | `/api/consultations/{id}/prescriptions` | Doctor |
| GET/POST | `/api/queue` | Hospital Ops |
| PATCH | `/api/queue/{id}/assign` | Hospital Ops |
| DELETE | `/api/queue/{id}` | Hospital Ops |
| POST | `/cases` | Legacy CAMARA-preflight triage |

### Quick API Test

```bash
curl -X POST http://localhost:8000/cases \
        -H "Content-Type: application/json" \
        -d '{
                "patient_id": "patient-001",
                "symptoms": ["chest pain", "dizziness"],
                "urgency": "emergency",
                "network_quality": "poor",
                "device_reachable": true,
                "location": "Kampala"
        }'
```

### Next Build Targets

1. Replace in-memory cache stores with real Laravel models + migrations.
2. Real-time updates via WebSockets / Server-Sent Events for the Emergency dashboard.
3. Auth + role-based access (currently demo sign-in).
4. AI triage and clinical reasoning agents in `ai-core/`.

## License

Add your preferred license (for example MIT, Apache-2.0, or proprietary) in a `LICENSE` file.
