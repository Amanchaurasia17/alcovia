# Alcovia - Intervention Engine (Intern assignment)

This repository contains a working prototype of the "Intervention Engine": a Backend (Node.js + Postgres), an Expo Web Frontend (React Native Web), and an n8n workflow for the mentor dispatch automation.

Design highlights
- Backend: `backend/` — Express, Postgres, Socket.io, endpoints for checkins and assigning remedial tasks.
- Frontend: `frontend/` — Expo React Native Web app implementing Focus Mode and cheater detection (tab visibility).
- Automation: `docs/n8n-workflow.json` — import into n8n; it receives failures, emails the mentor with an approve link, waits for mentor approval, and calls the backend to assign remedial tasks.

Fail-safe (handling mentor silence)

If a mentor does not respond within a configurable window (recommended: 12 hours), a fail-safe should:
- Auto-unlock the student with a lightweight remedial task (e.g., "Complete short quiz + Read Chapter summary") after X hours.
- Escalate via n8n to a Head Mentor or send SMS/push as configured.

Implementation notes
- Socket.io is used so the frontend will instantly receive status changes (bonus requirement).
- Cheater detection: the frontend listens to `visibilitychange` and auto-fails the session.

Local run (Docker)

```powershell
cd D:\task\Alcovia
docker-compose up --build
```

Then open the frontend (run locally with Expo) or deploy to a hosting provider. See `backend/README.md` and `frontend/README.md` for details.
