# Alcovia Backend

Quick start (local with Docker Compose):

```powershell
cd D:\task\Alcovia
docker-compose up --build
```

This will start Postgres and the backend on port 4000. Set `N8N_WEBHOOK_URL` in your environment or in `.env` to point to your n8n webhook (see `docs/n8n-workflow.json`).

Endpoints:
- `POST /daily-checkin` { student_id, quiz_score, focus_minutes }
- `POST /assign-intervention` { intervention_id, assigned_task, mentor_id }
- `POST /complete-remedial` { student_id }
- `GET /student/:id` -> returns status and remedial_task

Socket.io: connect to backend and `emit('join', 'student:<id>')` to receive `status` events.
