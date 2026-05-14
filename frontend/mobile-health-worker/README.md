# Mobile App (React Native)

Patient-facing mobile application for symptom submission and triage workflow.

## Run

```bash
npm install
EXPO_PUBLIC_API_URL=http://localhost:8000 npm start
```

The starter UI submits a patient case to `POST /cases` and renders the decision payload from Raphael Pulse.

## Scope

- Patient interaction screens
- Shared UI components
- API integration with Laravel gateway
- Future multi-role support (doctor, nurse)
