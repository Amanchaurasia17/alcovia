const express = require('express');
const cors = require('cors');
const axios = require('axios');
const http = require('http');
const { Server } = require('socket.io');
const { pool, init } = require('./db');
require('dotenv').config();


const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

io.on('connection', (socket) => {
  // client should join room with student:<id>
  socket.on('join', (room) => socket.join(room));
});

async function ensureStudentExists(student_id) {
  const r = await pool.query('SELECT id FROM students WHERE id=$1', [student_id]);
  if (r.rowCount === 0) {
    await pool.query('INSERT INTO students(id, name) VALUES($1,$2)', [student_id, `Student ${student_id}`]);
  }
}

app.post('/daily-checkin', async (req, res) => {
  const { student_id, quiz_score, focus_minutes } = req.body || {};
  if (!student_id || quiz_score == null || focus_minutes == null) return res.status(400).json({ error: 'Missing fields' });

  await ensureStudentExists(student_id);
  await pool.query('INSERT INTO daily_logs(student_id, quiz_score, focus_minutes) VALUES($1,$2,$3)', [student_id, quiz_score, focus_minutes]);

  // Logic gate
  if (quiz_score > 7 && focus_minutes > 60) {
    await pool.query('UPDATE students SET status=$1, remedial_task=NULL, updated_at=now() WHERE id=$2', ['On Track', student_id]);
    io.to(`student:${student_id}`).emit('status', { status: 'On Track' });
    return res.json({ status: 'On Track' });
  }

  // Failure -> Needs Intervention
  await pool.query('UPDATE students SET status=$1, updated_at=now() WHERE id=$2', ['Needs Intervention', student_id]);
  const r = await pool.query('INSERT INTO interventions(student_id, status) VALUES($1,$2) RETURNING id', [student_id, 'pending']);
  const intervention_id = r.rows[0].id;

  // Trigger n8n webhook if configured
  const webhook = process.env.N8N_WEBHOOK_URL;
  if (webhook) {
    try {
      await axios.post(webhook, { student_id, quiz_score, focus_minutes, intervention_id });
    } catch (err) {
      console.error('Failed to call n8n webhook', err.message);
    }
  }

  io.to(`student:${student_id}`).emit('status', { status: 'Locked', intervention_id });
  return res.json({ status: 'Pending Mentor Review', intervention_id });
});

app.post('/assign-intervention', async (req, res) => {
  const { intervention_id, assigned_task, mentor_id } = req.body || {};
  if (!intervention_id || !assigned_task) return res.status(400).json({ error: 'Missing fields' });

  // Update intervention
  const it = await pool.query('UPDATE interventions SET status=$1, assigned_task=$2, mentor_id=$3, assigned_at=now() WHERE id=$4 RETURNING student_id', ['assigned', assigned_task, mentor_id || null, intervention_id]);
  if (it.rowCount === 0) return res.status(404).json({ error: 'Intervention not found' });
  const student_id = it.rows[0].student_id;

  // Unlock student but set remedial task
  await pool.query('UPDATE students SET status=$1, remedial_task=$2, updated_at=now() WHERE id=$3', ['Remedial', assigned_task, student_id]);

  io.to(`student:${student_id}`).emit('status', { status: 'Remedial', assigned_task });

  return res.json({ ok: true });
});

app.post('/complete-remedial', async (req, res) => {
  const { student_id } = req.body || {};
  if (!student_id) return res.status(400).json({ error: 'Missing student_id' });
  await pool.query('UPDATE students SET status=$1, remedial_task=NULL, updated_at=now() WHERE id=$2', ['On Track', student_id]);
  io.to(`student:${student_id}`).emit('status', { status: 'On Track' });
  return res.json({ ok: true });
});

app.get('/student/:id', async (req, res) => {
  const { id } = req.params;
  const r = await pool.query('SELECT id, status, remedial_task FROM students WHERE id=$1', [id]);
  if (r.rowCount === 0) return res.status(404).json({ error: 'Not found' });
  res.json(r.rows[0]);
});

const port = process.env.PORT || 4000;

init().then(() => {
  server.listen(port, () => console.log('Backend listening on', port));

  // Fail-safe scheduler: auto-assign remedial tasks if mentor doesn't respond in configured hours (default 12)
  const HOURS = Number(process.env.FAILSAFE_HOURS || 12);
  setInterval(async () => {
    try {
      const res = await pool.query("SELECT id, student_id, created_at FROM interventions WHERE status='pending'");
      const now = new Date();
      for (const row of res.rows) {
        const created = new Date(row.created_at);
        const diffHours = (now - created) / (1000 * 60 * 60);
        if (diffHours >= HOURS) {
          // Auto-assign a lightweight remedial task
          await pool.query("UPDATE interventions SET status=$1, assigned_task=$2, assigned_at=now() WHERE id=$3", ['assigned', 'Auto: Read Chapter summary + short quiz', row.id]);
          await pool.query("UPDATE students SET status=$1, remedial_task=$2, updated_at=now() WHERE id=$3", ['Remedial', 'Auto: Read Chapter summary + short quiz', row.student_id]);
          io.to(`student:${row.student_id}`).emit('status', { status: 'Remedial', assigned_task: 'Auto: Read Chapter summary + short quiz' });
        }
      }
    } catch (err) {
      console.error('Fail-safe job error', err.message);
    }
  }, 1000 * 60 * 30); // run every 30 minutes

}).catch((err) => {
  console.error('DB init failed', err);
  process.exit(1);
});
